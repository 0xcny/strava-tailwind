"use server"

import { verifySession } from "@/app/auth/actions/verify-session"
import { RecordModel } from "pocketbase"
import { Collections, RecordIdString } from "@/lib/types/pocketbase-types"
import pb from "@/lib/pocketbase"
import { getStravaToken } from "@/lib/strava"
import { asError } from "@/lib/utils"
import { Line, TailwindTableSegment } from "@/lib/types/types"

/**
 * Fetches all starred segments from Strava API and database
 *
 * @returns Object containing Strava starred segments, database records, token, and request count
 */

export async function fetchStarredSegments(userId: string) {
  let stravaRequestCount = 0
  let stravaToken = ""

  try {
    const [token, _] = await getStravaToken()
    stravaToken = token
  } catch (error) {
    throw new Error("[ERROR] Couldn't retrieve Strava Access Token " + JSON.stringify(asError(error)))
  }

  stravaRequestCount++

  // Fetch both Strava starred segments and DB records concurrently
  const [stravaStarredList, dbKomEffortRecords] = await Promise.all([
    fetchStarredPage(1, stravaToken),
    getStarredSegmentsFromDatabase(userId),
  ])

  // Check if we need to fetch additional pages
  let allStarredSegments = [...stravaStarredList]
  if (stravaStarredList.length === 200) {
    const MAX_PAGES = 20
    let page = 2

    while (page <= MAX_PAGES) {
      const starredPage = await fetchStarredPage(page, stravaToken)
      stravaRequestCount++
      allStarredSegments = allStarredSegments.concat(starredPage)
      if (starredPage.length < 200) break
      page++
    }
  }

  return {
    stravaStarredList: allStarredSegments,
    dbKomEffortRecords,
    token: stravaToken,
    requestCount: stravaRequestCount,
  }
}

/**
 * Fetches a single page of starred segments from Strava API
 *
 * @param page - Page number to fetch
 * @param stravaToken - Valid Strava API access token
 * @returns Array of starred segment objects from Strava
 */

async function fetchStarredPage(page: number, stravaToken: string) {
  const response = await fetch(`${process.env.STRAVA_API}/segments/starred?page=${page}&per_page=200`, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + stravaToken,
    },
    next: {
      tags: ["strava-starred"],
    },
  })

  if (!response.ok) {
    throw new Error(`Error ${response.status}: Couldn't retrieve starred segment page ${page} from Strava`)
  }

  return response.json()
}

/**
 * Retrieves starred segments from the database for the authenticated user
 *
 * @returns Array of KomEffort records with expanded segment data
 */

async function getStarredSegmentsFromDatabase(
  userId: string
): Promise<(TailwindTableSegment & { path: Line[]; id: RecordIdString })[]> {
  const starredSegmentsRequest = await pb.collection(Collections.KomEfforts).getFullList({
    filter: `user="${userId}" && is_starred=true`,
    expand: "segment",
    fields: `id,expand.segment.name,
    expand.segment.city,
    segment_id,
    expand.segment.distance,
    expand.segment.labels,
    expand.segment.path,
    is_starred,
    has_kom,
    expand.segment.average_grade,
    expand.segment.leader_qom`,
  })

  return starredSegmentsRequest.map((effort: RecordModel) => {
    const segment = effort.expand!.segment
    return {
      id: effort.id, // Record ID
      name: segment.name,
      city: segment.city,
      segment_id: effort.segment_id,
      distance: segment.distance,
      labels: segment.labels,
      path: segment.path,
      is_starred: effort.is_starred,
      has_kom: effort.has_kom,
      average_grade: segment.average_grade,
      leader_qom: segment.leader_qom,
    }
  })
}
