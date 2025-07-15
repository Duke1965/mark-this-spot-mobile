"use client"

import { ArrowLeft, Instagram, MessageCircle, Twitter, Facebook, Mail, Download } from "lucide-react"

interface SocialPlatformSelectorProps {
  mediaUrl: string
  mediaType: "photo" | "video"
  locationName: string
  onPlatformSelect: (platformId: string, dimensions: { width: number; height: number }) => void
  onClose: () => void
}

export function SocialPlatformSelector({
  mediaUrl,
  mediaType,
  locationName,
  onPlatformSelect,
  onClose,
}: SocialPlatformSelectorProps) {
  const platforms = [
    {
      id: "instagram-story",
      name: "Instagram Story",
      icon: <Instagram size={24} />,
      dimensions: { width: 1080, height: 1920 },
      color: "#E4405F",
      description: "9:16 vertical format",
    },
    {
      id: "instagram-post",
      name: "Instagram Post",
      icon: <Instagram size={24} />,
      dimensions: { width: 1080, height: 1080 },
      color: "#E4405F",
      description: "1:1 square format",
    },
    {
      id: "whatsapp",
      name: "WhatsApp",
      icon: <MessageCircle size={24} />,
      dimensions: { width: 1200, height: 630 },
      color: "#25D366",
      description: "Perfect for sharing",
    },
    {
      id: "twitter",
      name: "Twitter/X",
      icon: <Twitter size={24} />,
      dimensions: { width: 1200, height: 675 },
      color: "#1DA1F2",
      description: "16:9 landscape",
    },
    {
      id: "facebook",
      name: "Facebook",
      icon: <Facebook size={24} />,
      dimensions: { width: 1200, height: 630 },
      color: "#1877F2",
      description: "Social media ready",
    },
    {
      id: "email",
      name: "Email",
      icon: <Mail size={24} />,
      dimensions: { width: 800, height: 600 },
      color: "#6B7280",
      description: "Email friendly size",
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
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.5rem" }}>Choose Platform</h2>
          <p style={{ margin: 0, fontSize: "0.875rem", opacity: 0.7 }}>
            Select where you want to share your {mediaType}
          </p>
        </div>
      </div>

      {/* Media Preview */}
      <div
        style={{
          padding: "1rem 2rem",
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
            border: "2px solid rgba(255,255,255,0.2)",
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
          padding: "1rem 2rem 2rem",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1rem",
          }}
        >
          {platforms.map((platform) => (
            <button
              key={platform.id}
              onClick={() => onPlatformSelect(platform.id, platform.dimensions)}
              style={{
                padding: "1.5rem",
                borderRadius: "1rem",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                transition: "all 0.3s ease",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
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
                  width: "48px",
                  height: "48px",
                  borderRadius: "0.75rem",
                  background: platform.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  flexShrink: 0,
                }}
              >
                {platform.icon}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1.125rem" }}>{platform.name}</h3>
                <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.875rem", opacity: 0.7 }}>{platform.description}</p>
                <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.5 }}>
                  {platform.dimensions.width} × {platform.dimensions.height}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Quick Actions */}
        <div
          style={{
            marginTop: "2rem",
            padding: "1.5rem",
            borderRadius: "1rem",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.05)",
          }}
        >
          <h3
            style={{ margin: "0 0 1rem 0", fontSize: "1.125rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <Download size={20} />
            Quick Actions
          </h3>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <button
              onClick={() => {
                // Download original
                const link = document.createElement("a")
                link.href = mediaUrl
                link.download = `pinit-${mediaType}-${Date.now()}.${mediaType === "photo" ? "jpg" : "webm"}`
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
              }}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "0.5rem",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Download size={16} />
              Download Original
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
