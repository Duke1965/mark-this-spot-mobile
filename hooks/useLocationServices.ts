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
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)

  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
    try {
      // Use Google's Geocoding API for better results
      if (window.google && window.google.maps) {
        const geocoder = new google.maps.Geocoder()
        const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === "OK" && results) {
              resolve(results)
            } else {
              reject(new Error("Geocoding failed"))
            }
          })
        })

        if (result.length > 0) {
          // Extract meaningful location name
          const addressComponents = result[0].address_components
          const locality = addressComponents.find((c) => c.types.includes("locality"))
          const sublocality = addressComponents.find((c) => c.types.includes("sublocality"))
          const area = addressComponents.find((c) => c.types.includes("administrative_area_level_1"))

          return locality?.long_name || sublocality?.long_name || area?.long_name || result[0].formatted_address
        }
      }

      // Fallback to free geocoding service
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      )

      if (response.ok) {
        const data = await response.json()
        return (
          data.city || data.locality || data.principalSubdivision || `Location ${lat.toFixed(4)}, ${lng.toFixed(4)}`
        )
      }

      return `Location ${lat.toFixed(4)}, ${lng.toFixed(4)}`
    } catch (error) {
      console.warn("Reverse geocoding failed:", error)
      return `Location ${lat.toFixed(4)}, ${lng.toFixed(4)}`
    }
  }, [])

  const getCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported by this browser")
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Get initial position
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
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

      // Start watching position for real-time updates
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng, accuracy: acc } = pos.coords
          const locationName = await reverseGeocode(lat, lng)

          setLocation({
            latitude: lat,
            longitude: lng,
            accuracy: acc,
            name: locationName,
          })
        },
        (err) => {
          console.warn("Location watch error:", err)
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 30000,
        },
      )
    } catch (err: any) {
      console.error("Location error:", err)
      setError(err.message || "Failed to get location")

      // Provide fallback location for development
      if (process.env.NODE_ENV === "development") {
        const fallbackLocation: LocationData = {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 1000,
          name: "San Francisco",
        }
        setLocation(fallbackLocation)
      }
    } finally {
      setIsLoading(false)
    }
  }, [reverseGeocode])

  useEffect(() => {
    getCurrentLocation()

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
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
