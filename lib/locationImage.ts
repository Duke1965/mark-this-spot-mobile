/**
 * Location Image Helper
 * Fetches location images from Unsplash based on place information
 */

export type LocationImage = {
  imageUrl: string
  imageUrlLarge: string
  photographerName: string
  photographerProfileUrl: string
  unsplashPhotoLink: string
}

export type LocationImageAttribution = {
  photographerName: string
  photographerProfileUrl: string
  unsplashPhotoLink: string
}

/**
 * Fetches a location image from Unsplash based on place information
 * @param place - Place information (name, city, category)
 * @returns LocationImage with URLs and attribution, or null if not found
 */
export async function fetchLocationImageForPlace(place: {
  name: string
  city?: string
  category?: string
}): Promise<LocationImage | null> {
  try {
    const params = new URLSearchParams()
    if (place.name) params.set("name", place.name)
    if (place.city) params.set("city", place.city)
    if (place.category) params.set("category", place.category)

    const res = await fetch(`/api/location-image/unsplash?${params.toString()}`)
    
    if (!res.ok) {
      if (res.status === 404) {
        console.log("🖼️ No Unsplash image found for place:", place.name)
      } else {
        console.warn("🖼️ Unsplash image fetch failed:", res.status)
      }
      return null
    }

    const data = await res.json()
    return data as LocationImage
  } catch (error) {
    console.error("❌ Error fetching location image:", error)
    return null
  }
}

