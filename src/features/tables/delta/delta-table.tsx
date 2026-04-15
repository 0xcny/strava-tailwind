"use client"

import * as React from "react"

import { ColumnDef } from "@tanstack/react-table"
import { DeltaTableSegment } from "@/lib/types/types"
import { DataTable } from "../_components/table"
import { getDeltaSegments } from "./server/queries"
import { useDataTable } from "../_hooks/use-data-table"
import { TableToolbar } from "../_components/table-toolbar"
import { createBaseColumns } from "../_lib/shared-columns"
import { createFilterFields } from "../_lib/filter-fields"
import { deltaTableColumns } from "./columns"

interface DeltaTableProps {
  dataPromise: ReturnType<typeof getDeltaSegments>
}

export function DeltaTable({ dataPromise }: DeltaTableProps) {
  const { data, pageCount } = React.use(dataPromise)

  // Memoize the columns so they don't re-render on every render
  const columns: ColumnDef<DeltaTableSegment>[] = React.useMemo(() => {
    const baseColumns = createBaseColumns<DeltaTableSegment>()
    return [...baseColumns, ...deltaTableColumns]
  }, [])

  const filterFields = createFilterFields<DeltaTableSegment>()

  const columnVisibility = {
    name: true,
    city: true,
    terrain: false,
    labels: false,
    status: true,
    created: true,
    actions: true,
  }
  const columnOrder = Object.keys(columnVisibility)

  const { table } = useDataTable({
    data,
    columns,
    pageCount,
    filterFields,
    initialState: {
      columnOrder,
      columnVisibility,
      sorting: [{ id: "created", desc: true }],
      columnPinning: { right: ["actions"] },
    },
    shallow: false,
    clearOnDefault: true,
  })

  return (
    <DataTable table={table}>
      <TableToolbar table={table} filterFields={filterFields} />
    </DataTable>
  )
}
