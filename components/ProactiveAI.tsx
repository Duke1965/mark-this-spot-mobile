"use client"

import { useState, useEffect, useCallback } from "react"
import { X } from "lucide-react"

interface ProactiveAIProps {
  userLocation: { latitude: number; longitude: number } | null
  pins: any[]
  isMoving: boolean
  lastActivity: string
  onSuggestionAction: (action: string, data?: any) => void
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

export function ProactiveAI({ userLocation, pins, isMoving, lastActivity, onSuggestionAction }: ProactiveAIProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(null)
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())
  const [lastLocationCheck, setLastLocationCheck] = useState<{ lat: number; lng: number; time: number } | null>(null)

  // Generate contextual suggestions based on current state
  const generateSuggestions = useCallback(() => {
    const now = Date.now()
    const currentHour = new Date().getHours()
    const newSuggestions: Suggestion[] = []

    // 1. LOCATION-BASED SUGGESTIONS
    if (userLocation && !isMoving) {
      // Check if user has moved significantly since last check
      if (
        !lastLocationCheck ||
        Math.abs(userLocation.latitude - lastLocationCheck.lat) > 0.001 ||
        Math.abs(userLocation.longitude - lastLocationCheck.lng) > 0.001
      ) {
        newSuggestions.push({
          id: "location-pin-worthy",
          type: "location",
          title: "📍 Pin-worthy spot detected!",
          description: "This looks like a great place to remember",
          action: "quick-pin",
          priority: 8,
          icon: "📍",
          color: "#10B981",
          timestamp: now,
        })

        setLastLocationCheck({ lat: userLocation.latitude, lng: userLocation.longitude, time: now })
      }
    }

    // 2. TIME-BASED SUGGESTIONS
    // Golden hour photography (6-8am, 5-7pm)
    if ((currentHour >= 6 && currentHour <= 8) || (currentHour >= 17 && currentHour <= 19)) {
      if (!dismissedSuggestions.has("golden-hour")) {
        newSuggestions.push({
          id: "golden-hour",
          type: "time",
          title: "✨ Perfect golden hour lighting!",
          description: "Ideal time for stunning photos",
          action: "open-camera",
          data: { mode: "photo" },
          priority: 7,
          icon: "✨",
          color: "#F59E0B",
          timestamp: now,
        })
      }
    }

    // Lunch discovery (11am-2pm)
    if (currentHour >= 11 && currentHour <= 14) {
      if (!dismissedSuggestions.has("lunch-discovery")) {
        newSuggestions.push({
          id: "lunch-discovery",
          type: "time",
          title: "🍽️ Lunch break discovery time!",
          description: "Find great nearby restaurants",
          action: "discovery-mode",
          priority: 6,
          icon: "🍽️",
          color: "#EF4444",
          timestamp: now,
        })
      }
    }

    // 3. PATTERN-BASED SUGGESTIONS
    // Story creation when user has 3+ pins with media
    const pinsWithMedia = pins.filter((p) => p.mediaUrl)
    if (pinsWithMedia.length >= 3 && !dismissedSuggestions.has("create-story")) {
      newSuggestions.push({
        id: "create-story",
        type: "pattern",
        title: "📖 Ready to create your story?",
        description: `Turn your ${pinsWithMedia.length} pins into a beautiful story`,
        action: "create-story",
        priority: 7,
        icon: "📖",
        color: "#8B5CF6",
        timestamp: now,
      })
    }

    // Encourage more pinning after first pin
    if (pins.length === 1 && !dismissedSuggestions.has("encourage-pinning")) {
      newSuggestions.push({
        id: "encourage-pinning",
        type: "pattern",
        title: "🎯 Great start! Pin another spot?",
        description: "Build your collection of memorable places",
        action: "suggest-pin",
        priority: 5,
        icon: "🎯",
        color: "#06B6D4",
        timestamp: now,
      })
    }

    // 4. CONTENT SUGGESTIONS
    // Video suggestion during interesting times
    if (currentHour >= 16 && currentHour <= 20 && !dismissedSuggestions.has("video-time")) {
      newSuggestions.push({
        id: "video-time",
        type: "content",
        title: "🎥 Perfect time for video content!",
        description: "Capture the evening atmosphere",
        action: "open-camera",
        data: { mode: "video" },
        priority: 6,
        icon: "🎥",
        color: "#EC4899",
        timestamp: now,
      })
    }

    // 5. ACTIVITY-BASED SUGGESTIONS
    // Suggest discovery after camera use
    if (lastActivity.includes("camera") && !dismissedSuggestions.has("post-camera-discovery")) {
      newSuggestions.push({
        id: "post-camera-discovery",
        type: "social",
        title: "🌐 Discover more nearby gems?",
        description: "Find other photo-worthy spots around here",
        action: "discovery-mode",
        priority: 6,
        icon: "🌐",
        color: "#10B981",
        timestamp: now,
      })
    }

    // Sort by priority and take top suggestion
    const sortedSuggestions = newSuggestions.sort((a, b) => b.priority - a.priority)
    setSuggestions(sortedSuggestions)

    // Show highest priority suggestion if not already showing one
    if (sortedSuggestions.length > 0 && !activeSuggestion) {
      setActiveSuggestion(sortedSuggestions[0])
    }
  }, [userLocation, pins, isMoving, lastActivity, dismissedSuggestions, lastLocationCheck, activeSuggestion])

  // Run suggestion generation periodically
  useEffect(() => {
    generateSuggestions()

    const interval = setInterval(generateSuggestions, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [generateSuggestions])

  // Auto-dismiss suggestions after 10 seconds
  useEffect(() => {
    if (activeSuggestion) {
      const timer = setTimeout(() => {
        setActiveSuggestion(null)
      }, 10000)

      return () => clearTimeout(timer)
    }
  }, [activeSuggestion])

  // Handle suggestion action
  const handleSuggestionAction = useCallback(
    (suggestion: Suggestion) => {
      console.log("🤖 Proactive AI: User accepted suggestion:", suggestion.title)
      onSuggestionAction(suggestion.action, suggestion.data)
      setActiveSuggestion(null)

      // Mark as dismissed to prevent immediate re-showing
      setDismissedSuggestions((prev) => new Set([...prev, suggestion.id]))

      // Clear dismissal after 5 minutes to allow re-suggestions
      setTimeout(() => {
        setDismissedSuggestions((prev) => {
          const newSet = new Set(prev)
          newSet.delete(suggestion.id)
          return newSet
        })
      }, 300000)
    },
    [onSuggestionAction],
  )

  // Handle suggestion dismissal
  const handleDismiss = useCallback((suggestion: Suggestion) => {
    console.log("🤖 Proactive AI: User dismissed suggestion:", suggestion.title)
    setActiveSuggestion(null)
    setDismissedSuggestions((prev) => new Set([...prev, suggestion.id]))

    // Clear dismissal after 10 minutes for less intrusive suggestions
    setTimeout(() => {
      setDismissedSuggestions((prev) => {
        const newSet = new Set(prev)
        newSet.delete(suggestion.id)
        return newSet
      })
    }, 600000)
  }, [])

  // Don't render if no active suggestion
  if (!activeSuggestion) return null

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 1000,
        maxWidth: "320px",
        width: "90%",
      }}
    >
      {/* Suggestion Card */}
      <div
        style={{
          background: "rgba(0, 0, 0, 0.95)",
          borderRadius: "1rem",
          padding: "1.5rem",
          color: "white",
          backdropFilter: "blur(20px)",
          border: `2px solid ${activeSuggestion.color}`,
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px ${activeSuggestion.color}40`,
          animation: "slideInScale 0.3s ease-out",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                fontSize: "1.5rem",
                background: activeSuggestion.color,
                borderRadius: "50%",
                width: "2.5rem",
                height: "2.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {activeSuggestion.icon}
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                AI Suggestion
              </div>
            </div>
          </div>
          <button
            onClick={() => handleDismiss(activeSuggestion)}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              borderRadius: "50%",
              width: "2rem",
              height: "2rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.1rem", fontWeight: "bold" }}>{activeSuggestion.title}</h3>
          <p style={{ margin: 0, fontSize: "0.9rem", opacity: 0.8, lineHeight: 1.4 }}>{activeSuggestion.description}</p>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={() => handleSuggestionAction(activeSuggestion)}
            style={{
              flex: 1,
              background: activeSuggestion.color,
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.75rem 1rem",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "0.9rem",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)"
              e.currentTarget.style.boxShadow = `0 4px 12px ${activeSuggestion.color}40`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)"
              e.currentTarget.style.boxShadow = "none"
            }}
          >
            {getActionText(activeSuggestion.action)}
          </button>
          <button
            onClick={() => handleDismiss(activeSuggestion)}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.75rem 1rem",
              color: "white",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Later
          </button>
        </div>

        {/* Priority Indicator */}
        <div
          style={{
            position: "absolute",
            top: "-2px",
            right: "-2px",
            background: activeSuggestion.color,
            borderRadius: "50%",
            width: "1.5rem",
            height: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.7rem",
            fontWeight: "bold",
          }}
        >
          {activeSuggestion.priority}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInScale {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
    </div>
  )
}

// Helper function to get action button text
function getActionText(action: string): string {
  switch (action) {
    case "quick-pin":
      return "📍 Pin It!"
    case "open-camera":
      return "📸 Open Camera"
    case "create-story":
      return "📖 Create Story"
    case "discovery-mode":
      return "🌐 Discover"
    case "suggest-pin":
      return "💡 Show Me"
    default:
      return "✨ Let's Go!"
  }
}
