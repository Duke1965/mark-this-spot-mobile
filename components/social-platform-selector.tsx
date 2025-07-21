"use client"

import { useState } from "react"
import { ArrowLeft, Instagram, Facebook, Twitter, MessageCircle, Music, Camera } from "lucide-react"

interface SocialPlatformSelectorProps {
  mediaUrl: string
  mediaType: "photo" | "video"
  onPlatformSelect: (platform: string) => void
  onBack: () => void
}

const socialPlatforms = [
  {
    id: "instagram-story",
    name: "Instagram Story",
    icon: Instagram,
    color: "linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)",
    dimensions: "1080×1920",
    description: "Vertical story format",
    popular: true,
  },
  {
    id: "instagram-post",
    name: "Instagram Post",
    icon: Instagram,
    color: "linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)",
    dimensions: "1080×1080",
    description: "Square feed post",
    popular: true,
  },
  {
    id: "facebook-post",
    name: "Facebook",
    icon: Facebook,
    color: "#1877F2",
    dimensions: "1200×630",
    description: "Timeline post",
    popular: false,
  },
  {
    id: "twitter-post",
    name: "Twitter/X",
    icon: Twitter,
    color: "#1DA1F2",
    dimensions: "1200×675",
    description: "Tweet with image",
    popular: false,
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: Music,
    color: "#000000",
    dimensions: "1080×1920",
    description: "Vertical video",
    popular: true,
  },
  {
    id: "snapchat",
    name: "Snapchat",
    icon: Camera,
    color: "#FFFC00",
    dimensions: "1080×1920",
    description: "Snap story",
    popular: false,
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: MessageCircle,
    color: "#25D366",
    dimensions: "1080×1080",
    description: "Status update",
    popular: true,
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

  // Filter platforms based on media type
  const availablePlatforms = socialPlatforms.filter((platform) => {
    if (mediaType === "video") {
      return ["instagram-story", "tiktok", "snapchat", "instagram-post"].includes(platform.id)
    }
    return true // All platforms support photos
  })

  const popularPlatforms = availablePlatforms.filter((p) => p.popular)
  const otherPlatforms = availablePlatforms.filter((p) => !p.popular)

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        display: "flex",
        flexDirection: "column",
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
        <button
          onClick={onBack}
          style={{
            padding: "0.5rem",
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>Choose Platform</h2>
          <p style={{ margin: 0, fontSize: "0.875rem", opacity: 0.8 }}>
            Select where you want to share your {mediaType}
          </p>
        </div>
        <div style={{ width: "40px" }} /> {/* Spacer for centering */}
      </div>

      {/* Media Preview */}
      <div
        style={{
          padding: "1rem",
          background: "rgba(0,0,0,0.2)",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "120px",
            height: "120px",
            borderRadius: "0.75rem",
            overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.3)",
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

      {/* Platform Selection */}
      <div
        style={{
          flex: 1,
          padding: "1rem",
          overflowY: "auto",
        }}
      >
        {/* Popular Platforms */}
        <div style={{ marginBottom: "2rem" }}>
          <h3
            style={{
              margin: "0 0 1rem 0",
              fontSize: "1rem",
              fontWeight: "bold",
              opacity: 0.9,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            🔥 Popular Platforms
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1rem",
            }}
          >
            {popularPlatforms.map((platform) => {
              const IconComponent = platform.icon
              return (
                <button
                  key={platform.id}
                  onClick={() => handlePlatformClick(platform.id)}
                  style={{
                    padding: "1.5rem",
                    borderRadius: "1rem",
                    border: "none",
                    background: selectedPlatform === platform.id ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
                    color: "white",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.3s ease",
                    transform: selectedPlatform === platform.id ? "scale(0.98)" : "scale(1)",
                    border:
                      selectedPlatform === platform.id ? "2px solid rgba(255,255,255,0.5)" : "2px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (selectedPlatform !== platform.id) {
                      e.currentTarget.style.background = "rgba(255,255,255,0.15)"
                      e.currentTarget.style.transform = "translateY(-2px)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedPlatform !== platform.id) {
                      e.currentTarget.style.background = "rgba(255,255,255,0.1)"
                      e.currentTarget.style.transform = "translateY(0)"
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "0.75rem",
                        background: typeof platform.color === "string" ? platform.color : platform.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: platform.id === "snapchat" ? "#000" : "white",
                      }}
                    >
                      <IconComponent size={24} />
                    </div>

                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "1.125rem", fontWeight: "bold" }}>
                        {platform.name}
                      </h4>
                      <p style={{ margin: 0, fontSize: "0.875rem", opacity: 0.8 }}>{platform.description}</p>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "0.75rem",
                      opacity: 0.7,
                    }}
                  >
                    <span>{platform.dimensions}</span>
                    <span>✨ Optimized</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Other Platforms */}
        {otherPlatforms.length > 0 && (
          <div>
            <h3
              style={{
                margin: "0 0 1rem 0",
                fontSize: "1rem",
                fontWeight: "bold",
                opacity: 0.9,
              }}
            >
              📱 More Platforms
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "0.75rem",
              }}
            >
              {otherPlatforms.map((platform) => {
                const IconComponent = platform.icon
                return (
                  <button
                    key={platform.id}
                    onClick={() => handlePlatformClick(platform.id)}
                    style={{
                      padding: "1rem",
                      borderRadius: "0.75rem",
                      border: "none",
                      background: selectedPlatform === platform.id ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)",
                      color: "white",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (selectedPlatform !== platform.id) {
                        e.currentTarget.style.background = "rgba(255,255,255,0.12)"
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedPlatform !== platform.id) {
                        e.currentTarget.style.background = "rgba(255,255,255,0.08)"
                      }
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "0.5rem",
                          background: typeof platform.color === "string" ? platform.color : platform.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: platform.id === "snapchat" ? "#000" : "white",
                        }}
                      >
                        <IconComponent size={18} />
                      </div>

                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "1rem", fontWeight: "bold" }}>
                          {platform.name}
                        </h4>
                        <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.7 }}>{platform.dimensions}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      <div
        style={{
          padding: "1rem",
          background: "rgba(59, 130, 246, 0.1)",
          border: "1px solid rgba(59, 130, 246, 0.3)",
          borderRadius: "0.75rem",
          margin: "1rem",
        }}
      >
        <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.875rem", fontWeight: "bold", color: "#60A5FA" }}>
          💡 Platform Tips
        </h4>
        <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.75rem", opacity: 0.9, lineHeight: "1.4" }}>
          <li>Each platform has optimized dimensions and templates</li>
          <li>Popular platforms have enhanced editing features</li>
          <li>Your content will be automatically formatted for the platform</li>
          {mediaType === "video" && <li>Video platforms support advanced editing tools</li>}
        </ul>
      </div>
    </div>
  )
}
