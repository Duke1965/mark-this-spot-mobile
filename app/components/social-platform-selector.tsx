"use client"

import { useState } from "react"
import { ArrowLeft, Instagram, MessageCircle, Twitter, Facebook, Share2 } from "lucide-react"

interface SocialPlatformSelectorProps {
  mediaUrl: string
  mediaType: "photo" | "video"
  locationName: string
  onPlatformSelect: (platformId: string, dimensions: { width: number; height: number }) => void
  onClose: () => void
}

const PLATFORMS = [
  {
    id: "instagram-story",
    name: "Instagram Story",
    icon: Instagram,
    dimensions: { width: 1080, height: 1920 },
    color: "#E4405F",
    description: "9:16 vertical format",
  },
  {
    id: "instagram-post",
    name: "Instagram Post",
    icon: Instagram,
    dimensions: { width: 1080, height: 1080 },
    color: "#E4405F",
    description: "1:1 square format",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: MessageCircle,
    dimensions: { width: 1080, height: 1080 },
    color: "#25D366",
    description: "Perfect for sharing",
  },
  {
    id: "twitter",
    name: "Twitter/X",
    icon: Twitter,
    dimensions: { width: 1200, height: 675 },
    color: "#1DA1F2",
    description: "16:9 landscape",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: Facebook,
    dimensions: { width: 1200, height: 630 },
    color: "#1877F2",
    description: "Social media ready",
  },
  {
    id: "generic",
    name: "Universal",
    icon: Share2,
    dimensions: { width: 1080, height: 1080 },
    color: "#6B7280",
    description: "Works everywhere",
  },
]

export function SocialPlatformSelector({
  mediaUrl,
  mediaType,
  locationName,
  onPlatformSelect,
  onClose,
}: SocialPlatformSelectorProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)

  const handlePlatformSelect = (platform: (typeof PLATFORMS)[0]) => {
    setSelectedPlatform(platform.id)
    // Small delay for visual feedback
    setTimeout(() => {
      onPlatformSelect(platform.id, platform.dimensions)
    }, 200)
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "linear-gradient(135deg, #1e293b 0%, #1e40af 50%, #4338ca 100%)",
        color: "white",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "2rem",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onClose}
          style={{
            padding: "0.5rem",
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "bold" }}>Choose Platform</h2>
          <p style={{ margin: 0, fontSize: "0.875rem", opacity: 0.7 }}>Optimize your {mediaType} for sharing</p>
        </div>
      </div>

      {/* Preview */}
      <div
        style={{
          padding: "1rem 2rem",
          display: "flex",
          justifyContent: "center",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "120px",
            height: "120px",
            borderRadius: "1rem",
            overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.1)",
          }}
        >
          {mediaType === "photo" ? (
            <img
              src={mediaUrl || "/placeholder.svg"}
              alt="Captured media"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              onError={(e) => {
                e.currentTarget.src = "/placeholder.svg?height=120&width=120&text=Photo"
              }}
            />
          ) : (
            <video
              src={mediaUrl}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              muted
              loop
              autoPlay
            />
          )}
        </div>
      </div>

      {/* Platform Grid */}
      <div
        style={{
          flex: 1,
          padding: "2rem",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1rem",
            maxWidth: "800px",
            margin: "0 auto",
          }}
        >
          {PLATFORMS.map((platform) => {
            const IconComponent = platform.icon
            const isSelected = selectedPlatform === platform.id

            return (
              <button
                key={platform.id}
                onClick={() => handlePlatformSelect(platform)}
                disabled={isSelected}
                style={{
                  padding: "1.5rem",
                  borderRadius: "1rem",
                  border: isSelected ? `2px solid ${platform.color}` : "2px solid rgba(255,255,255,0.1)",
                  background: isSelected
                    ? `linear-gradient(135deg, ${platform.color}20, ${platform.color}10)`
                    : "rgba(255,255,255,0.05)",
                  color: "white",
                  cursor: isSelected ? "not-allowed" : "pointer",
                  transition: "all 0.3s ease",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "1rem",
                  textAlign: "center",
                  transform: isSelected ? "scale(0.98)" : "scale(1)",
                  opacity: isSelected ? 0.8 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.1)"
                    e.currentTarget.style.transform = "scale(1.02)"
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)"
                    e.currentTarget.style.transform = "scale(1)"
                  }
                }}
              >
                <div
                  style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    background: `${platform.color}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `2px solid ${platform.color}40`,
                  }}
                >
                  <IconComponent size={28} color={platform.color} />
                </div>

                <div>
                  <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.125rem", fontWeight: "bold" }}>{platform.name}</h3>
                  <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.875rem", opacity: 0.8 }}>
                    {platform.dimensions.width}×{platform.dimensions.height}
                  </p>
                  <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.6 }}>{platform.description}</p>
                </div>

                {isSelected && (
                  <div
                    style={{
                      marginTop: "0.5rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontSize: "0.875rem",
                      color: platform.color,
                    }}
                  >
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTop: `2px solid ${platform.color}`,
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    />
                    Loading...
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
