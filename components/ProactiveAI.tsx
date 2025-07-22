"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { MapPin, Camera, BookOpen, Sparkles, X, Clock, Navigation } from "lucide-react"

interface ProactiveAIProps {
  userLocation: { latitude: number; longitude: number } | null
  pins: any[]
  isMoving: boolean
  lastActivity: string
  onSuggestionAction: (action: string, data?: any) => void
}

interface Suggestion {
  id: string
  type: "location" | "story" | "photo" | "time" | "pattern"
  title: string
  message: string
  action: string
  data?: any
  priority: number
  timestamp: number
}

export function ProactiveAI({ userLocation, pins, isMoving, lastActivity, onSuggestionAction }: ProactiveAIProps) {
  const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(null)
  const [suggestionHistory, setSuggestionHistory] = useState<string[]>([])
  const lastLocationRef = useRef<{ latitude: number; longitude: number } | null>(null)
  const movementTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Smart suggestion generation based on context
  const generateSuggestion = useCallback((): Suggestion | null => {
    const now = Date.now()
    const hour = new Date().getHours()

    // Avoid spam - don't show same type of suggestion within 5 minutes
    const recentSuggestions = suggestionHistory.filter((s) => now - Number.parseInt(s.split("-")[1]) < 300000)

    // 1. LOCATION-BASED SUGGESTIONS
    if (userLocation && lastLocationRef.current) {
      const distance = calculateDistance(
        lastLocationRef.current.latitude,
        lastLocationRef.current.longitude,
        userLocation.latitude,
        userLocation.longitude,
      )

      // User moved significant distance (>100m) and stopped
      if (distance > 0.1 && !isMoving && !recentSuggestions.some((s) => s.startsWith("location"))) {
        return {
          id: `location-${now}`,
          type: "location",
          title: "📍 Pin-Worthy Spot Detected!",
          message: "You've moved to a new location. This could be worth pinning!",
          action: "quick-pin",
          priority: 8,
          timestamp: now,
        }
      }
    }

    // 2. GOLDEN HOUR PHOTO SUGGESTIONS
    if ((hour >= 6 && hour <= 8) || (hour >= 17 && hour <= 19)) {
      if (!recentSuggestions.some((s) => s.startsWith("photo"))) {
        return {
          id: `photo-${now}`,
          type: "photo",
          title: "✨ Perfect Golden Hour!",
          message: "The lighting is magical right now - perfect for photos!",
          action: "open-camera",
          data: { mode: "photo" },
          priority: 7,
          timestamp: now,
        }
      }
    }

    // 3. STORY CREATION SUGGESTIONS
    if (pins.length >= 3 && !recentSuggestions.some((s) => s.startsWith("story"))) {
      const recentPins = pins.filter((p) => {
        const pinTime = new Date(p.timestamp).getTime()
        return now - pinTime < 86400000 // Last 24 hours
      })

      if (recentPins.length >= 3) {
        return {
          id: `story-${now}`,
          type: "story",
          title: "📖 Create Your Story!",
          message: `You've collected ${recentPins.length} pins today. Want to turn them into a story?`,
          action: "create-story",
          data: { pins: recentPins },
          priority: 6,
          timestamp: now,
        }
      }
    }

    // 4. TIME-BASED ACTIVITY SUGGESTIONS
    if (hour >= 12 && hour <= 14 && !recentSuggestions.some((s) => s.startsWith("time"))) {
      return {
        id: `time-${now}`,
        type: "time",
        title: "🍽️ Lunch Break Discovery",
        message: "Perfect time to discover local lunch spots nearby!",
        action: "discovery-mode",
        priority: 5,
        timestamp: now,
      }
    }

    // 5. PATTERN RECOGNITION
    if (pins.length > 0 && !recentSuggestions.some((s) => s.startsWith("pattern"))) {
      const lastPin = pins[pins.length - 1]
      const timeSinceLastPin = now - new Date(lastPin.timestamp).getTime()

      // User hasn't pinned in a while but is active
      if (timeSinceLastPin > 3600000 && isMoving) {
        // 1 hour
        return {
          id: `pattern-${now}`,
          type: "pattern",
          title: "🎯 Ready for Another Pin?",
          message: "You've been exploring! Found anything worth pinning?",
          action: "suggest-pin",
          priority: 4,
          timestamp: now,
        }
      }
    }

    return null
  }, [userLocation, pins, isMoving, suggestionHistory])

  // Monitor for suggestion triggers
  useEffect(() => {
    if (!activeSuggestion) {
      const suggestion = generateSuggestion()
      if (suggestion) {
        setActiveSuggestion(suggestion)
        setSuggestionHistory((prev) => [...prev, `${suggestion.type}-${suggestion.timestamp}`])
      }
    }
  }, [userLocation, isMoving, pins.length, generateSuggestion, activeSuggestion])

  // Update last location reference
  useEffect(() => {
    if (userLocation) {
      lastLocationRef.current = userLocation
    }
  }, [userLocation])

  // Auto-dismiss suggestions after 10 seconds
  useEffect(() => {
    if (activeSuggestion) {
      const timeout = setTimeout(() => {
        setActiveSuggestion(null)
      }, 10000)

      return () => clearTimeout(timeout)
    }
  }, [activeSuggestion])

  const handleSuggestionAction = useCallback(
    (action: string, data?: any) => {
      onSuggestionAction(action, data)
      setActiveSuggestion(null)
    },
    [onSuggestionAction],
  )

  const dismissSuggestion = useCallback(() => {
    setActiveSuggestion(null)
  }, [])

  // Helper function to calculate distance
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  if (!activeSuggestion) return null

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "location":
        return <MapPin size={24} />
      case "photo":
        return <Camera size={24} />
      case "story":
        return <BookOpen size={24} />
      case "time":
        return <Clock size={24} />
      case "pattern":
        return <Navigation size={24} />
      default:
        return <Sparkles size={24} />
    }
  }

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case "location":
        return "#10B981"
      case "photo":
        return "#F59E0B"
      case "story":
        return "#8B5CF6"
      case "time":
        return "#3B82F6"
      case "pattern":
        return "#EF4444"
      default:
        return "#6B7280"
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        top: "5rem",
        left: "1rem",
        right: "1rem",
        zIndex: 50,
        pointerEvents: "auto",
      }}
    >
      {/* Smart Suggestion Card */}
      <div
        style={{
          background: "rgba(0,0,0,0.9)",
          borderRadius: "1rem",
          padding: "1rem",
          color: "white",
          backdropFilter: "blur(10px)",
          border: `2px solid ${getSuggestionColor(activeSuggestion.type)}`,
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          animation: "slideInFromTop 0.5s ease-out",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
          {/* Icon */}
          <div
            style={{
              padding: "0.5rem",
              borderRadius: "50%",
              background: getSuggestionColor(activeSuggestion.type),
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {getSuggestionIcon(activeSuggestion.type)}
          </div>

          {/* Content */}
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", fontWeight: "bold" }}>{activeSuggestion.title}</h3>
            <p style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", opacity: 0.9 }}>{activeSuggestion.message}</p>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => handleSuggestionAction(activeSuggestion.action, activeSuggestion.data)}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: getSuggestionColor(activeSuggestion.type),
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: "bold",
                }}
              >
                {activeSuggestion.action === "quick-pin" && "📍 Pin It!"}
                {activeSuggestion.action === "open-camera" && "📸 Take Photo"}
                {activeSuggestion.action === "create-story" && "📖 Create Story"}
                {activeSuggestion.action === "discovery-mode" && "🌐 Discover"}
                {activeSuggestion.action === "suggest-pin" && "🎯 Pin Something"}
              </button>

              <button
                onClick={dismissSuggestion}
                style={{
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Priority Indicator */}
        <div
          style={{
            position: "absolute",
            top: "0.5rem",
            right: "0.5rem",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: getSuggestionColor(activeSuggestion.type),
            opacity: activeSuggestion.priority / 10,
          }}
        />
      </div>

      <style jsx>{`
        @keyframes slideInFromTop {
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
