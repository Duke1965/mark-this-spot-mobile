"use client"

import { useState, useCallback, useEffect } from "react"

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
  const [location, setLocation] = useState<LocationData | null>(null)
  const [error, setError] = useState<LocationError | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<PermissionState | null>(null)

  // Check permission status on mount
  useEffect(() => {
    if ("permissions" in navigator) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        setPermissionStatus(result.state)
        result.addEventListener("change", () => {
          setPermissionStatus(result.state)
        })
      })
    }
  }, [])

  const getCurrentLocation = useCallback((options?: PositionOptions): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = {
          code: 0,
          message: "Geolocation is not supported by this browser",
        }
        setError(error)
        reject(error)
        return
      }

      setIsLoading(true)
      setError(null)

      const defaultOptions: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
        ...options,
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          }

          setLocation(locationData)
          setIsLoading(false)
          resolve(locationData)
        },
        (geoError) => {
          const error: LocationError = {
            code: geoError.code,
            message: getErrorMessage(geoError.code),
          }

          setError(error)
          setIsLoading(false)
          reject(error)
        },
        defaultOptions,
      )
    })
  }, [])

  const watchLocation = useCallback((options?: PositionOptions): number => {
    if (!navigator.geolocation) {
      setError({
        code: 0,
        message: "Geolocation is not supported by this browser",
      })
      return -1
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000, // 1 minute for watch
      ...options,
    }

    return navigator.geolocation.watchPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        }

        setLocation(locationData)
        setError(null)
      },
      (geoError) => {
        const error: LocationError = {
          code: geoError.code,
          message: getErrorMessage(geoError.code),
        }
        setError(error)
      },
      defaultOptions,
    )
  }, [])

  const clearWatch = useCallback((watchId: number) => {
    if (navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      if ("permissions" in navigator) {
        const result = await navigator.permissions.query({ name: "geolocation" })
        if (result.state === "granted") {
          return true
        }
      }

      // Try to get location to trigger permission request
      await getCurrentLocation({ timeout: 5000 })
      return true
    } catch (error) {
      return false
    }
  }, [getCurrentLocation])

  const getErrorMessage = (code: number): string => {
    switch (code) {
      case 1:
        return "Location access denied by user"
      case 2:
        return "Location information unavailable"
      case 3:
        return "Location request timed out"
      default:
        return "An unknown location error occurred"
    }
  }

  // Utility functions
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }, [])

  const formatCoordinates = useCallback((lat: number, lng: number): string => {
    const latDir = lat >= 0 ? "N" : "S"
    const lngDir = lng >= 0 ? "E" : "W"
    return `${Math.abs(lat).toFixed(6)}°${latDir}, ${Math.abs(lng).toFixed(6)}°${lngDir}`
  }, [])

  const isLocationStale = useCallback((timestamp: number, maxAge = 300000): boolean => {
    return Date.now() - timestamp > maxAge
  }, [])

  return {
    location,
    error,
    isLoading,
    permissionStatus,
    getCurrentLocation,
    watchLocation,
    clearWatch,
    requestPermission,
    calculateDistance,
    formatCoordinates,
    isLocationStale,
  }
}
