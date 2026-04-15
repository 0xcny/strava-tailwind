import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getGreatCircleBearing, getPreciseDistance } from "geolib"
import polyline from "@mapbox/polyline"
import { THRESHOLD } from "./constants"
import { Line, Label, Coordinate } from "./types/types"
import { SegmentRecord } from "./types/pocketbase-types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const asError = (thrown: unknown): Error => {
  if (thrown instanceof Error) return thrown
  try {
    return new Error(JSON.stringify(thrown))
  } catch {
    return new Error(String(thrown))
  }
}

/**
 * Classifies a segment according to predefinded metrics
 *
 * @param {DetailedSegment} segment
 * @returns {Label[]} A maximum of 2 classifications for the given segment
 */

export const getLabel = (segment: any): Label[] => {
  const classification: Label[] = []
  if (segment.hazardous) classification.push("Hazardous")
  if (getPreciseDistance(segment.start_latlng, segment.end_latlng) <= THRESHOLD.CIRCUIT) classification.push("Circuit")
  const { path } = segment
  let aggregateDistance = path[0].distance
  let maxBearingChange = 0

  for (let i = 1; i < path.length; i++) {
    const previousPath = path[i - 1]
    const currentPath = path[i]

    const bearingChange = Math.abs(currentPath.bearing - previousPath.bearing)
    const adjustedChange = bearingChange > 180 ? 360 - bearingChange : bearingChange

    aggregateDistance += currentPath.distance
    maxBearingChange = Math.max(maxBearingChange, adjustedChange)
  }
  //const averageBearingChange = weightedBearingChange / aggregateDistance
  const curveAmount = pathCurveAmount(segment.path)
  if (curveAmount >= 3 && curveAmount / aggregateDistance > THRESHOLD.CURVY / 1000) {
    classification.push("Curvy")
  } else if (maxBearingChange < THRESHOLD.STRAIGHT) {
    classification.push("Straight")
  }
  const date = new Date(segment.created_at)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const daysSinceCreation = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
  if (segment.effort_count / daysSinceCreation <= THRESHOLD.UNCONTESTED) classification.push("Uncontested")
  else if (segment.effort_count >= THRESHOLD.CONTESTED) classification.push("Contested")
  if (segment.average_grade > THRESHOLD.CLIMB) classification.push("Climb")
  else if (segment.average_grade < THRESHOLD.DOWNHILL) classification.push("Downhill")
  if (segment.distance > THRESHOLD.OVERLONG) classification.push("Overlong")
  return classification
}

const pathCurveAmount = (path: Line[], angleThreshold = 60): number => {
  const maxCurveLength = 50 // m
  let curveAmount = 0
  let currentCurveDist = 0
  let avgWeightedBearing = 0

  const smoothedPath = path //smoothBearings(path)
  for (let i = 0; i < smoothedPath.length - 1; i++) {
    const initialBearing = smoothedPath[i].bearing
    let j = i + 1
    while (j < smoothedPath.length - 1 && currentCurveDist < maxCurveLength) {
      const bearingChange = Math.abs(initialBearing - smoothedPath[j].bearing)
      avgWeightedBearing += (bearingChange > 180 ? 360 - bearingChange : bearingChange) * smoothedPath[j].distance
      currentCurveDist += smoothedPath[j].distance
      j++
    }
    avgWeightedBearing = avgWeightedBearing / currentCurveDist
    if (avgWeightedBearing > angleThreshold) {
      i = j - 1
      curveAmount++
    }
    currentCurveDist = 0
    avgWeightedBearing = 0
  }
  return curveAmount
}

/**
 * Takes a polyline and transforms it into an array of lines
 *
 * @param {string} polyline - The polyline of a segment.
 * @returns {Line []} Array of line forming a path.
 */

export const getPath = (encodedPolyline: string) => {
  const path: Line[] = []
  const coordPairs: [number, number][] = polyline.decode(encodedPolyline)
  const formattedCoords: Coordinate[] = coordPairs.map((n) => ({ lat: n[0], lon: n[1] }))

  for (let i = 1; i < coordPairs.length; i++) {
    path.push({
      start: formattedCoords[i - 1],
      end: formattedCoords[i],
      distance: getPreciseDistance(formattedCoords[i - 1], formattedCoords[i]),
      bearing: getGreatCircleBearing(formattedCoords[i - 1], formattedCoords[i]),
    })
  }
  return path
}

// TODO zod
export const sanitizeSegment = (obj: any): SegmentRecord => {
  const getValue = (value: any, fallback: any = null) => value || fallback

  return {
    activity_type: getValue(obj.activity_type),
    athlete_count: getValue(obj.athlete_count),
    average_grade: getValue(obj.average_grade),
    city: obj.city ? obj.city : "-",
    climb_category: getValue(obj.climb_category) == null ? 0 : getValue(obj.climb_category),
    country: obj.country ? obj.country : "-",
    created_at: getValue(obj.created_at),
    distance: getValue(obj.distance),
    effort_count: getValue(obj.effort_count),
    end: getValue({ lat: obj.end_latlng[0], lon: obj.end_latlng[1] }),
    hazardous: getValue(obj.hazardous, false),
    labels: getValue(obj.labels),
    leader_kom: getValue(obj.xoms?.kom),
    leader_overall: getValue(obj.xoms?.overall),
    leader_qom: getValue(obj.xoms?.qom),
    local_legend_athlete_id: getValue(obj.local_legend?.athlete_id),
    maximum_grade: getValue(obj.maximum_grade),
    name: obj.name ? obj.name : "-",
    path: getValue(obj.path),
    polyline: getValue(obj.map?.polyline),
    profile_url_dark: getValue(obj.elevation_profiles?.dark_url),
    profile_url_light: getValue(obj.elevation_profiles?.light_url),
    segment_id: getValue(obj.id),
    star_count: getValue(obj.star_count),
    start: getValue({ lat: obj.start_latlng[0], lon: obj.start_latlng[1] }),
    state: obj.state ? obj.state : "-",
    total_elevation_gain: getValue(obj.total_elevation_gain),
  }
}
