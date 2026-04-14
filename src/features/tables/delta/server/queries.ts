import "server-only"

import { DeltaTableSegment, Label } from "@/lib/types/types"
import pb from "@/lib/pocketbase"
import { Collections } from "@/lib/types/pocketbase-types"
import { unstable_cache } from "@/lib/unstable-cache"
import { TableQuerySchema } from "../../_lib/validations"
import { getDeltaSortExpression } from "../utils"

export async function getDeltaSegments(input: TableQuerySchema) {
  return await unstable_cache(
    async () => {
      try {
        // Offset to paginate the results
        const offset = (input.page - 1) * input.perPage
        // Column and order to sort by
        // Spliting the sort string by "." to get the column and order
        // Example: "title.desc" => ["title", "desc"]
        const [column, order] = (input.sort?.split(".").filter(Boolean) ?? ["created", "desc"]) as [
          keyof DeltaTableSegment | undefined,
          "asc" | "desc" | undefined
        ]
        const sortExpression = getDeltaSortExpression(column, order)
        // Convert the date strings to date objects
        const fromDate = input.from ? new Date(input.from) : undefined
        const toDate = input.to ? new Date(input.to) : undefined

        // Build filter conditions
        let filterConditions = []

        // Filter by title
        if (input.name) {
          filterConditions.push(`kom_effort.segment.name ~ "${input.name}"`)
        }

        // Filter tasks by status
        if (input.labels) {
          const labelArray = input.labels.split(".").filter(Boolean) as Label[]
          labelArray.forEach((label) => {
            filterConditions.push(`kom_effort.segment.labels ~ "${label}"`)
          })
        }

        // Filter by created date
        if (input.from) {
          filterConditions.push(`created >= "${new Date(input.from).toISOString()}"`)
        }

        if (input.to) {
          filterConditions.push(`created <= "${new Date(input.to).toISOString()}"`)
        }

        // Combine filters based on the operator
        let filter = ""
        if (filterConditions.length > 0) {
          filter = filterConditions.join(input.operator === "or" ? " || " : " && ")
        }

        // Base Filter to only get tasks after tracking started TODO make constant somewhere
        const baseFilter = `created>"2025-01-01 00:00:00"`
        const combinedFilter = filter ? `${baseFilter} && ${filter}` : baseFilter

        const result = await pb.collection(Collections.KomTimeseries).getList(input.page, input.perPage, {
          filter: combinedFilter,
          sort: sortExpression,
          expand: "opponent,kom_effort,kom_effort.segment",
          fields: `status,
    created,
    expand.opponent.name,
    expand.opponent.athlete_id,
    expand.opponent.avatar,
    expand.opponent.collectionId,
    expand.opponent.id,
    expand.kom_effort.segment_id,
    expand.kom_effort.has_kom,
    expand.kom_effort.is_starred,
    expand.kom_effort.expand.segment.name,
    expand.kom_effort.expand.segment.city,
    expand.kom_effort.expand.segment.labels,
    expand.kom_effort.expand.segment.distance,
    expand.kom_effort.expand.segment.average_grade`,
          cache: "no-store",
        })
        const data: DeltaTableSegment[] = result.items.map((d) => ({
          status: d.status,
          created: new Date(d.created),
          opponent: d.expand!.opponent
            ? {
                name: d.expand!.opponent.name,
                athlete_id: d.expand!.opponent.athlete_id,
                avatar: `${process.env.PB_URL}/api/files/${d.expand!.opponent.collectionId}/${d.expand!.opponent.id}/${
                  d.expand!.opponent.avatar
                }`,
              }
            : undefined,
          segment_id: d.expand!.kom_effort.segment_id,
          is_starred: d.expand!.kom_effort.is_starred,
          has_kom: d.expand!.kom_effort.has_kom,
          name: d.expand!.kom_effort.expand!.segment.name,
          city: d.expand!.kom_effort.expand!.segment.city,
          labels: d.expand!.kom_effort.expand!.segment.labels,
          distance: d.expand!.kom_effort.expand!.segment.distance,
          average_grade: d.expand!.kom_effort.expand!.segment.average_grade,
        }))
        return {
          data,
          pageCount: result.totalPages,
        }
      } catch (_err) {
        console.error("Delta query error:", _err)
        return { data: [], pageCount: 0 }
      }
    },
    [JSON.stringify(input)],
    {
      revalidate: 120,
      tags: ["delta"],
    }
  )()
}
