/**
 * Simple geohash utility for cache key generation
 * Avoids external dependencies by using string rounding
 */

/**
 * Create a coarse key from lat/lng using string rounding
 * @param lat Latitude
 * @param lng Longitude
 * @param precision Number of decimal places (default: 5)
 * @returns Coarse key string like "51.50000|-0.12000"
 */
export function coarseKey(lat: number, lng: number, precision: number = 5): string {
  return `${lat.toFixed(precision)}|${lng.toFixed(precision)}`
}

