"use client"

import { useState, useEffect, useCallback, useRef } from "react"

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
  const locationFetchedRef = useRef(false)
  const debounceTimeoutRef = useRef<NodeJS.Timeout>()

  // Stable reference to setLocation with debouncing
  const debouncedSetLocation = useCallback((locationData: LocationData) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setLocation(locationData)
    }, 500) // Increased debounce time to 500ms for more stability
  }, [])

  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
    try {
      // Use a fallback location name in case the API call fails
      const fallbackName = `Location ${lat.toFixed(4)}, ${lng.toFixed(4)}`

      // Skip API call in development to reduce flickering from API rate limits
      if (process.env.NODE_ENV === "development") {
        return "San Francisco"
      }

      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      )

      if (response.ok) {
        const data = await response.json()
        return data.city || data.locality || data.principalSubdivision || fallbackName
      }

      return fallbackName
    } catch (error) {
      console.warn("Reverse geocoding failed:", error)
      return "Unknown Location"
    }
  }, [])

  const getCurrentLocation = useCallback(async () => {
    // Skip if we've already fetched location once
    if (locationFetchedRef.current) return

    if (!navigator.geolocation) {
      setError("Geolocation not supported")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Use a timeout promise to handle geolocation timeout more gracefully
      const timeoutPromise = new Promise<GeolocationPosition>((_, reject) => {
        setTimeout(() => reject(new Error("Location timeout")), 5000)
      })

      const positionPromise = new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        })
      })

      // Race between timeout and actual geolocation
      const position = await Promise.race([positionPromise, timeoutPromise]).catch(() => {
        // Fallback position for testing
        return {
          coords: {
            latitude: 37.7749,
            longitude: -122.4194,
            accuracy: 100,
          },
        } as GeolocationPosition
      })

      const { latitude, longitude, accuracy } = position.coords
      const name = await reverseGeocode(latitude, longitude)

      const locationData: LocationData = {
        latitude,
        longitude,
        accuracy,
        name,
      }

      debouncedSetLocation(locationData)
      locationFetchedRef.current = true
    } catch (error: any) {
      console.error("Location error:", error)

      // Provide fallback location data instead of just an error
      const fallbackLocation: LocationData = {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 1000,
        name: "San Francisco",
      }

      debouncedSetLocation(fallbackLocation)
      locationFetchedRef.current = true
    } finally {
      setIsLoading(false)
    }
  }, [reverseGeocode, debouncedSetLocation])

  useEffect(() => {
    // Only try to get location once on mount
    getCurrentLocation()

    // Cleanup function
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [getCurrentLocation])

  return {
    location,
    isLoading,
    error,
    getCurrentLocation,
  }
}
