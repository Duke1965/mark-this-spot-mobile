"use client"

import { Instagram, MessageCircle, Twitter, Facebook, Share2 } from "lucide-react"

interface SocialPlatformSelectorProps {
  mediaUrl: string
  mediaType: "photo" | "video"
  locationName: string
  onPlatformSelect: (platform: string, dimensions: { width: number; height: number }) => void
  onClose: () => void
}

const SOCIAL_PLATFORMS = [
  {
    id: "instagram-story",
    name: "Instagram Story",
    icon: Instagram,
    dimensions: { width: 1080, height: 1920 },
    color: "#E4405F",
    description: "9:16 vertical",
  },
  {
    id: "instagram-post",
    name: "Instagram Post",
    icon: Instagram,
    dimensions: { width: 1080, height: 1080 },
    color: "#E4405F",
    description: "1:1 square",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: MessageCircle,
    dimensions: { width: 1080, height: 1080 },
    color: "#25D366",
    description: "1:1 square",
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
    description: "1.91:1 landscape",
  },
  {
    id: "generic",
    name: "Save & Share",
    icon: Share2,
    dimensions: { width: 1080, height: 1080 },
    color: "#6B7280",
    description: "Universal format",
  },
]

export function SocialPlatformSelector({
  mediaUrl,
  mediaType,
  locationName,
  onPlatformSelect,
  onClose,
}: SocialPlatformSelectorProps) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        color: "white",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1rem",
          borderBottom: "1px solid rgba(255,255,255,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>Choose Platform</h2>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", opacity: 0.8 }}>
            Select where you'll share this {mediaType}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            padding: "0.5rem",
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
            fontSize: "1.25rem",
          }}
        >
          ×
        </button>
      </div>

      {/* Preview */}
      <div
        style={{
          padding: "1rem",
          display: "flex",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "120px",
            height: "120px",
            borderRadius: "1rem",
            overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.3)",
            background: "rgba(255,255,255,0.1)",
          }}
        >
          {mediaType === "photo" ? (
            <img
              src={mediaUrl || "/placeholder.svg"}
              alt="Preview"
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
            />
          )}
        </div>
      </div>

      {/* Platform Grid */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0 1rem 1rem 1rem",
        }}
      >
        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "1fr",
          }}
        >
          {SOCIAL_PLATFORMS.map((platform) => (
            <button
              key={platform.id}
              onClick={() => onPlatformSelect(platform.id, platform.dimensions)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "1rem",
                borderRadius: "1rem",
                border: "none",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.3s ease",
              }}
              onTouchStart={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.2)"
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)"
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "0.75rem",
                  background: platform.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <platform.icon size={24} color="white" />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "bold" }}>{platform.name}</h3>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", opacity: 0.7 }}>{platform.description}</p>
              </div>
              <div style={{ fontSize: "1.5rem", opacity: 0.6 }}>→</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
