import axios from "axios"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import {
  Collections,
  EffortDetailRecord,
  KomEffortRecord,
  KomTimeseriesRecord,
  SegmentRecord,
} from "@/lib/types/pocketbase-types"
import pb from "@/lib/pocketbase"
import { fetchNewSegmentRecord, getStravaToken } from "@/lib/strava"
import { ACTIVELY_ACQUIRED_KOM_THRESHOLD } from "@/lib/constants"
import { checkIfRestored, createRequestLog, errorResponse } from "./utils"

interface Order {
  ref_id: string
  segment_id: number
  status: "gained" | "lost"
  gender: "f" | "m"
  athleteId: number
}
export const maxDuration = 60 // vercel

export async function GET(req: Request) {
  let stravaRequestCount = 0
  const { log, getLog } = createRequestLog()

  try {
    const headersList = await headers()
    const apiKey = headersList.get("x-api-key")
    if (apiKey !== process.env.UPDATE_API_KEY) return new NextResponse("Unauthorized", { status: 401 })

    const userId = process.env.USER_ID!
    const userGender = "f"
    const athleteId = 21856708

    let exceededRate = false
    const date = new Date()
    const currentHour = (date.getUTCHours() + 1) % 24 //CEST
    const currentMinute = date.getUTCMinutes()

    log(
      `[INIT] ${currentHour < 10 ? "0" + currentHour : currentHour} : ${
        currentMinute < 10 ? "0" + currentMinute : currentMinute
      } CEST`
    )
    if (currentHour < 7 && headersList.get("night-override") === null) {
      return new NextResponse("Night", { status: 201 })
    }

    log("[AUTH] Initializing Pocketbase")
    await pb.collection("_superusers").authWithPassword(process.env.ADMIN_EMAIL!, process.env.ADMIN_PW!)
    pb.autoCancellation(false)

    log(`[DATABASE] Fetching Strava Token - `, false)
    let stravaToken
    try {
      const [token, wasRefreshed] = await getStravaToken()
      log(wasRefreshed ? "REFRESHED - " : "VALID - ", false)
      stravaToken = token
    } catch (error) {
      return errorResponse("Couldn't retrieve Strava Access Token ", 511, getLog(), error)
    }
    log(stravaToken + " - Success")

    log("[DATABASE] Fetching Kom Effort Collection")
    const userEfforts: KomEffortRecord[] = await pb.collection(Collections.KomEfforts).getFullList({
      filter: `user="${userId}"`,
      fields: "segment_id,id,has_kom,is_starred,pr_effort",
      cache: "no-store",
    })
    const ownedKomIds: Set<number> = userEfforts
      ? new Set(userEfforts.filter((obj: KomEffortRecord) => obj.has_kom).map((obj: KomEffortRecord) => obj.segment_id))
      : new Set()

    log(`[INFO] Kom Effort count: ${userEfforts.length}, active Koms: ${ownedKomIds.size}`)
    const apiPromises: Promise<Map<number, { detail: EffortDetailRecord; starred: boolean }>>[] = []
    let apiResults: Map<number, { detail: EffortDetailRecord; starred: boolean }>[] = []
    let apiDetails: Map<number, { detail: EffortDetailRecord; starred: boolean }> = new Map()

    const max_pages = Math.ceil(ownedKomIds.size / 200)

    let apiIds: Set<number>
    let usedScraper = false
    const concurrentUpdates: Promise<any>[] = []

    log(`[API] Fetching First Kom Page`)
    try {
      apiDetails = await fetchKomPageWithRetry(1, stravaToken, log, 3, 1500)
      stravaRequestCount++
    } catch (error) {
      log(`[WARNING] API failed: ${error}`)
    }

    if (apiDetails.size === 0) {
      log(`[SCRAPER] API returned empty — falling back to scraper`)
      const scraperUrl = process.env.SCRAPER_URL
      if (!scraperUrl) return errorResponse("API failed and scraper URL not configured", 503, getLog())
      try {
        const scraperRes = await fetch(`${scraperUrl}/scrape?athlete_id=${userId}`, {
          headers: { "x-api-secret": process.env.SCRAPER_SECRET || "" },
        })
        if (!scraperRes.ok) throw new Error(`Scraper returned ${scraperRes.status}`)
        const scraperData = (await scraperRes.json()) as { segment_ids: number[]; age_minutes: number; scraping: boolean }
        if (scraperData.scraping) throw new Error("Scraper is still running")
        if (scraperData.age_minutes > 120) throw new Error(`Scraper data too stale (${scraperData.age_minutes}min old)`)
        apiIds = new Set(scraperData.segment_ids)
        usedScraper = true
        log(`[SCRAPER] Got ${apiIds.size} segment IDs (${scraperData.age_minutes}min old)`)
      } catch (error) {
        return errorResponse("Both API and scraper failed", 503, getLog(), error)
      }
    } else {
      if (apiDetails.size === 200) {
        log(`[API] Fetching ${max_pages - 1} more Kom Pages `)
        try {
          for (let page = 2; page <= max_pages; page++) {
            apiPromises.push(fetchKomPageWithRetry(page, stravaToken, log))
          }
          apiResults = await Promise.all(apiPromises)
        } catch (error) {
          return errorResponse("Couldn't fetch Kom Lists", 503, getLog(), error)
        }
        for (const result of apiResults) {
          for (const [key, value] of result) {
            apiDetails.set(key, value)
          }
        }
      }

      const siteWrap = apiDetails.size / 200 === max_pages

      if (siteWrap) {
        const page = max_pages + 1
        log(`[API] Fetching an extra page (${page})`)
        try {
          const pageResult = await fetchKomPageWithRetry(page, stravaToken, log, 2, 1000, true)
          for (const [key, value] of pageResult) {
            apiDetails.set(key, value)
          }
        } catch (error) {
          return errorResponse(`Couldn't fetch extra page (${page})`, 503, getLog(), error)
        }
      }

      log("[DATABASE] Updating star status of owned koms")
      try {
        userEfforts.forEach((effort: KomEffortRecord) => {
          const apiIsStarred = apiDetails.get(effort.segment_id)?.starred
          if (apiIsStarred != null && effort.is_starred !== apiIsStarred) {
            concurrentUpdates.push(pb.collection(Collections.KomEfforts).update(effort.id!, { is_starred: apiIsStarred }))
          }
        })
      } catch (error) {
        log(`[WARNING] Failed to update star status of owned koms`)
      }

      apiIds = new Set(apiDetails.keys())
    }

    if (ownedKomIds.size - apiIds.size > 150) {
      log(`[ERROR] KOM count mismatch: DB has ${ownedKomIds.size}, ${usedScraper ? "scraper" : "API"} returned ${apiIds.size} — rejecting`)
      return errorResponse("Can't account for complete Kom List", 510, getLog())
    }

    log(`[${usedScraper ? "SCRAPER" : "API"}] Success`)

    if (ownedKomIds.symmetricDifference(apiIds).size !== 0) {
      const [lostKomIds, gainedKomIds] = [ownedKomIds.difference(apiIds), apiIds.difference(ownedKomIds)]
      log(`[CALC] Kom Difference: ${gainedKomIds.size} gained - ${lostKomIds.size} lost`)

      const order: Order[] = []

      // handles lost koms
      if (lostKomIds.size) {
        log("[INFO] Processing lost Koms")

        for (const lostId of lostKomIds) {
          const storedEffort = userEfforts.find((effort) => effort.segment_id === lostId)
          if (storedEffort == null || storedEffort.id == null)
            return errorResponse("Couldn't resolve lost effort, which was expected", 512, getLog(), { id: lostId })
          log(
            `[DATABASE] Updating a present Kom Effort Record (seg_id:${storedEffort.segment_id}, effort_ref:${storedEffort.id})`
          )
          const effortDetail = storedEffort.pr_effort!
          concurrentUpdates.push(
            pb
              .collection(Collections.KomEfforts)
              .update(
                storedEffort.id,
                {
                  has_kom: false,
                },
                { cache: "no-store" }
              )
              .then(() =>
                log(`[DATABASE] Succesfully updated an existing Kom Effort Record to lost (seg_id:${lostId})`)
              )
              .catch((error) => {
                return errorResponse(
                  `Error occured while updating an existing Kom Effort Record to lost (seg_id:${lostId})`,
                  513,
                  getLog(),
                  error,
                  lostKomIds
                )
              })
          )

          const lossRecord: KomTimeseriesRecord = {
            user: userId,
            segment_id: lostId,
            kom_effort: storedEffort.id,
            status: "lost",
            user_effort: effortDetail,
          }

          let lossRecordRef

          try {
            lossRecordRef = await pb.collection(Collections.KomTimeseries).create(lossRecord)
          } catch (error) {
            return errorResponse(`Error occured while creating a Loss Record (seg_id:${lostId})`, 513, getLog(), error)
          }
          log(`[DATABASE] Succesfully created a Loss Record (seg_id:${lostId})`)

          order.push({ ref_id: lossRecordRef.id, segment_id: lostId, status: "lost", gender: userGender, athleteId })
        }
      }

      //handles gained koms
      if (gainedKomIds.size) {
        log("[INFO] Processing gained Koms")
        for (const gainedId of gainedKomIds) {
          const storedEffort = userEfforts.find((effort) => effort.segment_id === gainedId)
          const effortDetail = apiDetails.get(gainedId)?.detail
          let detailRecord: { id: string } | null = null
          if (effortDetail) {
            detailRecord = await pb.collection(Collections.EffortDetails).create(effortDetail)
          } else {
            log(`[WARNING] No effort detail available for gained KOM (seg_id:${gainedId}) — scraper mode`)
          }

          if (!(storedEffort == null || storedEffort.id == null)) {
            log(
              `[DATABASE] Updating a present Kom Effort Record (seg_id:${storedEffort.segment_id}, effort_ref:${storedEffort.id})`
            )

            concurrentUpdates.push(
              pb
                .collection(Collections.KomEfforts)
                .update(
                  storedEffort.id!,
                  {
                    has_kom: true,
                    ...(detailRecord && { pr_effort: detailRecord.id }),
                  },
                  { cache: "no-store" }
                )
                .then(() =>
                  log(`[DATABASE] Succesfully updated an existing Kom Effort Record to gained (seg_id:${gainedId})`)
                )
                .catch((error) => {
                  return errorResponse(
                    `Error occured while updating an existing Kom Effort Record to gained (seg_id:${gainedId})`,
                    514,
                    getLog(),
                    error,
                    gainedId
                  )
                })
            )
            const restored = await checkIfRestored(gainedId)

            const gainRecord: KomTimeseriesRecord = {
              user: userId,
              segment_id: gainedId,
              kom_effort: storedEffort.id,
              status: restored ? "restored" : "gained",
              ...(detailRecord && { user_effort: detailRecord.id }),
            }

            let gainRecordRef

            try {
              gainRecordRef = await pb.collection(Collections.KomTimeseries).create(gainRecord)
            } catch (error) {
              return errorResponse(
                `Error occured while creating an active Gain Record (seg_id:${gainedId})`,
                513,
                getLog(),
                error
              )
            }
            log(`[DATABASE] Succesfully created an active Gain Record (seg_id:${gainedId})`)

            if (!restored) {
              order.push({
                ref_id: gainRecordRef.id,
                segment_id: gainedId,
                status: "gained",
                gender: userGender,
                athleteId,
              })
            }
          } else {
            let seg_ref: SegmentRecord,
              segment: SegmentRecord | null = null
            try {
              log(`[DATABASE] Trying to fetch Segment (seg_id: ${gainedId})`)
              seg_ref = await pb.collection(Collections.Segments).getFirstListItem(`segment_id="${gainedId}"`)
            } catch {
              log(`[DATABASE] Couldn't find segment (seg_id: ${gainedId})`)

              try {
                log(`[API] Fetching/Formatting a detailed Segment from Strava (seg_id: ${gainedId})`)
                segment = await fetchNewSegmentRecord(gainedId, stravaToken)
              } catch (error) {
                return errorResponse(
                  `Error occured while fetching/formatting a detailed Segment from Strava (seg_id: ${gainedId})`,
                  515,
                  getLog(),
                  error,
                  gainedId
                )
              }

              try {
                log(`[DATABASE] Creating Segment Record (seg_id: ${gainedId})`)
                seg_ref = await pb.collection(Collections.Segments).create(segment!)
              } catch (error) {
                return errorResponse(`Error occured while creating a new Segment on the database`, 516, getLog(), error, gainedId)
              }
            }
            const timeNow = new Date().getTime()
            const timeCreated = new Date(seg_ref.created_at!).getTime()
            const active = timeNow - timeCreated > ACTIVELY_ACQUIRED_KOM_THRESHOLD
            log(`[DEBUG] Time now ${timeNow}ms, time created ${timeCreated}ms, active:${active}`)

            log(`[DATABASE] Creating Kom Effort Record (seg_id:${gainedId}, seg_ref:${seg_ref.id})`)
            const newEffort: KomEffortRecord = {
              segment: seg_ref.id!,
              user: userId,
              segment_id: seg_ref.segment_id,
              is_starred: false,
              has_kom: true,
              ...(detailRecord && { pr_effort: detailRecord.id }),
            }
            let newKomEffort: KomEffortRecord
            try {
              newKomEffort = await pb.collection(Collections.KomEfforts).create(newEffort)
              log(`[DATABASE] Succesfully created a new Kom Effort Record (seg_id: ${gainedId})`)
            } catch (error) {
              return errorResponse(
                `Error occured while creating a new Kom Effort on the database (seg_id: ${gainedId})`,
                517,
                getLog(),
                error,
                gainedId
              )
            }

            const gainRecord: KomTimeseriesRecord = {
              user: userId,
              segment_id: seg_ref.segment_id,
              kom_effort: newKomEffort.id,
              status: active ? "gained" : "created",
              ...(detailRecord && { user_effort: detailRecord.id }),
            }

            let gainRecordRef
            try {
              gainRecordRef = await pb.collection(Collections.KomTimeseries).create(gainRecord)
            } catch (error) {
              return errorResponse(
                `Error occured while creating an active Gain Record (seg_id:${seg_ref.segment_id})`,
                513,
                getLog(),
                error
              )
            }
            log(`[DATABASE] Succesfully created an active Gain Record (seg_id:${seg_ref.segment_id})`)

            if (active) {
              order.push({
                ref_id: gainRecordRef.id,
                segment_id: seg_ref.segment_id,
                status: "gained",
                gender: userGender,
                athleteId,
              })
            }
          }
        }
      }

      const amount = ownedKomIds.size + gainedKomIds.size - lostKomIds.size

      concurrentUpdates.push(
        pb
          .collection(Collections.Users)
          .update(userId, { kom_count: amount })
          .then((userRecord) => {
            log(`[DATABASE] Updated User ${userId}: ${userRecord.kom_count} total Koms`)
          })
          .catch(() => {
            log(`[WARNING] Failed to update User Kom Count`)
          })
      )
      await Promise.all(concurrentUpdates)

      await sendOrder(order, log)
    } else {
      log(`[INFO] Sets are identical (Db: ${ownedKomIds.size} - Api: ${apiIds.size})`)
    }
    log(`[INFO] Requests made to Strava - ${stravaRequestCount}, Rate exceeded - ${exceededRate}`)
    log("[EXIT] 200")

    return new NextResponse(getLog(), { status: 200 })
  } catch (error) {
    return errorResponse("Uncaught Error in route", 520, getLog(), error)
  }
}

//Strava Api
const fetchKomPageWithRetry = async (
  page: number,
  token: string,
  log: (message: string, newline?: boolean) => void,
  retries = 2,
  delay = 1000,
  allowEmpty = false
): Promise<Map<number, { detail: EffortDetailRecord; starred: boolean }>> => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios({
        method: "GET",
        url: `${process.env.STRAVA_KOM_URL}?page=${page}&per_page=200`,
        headers: { Authorization: "Bearer " + token },
      })
      log(`  - ${page} (${response.data.length})`)
      if (!allowEmpty && response.data.length === 0) {
        log(`[ERROR] Empty response on attempt ${i + 1} fetching page ${page}, retrying in ${delay}ms...`)
        await new Promise((res) => setTimeout(res, delay))
        delay *= 2
        continue
      }
      const effortDetails: Map<number, { detail: EffortDetailRecord; starred: boolean }> = new Map()
      response.data.forEach((kom: any) => {
        let average_speed = 0
        if (kom.distance && kom.elapsed_time)
          average_speed = Math.round((kom.distance / kom.elapsed_time) * 3.6 * 100) / 100
        effortDetails.set(kom.segment.id, {
          detail: {
            elapsed_time: kom.elapsed_time,
            average_cadence: kom.average_cadence,
            average_watts: kom.average_watts,
            average_heartrate: kom.average_heartrate,
            max_heartrate: kom.max_heartrate,
            start_date: kom.start_date_local,
            average_speed: average_speed,
            segment_effort_id: kom.activity.id,
          },
          starred: kom.segment.starred,
        })
      })
      return effortDetails
    } catch (error) {
      if (axios.isAxiosError(error) && error.status === 503) {
        log(`[ERROR] 503 error on attempt ${i + 1} fetching page ${page}, retrying in ${delay}ms...`)
        await new Promise((res) => setTimeout(res, delay))
        delay *= 2
      } else {
        throw error
      }
    }
  }
  throw new Error(`Failed to fetch page ${page} after ${retries} retries.`)
}

async function sendOrder(order: Order[], log: (message: string, newline?: boolean) => void) {
  log(`[INFO] Sending order (${order.length}) to gcloud... `, false)
  try {
    const gcloudResponse = await fetch(process.env.GCLOUD_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.GCLOUD_AUTH!,
      },
      body: JSON.stringify(order),
    })
    log(gcloudResponse.status + "")
  } catch (error) {
    log(`[WARNING] GCloud Error`)
  }
}
