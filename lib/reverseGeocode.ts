export type PlaceLabel = { 
  raw: string
  short: string 
}

// Simple in-memory cache with timestamps
const geocodeCache = new Map<string, { result: PlaceLabel | null; timestamp: number }>()

export async function reverseGeocode(lat: number, lng: number): Promise<PlaceLabel | null> {
  // Create cache key by rounding to ~100m buckets
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`
  
  // Check cache and throttle (5 minutes) - increased for better performance
  const cached = geocodeCache.get(cacheKey)
  const now = Date.now()
  if (cached && now - cached.timestamp < 300000) {
    return cached.result
  }

  try {
    // Fetch from Mapbox Geocoding API for reverse geocoding
    // Request both address and place to get street + city information
    // Use relative path to avoid CORS issues with Vercel preview URLs
    const response = await fetch(
      `/api/mapbox_geocoding?lat=${lat}&lng=${lng}&types=address,place&limit=5`
    )
    
    const data = await response.json()
    
    // Check Mapbox API response
    if (!response.ok || !data.places || data.places.length === 0) {
      // Cache the null result
      geocodeCache.set(cacheKey, { result: null, timestamp: now })
      return null
    }

    // Find address result (for street) and place result (for city/town)
    // place_type can be an array or string
    const addressResult = data.places.find((p: any) => {
      const types = Array.isArray(p.place_type) ? p.place_type : [p.place_type]
      return types.includes('address') || p.context?.street
    })
    const placeResult = data.places.find((p: any) => {
      const types = Array.isArray(p.place_type) ? p.place_type : [p.place_type]
      return types.includes('place') || p.context?.city
    }) || data.places[0]
    
    // Use address result for street, place result for city/town
    const street = addressResult?.context?.street || addressResult?.address || addressResult?.name || ""
    const neighborhood = placeResult?.context?.neighborhood || addressResult?.context?.neighborhood || ""
    const city = placeResult?.context?.city || placeResult?.name || ""
    const placeName = placeResult?.name || placeResult?.place_name || "Unknown Location"
    
    // Format location name according to user requirements:
    // - For rural/town: "Street Town" (e.g., "Eikenhof street Riebeek west")
    // - For city: "Street Suburb City" (e.g., "Lytton street Observatory Cape town")
    
    let shortLabel = ""
    
    if (city && neighborhood) {
      // City location: "Street Suburb City"
      const parts = []
      if (street) parts.push(street)
      if (neighborhood) parts.push(neighborhood)
      if (city) parts.push(city)
      shortLabel = parts.join(" ")
    } else if (city || placeName) {
      // Rural/town location: "Street Town"
      const parts = []
      if (street) parts.push(street)
      // Use city if available, otherwise use placeName
      const town = city || placeName
      if (town) parts.push(town)
      shortLabel = parts.join(" ")
    } else {
      // Fallback to place name
      shortLabel = placeName
    }
    
    // Ensure "street" is lowercase (as per user examples)
    shortLabel = shortLabel.replace(/\bStreet\b/g, "street")

    const placeLabel: PlaceLabel = {
      raw: placeResult?.place_name || placeResult?.name || placeName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
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
