"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "../_components/table"
import { getTotalKoms } from "./server/queries"
import { useDataTable } from "../_hooks/use-data-table"
import { TableToolbar } from "../_components/table-toolbar"
import { BaseTableSegment } from "@/lib/types/types"
import { createBaseColumns } from "../_lib/shared-columns"
import { createFilterFields } from "../_lib/filter-fields"

interface TableProps {
  dataPromise: ReturnType<typeof getTotalKoms>
}

export function TotalTable({ dataPromise }: TableProps) {
  const { data, pageCount } = React.use(dataPromise)

  // Memoize the columns so they don't re-render on every render
  const columns: ColumnDef<BaseTableSegment>[] = React.useMemo(() => {
    return createBaseColumns<BaseTableSegment>()
  }, [])

  const filterFields = createFilterFields<BaseTableSegment>()

  const columnVisibility = {
    name: true,
    city: true,
    terrain: true,
    labels: false,
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
      sorting: [{ id: "name", desc: true }],
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
