/**
 * Map Provider Configuration
 * PINIT supports Mapbox and Apple Maps
 */

export type MapProvider = "mapbox" | "apple"

// Map provider from environment variable, defaults to mapbox
export const MAP_PROVIDER: MapProvider = (process.env.NEXT_PUBLIC_MAP_PROVIDER as MapProvider) || "mapbox"

// API Keys
export const MAPBOX_API_KEY = process.env.NEXT_PUBLIC_MAPBOX_API_KEY || ""

// Validate configuration
// Note: For Apple MapKit, we cannot check server-only env vars on the client.
// Client should validate by fetching /api/mapkit-token instead.
export function validateMapConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (MAP_PROVIDER === "mapbox") {
    if (!MAPBOX_API_KEY) {
      errors.push("Mapbox API key is required. Set NEXT_PUBLIC_MAPBOX_API_KEY in your environment variables.")
      console.warn("⚠️ Mapbox API key missing. Set NEXT_PUBLIC_MAPBOX_API_KEY in your environment variables.")
    }
  }
  // Note: Apple MapKit validation cannot be done client-side (server env vars not available).
  // Validation should be done by testing /api/mapkit-token endpoint instead.

  return {
    valid: errors.length === 0,
    errors
  }
}

// Log current configuration (only in browser)
// For Apple MapKit, we don't validate env vars here since they're server-only.
// The token endpoint will handle validation and errors.
if (typeof window !== "undefined") {
  const config = validateMapConfig()
  if (config.valid || MAP_PROVIDER === "apple") {
    console.log(`🗺️ Map Provider: ${MAP_PROVIDER}`)
  } else {
    console.error("❌ Map configuration errors:", config.errors)
  }
}

