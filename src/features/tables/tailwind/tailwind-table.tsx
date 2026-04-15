"use client"

import { useState, useEffect, useMemo } from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"
import { Check, Loader, AlertCircle, WindIcon } from "lucide-react"
import { TailwindTableSegment } from "@/lib/types/types"
import { DataTable } from "../_components/table"
import { TableToolbar } from "../_components/table-toolbar"
import { createBaseColumns } from "../_lib/shared-columns"
import { createFilterFields } from "../_lib/filter-fields"
import { tailwindTableColumns } from "./columns"
import { Process, StatusState } from "./types"
import { cn } from "@/lib/utils"

export default function TailwindTable() {
  const [status, setStatus] = useState<StatusState>({ step: "fetch" })
  const [segments, setSegments] = useState<TailwindTableSegment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    name: true,
    city: true,
    terrain: false,
    labels: false,
    tailwind: true,
    actions: true,
  })
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])

  const processes: Process[] = [
    { id: "fetch", name: "Fetching Starred Segments", description: "Retrieving your starred segments from Strava" },
    { id: "process", name: "Processing Segments", description: "Analyzing cached and newly fetched segment data" },
    { id: "update", name: "Updating Cache", description: "Syncing new segments to database" },
    { id: "weather", name: "Calculating Tailwind", description: "Computing wind metrics for each segment" },
  ]

  const columns: ColumnDef<TailwindTableSegment>[] = useMemo(() => {
    const baseColumns = createBaseColumns<TailwindTableSegment>()
    return [...baseColumns, ...tailwindTableColumns]
  }, [])

  const filterFields = createFilterFields<TailwindTableSegment>()

  useEffect(() => {
    if (status.step === "fetch") setCurrentStep(0)
    else if (status.step === "process") setCurrentStep(1)
    else if (status.step === "update") setCurrentStep(2)
    else if (status.step === "weather") setCurrentStep(3)
    else if (status.step === "complete") setCurrentStep(4)
  }, [status.step])

  useEffect(() => {
    const eventSource = new EventSource("/api/tailwind")

    eventSource.addEventListener("status", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as StatusState
      setStatus(data)
      if (data.step === "complete" && data.data?.segments) {
        setSegments(data.data.segments)
        setLoading(false)
        eventSource.close()
      }
    })

    eventSource.addEventListener("error", (event) => {
      try {
        JSON.parse((event as MessageEvent).data)
      } catch {}
      setError("An error occurred while loading tailwind data.")
      setLoading(false)
      eventSource.close()
    })

    eventSource.onerror = () => {
      setError("Connection lost. Please refresh to try again.")
      setLoading(false)
      eventSource.close()
    }

    return () => eventSource.close()
  }, [])

  const table = useReactTable({
    data: segments,
    columns,
    initialState: {
      columnOrder: Object.keys(columnVisibility),
      pagination: { pageSize: 30 },
      sorting: [{ id: "tailwind", desc: true }],
    },
    state: { columnVisibility, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <>
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="mx-auto w-full max-w-lg space-y-3 py-8">
          {processes.map((process, index) => {
            const isComplete = currentStep > index
            const isActive = currentStep === index
            return (
              <div
                key={process.id}
                className={cn(
                  "flex items-center gap-4 rounded-lg border p-4 transition-all",
                  isComplete && "border-success/30 bg-success/5",
                  isActive && "border-brand/30 bg-brand/5",
                  !isComplete && !isActive && "border-border bg-card opacity-50"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    isComplete && "bg-success text-success-foreground",
                    isActive && "bg-brand text-brand-foreground",
                    !isComplete && !isActive && "bg-muted text-muted-foreground"
                  )}
                >
                  {isComplete ? (
                    <Check className="h-4 w-4" />
                  ) : isActive ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="text-xs font-medium">{index + 1}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-none">{process.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{process.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && !error && segments.length > 0 && (
        <DataTable table={table}>
          <TableToolbar table={table} filterFields={filterFields} />
        </DataTable>
      )}

      {!loading && !error && segments.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <WindIcon className="h-8 w-8 text-muted-foreground/50" />
          <div>
            <p className="font-medium">No starred segments</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Star some segments on Strava and they'll appear here with tailwind analysis.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
