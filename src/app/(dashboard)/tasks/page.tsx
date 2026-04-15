import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

type Category = {
  name: string
  className: string
}

type Task = {
  id: string
  label: string
  check: boolean
  sprint: number
  category: string
}

type Feature = {
  name: string
  items: Task[]
}

const categories: Category[] = [
  { name: "UI", className: "border-info bg-info text-info-foreground" },
  { name: "Backend", className: "border-success bg-success text-success-foreground" },
  { name: "Bug", className: "border-destructive bg-destructive text-destructive-foreground" },
  { name: "Feature", className: "border-restore bg-restore text-restore-foreground" },
]

const tasks: Feature[] = [
  {
    name: "Layout/ App-Wide",
    items: [
      { id: "bug1", check: false, label: "Mobile sidebar crashing", sprint: 2, category: "Bug" },
      { id: "bug0", check: true, label: "Table margin not fluid accross viewports", sprint: 1, category: "Bug" },
      { id: "bug2", check: false, label: "Speed up page loadtimes/ time to first info", sprint: 4, category: "Bug" },
      { id: "feat2", check: false, label: "Enable site for tour with dummy", sprint: 3, category: "Feature" },
      { id: "feat6", check: false, label: "Dialog to save home address of user in onboarding", sprint: 4, category: "Feature" },
      { id: "bug3", check: true, label: "Unstar on strava leads to discrepancy of information", sprint: 4, category: "Bug" },
      { id: "be3", check: true, label: "Effort details should be saved on all active koms", sprint: 1, category: "Backend" },
      { id: "be4", check: true, label: "Scrape Effort and Pfp Links", sprint: 1, category: "Backend" },
      { id: "ui5", check: false, label: "Rework color themes", sprint: 4, category: "UI" },
      { id: "ui6", check: false, label: "Make logo", sprint: 5, category: "UI" },
      { id: "ui7", check: false, label: "Rewrite Scraper with TypeScript + make it more robust", sprint: 5, category: "Backend" },
      { id: "bug1e", check: false, label: "Starred Segments falsely saved as actively acquired even if it's passive", sprint: 2, category: "Bug" },
    ],
  },
  {
    name: "Landing Page",
    items: [
      { id: "ui1", check: false, label: "Redesign landing page", sprint: 3, category: "UI" },
      { id: "ui2", check: false, label: "Homepage cta", sprint: 3, category: "UI" },
      { id: "ui3", check: false, label: "Move login form to a seperate page", sprint: 3, category: "UI" },
    ],
  },
  {
    name: "Dashboard",
    items: [
      { id: "dash1", check: false, label: "Lay out widget structure with placeholders", sprint: 3, category: "UI" },
      { id: "dash2", check: false, label: "Total Kom development graph", sprint: 5, category: "Feature" },
      { id: "dash3", check: false, label: "Lost since last visit widget", sprint: 5, category: "Feature" },
      { id: "dash4", check: false, label: "Current weather at location widget", sprint: 5, category: "Feature" },
    ],
  },
  {
    name: "Tables",
    items: [
      { id: "bug4", check: false, label: "Fix Star/Unstar flow", sprint: 3, category: "Bug" },
      { id: "feat1", check: false, label: "Refresh on triggered revalidation", sprint: 2, category: "Backend" },
      { id: "be1", check: true, label: "Timed revalidation for Kom Tables", sprint: 1, category: "Backend" },
      { id: "ui4", check: false, label: "Cleanup Kom Tables col spacing", sprint: 3, category: "UI" },
      { id: "feat4", check: true, label: "Make Kom Table cols toggable", sprint: 2, category: "Feature" },
      { id: "feat5", check: false, label: "Save Table col States in Cookies", sprint: 2, category: "Feature" },
      { id: "table5", check: false, label: "Date Range Picker as filter on delta table", sprint: 4, category: "Feature" },
    ],
  },
  {
    name: "Tailwind",
    items: [
      { id: "feat3", check: false, label: "Filter tables by distance to home (slider)", sprint: 1, category: "Feature" },
      { id: "tail1", check: false, label: "Display how fresh weather data is", sprint: 1, category: "Feature" },
      { id: "tail2", check: false, label: "Better structured caching of this route", sprint: 2, category: "Backend" },
    ],
  },
]

const currentSprint = 1

function CategoryLegend() {
  return (
    <div className="flex flex-wrap gap-4 mb-6">
      {categories.map((category) => (
        <div key={category.name} className="flex items-center gap-2">
          <div className={cn("h-2.5 w-2.5 rounded-full", category.className.split(" ")[1])} />
          <span className="text-xs text-muted-foreground">{category.name}</span>
        </div>
      ))}
    </div>
  )
}

function TaskItem({ task }: { task: Task }) {
  const cat = categories.find((c) => c.name === task.category)

  return (
    <div className="flex items-center gap-3 py-1.5">
      <Checkbox
        checked={task.check}
        className="h-4 w-4 rounded-sm"
      />
      <span className={cn("text-sm", task.check && "line-through text-muted-foreground")}>{task.label}</span>
      <Badge variant="outline" className="ml-auto shrink-0 text-xs font-normal">
        S{task.sprint}
      </Badge>
    </div>
  )
}

export default async function TaskList() {
  const currentSprintTasks = tasks.flatMap((feature) => feature.items.filter((task) => task.sprint === currentSprint))

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Roadmap</h1>
      <p className="mt-1 text-sm text-muted-foreground">Current sprint and backlog items.</p>

      <div className="mt-6 space-y-6">
        <div className="rounded-lg border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium">Sprint {currentSprint}</h2>
            <Badge variant="secondary" className="text-xs">{currentSprintTasks.length} items</Badge>
          </div>
          <div className="space-y-0.5">
            {currentSprintTasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        </div>

        <CategoryLegend />

        <div className="grid gap-4 md:grid-cols-2">
          {tasks.map((feature) => (
            <div key={feature.name} className="rounded-lg border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-medium">{feature.name}</h2>
                <Badge variant="secondary" className="text-xs">{feature.items.length}</Badge>
              </div>
              <div className="space-y-0.5">
                {feature.items.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
