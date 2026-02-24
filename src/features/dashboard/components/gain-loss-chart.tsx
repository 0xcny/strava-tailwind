"use client"

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
const chartData = [
  { month: "KW17", gained: 3, lost: 2 },
  { month: "KW18", gained: 4, lost: 0 },
  { month: "KW19", gained: 2, lost: 3 },
  { month: "KW20", gained: 0, lost: 0 },
  { month: "KW21", gained: 2, lost: 2 },
  { month: "KW22", gained: 5, lost: 1 },
]

const chartConfig = {
  gained: {
    label: "Gained",
    color: "hsl(var(--chart-1))",
  },
  lost: {
    label: "Lost",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export function GainLossChart() {
  return (
    <Card className="col-span-12 lg:col-span-6 xl:col-span-6">
      <CardHeader>
        <CardTitle>Bar Chart - Stacked + Legend</CardTitle>
        <CardDescription>January - June 2024</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
  cursor={false}
  content={(p) => <ChartTooltipContent {...(p as any)} hideLabel />}
/>

            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="lost" stackId="a" fill="var(--color-lost)" radius={[0, 0, 4, 4]} />
            <Bar dataKey="gained" stackId="a" fill="var(--color-gained)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
