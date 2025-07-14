"use client"

import { useState } from "react"
import { Download, Share2, Instagram, Twitter, Facebook, Linkedin, ImageIcon, Video, FileText } from "lucide-react"

interface ExportHubProps {
  canvasData: {
    mediaUrl: string
    textElements: any[]
    stickerElements: any[]
    dimensions: { width: number; height: number }
    platform: string
  }
  onExport: (format: string, quality: string) => void
}

export function ExportHub({ canvasData, onExport }: ExportHubProps) {
  const [selectedFormat, setSelectedFormat] = useState("png")
  const [selectedQuality, setSelectedQuality] = useState("high")
  const [isExporting, setIsExporting] = useState(false)

  const formats = [
    { id: "png", name: "PNG", icon: ImageIcon, description: "Best for graphics with transparency" },
    { id: "jpg", name: "JPG", icon: ImageIcon, description: "Smaller file size, good for photos" },
    { id: "webp", name: "WebP", icon: ImageIcon, description: "Modern format, great compression" },
    { id: "pdf", name: "PDF", icon: FileText, description: "Perfect for printing" },
    { id: "mp4", name: "MP4", icon: Video, description: "For video content" },
  ]

  const qualities = [
    { id: "low", name: "Low", description: "Smaller file size" },
    { id: "medium", name: "Medium", description: "Balanced quality and size" },
    { id: "high", name: "High", description: "Best quality" },
    { id: "ultra", name: "Ultra", description: "Maximum quality" },
  ]

  const socialPlatforms = [
    { id: "instagram", name: "Instagram", icon: Instagram, color: "#E4405F" },
    { id: "twitter", name: "Twitter", icon: Twitter, color: "#1DA1F2" },
    { id: "facebook", name: "Facebook", icon: Facebook, color: "#1877F2" },
    { id: "linkedin", name: "LinkedIn", icon: Linkedin, color: "#0A66C2" },
  ]

  const handleExport = async () => {
    setIsExporting(true)

    // Simulate export process
    await new Promise((resolve) => setTimeout(resolve, 2000))

    onExport(selectedFormat, selectedQuality)
    setIsExporting(false)
  }

  const handleShare = (platform: string) => {
    // In a real implementation, this would handle sharing to social platforms
    console.log(`Sharing to ${platform}`)
  }

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.1)",
        padding: "1rem",
        borderRadius: "1rem",
        backdropFilter: "blur(10px)",
        maxHeight: "500px",
        overflowY: "auto",
      }}
    >
      <h3 style={{ color: "white", margin: "0 0 1rem 0", fontSize: "1.1rem" }}>Export & Share</h3>

      {/* Format Selection */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h4 style={{ color: "rgba(255,255,255,0.8)", margin: "0 0 0.75rem 0", fontSize: "0.9rem" }}>Export Format</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {formats.map((format) => {
            const IconComponent = format.icon
            return (
              <button
                key={format.id}
                onClick={() => setSelectedFormat(format.id)}
                style={{
                  padding: "0.75rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background: selectedFormat === format.id ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.2)",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  textAlign: "left",
                  transition: "all 0.3s ease",
                }}
              >
                <IconComponent size={20} />
                <div>
                  <div style={{ fontSize: "0.9rem", fontWeight: "500" }}>{format.name}</div>
                  <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>{format.description}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Quality Selection */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h4 style={{ color: "rgba(255,255,255,0.8)", margin: "0 0 0.75rem 0", fontSize: "0.9rem" }}>Quality</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
          {qualities.map((quality) => (
            <button
              key={quality.id}
              onClick={() => setSelectedQuality(quality.id)}
              style={{
                padding: "0.75rem",
                borderRadius: "0.75rem",
                border: "none",
                background: selectedQuality === quality.id ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.25rem",
                fontSize: "0.8rem",
                transition: "all 0.3s ease",
              }}
            >
              <div style={{ fontWeight: "500" }}>{quality.name}</div>
              <div style={{ opacity: 0.8, fontSize: "0.7rem", textAlign: "center" }}>{quality.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Export Preview */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h4 style={{ color: "rgba(255,255,255,0.8)", margin: "0 0 0.75rem 0", fontSize: "0.9rem" }}>Export Preview</h4>
        <div
          style={{
            background: "rgba(255,255,255,0.1)",
            borderRadius: "0.75rem",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
            <span style={{ color: "rgba(255,255,255,0.8)" }}>Platform:</span>
            <span style={{ color: "white" }}>{canvasData.platform}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
            <span style={{ color: "rgba(255,255,255,0.8)" }}>Dimensions:</span>
            <span style={{ color: "white" }}>
              {canvasData.dimensions.width} × {canvasData.dimensions.height}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
            <span style={{ color: "rgba(255,255,255,0.8)" }}>Format:</span>
            <span style={{ color: "white" }}>{selectedFormat.toUpperCase()}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
            <span style={{ color: "rgba(255,255,255,0.8)" }}>Quality:</span>
            <span style={{ color: "white" }}>{selectedQuality}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
            <span style={{ color: "rgba(255,255,255,0.8)" }}>Elements:</span>
            <span style={{ color: "white" }}>
              {canvasData.textElements.length} text, {canvasData.stickerElements.length} stickers
            </span>
          </div>
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
          background: isExporting ? "rgba(107, 114, 128, 0.3)" : "rgba(16, 185, 129, 0.3)",
          color: "white",
          cursor: isExporting ? "not-allowed" : "pointer",
          fontSize: "1rem",
          fontWeight: "600",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          marginBottom: "1.5rem",
          transition: "all 0.3s ease",
        }}
      >
        <Download size={20} />
        {isExporting ? "Exporting..." : "Export Creation"}
      </button>

      {/* Social Sharing */}
      <div>
        <h4 style={{ color: "rgba(255,255,255,0.8)", margin: "0 0 0.75rem 0", fontSize: "0.9rem" }}>Share Directly</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
          {socialPlatforms.map((platform) => {
            const IconComponent = platform.icon
            return (
              <button
                key={platform.id}
                onClick={() => handleShare(platform.id)}
                style={{
                  padding: "0.75rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  fontSize: "0.8rem",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${platform.color}33`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.2)"
                }}
              >
                <IconComponent size={16} />
                {platform.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            style={{
              flex: 1,
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              cursor: "pointer",
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            <Share2 size={16} />
            Copy Link
          </button>
          <button
            style={{
              flex: 1,
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              cursor: "pointer",
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            <Download size={16} />
            Save Draft
          </button>
        </div>
      </div>
    </div>
  )
}
