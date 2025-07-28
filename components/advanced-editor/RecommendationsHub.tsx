"use client"

import { useState, useCallback } from "react"
import { ArrowLeft, Clock, MapPin, Camera, Sparkles, X, Navigation } from "lucide-react"

interface Recommendation {
  id: string
  type: string
  title: string
  description: string
  action: string
  data?: any
  priority: number
  color: string
  isAISuggestion?: boolean
  timestamp: number
  category: string
  isCompleted?: boolean
  place?: {
    id: string
    title: string
    description?: string
    latitude: number
    longitude: number
    rating?: number
    priceLevel?: number
    types?: string[]
    googlePlaceId?: string
    mediaUrl?: string | null
    vicinity?: string
  }
}

interface RecommendationsHubProps {
  recommendations: Recommendation[]
  onBack: () => void
  onActionTaken: (action: string, data?: any) => void
  onRecommendationDismiss: (id: string) => void
  onRecommendationComplete: (id: string) => void
  onPlaceNavigation: (place: any) => void
}

export function RecommendationsHub({
  recommendations,
  onBack,
  onActionTaken,
  onRecommendationDismiss,
  onRecommendationComplete,
  onPlaceNavigation,
}: RecommendationsHubProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [sortBy, setSortBy] = useState<"priority" | "time">("priority")

  // Get unique categories
  const categories = ["All", ...Array.from(new Set(recommendations.map((r) => r.category)))]

  // Filter and sort recommendations
  const filteredRecommendations = recommendations
    .filter((r) => selectedCategory === "All" || r.category === selectedCategory)
    .filter((r) => !r.isCompleted) // Hide completed ones
    .sort((a, b) => {
      if (sortBy === "priority") {
        return b.priority - a.priority
      } else {
        return b.timestamp - a.timestamp
      }
    })

  const completedCount = recommendations.filter((r) => r.isCompleted).length

  const handleActionTap = useCallback(
    (recommendation: Recommendation) => {
      console.log("🎯 Taking action on recommendation:", recommendation.title)

      // If it's a place recommendation, handle navigation
      if (recommendation.place) {
        onPlaceNavigation(recommendation.place)
        onRecommendationComplete(recommendation.id)
        return
      }

      onActionTaken(recommendation.action, recommendation.data)
      onRecommendationComplete(recommendation.id)
    },
    [onActionTaken, onRecommendationComplete, onPlaceNavigation],
  )

  const getActionButtonText = useCallback((recommendation: Recommendation): string => {
    if (recommendation.place) {
      return "🗺️ View Place"
    }

    switch (recommendation.action) {
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
  }, [])

  const getActionIcon = useCallback((recommendation: Recommendation) => {
    if (recommendation.place) {
      return <Navigation size={16} />
    }

    switch (recommendation.action) {
      case "quick-pin":
        return <MapPin size={16} />
      case "open-camera":
        return <Camera size={16} />
      case "create-story":
        return <Sparkles size={16} />
      case "discovery-mode":
        return <MapPin size={16} />
      default:
        return <Sparkles size={16} />
    }
  }, [])

  const formatTimeAgo = useCallback((timestamp: number): string => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return new Date(timestamp).toLocaleDateString()
  }, [])

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #581c87 100%)",
        display: "flex",
        flexDirection: "column",
        color: "white",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1rem",
          background: "rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            onClick={onBack}
            style={{
              padding: "0.5rem",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              cursor: "pointer",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "bold" }}>🤖 AI Recommendations</h1>
            <p style={{ margin: 0, fontSize: "0.875rem", opacity: 0.7 }}>
              {filteredRecommendations.length} active • {completedCount} completed
            </p>
          </div>
        </div>

        {/* Sort Toggle */}
        <button
          onClick={() => setSortBy(sortBy === "priority" ? "time" : "priority")}
          style={{
            padding: "0.5rem 1rem",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
            borderRadius: "8px",
            fontSize: "0.875rem",
          }}
        >
          {sortBy === "priority" ? "🔥 Priority" : "⏰ Recent"}
        </button>
      </div>

      {/* Category Filter */}
      <div
        style={{
          padding: "1rem",
          background: "rgba(0,0,0,0.2)",
          overflowX: "auto",
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem", minWidth: "max-content" }}>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              style={{
                padding: "0.5rem 1rem",
                border: "none",
                background: selectedCategory === category ? "#1e3a8a" : "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                borderRadius: "1rem",
                fontSize: "0.875rem",
                fontWeight: selectedCategory === category ? "bold" : "normal",
                whiteSpace: "nowrap",
              }}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Recommendations List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
        {filteredRecommendations.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem", color: "white" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🤖</div>
            <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.5rem" }}>No Active Recommendations</h2>
            <p style={{ margin: 0, opacity: 0.7 }}>
              {completedCount > 0
                ? `Great job! You've completed ${completedCount} recommendations.`
                : "AI will suggest personalized recommendations as you explore."}
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {filteredRecommendations.map((recommendation) => (
              <div
                key={recommendation.id}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "1rem",
                  padding: "1.5rem",
                  border: `2px solid ${recommendation.color}40`,
                  position: "relative",
                }}
              >
                {/* Priority Badge */}
                <div
                  style={{
                    position: "absolute",
                    top: "1rem",
                    right: "1rem",
                    background: recommendation.color,
                    color: "white",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "1rem",
                    fontSize: "0.75rem",
                    fontWeight: "bold",
                  }}
                >
                  Priority {recommendation.priority}
                </div>

                {/* Dismiss Button */}
                <button
                  onClick={() => onRecommendationDismiss(recommendation.id)}
                  style={{
                    position: "absolute",
                    top: "0.5rem",
                    right: "0.5rem",
                    background: "rgba(255,255,255,0.2)",
                    border: "none",
                    borderRadius: "50%",
                    width: "2rem",
                    height: "2rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    cursor: "pointer",
                    opacity: 0.7,
                  }}
                >
                  <X size={14} />
                </button>

                {/* Place Image (if it's a place recommendation) */}
                {recommendation.place?.mediaUrl && (
                  <img
                    src={recommendation.place.mediaUrl || "/placeholder.svg"}
                    alt={recommendation.place.title}
                    style={{
                      width: "100%",
                      height: "120px",
                      objectFit: "cover",
                      borderRadius: "0.5rem",
                      marginBottom: "1rem",
                    }}
                  />
                )}

                {/* Content */}
                <div style={{ marginBottom: "1rem", paddingRight: "3rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "1.5rem" }}>{recommendation.title.split(" ")[0]}</span>
                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "bold" }}>
                      {recommendation.title.substring(recommendation.title.indexOf(" ") + 1)}
                    </h3>
                  </div>

                  <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.9rem", opacity: 0.8, lineHeight: 1.4 }}>
                    {recommendation.description}
                  </p>

                  {/* Place Details (if it's a place recommendation) */}
                  {recommendation.place && (
                    <div style={{ marginBottom: "0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                        <MapPin size={14} />
                        <span style={{ fontSize: "0.875rem", fontWeight: "bold" }}>{recommendation.place.title}</span>
                      </div>
                      {recommendation.place.rating && (
                        <div style={{ fontSize: "0.75rem", color: "#F59E0B" }}>
                          {"⭐".repeat(Math.floor(recommendation.place.rating))} {recommendation.place.rating}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Metadata */}
                  <div
                    style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.75rem", opacity: 0.6 }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <Clock size={12} />
                      {formatTimeAgo(recommendation.timestamp)}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <Sparkles size={12} />
                      {recommendation.category}
                    </div>
                    {recommendation.isAISuggestion && (
                      <div
                        style={{
                          background: "#8B5CF6",
                          padding: "0.125rem 0.5rem",
                          borderRadius: "0.5rem",
                          fontSize: "0.625rem",
                        }}
                      >
                        🤖 AI Generated
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleActionTap(recommendation)}
                  style={{
                    width: "100%",
                    background: recommendation.color,
                    border: "none",
                    borderRadius: "0.75rem",
                    padding: "0.75rem 1rem",
                    color: "white",
                    fontWeight: "bold",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)"
                    e.currentTarget.style.boxShadow = `0 4px 12px ${recommendation.color}40`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)"
                    e.currentTarget.style.boxShadow = "none"
                  }}
                >
                  {getActionIcon(recommendation)}
                  {getActionButtonText(recommendation)}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Stats */}
      {recommendations.length > 0 && (
        <div
          style={{
            padding: "1rem",
            background: "rgba(0,0,0,0.3)",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            textAlign: "center",
            fontSize: "0.875rem",
            opacity: 0.7,
          }}
        >
          🎯 {filteredRecommendations.length} recommendations ready • 🏆 {completedCount} completed
        </div>
      )}
    </div>
  )
}
