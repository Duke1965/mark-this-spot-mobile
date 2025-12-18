/**
 * Map Provider Configuration
 * PINIT uses TomTom as the primary map provider
 */

export type MapProvider = "tomtom"

// Map provider is always TomTom (Mapbox has been removed)
export const MAP_PROVIDER: MapProvider = "tomtom"

// API Keys
export const TOMTOM_API_KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY || ""

// Validate configuration
export function validateMapConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!TOMTOM_API_KEY) {
    errors.push("TomTom API key is required. Set NEXT_PUBLIC_TOMTOM_API_KEY in your environment variables.")
    console.warn("⚠️ TomTom API key missing. Set NEXT_PUBLIC_TOMTOM_API_KEY in your environment variables.")
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

