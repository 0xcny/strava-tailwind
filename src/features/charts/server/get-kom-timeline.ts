"use server"

import { SessionData } from "@/app/auth/types"
import pb from "@/lib/pocketbase"
import { Collections } from "@/lib/types/pocketbase-types"
import { RecordModel } from "pocketbase"
import { unstable_cache } from "@/lib/unstable-cache"

type TimelinePoint = { date: string; total: number }

export async function getKomTimeline(session: SessionData): Promise<TimelinePoint[]> {
  return await unstable_cache(
    async () => {
      if (!session.isLoggedIn || session.pbAuth == null) return []
      pb.authStore.save(session.pbAuth)

      let current = 3592
      const rawData = await pb.collection(Collections.KomTimeseries).getFullList({
        fields: "created,status",
        sort: "created",
      })

      const data: TimelinePoint[] = rawData.map((entry: RecordModel) => {
        if (entry.status === "lost") current -= 1
        else current += 1
        const splitDate = entry.created.split(" ")[0]
        return { date: splitDate, total: current }
      })

      const reduced = reduceToLastOfMonth(data)
      if (data.length > 0) reduced.unshift(data[0])
      return reduced
    },
    ["kom-timeline", session.userId ?? ""],
    { revalidate: 300, tags: ["kom-timeline"] }
  )()
}

function reduceToLastOfMonth(data: TimelinePoint[]): TimelinePoint[] {
  const grouped: Record<string, TimelinePoint> = {}
  for (const entry of data) {
    const date = new Date(entry.date)
    const key = `${date.getFullYear()}-${date.getMonth()}`
    if (!grouped[key] || new Date(entry.date) > new Date(grouped[key].date)) {
      grouped[key] = entry
    }
  }
  return Object.values(grouped)
}
