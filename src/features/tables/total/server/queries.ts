import "server-only"

import { Label, BaseTableSegment } from "@/lib/types/types"
import pb from "@/lib/pocketbase"
import { Collections } from "@/lib/types/pocketbase-types"
import { unstable_cache } from "@/lib/unstable-cache"
import { getTotalSortExpression } from "../utils"
import { TableQuerySchema } from "../../_lib/validations"

export async function getTotalKoms(input: TableQuerySchema) {
  return await unstable_cache(
    async () => {
      try {
        const [column, order] = (input.sort?.split(".").filter(Boolean) ?? ["created", "desc"]) as [
          keyof BaseTableSegment | undefined,
          "asc" | "desc" | undefined
        ]
        const sortExpression = getTotalSortExpression(column, order)

        // Build filter conditions
        let filterConditions = []

        // Filter by title
        if (input.name) {
          filterConditions.push(`segment.name ~ "${input.name}"`)
        }

        // Filter tasks by status
        if (input.labels) {
          const labelArray = input.labels.split(".").filter(Boolean) as Label[]
          labelArray.forEach((label) => {
            filterConditions.push(`segment.labels ~ "${label}"`)
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
        const baseFilter = "has_kom=true"
        const combinedFilter = filter ? `${baseFilter} && ${filter}` : baseFilter

        const result = await pb.collection(Collections.KomEfforts).getList(input.page, input.perPage, {
          filter: combinedFilter,
          sort: sortExpression,
          expand: "segment",
          fields: `segment_id,has_kom,is_starred,
            expand.segment.name,
            expand.segment.city,
            expand.segment.labels,
            expand.segment.distance,
            expand.segment.average_grade`,
        })
        const data: BaseTableSegment[] = result.items.map((d) => ({
          segment_id: d.segment_id,
          name: d.expand!.segment.name,
          city: d.expand!.segment.city,
          is_starred: d.is_starred,
          has_kom: d.has_kom,
          labels: d.expand!.segment.labels,
          distance: d.expand!.segment.distance,
          average_grade: d.expand!.segment.average_grade,
        }))

        return {
          data,
          pageCount: result.totalPages,
        }
      } catch (_err) {
        console.error("Total query error:", _err)
        return { data: [], pageCount: 0 }
      }
    },
    [JSON.stringify(input)],
    {
      revalidate: 120,
      tags: ["total"],
    }
  )()
}
