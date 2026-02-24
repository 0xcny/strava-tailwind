"use client"

import { TrendingUp } from "lucide-react"
import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
const chartData = [{ month: "january", lost: 3, active: 21, passive: 4 }]

const chartConfig = {
  lost: {
    label: "Lost",
    color: "hsl(var(--destructive))",
  },
  active: {
    label: "Active",
    color: "hsl(var(--secondary))",
  },
  passive: {
    label: "Passive",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

export function StatusChart() {
  const totalVisitors = 200

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Radial Chart - Stacked</CardTitle>
        <CardDescription>January - June 2024</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-center pb-0">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square w-full max-w-[250px]">
          <RadialBarChart data={chartData} endAngle={180} innerRadius={80} outerRadius={130}>
<ChartTooltip
  cursor={false}
  content={(p) => <ChartTooltipContent {...(p as any)} hideLabel />}
/>

            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                        <tspan x={viewBox.cx} y={(viewBox.cy || 0) - 16} className="fill-foreground text-2xl font-bold">
                          {totalVisitors.toLocaleString()}
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 4} className="fill-muted-foreground">
                          Visitors
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </PolarRadiusAxis>
            <RadialBar
              dataKey="active"
              fill="var(--color-active)"
              stackId="a"
              className="stroke-transparent stroke-2"
              cornerRadius={5}
            />
            <RadialBar
              dataKey="passive"
              fill="var(--color-passive)"
              stackId="a"
              className="stroke-transparent stroke-2"
              cornerRadius={5}
            />
            <RadialBar
              dataKey="lost"
              stackId="a"
              fill="var(--color-lost)"
              className="stroke-transparent stroke-2"
              cornerRadius={5}
            />
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none">
          Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">Showing total visitors for the last 6 months</div>
      </CardFooter>
    </Card>
  )
}
