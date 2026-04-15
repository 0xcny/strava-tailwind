"use server"

import { SessionData } from "@/app/auth/types"
import pb from "@/lib/pocketbase"
import { Collections } from "@/lib/types/pocketbase-types"
import { unstable_cache } from "@/lib/unstable-cache"
import { Status } from "@/lib/types/types"

export interface DashboardStats {
  totalKoms: number
  gained7d: number
  lost7d: number
  gained30d: number
  lost30d: number
}

export interface RecentChange {
  segmentName: string
  segmentId: number
  city: string
  status: Status
  created: string
}

export interface WeeklyActivity {
  week: string
  gained: number
  lost: number
}

export async function getDashboardStats(session: SessionData): Promise<DashboardStats> {
  return await unstable_cache(
    async () => {
      const { isLoggedIn, pbAuth, userId } = session
      if (!isLoggedIn || !pbAuth || !userId) return { totalKoms: 0, gained7d: 0, lost7d: 0, gained30d: 0, lost30d: 0 }
      pb.authStore.save(pbAuth)

      const now = new Date()
      const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const [userRecord, changes30d] = await Promise.all([
        pb.collection(Collections.Users).getFirstListItem(`id="${userId}"`, { fields: "kom_count" }),
        pb.collection(Collections.KomTimeseries).getFullList({
          filter: `user="${userId}" && created>="${d30}"`,
          fields: "status,created",
          sort: "-created",
        }),
      ])

      let gained7d = 0, lost7d = 0, gained30d = 0, lost30d = 0
      for (const c of changes30d) {
        const isGain = c.status === "gained" || c.status === "created" || c.status === "restored"
        const isRecent = c.created >= d7
        if (isGain) { gained30d++; if (isRecent) gained7d++ }
        else { lost30d++; if (isRecent) lost7d++ }
      }

      return {
        totalKoms: userRecord.kom_count,
        gained7d,
        lost7d,
        gained30d,
        lost30d,
      }
    },
    ["dashboard-stats", session.userId ?? ""],
    { revalidate: 120, tags: ["dashboard-stats"] }
  )()
}

export async function getRecentChanges(session: SessionData): Promise<RecentChange[]> {
  return await unstable_cache(
    async () => {
      const { isLoggedIn, pbAuth, userId } = session
      if (!isLoggedIn || !pbAuth || !userId) return []
      pb.authStore.save(pbAuth)

      const results = await pb.collection(Collections.KomTimeseries).getList(1, 12, {
        filter: `user="${userId}" && created>"2025-01-01 00:00:00"`,
        sort: "-created",
        expand: "kom_effort.segment",
        fields: `status,created,
          expand.kom_effort.segment_id,
          expand.kom_effort.expand.segment.name,
          expand.kom_effort.expand.segment.city`,
      })

      return results.items.map((d) => ({
        segmentName: d.expand?.kom_effort?.expand?.segment?.name ?? "Unknown",
        segmentId: d.expand?.kom_effort?.segment_id ?? 0,
        city: d.expand?.kom_effort?.expand?.segment?.city ?? "",
        status: d.status as Status,
        created: d.created,
      }))
    },
    ["recent-changes", session.userId ?? ""],
    { revalidate: 120, tags: ["recent-changes"] }
  )()
}

export async function getWeeklyActivity(session: SessionData): Promise<WeeklyActivity[]> {
  return await unstable_cache(
    async () => {
      const { isLoggedIn, pbAuth, userId } = session
      if (!isLoggedIn || !pbAuth || !userId) return []
      pb.authStore.save(pbAuth)

      const d90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      const changes = await pb.collection(Collections.KomTimeseries).getFullList({
        filter: `user="${userId}" && created>="${d90}"`,
        fields: "status,created",
        sort: "created",
      })

      const weeks = new Map<string, { gained: number; lost: number }>()
      for (const c of changes) {
        const d = new Date(c.created)
        const weekStart = new Date(d)
        weekStart.setDate(d.getDate() - d.getDay())
        const key = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`

        if (!weeks.has(key)) weeks.set(key, { gained: 0, lost: 0 })
        const entry = weeks.get(key)!
        const isGain = c.status === "gained" || c.status === "created" || c.status === "restored"
        if (isGain) entry.gained++
        else entry.lost++
      }

      return Array.from(weeks.entries()).map(([week, data]) => ({
        week,
        ...data,
      }))
    },
    ["weekly-activity", session.userId ?? ""],
    { revalidate: 120, tags: ["weekly-activity"] }
  )()
}
