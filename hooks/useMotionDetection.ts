"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface MotionData {
  isMoving: boolean
  speed: number // km/h
  lastMovement: number
  totalDistance: number
}

export function useMotionDetection() {
  const [motionData, setMotionData] = useState<MotionData>({
    isMoving: false,
    speed: 0,
    lastMovement: Date.now(),
    totalDistance: 0,
  })

  const lastPositionRef = useRef<{ latitude: number; longitude: number; timestamp: number } | null>(null)
  const movementTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const watchIdRef = useRef<number | null>(null)

  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }, [])

  const updateMotionData = useCallback(
    (position: GeolocationPosition) => {
      const currentTime = Date.now()
      const currentPos = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: currentTime,
      }

      if (lastPositionRef.current) {
        const distance = calculateDistance(
          lastPositionRef.current.latitude,
          lastPositionRef.current.longitude,
          currentPos.latitude,
          currentPos.longitude,
        )

        const timeDiff = (currentTime - lastPositionRef.current.timestamp) / 1000 / 3600 // hours
        const speed = timeDiff > 0 ? distance / timeDiff : 0

        // Consider moving if speed > 1 km/h (walking pace)
        const isMoving = speed > 1

        setMotionData((prev) => ({
          isMoving,
          speed,
          lastMovement: isMoving ? currentTime : prev.lastMovement,
          totalDistance: prev.totalDistance + distance,
        }))

        // Clear existing timeout
        if (movementTimeoutRef.current) {
          clearTimeout(movementTimeoutRef.current)
        }

        // Set timeout to mark as stopped after 30 seconds of no significant movement
        if (isMoving) {
          movementTimeoutRef.current = setTimeout(() => {
            setMotionData((prev) => ({ ...prev, isMoving: false }))
          }, 30000)
        }

        console.log(`🚶‍♂️ Motion: ${isMoving ? "Moving" : "Stopped"}, Speed: ${speed.toFixed(2)} km/h`)
      }

      lastPositionRef.current = currentPos
    },
    [calculateDistance],
  )

  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported")
      return
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000, // Update every 5 seconds
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      updateMotionData,
      (error) => {
        console.error("Motion detection error:", error)
      },
      options,
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      if (movementTimeoutRef.current) {
        clearTimeout(movementTimeoutRef.current)
      }
    }
  }, [updateMotionData])

  return motionData
}
