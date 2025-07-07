export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    // Use Google Maps Geocoding API if available
    if (window.google && window.google.maps) {
      const geocoder = new window.google.maps.Geocoder()

      return new Promise((resolve, reject) => {
        geocoder.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
          if (status === "OK" && results && results[0]) {
            resolve(results[0].formatted_address)
          } else {
            reject(new Error("Geocoding failed: " + status))
          }
        })
      })
    }

    // Fallback to a free geocoding service
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
    )

    if (!response.ok) {
      throw new Error("Geocoding service unavailable")
    }

    const data = await response.json()

    if (data.locality && data.countryName) {
      return `${data.locality}, ${data.principalSubdivision || data.countryName}`
    }

    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  } catch (error) {
    console.error("Reverse geocoding failed:", error)

    // Return coordinates as fallback
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  }
}
