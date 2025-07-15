"use client"

import { useState, useEffect, useCallback } from "react"

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

interface UseLocationServicesReturn {
  location: LocationData | null
  error: LocationError | null
  loading: boolean
  requestLocation: () => void
  watchLocation: () => void
  stopWatching: () => void
  isWatching: boolean
}

export function useLocationServices(): UseLocationServicesReturn {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [error, setError] = useState<LocationError | null>(null)
  const [loading, setLoading] = useState(false)
  const [isWatching, setIsWatching] = useState(false)
  const [watchId, setWatchId] = useState<number | null>(null)

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    const locationData: LocationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
    }

    setLocation(locationData)
    setError(null)
    setLoading(false)

    console.log("📍 Location updated:", locationData)
  }, [])

  const handleError = useCallback((err: GeolocationPositionError) => {
    const errorData: LocationError = {
      code: err.code,
      message: getErrorMessage(err.code),
    }

    setError(errorData)
    setLoading(false)

    console.error("❌ Location error:", errorData)
  }, [])

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError({
        code: -1,
        message: "Geolocation is not supported by this browser",
      })
      return
    }

    setLoading(true)
    setError(null)

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000, // 1 minute
    }

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options)
  }, [handleSuccess, handleError])

  const watchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError({
        code: -1,
        message: "Geolocation is not supported by this browser",
      })
      return
    }

    if (isWatching) {
      console.warn("⚠️ Location watching is already active")
      return
    }

    setLoading(true)
    setError(null)
    setIsWatching(true)

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000, // 30 seconds
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        handleSuccess(position)
        setLoading(false)
      },
      (err) => {
        handleError(err)
        setIsWatching(false)
      },
      options,
    )

    setWatchId(id)
    console.log("👀 Started watching location with ID:", id)
  }, [handleSuccess, handleError, isWatching])

  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      setWatchId(null)
      setIsWatching(false)
      setLoading(false)
      console.log("🛑 Stopped watching location")
    }
  }, [watchId])

  // Auto-request location on mount
  useEffect(() => {
    requestLocation()
  }, [requestLocation])

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
    error,
    loading,
    requestLocation,
    watchLocation,
    stopWatching,
    isWatching,
  }
}

function getErrorMessage(code: number): string {
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

// Utility function to calculate distance between two points
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radius of the Earth in kilometers
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c // Distance in kilometers
  return distance
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180)
}

// Utility function to format location for display
export function formatLocation(location: LocationData): string {
  return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
}

// Utility function to check if location is recent
export function isLocationRecent(location: LocationData, maxAgeMinutes = 5): boolean {
  const now = Date.now()
  const ageMinutes = (now - location.timestamp) / (1000 * 60)
  return ageMinutes <= maxAgeMinutes
}
