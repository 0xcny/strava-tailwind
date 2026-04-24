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
import { checkIfRestored, createRequestLog, errorResponse, successResponse } from "./utils"

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
  const logger = createRequestLog()

  try {
    const headersList = await headers()
    const apiKey = headersList.get("x-api-key")
    if (apiKey !== process.env.UPDATE_API_KEY) return new NextResponse("Unauthorized", { status: 401 })

    const userId = process.env.USER_ID!
    const userGender = "f"
    const athleteId = 21856708

    let exceededRate = false
    const date = new Date()
    const cestHour = (date.getUTCHours() + 2) % 24
    const cestMinute = date.getUTCMinutes()
    const timeStr = `${String(cestHour).padStart(2, "0")}:${String(cestMinute).padStart(2, "0")} CEST`

    logger.log("INIT", timeStr)

    if (cestHour < 7 && headersList.get("night-override") === null) {
      return new NextResponse("Night", { status: 201 })
    }

    // Auth
    logger.log("AUTH", "Initializing PocketBase")
    await pb.collection("_superusers").authWithPassword(process.env.ADMIN_EMAIL!, process.env.ADMIN_PW!)
    pb.autoCancellation(false)

    // Strava Token
    let stravaToken: string
    try {
      const [token, wasRefreshed] = await getStravaToken()
      stravaToken = token
      logger.log("AUTH", `Strava token ${wasRefreshed ? "refreshed" : "valid"}`, { token: token.slice(0, 8) + "..." })
    } catch (error) {
      return await errorResponse("Couldn't retrieve Strava Access Token", 511, logger, error)
    }

    // Fetch DB state
    logger.log("DB", "Fetching KOM effort collection")
    const userEfforts: KomEffortRecord[] = await pb.collection(Collections.KomEfforts).getFullList({
      filter: `user="${userId}"`,
      fields: "segment_id,id,has_kom,is_starred,pr_effort",
      cache: "no-store",
    })
    const ownedKomIds: Set<number> = userEfforts
      ? new Set(userEfforts.filter((e) => e.has_kom).map((e) => e.segment_id))
      : new Set()

    logger.log("DB", "KOM state loaded", { total_efforts: userEfforts.length, active_koms: ownedKomIds.size })

    const apiPromises: Promise<Map<number, { detail: EffortDetailRecord; starred: boolean }>>[] = []
    let apiResults: Map<number, { detail: EffortDetailRecord; starred: boolean }>[] = []
    let apiDetails: Map<number, { detail: EffortDetailRecord; starred: boolean }> = new Map()
    const max_pages = Math.ceil(ownedKomIds.size / 200)

    let apiIds: Set<number>
    let usedScraper = false
    const concurrentUpdates: Promise<any>[] = []

    // ── Data Source: API or Scraper ──

    logger.log("API", "Fetching first KOM page")
    try {
      apiDetails = await fetchKomPageWithRetry(1, stravaToken, logger, 3, 1500)
      stravaRequestCount++
    } catch (error) {
      logger.warn("API", `Failed: ${error}`)
    }

    if (apiDetails.size === 0) {
      // ── Scraper Fallback ──
      logger.warn("SCRAPER", "API returned empty — falling back to scraper")
      const scraperUrl = process.env.SCRAPER_URL
      if (!scraperUrl) return await errorResponse("API failed and scraper URL not configured", 503, logger)

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
        logger.log("SCRAPER", "Data received", { count: apiIds.size, age_min: scraperData.age_minutes })
      } catch (error) {
        return await errorResponse("Both API and scraper failed", 503, logger, error)
      }
    } else {
      // ── API Data ──
      if (apiDetails.size === 200) {
        logger.log("API", `Fetching ${max_pages - 1} more pages`)
        try {
          for (let page = 2; page <= max_pages; page++) {
            apiPromises.push(fetchKomPageWithRetry(page, stravaToken, logger))
          }
          apiResults = await Promise.all(apiPromises)
        } catch (error) {
          return await errorResponse("Couldn't fetch KOM lists", 503, logger, error)
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
        logger.log("API", `Site wrap detected — fetching extra page ${page}`)
        try {
          const pageResult = await fetchKomPageWithRetry(page, stravaToken, logger, 2, 1000, true)
          for (const [key, value] of pageResult) {
            apiDetails.set(key, value)
          }
        } catch (error) {
          return await errorResponse(`Couldn't fetch extra page (${page})`, 503, logger, error)
        }
      }

      // Star status sync
      logger.log("DB", "Syncing star status")
      try {
        userEfforts.forEach((effort: KomEffortRecord) => {
          const apiIsStarred = apiDetails.get(effort.segment_id)?.starred
          if (apiIsStarred != null && effort.is_starred !== apiIsStarred) {
            concurrentUpdates.push(pb.collection(Collections.KomEfforts).update(effort.id!, { is_starred: apiIsStarred }))
          }
        })
      } catch (error) {
        logger.warn("DB", "Failed to sync star status")
      }

      apiIds = new Set(apiDetails.keys())
    }

    // ── Validation ──

    const source = usedScraper ? "SCRAPER" : "API"

    if (ownedKomIds.size - apiIds.size > 150) {
      logger.error("VALIDATE", "KOM count mismatch — rejecting", {
        db: ownedKomIds.size,
        source_count: apiIds.size,
        source,
      })
      return await errorResponse("Can't account for complete KOM list", 510, logger)
    }

    logger.log(source, `Success — ${apiIds.size} KOMs from ${source.toLowerCase()}`)

    // ── Diff & Process ──

    if (ownedKomIds.symmetricDifference(apiIds).size !== 0) {
      const [lostKomIds, gainedKomIds] = [ownedKomIds.difference(apiIds), apiIds.difference(ownedKomIds)]
      logger.log("DIFF", `+${gainedKomIds.size} gained, -${lostKomIds.size} lost`)

      const order: Order[] = []

      // ── Lost KOMs ──
      if (lostKomIds.size) {
        logger.log("LOST", `Processing ${lostKomIds.size} lost KOMs`)

        for (const lostId of lostKomIds) {
          const storedEffort = userEfforts.find((e) => e.segment_id === lostId)
          if (storedEffort == null || storedEffort.id == null)
            return await errorResponse("Couldn't resolve lost effort", 512, logger, { segment_id: lostId })

          const effortDetail = storedEffort.pr_effort!
          logger.debug("LOST", `Marking lost: seg_id=${lostId}`)

          concurrentUpdates.push(
            pb
              .collection(Collections.KomEfforts)
              .update(storedEffort.id, { has_kom: false }, { cache: "no-store" })
              .then(() => logger.debug("LOST", `Updated effort record: seg_id=${lostId}`))
              .catch((error) =>
                errorResponse(`Failed to update effort to lost (seg_id:${lostId})`, 513, logger, error, lostKomIds)
              )
          )

          const lossRecord: KomTimeseriesRecord = {
            user: userId,
            segment_id: lostId,
            kom_effort: storedEffort.id,
            status: "lost",
            user_effort: effortDetail,
          }

          try {
            const lossRecordRef = await pb.collection(Collections.KomTimeseries).create(lossRecord)
            logger.log("LOST", `Created loss record: seg_id=${lostId}`)
            order.push({ ref_id: lossRecordRef.id, segment_id: lostId, status: "lost", gender: userGender, athleteId })
          } catch (error) {
            return await errorResponse(`Failed to create loss record (seg_id:${lostId})`, 513, logger, error)
          }
        }
      }

      // ── Gained KOMs ──
      if (gainedKomIds.size) {
        logger.log("GAINED", `Processing ${gainedKomIds.size} gained KOMs`)

        for (const gainedId of gainedKomIds) {
          const storedEffort = userEfforts.find((e) => e.segment_id === gainedId)
          const effortDetail = apiDetails.get(gainedId)?.detail

          let detailRecord: { id: string } | null = null
          if (effortDetail) {
            detailRecord = await pb.collection(Collections.EffortDetails).create(effortDetail)
          } else {
            logger.warn("GAINED", `No effort detail for seg_id=${gainedId} (scraper mode)`)
          }

          if (storedEffort?.id) {
            // Existing effort — update to gained
            logger.debug("GAINED", `Updating existing effort: seg_id=${gainedId}`)

            concurrentUpdates.push(
              pb
                .collection(Collections.KomEfforts)
                .update(
                  storedEffort.id!,
                  { has_kom: true, ...(detailRecord && { pr_effort: detailRecord.id }) },
                  { cache: "no-store" }
                )
                .then(() => logger.debug("GAINED", `Updated effort record: seg_id=${gainedId}`))
                .catch((error) =>
                  errorResponse(`Failed to update effort to gained (seg_id:${gainedId})`, 514, logger, error, gainedId)
                )
            )

            const restored = await checkIfRestored(gainedId)
            const gainRecord: KomTimeseriesRecord = {
              user: userId,
              segment_id: gainedId,
              kom_effort: storedEffort.id,
              status: restored ? "restored" : "gained",
              ...(detailRecord && { user_effort: detailRecord.id }),
            }

            try {
              const gainRecordRef = await pb.collection(Collections.KomTimeseries).create(gainRecord)
              logger.log("GAINED", `Created ${restored ? "restore" : "gain"} record: seg_id=${gainedId}`)
              if (!restored) {
                order.push({ ref_id: gainRecordRef.id, segment_id: gainedId, status: "gained", gender: userGender, athleteId })
              }
            } catch (error) {
              return await errorResponse(`Failed to create gain record (seg_id:${gainedId})`, 513, logger, error)
            }
          } else {
            // New KOM — create segment + effort + timeseries
            let seg_ref: SegmentRecord, segment: SegmentRecord | null = null

            try {
              logger.debug("GAINED", `Looking up segment: seg_id=${gainedId}`)
              seg_ref = await pb.collection(Collections.Segments).getFirstListItem(`segment_id="${gainedId}"`)
            } catch {
              logger.log("GAINED", `New segment — fetching from Strava: seg_id=${gainedId}`)
              try {
                segment = await fetchNewSegmentRecord(gainedId, stravaToken)
              } catch (error) {
                return await errorResponse(`Failed to fetch segment from Strava (seg_id:${gainedId})`, 515, logger, error, gainedId)
              }
              try {
                seg_ref = await pb.collection(Collections.Segments).create(segment!)
              } catch (error) {
                return await errorResponse(`Failed to create segment record (seg_id:${gainedId})`, 516, logger, error, gainedId)
              }
            }

            const timeNow = new Date().getTime()
            const timeCreated = new Date(seg_ref.created_at!).getTime()
            const active = timeNow - timeCreated > ACTIVELY_ACQUIRED_KOM_THRESHOLD
            logger.debug("GAINED", `Segment age check`, { seg_id: gainedId, active, age_ms: timeNow - timeCreated })

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
              logger.log("GAINED", `Created new effort record: seg_id=${gainedId}`)
            } catch (error) {
              return await errorResponse(`Failed to create effort record (seg_id:${gainedId})`, 517, logger, error, gainedId)
            }

            const gainRecord: KomTimeseriesRecord = {
              user: userId,
              segment_id: seg_ref.segment_id,
              kom_effort: newKomEffort.id,
              status: active ? "gained" : "created",
              ...(detailRecord && { user_effort: detailRecord.id }),
            }

            try {
              const gainRecordRef = await pb.collection(Collections.KomTimeseries).create(gainRecord)
              logger.log("GAINED", `Created ${active ? "gain" : "create"} record: seg_id=${seg_ref.segment_id}`)
              if (active) {
                order.push({
                  ref_id: gainRecordRef.id,
                  segment_id: seg_ref.segment_id,
                  status: "gained",
                  gender: userGender,
                  athleteId,
                })
              }
            } catch (error) {
              return await errorResponse(`Failed to create gain record (seg_id:${seg_ref.segment_id})`, 513, logger, error)
            }
          }
        }
      }

      // ── Finalize ──
      const amount = ownedKomIds.size + gainedKomIds.size - lostKomIds.size
      concurrentUpdates.push(
        pb
          .collection(Collections.Users)
          .update(userId, { kom_count: amount })
          .then((userRecord) => logger.log("DB", `KOM count updated: ${userRecord.kom_count}`))
          .catch(() => logger.warn("DB", "Failed to update KOM count"))
      )
      await Promise.all(concurrentUpdates)
      await sendOrder(order, logger)
    } else {
      logger.log("DIFF", `No changes`, { db: ownedKomIds.size, api: apiIds.size })
    }

    logger.log("STATS", `Strava requests: ${stravaRequestCount}, rate exceeded: ${exceededRate}`)
    return await successResponse(logger)
  } catch (error) {
    return await errorResponse("Uncaught error in route", 520, logger, error)
  }
}

// ── Strava API ──

const fetchKomPageWithRetry = async (
  page: number,
  token: string,
  logger: ReturnType<typeof createRequestLog>,
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
      logger.debug("API", `Page ${page}: ${response.data.length} items`)
      if (!allowEmpty && response.data.length === 0) {
        logger.warn("API", `Empty response on attempt ${i + 1}/${retries} for page ${page}, retrying in ${delay}ms`)
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
        logger.warn("API", `503 on attempt ${i + 1}/${retries} for page ${page}, retrying in ${delay}ms`)
        await new Promise((res) => setTimeout(res, delay))
        delay *= 2
      } else {
        throw error
      }
    }
  }
  throw new Error(`Failed to fetch page ${page} after ${retries} retries.`)
}

// ── GCloud Order ──

async function sendOrder(order: Order[], logger: ReturnType<typeof createRequestLog>) {
  if (order.length === 0) return
  logger.log("GCLOUD", `Sending order: ${order.length} items`)
  try {
    const gcloudResponse = await fetch(process.env.GCLOUD_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.GCLOUD_AUTH!,
      },
      body: JSON.stringify(order),
    })
    logger.log("GCLOUD", `Response: ${gcloudResponse.status}`)
  } catch (error) {
    logger.warn("GCLOUD", "Failed to send order")
  }
}
