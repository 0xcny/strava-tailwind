import { BaseTableSegment, Label } from "@/lib/types/types"
import { ColumnDef } from "@tanstack/react-table"
import { TableColumnHeader } from "../_components/table-column-header"
import LabelsTooltip from "../_components/label-tooltip"
import { Badge } from "@/components/ui/badge"
import { ChevronsLeftRightEllipsisIcon, MountainIcon } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { TableRowActions } from "../_components/table-row-action"

export function createBaseColumns<T extends BaseTableSegment>(): ColumnDef<T>[] {
  return [
    {
      id: "name",
      accessorKey: "name",
      filterFn: (row, id: string, filterValue: string) =>
        row.original.name.toLowerCase().includes(filterValue.toLowerCase()) ||
        row.original.city.toLowerCase().includes(filterValue.toLowerCase()),
      header: ({ column }) => <TableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => {
        const labels = row.original.labels
        const name = row.original.name

        return (
          <div className="min-w-[250px] flex flex-wrap gap-2 items-center md:flex-nowrap">
            {labels && labels.length > 0 && <LabelsTooltip labels={labels} />}
            <div className="xl:flex hidden flex-wrap gap-2 ">
              {labels &&
                labels.map((c: Label) => (
                  <Badge
                    key={c}
                    variant="secondary"
                    className="text-xs font-normal"
                  >
                    {c}
                  </Badge>
                ))}
            </div>

            <span className="font-medium">{name}</span>
          </div>
        )
      },
    },
    {
      id: "labels",
      accessorKey: "labels",
      header: ({ column }) => null,
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue || filterValue.length === 0) return true
        const labels = row.getValue(columnId)
        if (!labels || !Array.isArray(labels)) return false

        // Check if any of the selected filter values exist in the row's labels
        return filterValue.some((filter: Label) => labels.includes(filter))
      },
      cell: ({ row }) => null,
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "city",
      accessorKey: "city",
      header: ({ column }) => <TableColumnHeader column={column} title="City" />,
      cell: ({ row }) => {
        return <span>{row.original.city}</span>
      },
    },
    {
      id: "terrain",
      accessorKey: "average_grade",
      header: ({ column }) => <TableColumnHeader column={column} title="Terrain" />,
      cell: ({ row }) => {
        let distance = Math.round(row.original.distance) + "m"
        if (distance.length > 4) distance = Math.round(row.original.distance / 100) / 10 + "km"
        return (
          <div className="flex space-x-2 items-center">
            <ChevronsLeftRightEllipsisIcon className="h-4 w-4 text-muted-foreground" />
            <span>{distance}</span>
            <Separator orientation="vertical" className="h-4" />
            <MountainIcon className="h-3 w-3 text-muted-foreground" />
            <span>{row.original.average_grade}%</span>
          </div>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => <TableRowActions row={row} />,
      enableSorting: false,
      enableHiding: false,
    },
  ]
}
