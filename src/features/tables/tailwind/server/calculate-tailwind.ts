import { Coordinate, Line, TailwindTableSegment } from "@/lib/types/types"
import { getCenter } from "geolib"
import { cachedMeteoRequest } from "./meteo-request"

/**
 * Calculates tailwind metrics for route segments using deterministic coordinate-based
 * clustering to ensure consistent cache hits
 *
 * @param segments - Array of tailwind table segments with path data
 * @returns Object containing processed segments with wind data and count of weather API requests made
 */
export async function calculateTailwind(segments: (TailwindTableSegment & { path: Line[] })[]) {
  const results: TailwindTableSegment[] = []

  // Grid size in degrees (approximately)
  // 0.05 degrees is roughly 5.5 km TODO finetune
  const GRID_SIZE_DEGREES = 0.05

  function getGridKey(coord: Coordinate): string {
    const gridLat = Math.floor(coord.lat / GRID_SIZE_DEGREES) * GRID_SIZE_DEGREES
    const gridLon = Math.floor(coord.lon / GRID_SIZE_DEGREES) * GRID_SIZE_DEGREES
    return `${gridLat.toFixed(4)},${gridLon.toFixed(4)}`
  }

  // Map to store unique grid cells and their representative coordinates
  const gridMap = new Map<string, Coordinate>()

  // First pass: map lines to grid cells
  segments.forEach((segment) => {
    const path: (Line & { gridKey?: string })[] = segment.path
    for (const line of path) {
      const midpoint = getCenter([line.start, line.end])
      if (!midpoint) throw new Error("Could not calculate midpoint")

      const formattedMidpoint: Coordinate = {
        lat: midpoint.latitude,
        lon: midpoint.longitude,
      }

      const gridKey = getGridKey(formattedMidpoint)
      line.gridKey = gridKey

      //TODO calc diagonal midpoint of grid as refrence point instead of random point
      if (!gridMap.has(gridKey)) {
        gridMap.set(gridKey, formattedMidpoint)
      }
    }
  })

  // Second pass: fetch weather data for each grid cell
  const weatherPromises = Array.from(gridMap.entries()).map(([gridKey, coordinate]) => {
    return cachedMeteoRequest(coordinate, gridKey).then((result) => ({
      gridKey,
      weatherData: result,
    }))
  })

  const weatherResults = await Promise.all(weatherPromises)

  // Helper map for looking up weather data by grid key
  const weatherDataMap = new Map(weatherResults.map(({ gridKey, weatherData }) => [gridKey, weatherData]))

  segments.forEach((segment) => {
    const path: (Line & { gridKey?: string })[] = segment.path
    let tailAbs = 0,
      crossAbs = 0,
      headAbs = 0,
      aggregateWindspeed = 0,
      aggregateDistance = 0

    for (let i = 0; i < path.length; i++) {
      const line = path[i]

      const weatherData = weatherDataMap.get(line.gridKey!)
      if (!weatherData) {
        continue
      }

      aggregateDistance += line.distance

      // Circular degree calculation
      const rawAngleDiff = line.bearing - weatherData.current.windDirection10m
      const angleDifference = Math.min(360 - Math.abs(rawAngleDiff), Math.abs(rawAngleDiff))

      // Calculate the wind component
      const windSpeed = weatherData.current.windSpeed10m

      if (angleDifference >= 135) {
        tailAbs += line.distance
        aggregateWindspeed += line.distance * windSpeed
      } else if (angleDifference >= 45) {
        crossAbs += line.distance
      } else {
        headAbs += line.distance
      }

      line.windDirection = angleDifference
    }

    const tail = aggregateDistance > 0 ? (tailAbs / aggregateDistance) * 100 : 0
    const cross = aggregateDistance > 0 ? (crossAbs / aggregateDistance) * 100 : 0
    const head = aggregateDistance > 0 ? (headAbs / aggregateDistance) * 100 : 0
    const avgTailwindSpeed = tailAbs > 0 ? aggregateWindspeed / tailAbs : 0

    const { path: _, ...rest } = segment
    results.push({
      ...rest,
      wind: {
        tail,
        cross,
        head,
        avgTailwindSpeed,
      },
    })
  })

  return { results }
}
