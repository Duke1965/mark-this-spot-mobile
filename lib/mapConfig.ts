/**
 * Map Provider Configuration
 * Supports switching between Mapbox and TomTom map providers
 */

export type MapProvider = "mapbox" | "tomtom"

// Get map provider from environment variable, default to "mapbox" for backward compatibility
export const MAP_PROVIDER: MapProvider = 
  (process.env.NEXT_PUBLIC_MAP_PROVIDER as MapProvider) || "mapbox"

// API Keys
export const MAPBOX_API_KEY = process.env.NEXT_PUBLIC_MAPBOX_API_KEY || ""
export const TOMTOM_API_KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || ""

// Validate configuration
export function validateMapConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (MAP_PROVIDER === "tomtom" && !TOMTOM_API_KEY) {
    errors.push("TomTom API key is required when MAP_PROVIDER=tomtom")
    console.warn("⚠️ TomTom API key missing. Set NEXT_PUBLIC_TOMTOM_API_KEY in your environment variables.")
  }

  if (MAP_PROVIDER === "mapbox" && !MAPBOX_API_KEY) {
    errors.push("Mapbox API key is required when MAP_PROVIDER=mapbox")
    console.warn("⚠️ Mapbox API key missing. Set NEXT_PUBLIC_MAPBOX_API_KEY in your environment variables.")
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// Log current configuration (only in browser)
if (typeof window !== "undefined") {
  const config = validateMapConfig()
  if (config.valid) {
    console.log(`🗺️ Map Provider: ${MAP_PROVIDER}`)
  } else {
    console.error("❌ Map configuration errors:", config.errors)
  }
}

