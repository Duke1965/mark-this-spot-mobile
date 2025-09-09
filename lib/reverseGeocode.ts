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
    // Fetch from Google Geocoding API
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=en&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
    )
    
    const data = await response.json()
    
    // Check API response status
    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      // Cache the null result
      geocodeCache.set(cacheKey, { result: null, timestamp: now })
      return null
    }

    const result = data.results[0]
    const components = result.address_components || []
    
    // Extract components in priority order
    let neighborhood = ""
    let locality = ""
    let admin2 = ""
    let admin1 = ""
    let countryCode = ""

    for (const component of components) {
      const types = component.types || []
      
      if (types.includes("neighborhood") || types.includes("sublocality")) {
        neighborhood = component.long_name
      } else if (types.includes("locality")) {
        locality = component.long_name
      } else if (types.includes("administrative_area_level_2")) {
        admin2 = component.long_name
      } else if (types.includes("administrative_area_level_1")) {
        admin1 = component.long_name
      } else if (types.includes("country")) {
        countryCode = component.short_name
      }
    }

    // Build smart label
    let shortLabel = ""
    
    if (neighborhood && locality) {
      shortLabel = `${neighborhood}, ${locality}`
    } else if (locality) {
      shortLabel = locality
    } else {
      const adminArea = admin2 || admin1
      if (adminArea && countryCode) {
        shortLabel = `${adminArea}, ${countryCode}`
      } else if (adminArea) {
        shortLabel = adminArea
      } else if (countryCode) {
        shortLabel = countryCode
      } else {
        shortLabel = "Unknown Location"
      }
    }

    const placeLabel: PlaceLabel = {
      raw: result.formatted_address || "",
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
