"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface MotionData {
  isMoving: boolean
  speed: number // km/h
  acceleration: number
  lastPosition: { latitude: number; longitude: number; timestamp: number } | null
  confidence: number // 0-1, how confident we are in the motion detection
}

export function useMotionDetection() {
  const [motionData, setMotionData] = useState<MotionData>({
    isMoving: false,
    speed: 0,
    acceleration: 0,
    lastPosition: null,
    confidence: 0,
  })

  const positionHistoryRef = useRef<Array<{ lat: number; lng: number; timestamp: number; accuracy: number }>>([])
  const watchIdRef = useRef<number | null>(null)

  // Calculate distance between two points in kilometers
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

  // Analyze motion from position history
  const analyzeMotion = useCallback(() => {
    const history = positionHistoryRef.current
    if (history.length < 2) return

    // Keep only last 10 positions (about 1-2 minutes of data)
    if (history.length > 10) {
      positionHistoryRef.current = history.slice(-10)
    }

    const recent = history.slice(-3) // Last 3 positions for motion detection
    if (recent.length < 2) return

    let totalDistance = 0
    let totalTime = 0
    const speeds: number[] = []

    // Calculate speeds between consecutive points
    for (let i = 1; i < recent.length; i++) {
      const prev = recent[i - 1]
      const curr = recent[i]

      const distance = calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng)
      const timeDiff = (curr.timestamp - prev.timestamp) / 1000 / 3600 // hours

      if (timeDiff > 0) {
        const speed = distance / timeDiff // km/h
        speeds.push(speed)
        totalDistance += distance
        totalTime += timeDiff
      }
    }

    if (speeds.length === 0) return

    // Calculate average speed
    const avgSpeed = totalTime > 0 ? totalDistance / totalTime : 0

    // Determine if moving (threshold: 1 km/h = ~0.28 m/s)
    const isMoving = avgSpeed > 1 && totalDistance > 0.01 // Moving faster than 1 km/h and moved at least 10m

    // Calculate acceleration (change in speed)
    let acceleration = 0
    if (speeds.length >= 2) {
      const recentSpeed = speeds[speeds.length - 1]
      const prevSpeed = speeds[speeds.length - 2]
      acceleration = recentSpeed - prevSpeed
    }

    // Confidence based on GPS accuracy and consistency
    const avgAccuracy = recent.reduce((sum, pos) => sum + pos.accuracy, 0) / recent.length
    const confidence = Math.max(0, Math.min(1, (100 - avgAccuracy) / 100)) // Better accuracy = higher confidence

    setMotionData({
      isMoving,
      speed: Math.max(0, avgSpeed),
      acceleration,
      lastPosition: recent[recent.length - 1]
        ? {
            latitude: recent[recent.length - 1].lat,
            longitude: recent[recent.length - 1].lng,
            timestamp: recent[recent.length - 1].timestamp,
          }
        : null,
      confidence,
    })

    console.log("🚶‍♂️ Motion Analysis:", {
      isMoving,
      speed: avgSpeed.toFixed(2) + " km/h",
      distance: (totalDistance * 1000).toFixed(0) + "m",
      confidence: (confidence * 100).toFixed(0) + "%",
    })
  }, [calculateDistance])

  // Start motion detection
  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported")
      return
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000, // 5 seconds
    }

    const handlePosition = (position: GeolocationPosition) => {
      const newPosition = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        timestamp: position.timestamp,
        accuracy: position.coords.accuracy,
      }

      positionHistoryRef.current.push(newPosition)
      analyzeMotion()
    }

    const handleError = (error: GeolocationPositionError) => {
      console.warn("Motion detection error:", error.message)
    }

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(handlePosition, handleError, options)

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [analyzeMotion])

  // Clean up old positions periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now()
      positionHistoryRef.current = positionHistoryRef.current.filter(
        (pos) => now - pos.timestamp < 300000, // Keep last 5 minutes
      )
    }, 60000) // Clean up every minute

    return () => clearInterval(cleanup)
  }, [])

  return motionData
}
