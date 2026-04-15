"use client"

import { use } from "react"
import {
  CrownIcon,
  CircleXIcon,
  PencilLineIcon,
  RotateCwIcon,
  MedalIcon,
  ExternalLinkIcon,
} from "lucide-react"
import { RecentChange } from "../server/queries"
import { Status } from "@/lib/types/types"
import { cn } from "@/lib/utils"

const statusConfig: Record<Status, { icon: React.ElementType; color: string; label: string }> = {
  gained: { icon: MedalIcon, color: "text-success", label: "Gained" },
  created: { icon: PencilLineIcon, color: "text-info", label: "Created" },
  restored: { icon: RotateCwIcon, color: "text-success", label: "Restored" },
  lost: { icon: CircleXIcon, color: "text-destructive", label: "Lost" },
  deleted: { icon: CircleXIcon, color: "text-muted-foreground", label: "Deleted" },
  claimed: { icon: CrownIcon, color: "text-warning", label: "Claimed" },
}

export function RecentActivity({ changesPromise }: { changesPromise: Promise<RecentChange[]> }) {
  const changes = use(changesPromise)

  if (changes.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-medium">Recent Activity</h3>
        <p className="mt-4 text-center text-sm text-muted-foreground">No recent changes.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b px-5 py-3">
        <h3 className="text-sm font-medium">Recent Activity</h3>
      </div>
      <div className="divide-y">
        {changes.map((change, i) => {
          const config = statusConfig[change.status] ?? statusConfig.lost
          const Icon = config.icon
          const date = new Date(change.created)
          const relative = formatRelative(date)

          return (
            <div key={`${change.segmentId}-${i}`} className="flex items-center gap-3 px-5 py-3">
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted", config.color)}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-medium">{change.segmentName}</p>
                  <a
                    href={`https://www.strava.com/segments/${change.segmentId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLinkIcon className="h-3 w-3" />
                  </a>
                </div>
                <p className="text-xs text-muted-foreground">
                  {change.city && `${change.city} · `}
                  <span className={config.color}>{config.label}</span>
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{relative}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatRelative(date: Date): string {
  const now = Date.now()
  const diff = now - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
