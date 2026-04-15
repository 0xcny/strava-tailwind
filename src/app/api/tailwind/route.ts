import pb from "@/lib/pocketbase"
import { getSession } from "@/app/auth/actions/verify-session"
import { fetchStarredSegments } from "@/features/tables/tailwind/server/get-starred-segments"
import { processSegmentData } from "@/features/tables/tailwind/server/process-new-segments"
import { processNewSegments } from "@/features/tables/tailwind/server/update-database-segments"
import { NextResponse } from "next/server"
import { TailwindTableSegment } from "@/lib/types/types"
import { StatusState } from "@/features/tables/tailwind/types"
import { BASE_URL } from "@/lib/base-url"

/**
 * Streams the process of fetching and analyzing tailwind data for a user's starred Strava segments.
 * This endpoint:
 * 1. Authenticates the user
 * 2. Fetches starred segments from Strava
 * 3. Processes segment data and identifies new segments
 * 4. Updates the database with new segments
 * 5. Calculates tailwind metrics using weather data
 *
 * @returns {NextResponse<ReadableStream>} Server-Sent Events stream with progress updates and final results
 */

export async function GET(): Promise<NextResponse<ReadableStream<TailwindTableSegment>>> {
  const session = await getSession()

  if (!session?.isLoggedIn || !session.userId || !session.pbAuth) {
    return new NextResponse(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  const encoder = new TextEncoder()
  let streamController: ReadableStreamDefaultController<Uint8Array>

  const sendEvent = (event: string, data: StatusState) => {
    try {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
      streamController.enqueue(encoder.encode(payload))
    } catch (error) {
      console.error("Error sending event:", error)
    }
  }

  const stream = new ReadableStream({
    start(controller) {
      streamController = controller

      // Process Start
      const processData = async () => {
        pb.authStore.save(session.pbAuth!)

        try {
          // Step 1: Fetch starred segments from strava & db
          sendEvent("status", {
            step: "fetch",
          })
          const {
            stravaStarredList,
            dbKomEffortRecords,
            token,
            requestCount: step1RequestCount,
          } = await fetchStarredSegments(session.userId!)

          // Step 2: Processing segment data
          sendEvent("status", {
            step: "process",
          })

          // Early return if no starred segments
          if (!stravaStarredList.length) {
            sendEvent("status", {
              step: "complete",
              data: { segments: [] },
            })
            controller.close()
            return
          }

          const { newSegments, tailwindSegments } = await processSegmentData(
            stravaStarredList,
            dbKomEffortRecords,
            token
          )

          // Step 4: Update database
          sendEvent("status", {
            step: "update",
          })

          await processNewSegments(newSegments, session.userId!)

          // Step 5: Calculate tailwind
          sendEvent("status", {
            step: "weather",
          })

          // The only way for me to cache a function response within a stream was to source it out in a seperate route
          const response = await fetch(BASE_URL + "/api/weather-data", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-secret": process.env.CLIENT_SECRET!,
            },
            body: JSON.stringify(tailwindSegments),
          })

          if (!response.ok) {
            throw new Error(`Weather data request failed with status ${response.status}`)
          }

          const { results: starredSegmentsWithWeather } = await response.json()

          sendEvent("status", {
            step: "complete",
            data: {
              segments: starredSegmentsWithWeather,
            },
          })
        } catch (error) {
          console.error("Error processing tailwind segments:", error)

          sendEvent("error", {
            step: "error",
            error: error instanceof Error ? error.message : String(error),
          })
        }
        // Process End
        controller.close()
      }

      // Start processing without awaiting
      processData().catch(console.error)
    },
  })

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
    },
  })
}
