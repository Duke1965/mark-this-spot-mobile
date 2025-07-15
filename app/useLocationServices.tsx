"use client"

import { useState, useEffect, useCallback } from "react"
import { reverseGeocode, getCurrentLocation, watchLocation } from "@/utils/geocoding"

interface LocationData {
  latitude: number
  longitude: number
  accuracy?: number
  timestamp: number
}

interface LocationAddress {
  address: string
  city?: string
  country?: string
  formattedAddress: string
}

interface UseLocationServicesOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
  watchPosition?: boolean
  autoReverseGeocode?: boolean
}

interface UseLocationServicesReturn {
  // Location data
  location: LocationData | null
  address: LocationAddress | null

  // Loading states
  isLoadingLocation: boolean
  isLoadingAddress: boolean

  // Error states
  locationError: string | null
  addressError: string | null

  // Permission state
  permissionState: PermissionState | null

  // Methods
  getCurrentLocation: () => Promise<void>
  refreshAddress: () => Promise<void>
  clearErrors: () => void

  // Watch control
  startWatching: () => void
  stopWatching: () => void
  isWatching: boolean
}

export function useLocationServices(options: UseLocationServicesOptions = {}): UseLocationServicesReturn {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 60000,
    watchPosition = false,
    autoReverseGeocode = true,
  } = options

  // State
  const [location, setLocation] = useState<LocationData | null>(null)
  const [address, setAddress] = useState<LocationAddress | null>(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [isLoadingAddress, setIsLoadingAddress] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [permissionState, setPermissionState] = useState<PermissionState | null>(null)
  const [watchId, setWatchId] = useState<number | null>(null)
  const [isWatching, setIsWatching] = useState(false)

  // Check permission state
  useEffect(() => {
    if ("permissions" in navigator) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        setPermissionState(result.state)

        result.addEventListener("change", () => {
          setPermissionState(result.state)
        })
      })
    }
  }, [])

  // Reverse geocode when location changes
  useEffect(() => {
    if (location && autoReverseGeocode) {
      refreshAddress()
    }
  }, [location, autoReverseGeocode])

  // Start watching on mount if enabled
  useEffect(() => {
    if (watchPosition) {
      startWatching()
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [watchPosition])

  const handleLocationSuccess = useCallback((position: GeolocationPosition) => {
    const newLocation: LocationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
    }

    setLocation(newLocation)
    setLocationError(null)
    setIsLoadingLocation(false)

    console.log("📍 Location updated:", newLocation)
  }, [])

  const handleLocationError = useCallback((error: GeolocationPositionError) => {
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
    }

    setLocationError(errorMessage)
    setIsLoadingLocation(false)
    setIsWatching(false)

    console.error("❌ Location error:", errorMessage)
  }, [])

  const getCurrentLocationMethod = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser")
      return
    }

    setIsLoadingLocation(true)
    setLocationError(null)

    try {
      const position = await getCurrentLocation()
      handleLocationSuccess(position)
    } catch (error) {
      handleLocationError(error as GeolocationPositionError)
    }
  }, [handleLocationSuccess, handleLocationError])

  const refreshAddress = useCallback(async () => {
    if (!location) {
      setAddressError("No location available for reverse geocoding")
      return
    }

    setIsLoadingAddress(true)
    setAddressError(null)

    try {
      const result = await reverseGeocode(location.latitude, location.longitude)

      if (result) {
        setAddress(result)
        console.log("🏠 Address updated:", result)
      } else {
        setAddressError("Could not determine address for this location")
      }
    } catch (error) {
      setAddressError("Failed to get address information")
      console.error("❌ Reverse geocoding error:", error)
    } finally {
      setIsLoadingAddress(false)
    }
  }, [location])

  const startWatching = useCallback(() => {
    if (!navigator.geolocation || isWatching) {
      return
    }

    const id = watchLocation(handleLocationSuccess, handleLocationError)

    if (id !== null) {
      setWatchId(id)
      setIsWatching(true)
      console.log("👀 Started watching location")
    }
  }, [isWatching, handleLocationSuccess, handleLocationError])

  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      setWatchId(null)
      setIsWatching(false)
      console.log("⏹️ Stopped watching location")
    }
  }, [watchId])

  const clearErrors = useCallback(() => {
    setLocationError(null)
    setAddressError(null)
  }, [])

  return {
    // Data
    location,
    address,

    // Loading states
    isLoadingLocation,
    isLoadingAddress,

    // Error states
    locationError,
    addressError,

    // Permission
    permissionState,

    // Methods
    getCurrentLocation: getCurrentLocationMethod,
    refreshAddress,
    clearErrors,

    // Watch control
    startWatching,
    stopWatching,
    isWatching,
  }
}

// Utility hook for simple location getting
export function useCurrentLocation() {
  const { location, address, isLoadingLocation, locationError, getCurrentLocation } = useLocationServices({
    watchPosition: false,
    autoReverseGeocode: true,
  })

  useEffect(() => {
    getCurrentLocation()
  }, [])

  return {
    location,
    address,
    isLoading: isLoadingLocation,
    error: locationError,
    refresh: getCurrentLocation,
  }
}
