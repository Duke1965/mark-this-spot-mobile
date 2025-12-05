export type PlaceLabel = { 
  raw: string
  short: string 
}

// Simple in-memory cache with timestamps
const geocodeCache = new Map<string, { result: PlaceLabel | null; timestamp: number }>()

export async function reverseGeocode(lat: number, lng: number): Promise<PlaceLabel | null> {
  // Create cache key by rounding to ~100m buckets
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`
  
  // Check cache and throttle (10 seconds)
  const cached = geocodeCache.get(cacheKey)
  const now = Date.now()
  if (cached && now - cached.timestamp < 10000) {
    return cached.result
  }

  try {
    // Fetch from Mapbox Geocoding API for reverse geocoding
    // Use relative path to avoid CORS issues with Vercel preview URLs
    const response = await fetch(
      `/api/mapbox_geocoding?lat=${lat}&lng=${lng}&types=poi`
    )
    
    const data = await response.json()
    
    // Check Mapbox API response
    if (!response.ok || !data.places || data.places.length === 0) {
      // Cache the null result
      geocodeCache.set(cacheKey, { result: null, timestamp: now })
      return null
    }

    // Use Mapbox place data
    const place = data.places[0]
    const placeName = place.name || place.place_name || "Unknown Location"
    const address = place.address || ""
    
    // Build smart label from Mapbox data
    let shortLabel = placeName
    
    // Add context if available (neighborhood, city)
    if (place.context) {
      const contextParts = []
      if (place.context.neighborhood) contextParts.push(place.context.neighborhood)
      if (place.context.city) contextParts.push(place.context.city)
      
      if (contextParts.length > 0) {
        shortLabel = `${placeName}, ${contextParts[0]}`
      }
    } else if (address && address !== placeName) {
      shortLabel = `${placeName}, ${address}`
    }

    const placeLabel: PlaceLabel = {
      raw: place.place_name || address || placeName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      short: shortLabel
    }

    // Cache the result
    geocodeCache.set(cacheKey, { result: placeLabel, timestamp: now })
    
    return placeLabel

  } catch (error) {
    console.error("Reverse geocoding error:", error)
    // Cache the null result to avoid repeated failures
    geocodeCache.set(cacheKey, { result: null, timestamp: now })
    return null
  }
} 
