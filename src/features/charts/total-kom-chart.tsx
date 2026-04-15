"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { use } from "react"

const chartConfig = {
  total: {
    label: "Total KOMs",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export function TotalKomChart({
  chartDataPromise,
}: {
  chartDataPromise: Promise<{ date: string; total: number }[]>
}) {
  const chartData = use(chartDataPromise)
  return (
    <ChartContainer config={chartConfig} className="h-[250px] w-full">
      <AreaChart margin={{ left: -20, right: 4 }} data={chartData}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickFormatter={formatDateAxis} tick={{ fontSize: 12 }} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => value.toLocaleString()}
          domain={["dataMin - 50", "dataMax + 50"]}
          tick={{ fontSize: 12 }}
        />
        <ChartTooltip
          cursor={false}
          content={(p) => <ChartTooltipContent {...(p as any)} hideLabel />}
        />
        <defs>
          <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          dataKey="total"
          type="monotone"
          fill="url(#fillTotal)"
          stroke="var(--color-total)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )
}

function formatDateAxis(tickItem: string) {
  const d = new Date(tickItem)
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
}
