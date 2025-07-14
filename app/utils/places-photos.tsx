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
    // Step 1: Search for nearby places using Places API
    const searchResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=100&key=${apiKey}`,
    )

    if (!searchResponse.ok) {
      throw new Error(`Places search failed: ${searchResponse.status}`)
    }

    const searchData = await searchResponse.json()

    if (searchData.status !== "OK" || !searchData.results || searchData.results.length === 0) {
      console.log("🔍 No places found nearby, trying text search...")

      // Fallback: Try text search with location name
      const textSearchResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(locationName)}&location=${latitude},${longitude}&radius=500&key=${apiKey}`,
      )

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
    return null
  }
}

// Enhanced thumbnail generator with place photos
export async function generateEnhancedThumbnailForPin(pin: any): Promise<string> {
  // If pin has media, use the actual media as thumbnail
  if (pin.media) {
    return pin.media.url
  }

  // For location pins, try to get a place photo first
  try {
    const placePhoto = await getPlacePhotoForLocation(pin.latitude, pin.longitude, pin.address)
    if (placePhoto) {
      return placePhoto
    }
  } catch (error) {
    console.warn("⚠️ Failed to get place photo, falling back to map:", error)
  }

  // Fallback to map thumbnail
  return `https://maps.googleapis.com/maps/api/staticmap?center=${pin.latitude},${pin.longitude}&zoom=15&size=300x200&maptype=roadmap&markers=color:red%7Clabel:P%7C${pin.latitude},${pin.longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
}
