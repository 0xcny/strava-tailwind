"use client"

import { use } from "react"
import { CrownIcon, TrendingUpIcon, TrendingDownIcon, ActivityIcon } from "lucide-react"
import { DashboardStats } from "../server/queries"

export function StatCards({ statsPromise }: { statsPromise: Promise<DashboardStats> }) {
  const stats = use(statsPromise)
  const net7d = stats.gained7d - stats.lost7d
  const net30d = stats.gained30d - stats.lost30d

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total KOMs"
        value={stats.totalKoms.toLocaleString()}
        icon={<CrownIcon className="h-4 w-4" />}
        sub={net30d >= 0 ? `+${net30d} this month` : `${net30d} this month`}
        accent
      />
      <StatCard
        label="Gained (7d)"
        value={`+${stats.gained7d}`}
        icon={<TrendingUpIcon className="h-4 w-4" />}
        sub={`${stats.gained30d} in 30 days`}
      />
      <StatCard
        label="Lost (7d)"
        value={`-${stats.lost7d}`}
        icon={<TrendingDownIcon className="h-4 w-4" />}
        sub={`${stats.lost30d} in 30 days`}
      />
      <StatCard
        label="Net Change (7d)"
        value={net7d >= 0 ? `+${net7d}` : `${net7d}`}
        icon={<ActivityIcon className="h-4 w-4" />}
        sub={net7d >= 0 ? "Growing" : "Declining"}
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  sub,
  accent,
}: {
  label: string
  value: string
  icon: React.ReactNode
  sub: string
  accent?: boolean
}) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={accent ? "text-brand" : "text-muted-foreground"}>{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}
