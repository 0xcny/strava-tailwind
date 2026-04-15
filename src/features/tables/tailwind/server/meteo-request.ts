"use server"

import { Coordinate } from "@/lib/types/types"
import { unstable_cache as next_unstable_cache } from "next/cache"
import { fetchWeatherApi } from "openmeteo"

/**
 * Fetches and caches weather data from the Open-Meteo API
 *
 * @param coord - Coordinate object containing latitude and longitude
 * @param gridKey - cache key
 * @returns Weather data object with current conditions
 *   - current: Object containing current weather measurements
 *     - time: Date object representing the time of measurement
 *     - temperature2m: Temperature in degrees Celsius at 2 meters above ground
 *     - weatherCode: Numerical code representing weather conditions
 *     - windSpeed10m: Wind speed in m/s at 10 meters above ground
 *     - windDirection10m: Wind direction in degrees at 10 meters above ground
 *     - windGusts10m: Wind gust speed in m/s at 10 meters above ground
 *
 * Uses Next.js cache with a revalidation period to minimize
 * API requests. Cache misses are logged to the console.
 */

export async function cachedMeteoRequest(coord: Coordinate, gridKey: string) {
  return await next_unstable_cache(
    async () => {
      const params = {
        latitude: coord.lat,
        longitude: coord.lon,
        current: ["temperature_2m", "weather_code", "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m"],
        timezone: "Europe/Berlin",
        forecast_days: 1,
      }
      const url = "https://api.open-meteo.com/v1/forecast"
      const responses = await fetchWeatherApi(url, params)
      const response = responses[0]
      const utcOffsetSeconds = response.utcOffsetSeconds()
      const current = response.current()!

      // Note: The order of weather variables in the URL query and the indices below need to match!
      return {
        current: {
          time: new Date((Number(current.time()) + utcOffsetSeconds) * 1000),
          temperature2m: current.variables(0)!.value(),
          weatherCode: current.variables(1)!.value(),
          windSpeed10m: current.variables(2)!.value(),
          windDirection10m: current.variables(3)!.value(),
          windGusts10m: current.variables(4)!.value(),
        },
      }
    },
    [gridKey],
    {
      revalidate: 600,
      tags: ["meteo-requests"],
    }
  )()
}
