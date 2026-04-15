import { Suspense } from "react"
import { verifySession } from "@/app/auth/actions/verify-session"
import { getDashboardStats, getRecentChanges, getWeeklyActivity } from "@/features/dashboard/server/queries"
import { getKomTimeline } from "@/features/charts/server/get-kom-timeline"
import { StatCards } from "@/features/dashboard/components/stat-cards"
import { RecentActivity } from "@/features/dashboard/components/recent-activity"
import { WeeklyChart } from "@/features/dashboard/components/weekly-chart"
import { TotalKomChart } from "@/features/charts/total-kom-chart"
import { Skeleton } from "@/components/ui/skeleton"

export default async function DashboardPage() {
  const session = await verifySession()

  const statsPromise = getDashboardStats(session)
  const changesPromise = getRecentChanges(session)
  const weeklyPromise = getWeeklyActivity(session)
  const timelinePromise = getKomTimeline(session)

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Your KOM overview at a glance.</p>
      </div>

      <Suspense fallback={<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[106px] rounded-lg" />)}</div>}>
        <StatCards statsPromise={statsPromise} />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-6">
          <div className="rounded-lg border bg-card">
            <div className="border-b px-5 py-3">
              <h3 className="text-sm font-medium">KOM History</h3>
            </div>
            <div className="p-4">
              <Suspense fallback={<Skeleton className="h-[250px]" />}>
                <TotalKomChart chartDataPromise={timelinePromise} />
              </Suspense>
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="border-b px-5 py-3">
              <h3 className="text-sm font-medium">Weekly Gains & Losses</h3>
              <p className="text-xs text-muted-foreground">Last 90 days</p>
            </div>
            <div className="p-4">
              <Suspense fallback={<Skeleton className="h-[250px]" />}>
                <WeeklyChart dataPromise={weeklyPromise} />
              </Suspense>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <Suspense fallback={<Skeleton className="h-[500px] rounded-lg" />}>
            <RecentActivity changesPromise={changesPromise} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
