// Geocoding utilities using OpenStreetMap Nominatim API
export interface GeocodeResult {
  address: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  formattedAddress: string
  latitude: number
  longitude: number
}

/**
 * Reverse geocode coordinates to get address information
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<GeocodeResult | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`,
      {
        headers: {
          "User-Agent": "MarkThisSpot/1.0",
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data || !data.address) {
      return null
    }

    const address = data.address
    const result: GeocodeResult = {
      address: data.display_name || "Unknown Location",
      city: address.city || address.town || address.village || address.hamlet,
      state: address.state || address.region,
      country: address.country,
      postalCode: address.postcode,
      formattedAddress: data.display_name || "Unknown Location",
      latitude,
      longitude,
    }

    return result
  } catch (error) {
    console.error("Reverse geocoding failed:", error)
    return null
  }
}

/**
 * Forward geocode an address to get coordinates
 */
export async function forwardGeocode(address: string): Promise<GeocodeResult[]> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(address)}&addressdetails=1&limit=5`,
      {
        headers: {
          "User-Agent": "MarkThisSpot/1.0",
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`)
    }

    const data = await response.json()

    if (!Array.isArray(data)) {
      return []
    }

    return data.map((item: any) => ({
      address: item.display_name || "Unknown Location",
      city: item.address?.city || item.address?.town || item.address?.village,
      state: item.address?.state || item.address?.region,
      country: item.address?.country,
      postalCode: item.address?.postcode,
      formattedAddress: item.display_name || "Unknown Location",
      latitude: Number.parseFloat(item.lat),
      longitude: Number.parseFloat(item.lon),
    }))
  } catch (error) {
    console.error("Forward geocoding failed:", error)
    return []
  }
}

/**
 * Get current location using browser geolocation API
 */
export function getCurrentLocation(options?: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"))
      return
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, { ...defaultOptions, ...options })
  })
}

/**
 * Watch location changes
 */
export function watchLocation(
  onSuccess: (position: GeolocationPosition) => void,
  onError: (error: GeolocationPositionError) => void,
  options?: PositionOptions,
): number | null {
  if (!navigator.geolocation) {
    onError({
      code: 2,
      message: "Geolocation is not supported by this browser",
    } as GeolocationPositionError)
    return null
  }

  const defaultOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 60000,
  }

  return navigator.geolocation.watchPosition(onSuccess, onError, { ...defaultOptions, ...options })
}

/**
 * Calculate distance between two coordinates in meters
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(latitude: number, longitude: number, precision = 6): string {
  return `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`
}

/**
 * Check if coordinates are valid
 */
export function isValidCoordinates(latitude: number, longitude: number): boolean {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !isNaN(latitude) &&
    !isNaN(longitude)
  )
}

/**
 * Get location permission status
 */
export async function getLocationPermission(): Promise<PermissionState | null> {
  if (!("permissions" in navigator)) {
    return null
  }

  try {
    const result = await navigator.permissions.query({ name: "geolocation" })
    return result.state
  } catch (error) {
    console.warn("Could not check location permission:", error)
    return null
  }
}
