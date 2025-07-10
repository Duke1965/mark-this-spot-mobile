"use client"

import { MapPin, Calendar, Eye, Trash2 } from "lucide-react"

interface Spot {
  id: string
  latitude: number
  longitude: number
  timestamp: string
  address: string
  notes: string
  photos?: string[]
  category?: string
  photo?: string
  postcard?: any
}

interface SpotCardProps {
  spot: Spot
  index: number
  onView: () => void
  onDelete: () => void
  category: {
    name: string
    emoji: string
    color: string
  }
}

export function SpotCard({ spot, index, onView, onDelete, category }: SpotCardProps) {
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const spotTime = new Date(timestamp)
    const diffInHours = Math.floor((now.getTime() - spotTime.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return spotTime.toLocaleDateString()
  }

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.1)",
        backdropFilter: "blur(10px)",
        borderRadius: "1rem",
        border: "1px solid rgba(255,255,255,0.2)",
        overflow: "hidden",
        transition: "all 0.3s ease",
        animation: `slideInUp 0.6s ease-out ${index * 0.1}s both`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)"
        e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,0,0,0.3)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)"
        e.currentTarget.style.boxShadow = "none"
      }}
    >
      {/* Media Preview */}
      {(spot.postcard || spot.photo) && (
        <div
          style={{
            height: "160px",
            position: "relative",
            overflow: "hidden",
            background: "linear-gradient(135deg, #374151 0%, #1f2937 100%)",
          }}
        >
          {spot.postcard ? (
            spot.postcard.mediaType === "photo" ? (
              <img
                src={spot.postcard.mediaUrl || "/placeholder.svg?height=160&width=320&text=Postcard"}
                alt="Postcard"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <video
                src={spot.postcard.mediaUrl}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
                muted
              />
            )
          ) : spot.photo ? (
            <img
              src={spot.photo || "/placeholder.svg?height=160&width=320&text=Photo"}
              alt="Spot"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : null}

          {/* Media Type Badge */}
          <div
            style={{
              position: "absolute",
              top: "0.75rem",
              right: "0.75rem",
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(10px)",
              color: "white",
              padding: "0.25rem 0.75rem",
              borderRadius: "1rem",
              fontSize: "0.75rem",
              fontWeight: "bold",
            }}
          >
            {spot.postcard ? (spot.postcard.mediaType === "photo" ? "📸 Postcard" : "🎥 Video") : "📷 Photo"}
          </div>

          {/* Gradient Overlay */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "50%",
              background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
            }}
          />
        </div>
      )}

      {/* Content */}
      <div style={{ padding: "1.25rem" }}>
        {/* Category Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            background: `${category.color}20`,
            border: `1px solid ${category.color}40`,
            color: "white",
            padding: "0.25rem 0.75rem",
            borderRadius: "1rem",
            fontSize: "0.75rem",
            fontWeight: "bold",
            marginBottom: "0.75rem",
          }}
        >
          <span>{category.emoji}</span>
          {category.name}
        </div>

        {/* Address */}
        <h3
          style={{
            color: "white",
            fontSize: "1.125rem",
            fontWeight: "bold",
            marginBottom: "0.5rem",
            lineHeight: "1.4",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {spot.address}
        </h3>

        {/* Postcard Message */}
        {spot.postcard?.message && (
          <p
            style={{
              color: "rgba(255,255,255,0.8)",
              fontSize: "0.875rem",
              fontStyle: "italic",
              marginBottom: "0.75rem",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            "{spot.postcard.message}"
          </p>
        )}

        {/* Metadata */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "rgba(255,255,255,0.6)" }}>
            <MapPin size={14} />
            <span style={{ fontSize: "0.75rem" }}>
              {spot.latitude.toFixed(4)}, {spot.longitude.toFixed(4)}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "rgba(255,255,255,0.6)" }}>
            <Calendar size={14} />
            <span style={{ fontSize: "0.75rem" }}>{formatTimeAgo(spot.timestamp)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={onView}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.75rem",
              background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
              color: "white",
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "0.875rem",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.05)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)"
            }}
          >
            <Eye size={16} />
            View
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            style={{
              padding: "0.75rem",
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              color: "#ef4444",
              borderRadius: "0.5rem",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.3)"
              e.currentTarget.style.transform = "scale(1.1)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)"
              e.currentTarget.style.transform = "scale(1)"
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
