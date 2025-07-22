"use client"

import { useState, useEffect, useCallback } from "react"

interface ProactiveAIProps {
  userLocation: { latitude: number; longitude: number } | null
  pins: any[]
  isMoving: boolean
  lastActivity: string
  onSuggestionAction: (action: string, data?: any) => void
  onRecommendationGenerated: (recommendations: any[]) => void
}

interface Suggestion {
  id: string
  type: "location" | "time" | "pattern" | "content" | "social"
  title: string
  description: string
  action: string
  data?: any
  priority: number
  icon: string
  color: string
  timestamp: number
}

interface TopNotification {
  id: string
  message: string
  icon: string
  color: string
  timestamp: number
}

export function ProactiveAI({
  userLocation,
  pins,
  isMoving,
  lastActivity,
  onSuggestionAction,
  onRecommendationGenerated,
}: ProactiveAIProps) {
  const [topNotification, setTopNotification] = useState<TopNotification | null>(null)
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())
  const [lastLocationCheck, setLastLocationCheck] = useState<{ lat: number; lng: number; time: number } | null>(null)
  const [pendingRecommendations, setPendingRecommendations] = useState<any[]>([])

  // Generate contextual suggestions and recommendations
  const generateSuggestions = useCallback(() => {
    const now = Date.now()
    const currentHour = new Date().getHours()
    const recommendations: any[] = []

    // 1. LOCATION-BASED SUGGESTIONS
    if (userLocation && !isMoving) {
      // Check if user has moved significantly since last check
      if (
        !lastLocationCheck ||
        Math.abs(userLocation.latitude - lastLocationCheck.lat) > 0.001 ||
        Math.abs(userLocation.longitude - lastLocationCheck.lng) > 0.001
      ) {
        if (!dismissedSuggestions.has("location-pin-worthy")) {
          // Show subtle notification
          setTopNotification({
            id: "location-pin-worthy",
            message: "📍 Pin-worthy spot detected nearby!",
            icon: "📍",
            color: "#10B981",
            timestamp: now,
          })

          // Add to recommendations for discovery panel
          recommendations.push({
            id: `suggestion-${now}`,
            type: "ai-suggestion",
            title: "📍 Current Location",
            description: "AI detected this as a pin-worthy spot",
            action: "quick-pin",
            priority: 8,
            color: "#10B981",
            isAISuggestion: true,
          })

          setDismissedSuggestions((prev) => new Set([...prev, "location-pin-worthy"]))
        }

        setLastLocationCheck({ lat: userLocation.latitude, lng: userLocation.longitude, time: now })
      }
    }

    // 2. TIME-BASED SUGGESTIONS
    // Golden hour photography (6-8am, 5-7pm)
    if ((currentHour >= 6 && currentHour <= 8) || (currentHour >= 17 && currentHour <= 19)) {
      if (!dismissedSuggestions.has("golden-hour")) {
        setTopNotification({
          id: "golden-hour",
          message: "✨ Perfect golden hour for photos!",
          icon: "✨",
          color: "#F59E0B",
          timestamp: now,
        })

        recommendations.push({
          id: `golden-hour-${now}`,
          type: "ai-suggestion",
          title: "✨ Golden Hour Photography",
          description: "Perfect lighting conditions detected",
          action: "open-camera",
          data: { mode: "photo" },
          priority: 7,
          color: "#F59E0B",
          isAISuggestion: true,
        })

        setDismissedSuggestions((prev) => new Set([...prev, "golden-hour"]))
      }
    }

    // Lunch discovery (11am-2pm)
    if (currentHour >= 11 && currentHour <= 14) {
      if (!dismissedSuggestions.has("lunch-discovery")) {
        setTopNotification({
          id: "lunch-discovery",
          message: "🍽️ Great time to discover lunch spots!",
          icon: "🍽️",
          color: "#EF4444",
          timestamp: now,
        })

        recommendations.push({
          id: `lunch-${now}`,
          type: "ai-suggestion",
          title: "🍽️ Lunch Break Discovery",
          description: "Find great restaurants nearby",
          action: "discovery-mode",
          priority: 6,
          color: "#EF4444",
          isAISuggestion: true,
        })

        setDismissedSuggestions((prev) => new Set([...prev, "lunch-discovery"]))
      }
    }

    // 3. PATTERN-BASED SUGGESTIONS
    // Story creation when user has 3+ pins with media
    const pinsWithMedia = pins.filter((p) => p.mediaUrl)
    if (pinsWithMedia.length >= 3 && !dismissedSuggestions.has("create-story")) {
      setTopNotification({
        id: "create-story",
        message: `📖 Ready to create a story from ${pinsWithMedia.length} pins?`,
        icon: "📖",
        color: "#8B5CF6",
        timestamp: now,
      })

      recommendations.push({
        id: `story-${now}`,
        type: "ai-suggestion",
        title: "📖 Create Your Story",
        description: `Turn your ${pinsWithMedia.length} pins into a beautiful story`,
        action: "create-story",
        priority: 7,
        color: "#8B5CF6",
        isAISuggestion: true,
      })

      setDismissedSuggestions((prev) => new Set([...prev, "create-story"]))
    }

    // Encourage more pinning after first pin
    if (pins.length === 1 && !dismissedSuggestions.has("encourage-pinning")) {
      setTopNotification({
        id: "encourage-pinning",
        message: "🎯 Great start! Ready to pin another spot?",
        icon: "🎯",
        color: "#06B6D4",
        timestamp: now,
      })

      recommendations.push({
        id: `encourage-${now}`,
        type: "ai-suggestion",
        title: "🎯 Build Your Collection",
        description: "Great start! Pin more memorable places",
        action: "suggest-pin",
        priority: 5,
        color: "#06B6D4",
        isAISuggestion: true,
      })

      setDismissedSuggestions((prev) => new Set([...prev, "encourage-pinning"]))
    }

    // 4. CONTENT SUGGESTIONS
    // Video suggestion during interesting times
    if (currentHour >= 16 && currentHour <= 20 && !dismissedSuggestions.has("video-time")) {
      setTopNotification({
        id: "video-time",
        message: "🎥 Perfect evening atmosphere for video!",
        icon: "🎥",
        color: "#EC4899",
        timestamp: now,
      })

      recommendations.push({
        id: `video-${now}`,
        type: "ai-suggestion",
        title: "🎥 Evening Video Content",
        description: "Capture the perfect evening atmosphere",
        action: "open-camera",
        data: { mode: "video" },
        priority: 6,
        color: "#EC4899",
        isAISuggestion: true,
      })

      setDismissedSuggestions((prev) => new Set([...prev, "video-time"]))
    }

    // Send recommendations to parent component for discovery panel
    if (recommendations.length > 0) {
      setPendingRecommendations((prev) => [...prev, ...recommendations])
      onRecommendationGenerated(recommendations)
    }

    // Clear dismissed suggestions after 10 minutes to allow re-suggestions
    setTimeout(() => {
      setDismissedSuggestions(new Set())
    }, 600000)
  }, [userLocation, pins, isMoving, lastActivity, dismissedSuggestions, lastLocationCheck, onRecommendationGenerated])

  // Run suggestion generation periodically
  useEffect(() => {
    generateSuggestions()

    const interval = setInterval(generateSuggestions, 60000) // Check every minute (less frequent)
    return () => clearInterval(interval)
  }, [generateSuggestions])

  // Auto-dismiss top notifications after 4 seconds
  useEffect(() => {
    if (topNotification) {
      const timer = setTimeout(() => {
        setTopNotification(null)
      }, 4000) // Shorter duration for less distraction

      return () => clearTimeout(timer)
    }
  }, [topNotification])

  // Handle notification tap (optional quick action)
  const handleNotificationTap = useCallback(() => {
    if (topNotification) {
      // For now, just dismiss and let user use discovery panel
      setTopNotification(null)
      console.log("🤖 User tapped notification - check discovery panel for details")
    }
  }, [topNotification])

  // Don't render if no active notification
  if (!topNotification) return null

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        pointerEvents: "auto",
      }}
    >
      {/* WhatsApp-style Top Notification Bar */}
      <div
        onClick={handleNotificationTap}
        style={{
          background: `linear-gradient(135deg, ${topNotification.color}E6, ${topNotification.color}CC)`,
          color: "white",
          padding: "0.75rem 1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          cursor: "pointer",
          backdropFilter: "blur(10px)",
          borderBottom: `2px solid ${topNotification.color}`,
          animation: "slideDownFade 0.3s ease-out",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        {/* Icon */}
        <div
          style={{
            fontSize: "1.2rem",
            flexShrink: 0,
          }}
        >
          {topNotification.icon}
        </div>

        {/* Message */}
        <div style={{ flex: 1, fontSize: "0.9rem", fontWeight: "500" }}>{topNotification.message}</div>

        {/* Subtle indicator */}
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.8)",
            flexShrink: 0,
          }}
        />
      </div>

      <style jsx>{`
        @keyframes slideDownFade {
          0% {
            transform: translateY(-100%);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
