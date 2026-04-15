export type TableId = "delta" | "total" | "tailwind"

// Define column IDs for each table type
export type DeltaColumnId = "name" | "city" | "terrain" | "labels" | "status" | "created" | "actions"
export type TotalColumnId = "star" | "name" | "city" | "terrain" | "labels" | "actions"
export type TailwindColumnId = "kom" | "name" | "city" | "terrain" | "labels" | "tailwind" | "actions"

// Type for column IDs indexed by table ID
export type ColumnIdByTable = {
  delta: DeltaColumnId
  total: TotalColumnId
  tailwind: TailwindColumnId
}

// Helper type to get column ID based on table ID
export type ColumnId<T extends TableId> = ColumnIdByTable[T]

// Filter type definition
export type FilterConfig = {
  column: string
  value: string
}

// Table settings interface
export interface TableSettings<T extends TableId> {
  filters: FilterConfig[]
  visibility: Record<ColumnId<T>, boolean>
  sort: {
    id: ColumnId<T>
    desc: boolean
  }
  pageSize: number
}

// Default table settings
export const DEFAULT_TABLE_SETTINGS: {
  [K in TableId]: TableSettings<K>
} = {
  delta: {
    filters: [],
    visibility: {
      name: true,
      city: true,
      terrain: false,
      labels: false,
      status: true,
      created: true,
      actions: true,
    },
    sort: {
      id: "created",
      desc: true,
    },

    pageSize: 30,
  },
  total: {
    filters: [],
    visibility: {
      star: true,
      name: true,
      city: true,
      terrain: false,
      labels: false,
      actions: true,
    },
    sort: {
      id: "city",
      desc: false,
    },

    pageSize: 10,
  },
  tailwind: {
    filters: [],
    visibility: {
      kom: true,
      name: true,
      city: true,
      terrain: false,
      labels: false,
      tailwind: true,
      actions: true,
    },
    sort: {
      id: "tailwind",
      desc: true,
    },

    pageSize: 10,
  },
} as const
