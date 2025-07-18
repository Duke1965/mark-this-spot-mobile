"use client"

import { useState, useEffect, useCallback } from "react"

interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  name: string
  address?: string
}

interface UseLocationServicesReturn {
  location: LocationData | null
  isLoading: boolean
  error: string | null
  getCurrentLocation: () => Promise<void>
  watchLocation: () => void
  stopWatching: () => void
}

export function useLocationServices(): UseLocationServicesReturn {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [watchId, setWatchId] = useState<number | null>(null)

  // Reverse geocoding to get location name
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
    try {
      // Using a simple geocoding approach - in production you might want to use a proper service
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

    // Fallback to coordinate-based naming
    return `Location ${lat.toFixed(4)}, ${lng.toFixed(4)}`
  }, [])

  // Get current location
  const getCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
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
      console.log("📍 Location updated:", locationData)
    } catch (error: any) {
      let errorMessage = "Failed to get location"

      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = "Location access denied by user"
          break
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Location information unavailable"
          break
        case error.TIMEOUT:
          errorMessage = "Location request timed out"
          break
        default:
          errorMessage = error.message || "Unknown location error"
      }

      setError(errorMessage)
      console.error("❌ Location error:", errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [reverseGeocode])

  // Watch location changes
  const watchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser")
      return
    }

    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
    }

    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords
        const name = await reverseGeocode(latitude, longitude)

        const locationData: LocationData = {
          latitude,
          longitude,
          accuracy,
          name,
        }

        setLocation(locationData)
        console.log("📍 Location watched:", locationData)
      },
      (error) => {
        let errorMessage = "Failed to watch location"

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied by user"
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable"
            break
          case error.TIMEOUT:
            errorMessage = "Location request timed out"
            break
          default:
            errorMessage = error.message || "Unknown location error"
        }

        setError(errorMessage)
        console.error("❌ Location watch error:", errorMessage)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      },
    )

    setWatchId(id)
  }, [reverseGeocode, watchId])

  // Stop watching location
  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      setWatchId(null)
      console.log("📍 Stopped watching location")
    }
  }, [watchId])

  // Auto-get location on mount
  useEffect(() => {
    getCurrentLocation()
  }, [getCurrentLocation])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [watchId])

  return {
    location,
    isLoading,
    error,
    getCurrentLocation,
    watchLocation,
    stopWatching,
  }
}
