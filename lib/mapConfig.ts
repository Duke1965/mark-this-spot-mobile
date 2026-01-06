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
export function validateMapConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (MAP_PROVIDER === "mapbox") {
    if (!MAPBOX_API_KEY) {
      errors.push("Mapbox API key is required. Set NEXT_PUBLIC_MAPBOX_API_KEY in your environment variables.")
      console.warn("⚠️ Mapbox API key missing. Set NEXT_PUBLIC_MAPBOX_API_KEY in your environment variables.")
    }
  } else if (MAP_PROVIDER === "apple") {
    const hasTeamId = !!process.env.APPLE_MAPKIT_TEAM_ID
    const hasKeyId = !!process.env.APPLE_MAPKIT_KEY_ID
    const hasPrivateKey = !!process.env.APPLE_MAPKIT_PRIVATE_KEY_BASE64

    if (!hasTeamId || !hasKeyId || !hasPrivateKey) {
      errors.push("Apple MapKit credentials are required. Set APPLE_MAPKIT_TEAM_ID, APPLE_MAPKIT_KEY_ID, and APPLE_MAPKIT_PRIVATE_KEY_BASE64 in your environment variables.")
      console.warn("⚠️ Apple MapKit credentials missing. Set APPLE_MAPKIT_TEAM_ID, APPLE_MAPKIT_KEY_ID, and APPLE_MAPKIT_PRIVATE_KEY_BASE64 in your environment variables.")
    }
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

