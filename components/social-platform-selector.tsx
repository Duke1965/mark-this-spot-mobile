"use client"

import { useState } from "react"
import { ArrowLeft, Check } from "lucide-react"

interface SocialPlatformSelectorProps {
  mediaUrl: string
  mediaType: "photo" | "video"
  onPlatformSelect: (platform: string) => void
  onBack: () => void
}

const platforms = [
  {
    id: "instagram-story",
    name: "Instagram Story",
    icon: "📱",
    dimensions: "9:16",
    color: "#E4405F",
  },
  {
    id: "instagram-post",
    name: "Instagram Post",
    icon: "📸",
    dimensions: "1:1",
    color: "#E4405F",
  },
  {
    id: "facebook-post",
    name: "Facebook Post",
    icon: "👥",
    dimensions: "16:9",
    color: "#1877F2",
  },
  {
    id: "x-post",
    name: "X Post",
    icon: "🐦",
    dimensions: "16:9",
    color: "#1DA1F2",
  },
  {
    id: "linkedin-post",
    name: "LinkedIn Post",
    icon: "💼",
    dimensions: "16:9",
    color: "#0A66C2",
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: "🎵",
    dimensions: "9:16",
    color: "#000000",
  },
  {
    id: "snapchat",
    name: "Snapchat",
    icon: "👻",
    dimensions: "9:16",
    color: "#FFFC00",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: "💬",
    dimensions: "1:1",
    color: "#25D366",
  },
]

export function SocialPlatformSelector({ mediaUrl, mediaType, onPlatformSelect, onBack }: SocialPlatformSelectorProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>("")

  const handlePlatformClick = (platformId: string) => {
    setSelectedPlatform(platformId)
    // Small delay for visual feedback
    setTimeout(() => {
      onPlatformSelect(platformId)
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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(0,0,0,0.2)",
        }}
      >
        <button
          onClick={onBack}
          style={{
            padding: "0.75rem",
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
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>Choose Platform</h1>
        <div style={{ width: "48px" }} /> {/* Spacer */}
      </div>

      {/* Media Preview */}
      <div
        style={{
          padding: "1rem",
          display: "flex",
          justifyContent: "center",
          background: "rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            width: "120px",
            height: "120px",
            borderRadius: "0.5rem",
            overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.2)",
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
              autoPlay
              loop
            />
          )}
        </div>
      </div>

      {/* Platform Grid */}
      <div
        style={{
          flex: 1,
          padding: "1rem",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "1rem",
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          {platforms.map((platform) => (
            <button
              key={platform.id}
              onClick={() => handlePlatformClick(platform.id)}
              style={{
                padding: "1.5rem 1rem",
                borderRadius: "1rem",
                border: selectedPlatform === platform.id ? "2px solid #10B981" : "2px solid rgba(255,255,255,0.1)",
                background: selectedPlatform === platform.id ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.05)",
                color: "white",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.75rem",
                transition: "all 0.2s ease",
                position: "relative",
                backdropFilter: "blur(10px)",
              }}
              onMouseEnter={(e) => {
                if (selectedPlatform !== platform.id) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)"
                  e.currentTarget.style.transform = "translateY(-2px)"
                }
              }}
              onMouseLeave={(e) => {
                if (selectedPlatform !== platform.id) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)"
                  e.currentTarget.style.transform = "translateY(0)"
                }
              }}
            >
              {selectedPlatform === platform.id && (
                <div
                  style={{
                    position: "absolute",
                    top: "0.5rem",
                    right: "0.5rem",
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "#10B981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Check size={16} color="white" />
                </div>
              )}

              <div
                style={{
                  fontSize: "2rem",
                  marginBottom: "0.25rem",
                }}
              >
                {platform.icon}
              </div>

              <div style={{ textAlign: "center" }}>
                <h3
                  style={{
                    margin: "0 0 0.25rem 0",
                    fontSize: "0.875rem",
                    fontWeight: "bold",
                  }}
                >
                  {platform.name}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.75rem",
                    opacity: 0.7,
                  }}
                >
                  {platform.dimensions}
                </p>
              </div>

              <div
                style={{
                  width: "100%",
                  height: "3px",
                  borderRadius: "1.5px",
                  background: platform.color,
                  opacity: 0.6,
                }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div
        style={{
          padding: "1rem",
          textAlign: "center",
          background: "rgba(0,0,0,0.1)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.875rem",
            opacity: 0.8,
          }}
        >
          Select a platform to optimize your {mediaType} for sharing
        </p>
      </div>
    </div>
  )
}
