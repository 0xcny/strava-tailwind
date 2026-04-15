export interface Line {
  start: Coordinate
  end: Coordinate
  distance: number
  bearing: number
  clusterId?: number
  windDirection?: number
}

export type Coordinate = {
  lat: number
  lon: number
}

export type Status = "gained" | "claimed" | "lost" | "deleted" | "created" | "restored"

export type Label =
  | "Hazardous"
  | "Circuit"
  | "Curvy"
  | "Straight"
  | "Climb"
  | "Downhill"
  | "Overlong"
  | "Contested"
  | "Uncontested"

export type WeatherResponse = {
  tail: number
  cross: number
  head: number
  avgTailwindSpeed: number
}

export interface BaseTableSegment {
  segment_id: number
  name: string
  city: string
  has_kom: boolean
  is_starred: boolean
  distance: number
  average_grade: number
  labels?: Label[]
}

export interface DeltaTableSegment extends BaseTableSegment {
  status?: Status
  created?: Date
}

export interface TailwindTableSegment extends BaseTableSegment {
  leader_qom?: string | null
  wind?: WeatherResponse
}

