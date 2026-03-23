"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { reverseGeocode } from "@/lib/reverseGeocode"
import type { LocationData } from "@/lib/types"
import { requestLocationPermission } from "@/lib/mobilePermissions"
import { Capacitor } from "@capacitor/core"

interface LocationError {
  code: number
  message: string
}

// Helper functions (defined first to prevent hoisting issues)
const getErrorMessage = (code: number): string => {
  switch (code) {
    case 1:
      return "Location access denied by user"
    case 2:
      return "Location position unavailable"
    case 3:
      return "Location request timeout"
    default:
      return "An unknown location error occurred"
  }
}

export function useLocationServices() {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [error, setError] = useState<LocationError | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<PermissionState | null>(null)
  const [placeName, setPlaceName] = useState<string | null>(null)

  // NEW: Persist last known coordinates so the app can still function
  // when geolocation is slow/unavailable (e.g., desktop without location services).
  const LAST_KNOWN_LOCATION_KEY = "pinit-last-known-location-v1"
  const readLastKnownLocation = useCallback((): LocationData | null => {
    try {
      if (typeof window === "undefined") return null
      const raw = window.localStorage.getItem(LAST_KNOWN_LOCATION_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as Partial<LocationData>
      const lat = Number(parsed.latitude)
      const lng = Number(parsed.longitude)
      const accuracy = Number(parsed.accuracy ?? 0)
      const ts = Number(parsed.timestamp ?? 0)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
      return {
        latitude: lat,
        longitude: lng,
        accuracy: Number.isFinite(accuracy) ? accuracy : undefined,
        timestamp: Number.isFinite(ts) && ts > 0 ? ts : Date.now(),
      }
    } catch {
      return null
    }
  }, [])

  const persistLastKnownLocation = useCallback((loc: LocationData) => {
    try {
      if (typeof window === "undefined") return
      const payload: LocationData = {
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
        timestamp: loc.timestamp ?? Date.now(),
      }
      window.localStorage.setItem(LAST_KNOWN_LOCATION_KEY, JSON.stringify(payload))
    } catch {
      // best-effort
    }
  }, [])
  
  // NEW: Location persistence - remember last good location name
  const [lastGoodPlaceName, setLastGoodPlaceName] = useState<string | null>(null)
  const [lastGoodLocation, setLastGoodLocation] = useState<{ lat: number; lng: number } | null>(null)
  
  // Refs for debouncing place name lookups
  const lastPlaceNameLookup = useRef<{ lat: number; lng: number; timestamp: number } | null>(null)

  // Calculate distance between two points in kilometers (defined early)
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

  const isCapacitor = typeof window !== "undefined" && Capacitor.isNativePlatform()
  const isNative = isCapacitor && Capacitor.isPluginAvailable("Geolocation")

  // Check permission status on mount (native uses Capacitor, web uses Permissions API)
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      if (typeof window === "undefined") return

      if (isNative) {
        try {
          const { Geolocation } = await import("@capacitor/geolocation")
          const res = await Geolocation.checkPermissions()
          if (cancelled) return
          const state = (res as any)?.location
          if (state === "granted" || state === "denied" || state === "prompt" || state === "prompt-with-rationale") {
            setPermissionStatus(state as any)
          } else {
            setPermissionStatus(null)
          }
        } catch {
          setPermissionStatus(null)
        }
        return
      }

      if (isCapacitor && !isNative) {
        // Capacitor shell without native geolocation plugin available
        setPermissionStatus(null)
        return
      }

      if ("permissions" in navigator) {
        try {
          const result = await navigator.permissions.query({ name: "geolocation" })
          if (cancelled) return
          setPermissionStatus(result.state)
          result.addEventListener("change", () => {
            setPermissionStatus(result.state)
          })
        } catch {
          // ignore
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isCapacitor, isNative])

  // Warm-start from last known location (prevents "stuck on Getting location...")
  useEffect(() => {
    const cached = readLastKnownLocation()
    if (!cached) return
    // Only apply cached location if we don't already have one (avoid clobbering GPS).
    setLocation((prev) => prev ?? cached)
    // Intentionally only warm-start coordinates; place naming will be resolved by
    // downstream effects when a location is present.
  }, [readLastKnownLocation])

  const getPlaceName = useCallback(async (lat: number, lng: number): Promise<string | null> => {
    try {
      const res = await reverseGeocode(lat, lng)
      const label = res?.short || null
      
      // NEW: If we get a real place name, remember it
      if (label && label !== "Unknown Location") {
        setLastGoodPlaceName(label)
        setLastGoodLocation({ lat, lng })
        setPlaceName(label)
        return label
      }
      
      // NEW: If no real place name but we have a recent good one nearby, keep using it
      if (lastGoodPlaceName && lastGoodLocation) {
        const distance = calculateDistance(lat, lng, lastGoodLocation.lat, lastGoodLocation.lng)
        if (distance < 0.5) { // Within 500m of last good location
          console.log(`📍 Using persistent location: ${lastGoodPlaceName}`)
          setPlaceName(lastGoodPlaceName)
          return lastGoodPlaceName
        }
      }
      
      setPlaceName(label)
      return label
    } catch {
      // NEW: On error, try to use last good location if nearby
      if (lastGoodPlaceName && lastGoodLocation) {
        const distance = calculateDistance(lat, lng, lastGoodLocation.lat, lastGoodLocation.lng)
        if (distance < 0.5) { // Within 500m of last good location
          console.log(`📍 Using persistent location on error: ${lastGoodPlaceName}`)
          setPlaceName(lastGoodPlaceName)
          return lastGoodPlaceName
        }
      }
      return null
    }
  }, [calculateDistance, lastGoodPlaceName, lastGoodLocation])

  const getCurrentLocation = useCallback(async (options?: PositionOptions): Promise<LocationData> => {
    const allowed = await requestLocationPermission()
    if (!allowed) {
      const error = {
        code: 1,
        message: getErrorMessage(1),
      }
      setError(error)
      throw error
    }

    if (isNative) {
      console.log("📍 Using Capacitor native geolocation")
      setIsLoading(true)
      setError(null)
      try {
        const { Geolocation } = await import("@capacitor/geolocation")
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: options?.timeout ?? 15000,
          maximumAge: options?.maximumAge ?? 60000,
        })
        const locationData: LocationData = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: (pos as any).timestamp ?? Date.now(),
        }
        setLocation(locationData)
        setIsLoading(false)
        persistLastKnownLocation(locationData)
        await getPlaceName(locationData.latitude, locationData.longitude)
        return locationData
      } catch (e: any) {
        const error: LocationError = {
          code: 2,
          message: e?.message || getErrorMessage(2),
        }
        setError(error)
        setIsLoading(false)
        const cached = readLastKnownLocation()
        if (cached) setLocation((prev) => prev ?? cached)
        throw error
      }
    }

    console.log("📍 Using browser geolocation fallback")
    return await new Promise((resolve, reject) => {
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
        timeout: 15000, // Increased to 15 seconds for better reliability
        maximumAge: 60000, // Reduced to 1 minute for fresher location data
        ...options,
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          }

          setLocation(locationData)
          setIsLoading(false)
          persistLastKnownLocation(locationData)
          
          // Debounced place name lookup
          const now = Date.now()
          const shouldLookup = !lastPlaceNameLookup.current || 
            calculateDistance(
              lastPlaceNameLookup.current.lat, 
              lastPlaceNameLookup.current.lng,
              locationData.latitude, 
              locationData.longitude
            ) > 0.1 || // 100 meters
            now - lastPlaceNameLookup.current.timestamp > 10000 // 10 seconds
          
          if (shouldLookup) {
            lastPlaceNameLookup.current = {
              lat: locationData.latitude,
              lng: locationData.longitude,
              timestamp: now
            }
            await getPlaceName(locationData.latitude, locationData.longitude)
          }
          
          resolve(locationData)
        },
        (geoError) => {
          const error: LocationError = {
            code: geoError.code,
            message: getErrorMessage(geoError.code),
          }

          setError(error)
          setIsLoading(false)

          // If we have a cached location, use it as a fallback so the UI can proceed.
          const cached = readLastKnownLocation()
          if (cached) {
            setLocation((prev) => prev ?? cached)
          }
          reject(error)
        },
        defaultOptions,
      )
    })
  }, [calculateDistance, getPlaceName, isNative, persistLastKnownLocation, readLastKnownLocation, requestLocationPermission])

  const watchLocation = useCallback((options?: PositionOptions): string | number => {
    if (isNative) {
      console.log("📍 Using Capacitor native geolocation (watch)")
        try {
          const start = async () => {
            const allowed = await requestLocationPermission()
            if (!allowed) return null
            const { Geolocation } = await import("@capacitor/geolocation")
            const id = await Geolocation.watchPosition(
            {
              enableHighAccuracy: true,
              timeout: options?.timeout ?? 15000,
              maximumAge: options?.maximumAge ?? 10000,
            },
            async (pos, err) => {
              if (err || !pos?.coords) {
                if (err) {
                  setError({ code: 2, message: err.message || getErrorMessage(2) })
                }
                const cached = readLastKnownLocation()
                if (cached) setLocation((prev) => prev ?? cached)
                return
              }
              const locationData: LocationData = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                timestamp: (pos as any).timestamp ?? Date.now(),
              }
              setLocation(locationData)
              setError(null)
              persistLastKnownLocation(locationData)
              const now = Date.now()
              const shouldLookup =
                !lastPlaceNameLookup.current ||
                calculateDistance(
                  lastPlaceNameLookup.current.lat,
                  lastPlaceNameLookup.current.lng,
                  locationData.latitude,
                  locationData.longitude,
                ) > 0.1 ||
                now - lastPlaceNameLookup.current.timestamp > 10000
              if (shouldLookup) {
                lastPlaceNameLookup.current = {
                  lat: locationData.latitude,
                  lng: locationData.longitude,
                  timestamp: now,
                }
                await getPlaceName(locationData.latitude, locationData.longitude)
              }
            },
            )
            return id
          }
          // Fire and return a placeholder id synchronously; page.tsx stores it and uses clearWatch later.
          // Since this hook is used only for side-effects, returning a string is acceptable.
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          start()
          return "cap-watch"
      } catch {
        return -1
      }
    }

    if (!navigator.geolocation) {
      setError({
        code: 0,
        message: "Geolocation is not supported by this browser",
      })
      return -1
    }

    // Optimize for mobile battery life while maintaining accuracy
    const isMobile = typeof window !== "undefined" && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    const defaultOptions: PositionOptions = {
      enableHighAccuracy: isMobile ? false : true, // Use lower accuracy on mobile to save battery
      timeout: isMobile ? 15000 : 10000, // Longer timeout on mobile for better reliability
      maximumAge: isMobile ? 30000 : 10000, // Cache location longer on mobile to reduce GPS usage
      ...options,
    }

    return navigator.geolocation.watchPosition(
      async (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        }

        setLocation(locationData)
        setError(null)
        persistLastKnownLocation(locationData)
        
        // Debounced place name lookup
        const now = Date.now()
        const shouldLookup = !lastPlaceNameLookup.current || 
          calculateDistance(
            lastPlaceNameLookup.current.lat, 
            lastPlaceNameLookup.current.lng,
            locationData.latitude, 
            locationData.longitude
          ) > 0.1 || // 100 meters
          now - lastPlaceNameLookup.current.timestamp > 10000 // 10 seconds
        
        if (shouldLookup) {
          lastPlaceNameLookup.current = {
            lat: locationData.latitude,
            lng: locationData.longitude,
            timestamp: now
          }
          await getPlaceName(locationData.latitude, locationData.longitude)
        }
      },
      (geoError) => {
        const error: LocationError = {
          code: geoError.code,
          message: getErrorMessage(geoError.code),
        }
        setError(error)

        // Keep last known location if watchPosition fails intermittently.
        const cached = readLastKnownLocation()
        if (cached) {
          setLocation((prev) => prev ?? cached)
        }
      },
      defaultOptions,
    )
  }, [calculateDistance, getPlaceName, isNative, persistLastKnownLocation, readLastKnownLocation, requestLocationPermission])

  const clearWatch = useCallback((watchId: string | number) => {
    if (isNative) {
      ;(async () => {
        try {
          const { Geolocation } = await import("@capacitor/geolocation")
          await Geolocation.clearWatch({ id: String(watchId) })
        } catch {
          // ignore
        }
      })()
      return
    }
    if (navigator.geolocation && typeof watchId === "number") {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [isNative])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      if (isNative) {
        console.log("📍 Using Capacitor native geolocation (requestPermissions)")
        const { Geolocation } = await import("@capacitor/geolocation")
        const res = await Geolocation.requestPermissions()
        const state = (res as any)?.location
        if (state === "granted" || state === "denied" || state === "prompt" || state === "prompt-with-rationale") {
          setPermissionStatus(state as any)
        }
        return state === "granted"
      }

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
  }, [getCurrentLocation, isNative])

  // Utility functions

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
    placeName,
    getCurrentLocation,
    watchLocation,
    clearWatch,
    requestPermission,
    getPlaceName,
    calculateDistance,
    formatCoordinates,
    isLocationStale,
  }
}
