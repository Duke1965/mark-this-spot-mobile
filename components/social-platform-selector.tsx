"use client"

import { ArrowLeft } from "lucide-react"

interface SocialPlatformSelectorProps {
  mediaUrl: string
  mediaType: "photo" | "video"
  onPlatformSelect: (platform: string) => void
  onBack: () => void
}

export function SocialPlatformSelector({ mediaUrl, mediaType, onPlatformSelect, onBack }: SocialPlatformSelectorProps) {
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
      icon: "📷",
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
      id: "twitter-post",
      name: "Twitter Post",
      icon: "🐦",
      dimensions: "16:9",
      color: "#1DA1F2",
    },
    {
      id: "tiktok",
      name: "TikTok",
      icon: "🎵",
      dimensions: "9:16",
      color: "#000000",
    },
    {
      id: "linkedin-post",
      name: "LinkedIn Post",
      icon: "💼",
      dimensions: "16:9",
      color: "#0A66C2",
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
      name: "WhatsApp Status",
      icon: "💬",
      dimensions: "1:1",
      color: "#25D366",
    },
  ]

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
          gap: "1rem",
        }}
      >
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
        <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>Choose Platform</h1>
      </div>

      {/* Media Preview */}
      <div
        style={{
          padding: "1rem",
          display: "flex",
          justifyContent: "center",
          background: "rgba(0,0,0,0.2)",
        }}
      >
        {mediaType === "photo" ? (
          <img
            src={mediaUrl || "/placeholder.svg"}
            alt="Captured media"
            style={{
              width: "120px",
              height: "120px",
              objectFit: "cover",
              borderRadius: "8px",
              border: "2px solid rgba(255,255,255,0.3)",
            }}
          />
        ) : (
          <video
            src={mediaUrl}
            style={{
              width: "120px",
              height: "120px",
              objectFit: "cover",
              borderRadius: "8px",
              border: "2px solid rgba(255,255,255,0.3)",
            }}
            muted
            autoPlay
            loop
          />
        )}
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
          }}
        >
          {platforms.map((platform) => (
            <button
              key={platform.id}
              onClick={() => onPlatformSelect(platform.id)}
              style={{
                padding: "1.5rem 1rem",
                border: "none",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                borderRadius: "12px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.3s ease",
                backdropFilter: "blur(10px)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.2)"
                e.currentTarget.style.transform = "translateY(-2px)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)"
                e.currentTarget.style.transform = "translateY(0)"
              }}
            >
              <div
                style={{
                  fontSize: "2rem",
                  marginBottom: "0.5rem",
                }}
              >
                {platform.icon}
              </div>
              <div
                style={{
                  fontSize: "0.875rem",
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                {platform.name}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  opacity: 0.7,
                  textAlign: "center",
                }}
              >
                {platform.dimensions}
              </div>
              <div
                style={{
                  width: "100%",
                  height: "3px",
                  background: platform.color,
                  borderRadius: "2px",
                  marginTop: "0.5rem",
                }}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
