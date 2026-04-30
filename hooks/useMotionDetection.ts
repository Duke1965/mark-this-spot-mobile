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
  const startedAtRef = useRef<number>(Date.now())
  const stableIsMovingRef = useRef<boolean>(false)
  const movingSinceRef = useRef<number | null>(null)
  const stoppedSinceRef = useRef<number | null>(null)

  // V1 tuning: reduce GPS-noise flicker.
  const SPEED_MOVING_KMH = 6 // ~5–8 km/h suggested; pick 6 as stable baseline
  const ON_DEBOUNCE_MS = 2500 // require movement sustained before turning ON
  const OFF_DEBOUNCE_MS = 4000 // require stop sustained before turning OFF
  const STARTUP_GRACE_MS = 4000 // ignore cached/early readings after app open
  const MAX_FIRST_READING_STALENESS_MS = 3000 // ignore obviously stale cached first reading

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

    // Optimize position history for mobile memory usage
    const isMobile = typeof window !== "undefined" && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    const maxPositions = isMobile ? 8 : 10 // Fewer positions on mobile to save memory
    
    // Keep only recent positions to prevent memory buildup
    if (history.length > maxPositions) {
      positionHistoryRef.current = history.slice(-maxPositions)
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

    // Candidate moving state (noise-resistant): require realistic speed
    // and some actual displacement over the sample window.
    const candidateMoving = avgSpeed >= SPEED_MOVING_KMH && totalDistance >= 0.02 // >= 20m over recent samples

    // Debounce to avoid flicker.
    const now = Date.now()
    const stable = stableIsMovingRef.current
    let nextStable = stable

    if (now - startedAtRef.current < STARTUP_GRACE_MS) {
      // On app open, avoid false "moving" from cached/stale readings.
      movingSinceRef.current = null
      stoppedSinceRef.current = null
      nextStable = false
    } else if (candidateMoving) {
      stoppedSinceRef.current = null
      if (!stable) {
        if (movingSinceRef.current === null) movingSinceRef.current = now
        if (now - movingSinceRef.current >= ON_DEBOUNCE_MS) nextStable = true
      } else {
        movingSinceRef.current = null
      }
    } else {
      movingSinceRef.current = null
      if (stable) {
        if (stoppedSinceRef.current === null) stoppedSinceRef.current = now
        if (now - stoppedSinceRef.current >= OFF_DEBOUNCE_MS) nextStable = false
      } else {
        stoppedSinceRef.current = null
      }
    }

    stableIsMovingRef.current = nextStable

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
      isMoving: nextStable,
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
      isMoving: nextStable,
      candidateMoving,
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

    // Reset state on app open/mount.
    startedAtRef.current = Date.now()
    stableIsMovingRef.current = false
    movingSinceRef.current = null
    stoppedSinceRef.current = null
    positionHistoryRef.current = []

    // Optimize motion detection for mobile battery life
    const isMobile = typeof window !== "undefined" && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    const options: PositionOptions = {
      enableHighAccuracy: isMobile ? false : true, // Lower accuracy on mobile saves significant battery
      timeout: isMobile ? 15000 : 10000, // More time for mobile GPS
      maximumAge: isMobile ? 15000 : 5000, // Cache longer on mobile to reduce GPS usage
    }

    const handlePosition = (position: GeolocationPosition) => {
      // Ignore obviously stale cached first reading (common after reopen).
      const now = Date.now()
      if (positionHistoryRef.current.length === 0 && now - position.timestamp > MAX_FIRST_READING_STALENESS_MS) {
        return
      }

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
