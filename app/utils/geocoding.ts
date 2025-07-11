"use client"

export async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    console.warn("⚠️ No Google Maps API key - using coordinates as address")
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`,
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.status === "OK" && data.results && data.results.length > 0) {
      const address = data.results[0].formatted_address
      console.log("🗺️ Geocoding successful:", address)
      return address
    } else {
      console.warn("⚠️ Geocoding failed:", data.status)
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
    }
  } catch (error) {
    console.error("❌ Geocoding error:", error)
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
  }
}

export async function forwardGeocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    console.warn("⚠️ No Google Maps API key for forward geocoding")
    return null
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`,
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.status === "OK" && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location
      console.log("🗺️ Forward geocoding successful:", location)
      return { lat: location.lat, lng: location.lng }
    } else {
      console.warn("⚠️ Forward geocoding failed:", data.status)
      return null
    }
  } catch (error) {
    console.error("❌ Forward geocoding error:", error)
    return null
  }
}
