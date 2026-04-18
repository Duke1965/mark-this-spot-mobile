"use client"

import { useState, useEffect, useCallback } from "react"

interface ProactiveAIProps {
  userLocation: { latitude: number; longitude: number } | null
  pins: any[]
  isMoving: boolean
  lastActivity: string
  onSuggestionAction: (action: string, data?: any) => void
  onNotificationTap: () => void
}

interface TopNotification {
  id: string
  message: string
  icon: string
  color: string
  timestamp: number
}

export function ProactiveAI(props: ProactiveAIProps) {
  const { userLocation, pins, isMoving } = props
  const [topNotification, setTopNotification] = useState<TopNotification | null>(null)
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())
  const [lastLocationCheck, setLastLocationCheck] = useState<{ lat: number; lng: number; time: number } | null>(null)

  // Generate contextual suggestions (notifications only — no non-place “recommendations” for the map/list hub)
  const generateSuggestions = useCallback(() => {
    const now = Date.now()
    const currentHour = new Date().getHours()

    // 1. LOCATION-BASED SUGGESTIONS
    if (userLocation && !isMoving) {
      if (
        !lastLocationCheck ||
        Math.abs(userLocation.latitude - lastLocationCheck.lat) > 0.001 ||
        Math.abs(userLocation.longitude - lastLocationCheck.lng) > 0.001
      ) {
        if (!dismissedSuggestions.has("location-pin-worthy")) {
          setTopNotification({
            id: "location-pin-worthy",
            message: "📍 Pin-worthy spot detected nearby!",
            icon: "📍",
            color: "#1e3a8a",
            timestamp: now,
          })

          setDismissedSuggestions((prev) => new Set([...prev, "location-pin-worthy"]))
        }

        setLastLocationCheck({ lat: userLocation.latitude, lng: userLocation.longitude, time: now })
      }
    }

    // 2. TIME-BASED SUGGESTIONS
    if ((currentHour >= 6 && currentHour <= 8) || (currentHour >= 17 && currentHour <= 19)) {
      if (!dismissedSuggestions.has("golden-hour")) {
        setTopNotification({
          id: "golden-hour",
          message: "✨ Perfect golden hour for photos!",
          icon: "✨",
          color: "#1e3a8a",
          timestamp: now,
        })

        setDismissedSuggestions((prev) => new Set([...prev, "golden-hour"]))
      }
    }

    if (currentHour >= 11 && currentHour <= 14) {
      if (!dismissedSuggestions.has("lunch-discovery")) {
        setTopNotification({
          id: "lunch-discovery",
          message: "🍽️ Great time to discover lunch spots!",
          icon: "🍽️",
          color: "#1e3a8a",
          timestamp: now,
        })

        setDismissedSuggestions((prev) => new Set([...prev, "lunch-discovery"]))
      }
    }

    // 3. PATTERN-BASED SUGGESTIONS
    const pinsWithMedia = pins.filter((p) => p.mediaUrl)
    if (pinsWithMedia.length >= 3 && !dismissedSuggestions.has("create-story")) {
      setTopNotification({
        id: "create-story",
        message: `📖 Ready to create a story from ${pinsWithMedia.length} pins?`,
        icon: "📖",
        color: "#1e3a8a",
        timestamp: now,
      })

      setDismissedSuggestions((prev) => new Set([...prev, "create-story"]))
    }

    if (pins.length === 1 && !dismissedSuggestions.has("encourage-pinning")) {
      setTopNotification({
        id: "encourage-pinning",
        message: "🎯 Great start! Ready to pin another spot?",
        icon: "🎯",
        color: "#1e3a8a",
        timestamp: now,
      })

      setDismissedSuggestions((prev) => new Set([...prev, "encourage-pinning"]))
    }

    // 4. CONTENT SUGGESTIONS
    if (currentHour >= 16 && currentHour <= 20 && !dismissedSuggestions.has("video-time")) {
      setTopNotification({
        id: "video-time",
        message: "🎥 Perfect evening atmosphere for video!",
        icon: "🎥",
        color: "#1e3a8a",
        timestamp: now,
      })

      setDismissedSuggestions((prev) => new Set([...prev, "video-time"]))
    }

    setTimeout(() => {
      setDismissedSuggestions(new Set())
    }, 600000)
  }, [userLocation, pins, isMoving, dismissedSuggestions, lastLocationCheck])

  useEffect(() => {
    generateSuggestions()

    const isMobile = typeof window !== "undefined" && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    const intervalTime = isMobile ? 120000 : 60000

    const interval = setInterval(generateSuggestions, intervalTime)
    return () => clearInterval(interval)
  }, [generateSuggestions])

  useEffect(() => {
    if (topNotification) {
      const timer = setTimeout(() => {
        setTopNotification(null)
      }, 4000)

      return () => clearTimeout(timer)
    }
  }, [topNotification])

  // Don't render anything - notifications disabled for now
  return null
}
