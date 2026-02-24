"use client"

import { Loader } from "lucide-react"
import { Area, AreaChart, CartesianGrid, ReferenceDot, XAxis, YAxis } from "recharts"

import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { use } from "react"

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export function TotalKomChart({
  chartDataPromise,
}: {
  chartDataPromise: Promise<{ date: string; desktop: number }[]>
}) {
  const chartData = use(chartDataPromise)
  return (
    <ChartContainer config={chartConfig} className="h-56 md:h-80 lg:h-[400px] w-full">
      <AreaChart margin={{ left: -20 }} accessibilityLayer data={chartData} height={200}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" dy={5} tickMargin={5} tickLine={false} axisLine={false} tickFormatter={formatDateAxis} />
        <YAxis
          type="number"
          tickFormatter={(value) => value.toLocaleString()}
          domain={["dataMin - 100", "dataMax + 100"]}
          tickCount={7}
        />
        <ChartTooltip
  cursor={false}
  content={(p) => <ChartTooltipContent {...(p as any)} hideLabel />}

/>
        <defs>
          <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-desktop)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--color-desktop)" stopOpacity={0.1} />
          </linearGradient>
        </defs>

        <Area
          dataKey="desktop"
          type="natural"
          fill="url(#fillDesktop)"
          fillOpacity={0.4}
          stroke="var(--color-desktop)"
        />
      </AreaChart>
    </ChartContainer>
  )
}

export function TotalKomChartLoading() {
  const test1 = (
    <ChartContainer config={chartConfig} className="h-56 md:h-80 lg:h-[400px] w-full">
      <AreaChart margin={{ left: -20 }} accessibilityLayer height={200}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickMargin={5} tickLine={false} axisLine={false} tickFormatter={formatDateAxis} />
        <YAxis type="number" tickFormatter={(value) => value.toLocaleString()} domain={[0, 100]} tickCount={5} />
      </AreaChart>
    </ChartContainer>
  )
  const test2 = (
    <div className="h-[400px] w-full flex items-center justify-center">
      <Loader className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
  return test1
}

function formatDateAxis(tickItem: string) {
  const dateSplit = new Date(tickItem).toDateString().slice(4).split(" ")
  return dateSplit[0] + " " + dateSplit[2].slice(2)
}
