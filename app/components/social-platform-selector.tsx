"use client"

import { useState } from "react"
import { Instagram, MessageCircle, Twitter, Facebook, Smartphone, ArrowLeft } from "lucide-react"

interface SocialPlatformSelectorProps {
  onSelectPlatform: (platform: string, dimensions: { width: number; height: number }) => void
  onBack: () => void
}

const PLATFORMS = [
  {
    id: "instagram-story",
    name: "Instagram Story",
    icon: Instagram,
    dimensions: { width: 1080, height: 1920 },
    color: "linear-gradient(135deg, #E1306C 0%, #FD1D1D 50%, #F77737 100%)",
    description: "9:16 vertical format",
  },
  {
    id: "instagram-post",
    name: "Instagram Post",
    icon: Instagram,
    dimensions: { width: 1080, height: 1080 },
    color: "linear-gradient(135deg, #405DE6 0%, #5851DB 25%, #833AB4 50%, #C13584 75%, #E1306C 100%)",
    description: "1:1 square format",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: MessageCircle,
    dimensions: { width: 1080, height: 1080 },
    color: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
    description: "Perfect for sharing",
  },
  {
    id: "twitter",
    name: "Twitter/X",
    icon: Twitter,
    dimensions: { width: 1200, height: 675 },
    color: "linear-gradient(135deg, #1DA1F2 0%, #0084B4 100%)",
    description: "16:9 landscape",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: Facebook,
    dimensions: { width: 1200, height: 630 },
    color: "linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)",
    description: "Optimized for feed",
  },
  {
    id: "generic",
    name: "Universal",
    icon: Smartphone,
    dimensions: { width: 1080, height: 1080 },
    color: "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
    description: "Works everywhere",
  },
]

export function SocialPlatformSelector({ onSelectPlatform, onBack }: SocialPlatformSelectorProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)

  const handlePlatformSelect = (platform: (typeof PLATFORMS)[0]) => {
    setSelectedPlatform(platform.id)
    // Small delay for visual feedback
    setTimeout(() => {
      onSelectPlatform(platform.id, platform.dimensions)
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
        background: "linear-gradient(135deg, #667EEA 0%, #764BA2 100%)",
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
          gap: "1rem",
          flexShrink: 0,
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
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>📱 Choose Platform</h2>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", opacity: 0.8 }}>
            Select where you'll share your postcard
          </p>
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
            gap: "1.5rem",
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
                  padding: "2rem",
                  borderRadius: "1.5rem",
                  border: "none",
                  background: isSelected ? "rgba(255,255,255,0.3)" : platform.color,
                  color: "white",
                  cursor: isSelected ? "not-allowed" : "pointer",
                  transition: "all 0.3s ease",
                  transform: isSelected ? "scale(0.95)" : "scale(1)",
                  boxShadow: isSelected ? "inset 0 4px 20px rgba(0,0,0,0.3)" : "0 8px 25px rgba(0,0,0,0.2)",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Icon and Title */}
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div
                    style={{
                      padding: "1rem",
                      borderRadius: "1rem",
                      background: "rgba(255,255,255,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconComponent size={32} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>{platform.name}</h3>
                    <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", opacity: 0.8 }}>
                      {platform.description}
                    </p>
                  </div>
                </div>

                {/* Dimensions */}
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "0.75rem",
                    background: "rgba(255,255,255,0.1)",
                    fontSize: "0.875rem",
                    fontWeight: "bold",
                    textAlign: "center",
                  }}
                >
                  {platform.dimensions.width} × {platform.dimensions.height}px
                </div>

                {/* Selection Indicator */}
                {isSelected && (
                  <div
                    style={{
                      position: "absolute",
                      top: "1rem",
                      right: "1rem",
                      width: "2rem",
                      height: "2rem",
                      borderRadius: "50%",
                      background: "rgba(34, 197, 94, 0.9)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1rem",
                    }}
                  >
                    ✓
                  </div>
                )}

                {/* Loading Spinner */}
                {isSelected && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "1rem",
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: "1.5rem",
                      height: "1.5rem",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTop: "2px solid white",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Info Section */}
        <div
          style={{
            marginTop: "3rem",
            padding: "2rem",
            borderRadius: "1rem",
            background: "rgba(255,255,255,0.1)",
            textAlign: "center",
            maxWidth: "600px",
            margin: "3rem auto 0",
          }}
        >
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.125rem", fontWeight: "bold" }}>
            🎨 Platform-Optimized Templates
          </h3>
          <p style={{ margin: 0, fontSize: "0.875rem", opacity: 0.9, lineHeight: 1.6 }}>
            Each platform has custom templates designed for optimal engagement. Your photo will be automatically
            formatted with the perfect dimensions and styling for your chosen platform.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% {
            transform: translateX(-50%) rotate(0deg);
          }
          100% {
            transform: translateX(-50%) rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}
