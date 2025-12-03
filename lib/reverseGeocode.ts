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
    // Fetch from Foursquare Places API instead of Google Geocoding
    // Use Foursquare to get place name and description
    // Use relative path to avoid CORS issues with Vercel preview URLs
    const response = await fetch(
      `/api/foursquare-places?lat=${lat}&lng=${lng}&radius=50&limit=1`
    )
    
    const data = await response.json()
    
    // Check Foursquare API response
    if (!response.ok || !data.items || data.items.length === 0) {
      // Cache the null result
      geocodeCache.set(cacheKey, { result: null, timestamp: now })
      return null
    }

    // Use Foursquare place data
    const place = data.items[0]
    const placeName = place.title || place.name || "Unknown Location"
    const address = place.address || place.location?.address || ""
    
    // Build smart label from Foursquare data
    let shortLabel = placeName
    if (address && address !== placeName) {
      shortLabel = `${placeName}, ${address}`
    }

    const placeLabel: PlaceLabel = {
      raw: address || placeName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
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
