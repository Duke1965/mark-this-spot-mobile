"use client"

import { useState, useCallback } from "react"

interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

interface LocationError {
  code: number
  message: string
}

export function useLocationServices() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getCurrentLocation = useCallback((): Promise<LocationData | null> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const errorMsg = "Geolocation is not supported by this browser"
        setError(errorMsg)
        reject(new Error(errorMsg))
        return
      }

      setIsLoading(true)
      setError(null)

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          }

          console.log("📍 Location obtained:", locationData)
          setIsLoading(false)
          resolve(locationData)
        },
        (error) => {
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
              errorMessage = "Unknown location error"
              break
          }

          console.error("❌ Location error:", errorMessage, error)
          setError(errorMessage)
          setIsLoading(false)
          reject(new Error(errorMessage))
        },
        options,
      )
    })
  }, [])

  const watchLocation = useCallback((callback: (location: LocationData) => void) => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser")
      return null
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        }
        callback(locationData)
      },
      (error) => {
        console.error("Watch location error:", error)
        setError("Failed to watch location")
      },
      options,
    )

    return watchId
  }, [])

  const clearWatch = useCallback((watchId: number) => {
    navigator.geolocation.clearWatch(watchId)
  }, [])

  return {
    getCurrentLocation,
    watchLocation,
    clearWatch,
    isLoading,
    error,
  }
}
