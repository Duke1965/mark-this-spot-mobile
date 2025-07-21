"use client"

import { useState, useEffect, useCallback } from "react"

export interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  name: string
  address?: string
}

export function useLocationServices() {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      )

      if (response.ok) {
        const data = await response.json()
        return data.city || data.locality || data.principalSubdivision || "Unknown Location"
      }
    } catch (error) {
      console.warn("Reverse geocoding failed:", error)
    }

    return `Location ${lat.toFixed(4)}, ${lng.toFixed(4)}`
  }, [])

  const getCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        })
      })

      const { latitude, longitude, accuracy } = position.coords
      const name = await reverseGeocode(latitude, longitude)

      const locationData: LocationData = {
        latitude,
        longitude,
        accuracy,
        name,
      }

      setLocation(locationData)
    } catch (error: any) {
      let errorMessage = "Failed to get location"

      if (error.code === 1) errorMessage = "Location access denied"
      else if (error.code === 2) errorMessage = "Location unavailable"
      else if (error.code === 3) errorMessage = "Location timeout"

      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [reverseGeocode])

  useEffect(() => {
    getCurrentLocation()
  }, [getCurrentLocation])

  return {
    location,
    isLoading,
    error,
    getCurrentLocation,
  }
}
