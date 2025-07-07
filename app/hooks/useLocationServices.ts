"use client"

import { useState, useCallback } from "react"

interface Location {
  latitude: number
  longitude: number
  accuracy?: number
}

export function useLocationServices() {
  const [isLoading, setIsLoading] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  const getCurrentLocation = useCallback(async (): Promise<Location | null> => {
    setIsLoading(true)
    setError(null)

    try {
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported by this browser")
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        })
      })

      setHasPermission(true)

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }
    } catch (error: any) {
      console.error("Location error:", error)
      setHasPermission(false)

      let errorMessage = "Could not get your location"

      switch (error.code) {
        case 1:
          errorMessage = "Location access denied. Please enable location permissions."
          break
        case 2:
          errorMessage = "Location unavailable. Please check your GPS/internet connection."
          break
        case 3:
          errorMessage = "Location request timed out. Please try again."
          break
        default:
          errorMessage = error.message || "Unknown location error"
      }

      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getLocationWithBacktrack = useCallback(
    async (backtrackKm = 1): Promise<Location | null> => {
      const currentLocation = await getCurrentLocation()
      if (!currentLocation) return null

      // Simulate backtracking by adjusting coordinates slightly
      const backtrackOffset = (backtrackKm / 111) * (Math.random() * 0.5 + 0.5)

      return {
        latitude: currentLocation.latitude - backtrackOffset * (Math.random() - 0.5),
        longitude: currentLocation.longitude - backtrackOffset * (Math.random() - 0.5),
        accuracy: currentLocation.accuracy,
      }
    },
    [getCurrentLocation],
  )

  return {
    getCurrentLocation,
    getLocationWithBacktrack,
    isLoading,
    hasPermission,
    error,
  }
}
