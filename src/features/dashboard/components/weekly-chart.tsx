"use client"

import { use } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { WeeklyActivity } from "../server/queries"

const chartConfig = {
  gained: {
    label: "Gained",
    color: "hsl(var(--success))",
  },
  lost: {
    label: "Lost",
    color: "hsl(var(--destructive))",
  },
} satisfies ChartConfig

export function WeeklyChart({ dataPromise }: { dataPromise: Promise<WeeklyActivity[]> }) {
  const data = use(dataPromise)

  if (data.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
        No activity data yet.
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-[250px] w-full">
      <BarChart data={data} margin={{ left: -20, right: 4 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} allowDecimals={false} />
        <ChartTooltip
          cursor={false}
          content={(p) => <ChartTooltipContent {...(p as any)} />}
        />
        <Bar dataKey="gained" fill="var(--color-gained)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="lost" fill="var(--color-lost)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
