"use client"

interface PlacePhoto {
  photoUrl: string
  attribution?: string
}

// Cache to avoid repeated API calls for the same location
const photoCache = new Map<string, string>()

export async function getPlacePhotoForLocation(
  latitude: number,
  longitude: number,
  locationName: string,
): Promise<string | null> {
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`

  // Check cache first
  if (photoCache.has(cacheKey)) {
    return photoCache.get(cacheKey) || null
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.warn("⚠️ No Google Maps API key - cannot fetch place photos")
    return null
  }

  try {
    console.log(`🔍 Searching for place photos near: ${latitude}, ${longitude}`)

    // Step 1: Search for nearby places using Places API
    const searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=100&key=${apiKey}`

    // Use a CORS proxy for client-side requests
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(searchUrl)}`

    const searchResponse = await fetch(proxyUrl)

    if (!searchResponse.ok) {
      throw new Error(`Places search failed: ${searchResponse.status}`)
    }

    const searchData = await searchResponse.json()

    if (searchData.status !== "OK" || !searchData.results || searchData.results.length === 0) {
      console.log("🔍 No places found nearby, trying text search...")

      // Fallback: Try text search with location name
      const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(locationName)}&location=${latitude},${longitude}&radius=500&key=${apiKey}`
      const textProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(textSearchUrl)}`

      const textSearchResponse = await fetch(textProxyUrl)

      if (!textSearchResponse.ok) {
        throw new Error(`Text search failed: ${textSearchResponse.status}`)
      }

      const textSearchData = await textSearchResponse.json()

      if (textSearchData.status !== "OK" || !textSearchData.results || textSearchData.results.length === 0) {
        console.log("🔍 No places found in text search either")
        return null
      }

      searchData.results = textSearchData.results
    }

    // Step 2: Find a place with photos
    let selectedPlace = null
    for (const place of searchData.results) {
      if (place.photos && place.photos.length > 0) {
        selectedPlace = place
        break
      }
    }

    if (!selectedPlace) {
      console.log("📷 No places with photos found")
      return null
    }

    // Step 3: Get the photo URL
    const photoReference = selectedPlace.photos[0].photo_reference
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${apiKey}`

    console.log(`📸 Found place photo for: ${selectedPlace.name}`)

    // Cache the result
    photoCache.set(cacheKey, photoUrl)

    return photoUrl
  } catch (error) {
    console.error("❌ Failed to fetch place photo:", error)

    // Try alternative approach - use Street View Static API as fallback
    try {
      const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=400x300&location=${latitude},${longitude}&key=${apiKey}`
      console.log("🛣️ Using Street View as fallback")

      // Cache the street view result
      photoCache.set(cacheKey, streetViewUrl)
      return streetViewUrl
    } catch (streetViewError) {
      console.error("❌ Street View fallback also failed:", streetViewError)
      return null
    }
  }
}

// Enhanced thumbnail generator with better fallbacks
export async function generateEnhancedThumbnailForPin(pin: any): Promise<string> {
  // If pin has media, use the actual media as thumbnail
  if (pin.media) {
    return pin.media.url
  }

  // For location pins, try multiple approaches
  try {
    // First try: Get place photo
    const placePhoto = await getPlacePhotoForLocation(pin.latitude, pin.longitude, pin.address)
    if (placePhoto) {
      return placePhoto
    }
  } catch (error) {
    console.warn("⚠️ Failed to get place photo:", error)
  }

  // Second try: Street View Static API
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (apiKey) {
    try {
      const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=400x300&location=${pin.latitude},${pin.longitude}&fov=90&heading=0&pitch=0&key=${apiKey}`

      // Test if street view image exists
      const testResponse = await fetch(streetViewUrl, { method: "HEAD" })
      if (testResponse.ok) {
        console.log("🛣️ Using Street View image")
        return streetViewUrl
      }
    } catch (error) {
      console.warn("⚠️ Street View failed:", error)
    }
  }

  // Final fallback: Enhanced static map with better styling
  const fallbackMapUrl = apiKey
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${pin.latitude},${pin.longitude}&zoom=16&size=400x300&maptype=roadmap&markers=color:red%7Csize:mid%7C${pin.latitude},${pin.longitude}&style=feature:poi|visibility:on&style=feature:transit|visibility:simplified&key=${apiKey}`
    : `https://via.placeholder.com/400x300/4F46E5/FFFFFF?text=${encodeURIComponent(pin.address.substring(0, 20))}`

  console.log("🗺️ Using enhanced static map fallback")
  return fallbackMapUrl
}

// Utility to clear photo cache
export function clearPhotoCache(): void {
  photoCache.clear()
  console.log("🗑️ Photo cache cleared")
}

// Utility to preload photos for better performance
export async function preloadPhotosForPins(pins: any[]): Promise<void> {
  console.log(`🔄 Preloading photos for ${pins.length} pins...`)

  const promises = pins
    .filter((pin) => !pin.media) // Only preload for location pins
    .map((pin) =>
      generateEnhancedThumbnailForPin(pin).catch((error) => {
        console.warn(`⚠️ Failed to preload photo for pin ${pin.id}:`, error)
        return null
      }),
    )

  await Promise.all(promises)
  console.log("✅ Photo preloading completed")
}
