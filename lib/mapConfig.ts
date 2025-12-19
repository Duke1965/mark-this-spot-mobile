/**
 * Map Provider Configuration
 * PINIT uses Mapbox as the primary map provider
 */

export type MapProvider = "mapbox"

// Map provider is always Mapbox (TomTom has been removed)
export const MAP_PROVIDER: MapProvider = "mapbox"

// API Keys
export const MAPBOX_API_KEY = process.env.NEXT_PUBLIC_MAPBOX_API_KEY || ""

// Validate configuration
export function validateMapConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!MAPBOX_API_KEY) {
    errors.push("Mapbox API key is required. Set NEXT_PUBLIC_MAPBOX_API_KEY in your environment variables.")
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

