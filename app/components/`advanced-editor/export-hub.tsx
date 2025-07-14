"use client"

import { useState } from "react"
import { Download, Share2, Instagram, Twitter, Facebook } from "lucide-react"

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
  const [exportFormat, setExportFormat] = useState("png")
  const [exportQuality, setExportQuality] = useState("high")
  const [isExporting, setIsExporting] = useState(false)

  const exportFormats = [
    { value: "png", label: "PNG", description: "Best for images with transparency" },
    { value: "jpg", label: "JPG", description: "Smaller file size, good for photos" },
    { value: "webp", label: "WebP", description: "Modern format, great compression" },
    { value: "pdf", label: "PDF", description: "Perfect for printing" },
    { value: "svg", label: "SVG", description: "Vector format, scalable" },
  ]

  const qualityOptions = [
    { value: "low", label: "Low (Fast)", description: "Quick export, larger file" },
    { value: "medium", label: "Medium", description: "Balanced quality and size" },
    { value: "high", label: "High (Slow)", description: "Best quality, smaller file" },
  ]

  const socialPlatforms = [
    {
      name: "Instagram",
      icon: <Instagram size={20} />,
      color: "#E4405F",
      sizes: ["1080x1080 (Post)", "1080x1920 (Story)"],
    },
    {
      name: "Twitter",
      icon: <Twitter size={20} />,
      color: "#1DA1F2",
      sizes: ["1200x675 (Post)", "1500x500 (Header)"],
    },
    {
      name: "Facebook",
      icon: <Facebook size={20} />,
      color: "#4267B2",
      sizes: ["1200x630 (Post)", "820x312 (Cover)"],
    },
  ]

  const handleExport = async () => {
    setIsExporting(true)

    // Simulate export process
    await new Promise((resolve) => setTimeout(resolve, 2000))

    onExport(exportFormat, exportQuality)
    setIsExporting(false)
  }

  const handleSocialShare = (platform: string) => {
    // In a real app, this would integrate with social media APIs
    console.log(`Sharing to ${platform}`)
  }

  const getFileSizeEstimate = () => {
    const { width, height } = canvasData.dimensions
    const pixels = width * height

    let baseSize = pixels / 1000 // Base calculation

    switch (exportFormat) {
      case "png":
        baseSize *= 4
        break
      case "jpg":
        baseSize *= 1
        break
      case "webp":
        baseSize *= 0.7
        break
      case "pdf":
        baseSize *= 2
        break
      case "svg":
        baseSize *= 0.1
        break
    }

    switch (exportQuality) {
      case "low":
        baseSize *= 0.5
        break
      case "medium":
        baseSize *= 1
        break
      case "high":
        baseSize *= 2
        break
    }

    if (baseSize < 1000) {
      return `~${Math.round(baseSize)}KB`
    } else {
      return `~${(baseSize / 1000).toFixed(1)}MB`
    }
  }

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.1)",
        padding: "1rem",
        borderRadius: "1rem",
        backdropFilter: "blur(10px)",
      }}
    >
      <h3 style={{ color: "white", margin: "0 0 1rem 0" }}>Export & Share</h3>

      {/* Export Format */}
      <div style={{ marginBottom: "1rem" }}>
        <h4 style={{ color: "white", fontSize: "0.9rem", margin: "0 0 0.5rem 0" }}>Format</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {exportFormats.map((format) => (
            <label
              key={format.value}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem",
                borderRadius: "0.5rem",
                background: exportFormat === format.value ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.1)",
                cursor: "pointer",
                color: "white",
                fontSize: "0.8rem",
              }}
            >
              <input
                type="radio"
                name="format"
                value={format.value}
                checked={exportFormat === format.value}
                onChange={(e) => setExportFormat(e.target.value)}
                style={{ margin: 0 }}
              />
              <div>
                <div style={{ fontWeight: "bold" }}>{format.label}</div>
                <div style={{ fontSize: "0.7rem", opacity: 0.8 }}>{format.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Quality Settings */}
      <div style={{ marginBottom: "1rem" }}>
        <h4 style={{ color: "white", fontSize: "0.9rem", margin: "0 0 0.5rem 0" }}>Quality</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          {qualityOptions.map((quality) => (
            <label
              key={quality.value}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem",
                borderRadius: "0.5rem",
                background: exportQuality === quality.value ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.1)",
                cursor: "pointer",
                color: "white",
                fontSize: "0.8rem",
              }}
            >
              <input
                type="radio"
                name="quality"
                value={quality.value}
                checked={exportQuality === quality.value}
                onChange={(e) => setExportQuality(e.target.value)}
                style={{ margin: 0 }}
              />
              <div>
                <div style={{ fontWeight: "bold" }}>{quality.label}</div>
                <div style={{ fontSize: "0.7rem", opacity: 0.8 }}>{quality.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Export Info */}
      <div
        style={{
          background: "rgba(255,255,255,0.1)",
          padding: "0.75rem",
          borderRadius: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        <div style={{ color: "white", fontSize: "0.8rem", marginBottom: "0.25rem" }}>
          <strong>Export Details:</strong>
        </div>
        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.7rem" }}>
          Size: {canvasData.dimensions.width} × {canvasData.dimensions.height}px
        </div>
        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.7rem" }}>Platform: {canvasData.platform}</div>
        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.7rem" }}>
          Estimated file size: {getFileSizeEstimate()}
        </div>
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={isExporting}
        style={{
          width: "100%",
          padding: "1rem",
          borderRadius: "0.5rem",
          border: "none",
          background: isExporting ? "rgba(107, 114, 128, 0.5)" : "rgba(16, 185, 129, 0.3)",
          color: "white",
          cursor: isExporting ? "not-allowed" : "pointer",
          fontSize: "0.9rem",
          fontWeight: "bold",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        <Download size={20} />
        {isExporting ? "Exporting..." : `Export as ${exportFormat.toUpperCase()}`}
      </button>

      {/* Social Sharing */}
      <div>
        <h4 style={{ color: "white", fontSize: "0.9rem", margin: "0 0 0.5rem 0" }}>
          <Share2 size={16} style={{ marginRight: "0.25rem" }} />
          Quick Share
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {socialPlatforms.map((platform) => (
            <button
              key={platform.name}
              onClick={() => handleSocialShare(platform.name)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
            >
              <div style={{ color: platform.color }}>{platform.icon}</div>
              <div>
                <div style={{ fontWeight: "bold" }}>{platform.name}</div>
                <div style={{ fontSize: "0.7rem", opacity: 0.8 }}>{platform.sizes.join(" • ")}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
