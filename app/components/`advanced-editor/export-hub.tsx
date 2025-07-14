"use client"

import { useState } from "react"
import { Download, Share2, Instagram, Facebook, Twitter, MessageCircle, Youtube, Smartphone } from "lucide-react"

interface ExportHubProps {
  canvasDataUrl: string
  platform: {
    id: string
    name: string
    dimensions: { width: number; height: number }
  }
  onExport: (settings: ExportSettings) => void
  onShare: (platform: string) => void
}

interface ExportSettings {
  quality: number
  format: string
  filename: string
}

const SOCIAL_PLATFORMS = [
  { id: "instagram", name: "Instagram", icon: <Instagram size={20} />, color: "#E4405F" },
  { id: "facebook", name: "Facebook", icon: <Facebook size={20} />, color: "#1877F2" },
  { id: "twitter", name: "Twitter", icon: <Twitter size={20} />, color: "#1DA1F2" },
  { id: "whatsapp", name: "WhatsApp", icon: <MessageCircle size={20} />, color: "#25D366" },
  { id: "youtube", name: "YouTube", icon: <Youtube size={20} />, color: "#FF0000" },
  { id: "tiktok", name: "TikTok", icon: <Smartphone size={20} />, color: "#000000" },
]

const QUALITY_PRESETS = [
  { value: 0.6, label: "Low (Small file)", description: "Good for sharing" },
  { value: 0.8, label: "Medium (Balanced)", description: "Recommended" },
  { value: 0.95, label: "High (Large file)", description: "Best quality" },
  { value: 1.0, label: "Maximum", description: "Lossless" },
]

export function ExportHub({ canvasDataUrl, platform, onExport, onShare }: ExportHubProps) {
  const [quality, setQuality] = useState(0.8)
  const [format, setFormat] = useState("jpeg")
  const [filename, setFilename] = useState(`pinit-${platform.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)

    try {
      // Create a canvas to apply quality settings
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = new Image()

      img.onload = () => {
        canvas.width = platform.dimensions.width
        canvas.height = platform.dimensions.height

        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

          // Convert to desired format and quality
          const finalDataUrl = canvas.toDataURL(`image/${format}`, quality)

          // Trigger download
          const link = document.createElement("a")
          link.download = `${filename}.${format}`
          link.href = finalDataUrl
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)

          // Call export callback
          onExport({
            quality,
            format,
            filename: `${filename}.${format}`,
          })
        }

        setIsExporting(false)
      }

      img.src = canvasDataUrl
    } catch (error) {
      console.error("Export failed:", error)
      setIsExporting(false)
    }
  }

  const handleShare = (platformId: string) => {
    onShare(platformId)
  }

  const getFileSizeEstimate = () => {
    // Rough estimate based on dimensions and quality
    const pixels = platform.dimensions.width * platform.dimensions.height
    const baseSize = pixels * 3 // 3 bytes per pixel (RGB)
    const compressedSize = baseSize * quality

    if (compressedSize < 1024 * 1024) {
      return `~${Math.round(compressedSize / 1024)}KB`
    } else {
      return `~${(compressedSize / (1024 * 1024)).toFixed(1)}MB`
    }
  }

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.9)",
        padding: "1rem",
        borderRadius: "1rem",
        maxHeight: "500px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <Download size={20} style={{ color: "#10B981" }} />
        <h3
          style={{
            color: "white",
            margin: 0,
            fontSize: "1.1rem",
            fontWeight: "600",
          }}
        >
          Export & Share
        </h3>
      </div>

      {/* Preview */}
      <div
        style={{
          marginBottom: "1.5rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "0.5rem",
            background: "rgba(255,255,255,0.05)",
            borderRadius: "0.75rem",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <img
            src={canvasDataUrl || "/placeholder.svg"}
            alt="Export preview"
            style={{
              maxWidth: "200px",
              maxHeight: "150px",
              borderRadius: "0.5rem",
              objectFit: "contain",
            }}
          />
          <div
            style={{
              color: "rgba(255,255,255,0.8)",
              fontSize: "0.8rem",
              marginTop: "0.5rem",
            }}
          >
            {platform.dimensions.width} × {platform.dimensions.height}px
          </div>
        </div>
      </div>

      {/* Export Settings */}
      <div
        style={{
          marginBottom: "1.5rem",
          padding: "1rem",
          background: "rgba(255,255,255,0.05)",
          borderRadius: "0.75rem",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <h4
          style={{
            color: "white",
            margin: "0 0 1rem 0",
            fontSize: "0.9rem",
            fontWeight: "500",
          }}
        >
          Export Settings
        </h4>

        {/* Quality */}
        <div style={{ marginBottom: "1rem" }}>
          <label
            style={{
              color: "rgba(255,255,255,0.8)",
              fontSize: "0.8rem",
              display: "block",
              marginBottom: "0.5rem",
            }}
          >
            Quality & File Size
          </label>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {QUALITY_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => setQuality(preset.value)}
                style={{
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: quality === preset.value ? "2px solid #10B981" : "1px solid rgba(255,255,255,0.2)",
                  background: quality === preset.value ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.1)",
                  color: "white",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "0.875rem", fontWeight: "500" }}>{preset.label}</div>
                    <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>{preset.description}</div>
                  </div>
                  <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>{getFileSizeEstimate()}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Format */}
        <div style={{ marginBottom: "1rem" }}>
          <label
            style={{
              color: "rgba(255,255,255,0.8)",
              fontSize: "0.8rem",
              display: "block",
              marginBottom: "0.5rem",
            }}
          >
            Format
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {["jpeg", "png", "webp"].map((fmt) => (
              <button
                key={fmt}
                onClick={() => setFormat(fmt)}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.5rem",
                  border: format === fmt ? "2px solid #10B981" : "1px solid rgba(255,255,255,0.2)",
                  background: format === fmt ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.1)",
                  color: "white",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  fontSize: "0.8rem",
                  fontWeight: "500",
                  textTransform: "uppercase",
                }}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Filename */}
        <div>
          <label
            style={{
              color: "rgba(255,255,255,0.8)",
              fontSize: "0.8rem",
              display: "block",
              marginBottom: "0.5rem",
            }}
          >
            Filename
          </label>
          <input
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.1)",
              color: "white",
              fontSize: "0.8rem",
              outline: "none",
            }}
            placeholder="Enter filename..."
          />
        </div>
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={isExporting}
        style={{
          width: "100%",
          padding: "1rem",
          borderRadius: "0.75rem",
          border: "none",
          background: isExporting ? "rgba(107, 114, 128, 0.5)" : "linear-gradient(135deg, #10B981 0%, #059669 100%)",
          color: "white",
          cursor: isExporting ? "not-allowed" : "pointer",
          fontSize: "1rem",
          fontWeight: "600",
          transition: "all 0.3s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <Download size={20} />
        {isExporting ? "Exporting..." : "Download Image"}
      </button>

      {/* Social Sharing */}
      <div
        style={{
          padding: "1rem",
          background: "rgba(255,255,255,0.05)",
          borderRadius: "0.75rem",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          <Share2 size={16} style={{ color: "rgba(255,255,255,0.8)" }} />
          <h4
            style={{
              color: "white",
              margin: 0,
              fontSize: "0.9rem",
              fontWeight: "500",
            }}
          >
            Share Directly
          </h4>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "0.75rem",
          }}
        >
          {SOCIAL_PLATFORMS.map((socialPlatform) => (
            <button
              key={socialPlatform.id}
              onClick={() => handleShare(socialPlatform.id)}
              style={{
                padding: "0.75rem",
                borderRadius: "0.75rem",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                transition: "all 0.3s ease",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.8rem",
                fontWeight: "500",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${socialPlatform.color}20`
                e.currentTarget.style.borderColor = `${socialPlatform.color}40`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)"
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"
              }}
            >
              <div style={{ color: socialPlatform.color }}>{socialPlatform.icon}</div>
              {socialPlatform.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
