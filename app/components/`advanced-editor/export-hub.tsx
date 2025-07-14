"use client"

import type React from "react"

import { useState } from "react"
import { Download, Share2, Instagram, Twitter, Facebook, Linkedin, Copy, Check } from "lucide-react"

interface ExportHubProps {
  canvasDataUrl?: string
  canvasRef?: React.RefObject<HTMLCanvasElement>
  platform?: any
  locationName?: string
  onExport?: (settings: any) => void
  onShare?: (platform: string) => void
  onExportComplete?: () => void
}

export function ExportHub({
  canvasDataUrl,
  canvasRef,
  platform,
  locationName,
  onExport,
  onShare,
  onExportComplete,
}: ExportHubProps) {
  const [exportFormat, setExportFormat] = useState("jpeg")
  const [exportQuality, setExportQuality] = useState(90)
  const [exportSize, setExportSize] = useState("original")
  const [isExporting, setIsExporting] = useState(false)
  const [copied, setCopied] = useState(false)

  const exportFormats = [
    { id: "jpeg", name: "JPEG", description: "Best for photos", extension: ".jpg" },
    { id: "png", name: "PNG", description: "Best for graphics", extension: ".png" },
    { id: "webp", name: "WebP", description: "Modern format", extension: ".webp" },
    { id: "pdf", name: "PDF", description: "Document format", extension: ".pdf" },
    { id: "svg", name: "SVG", description: "Vector format", extension: ".svg" },
  ]

  const exportSizes = [
    { id: "original", name: "Original", description: "Keep original size" },
    { id: "instagram-post", name: "Instagram Post", description: "1080×1080", width: 1080, height: 1080 },
    { id: "instagram-story", name: "Instagram Story", description: "1080×1920", width: 1080, height: 1920 },
    { id: "facebook-post", name: "Facebook Post", description: "1200×630", width: 1200, height: 630 },
    { id: "twitter-post", name: "Twitter Post", description: "1200×675", width: 1200, height: 675 },
    { id: "linkedin-post", name: "LinkedIn Post", description: "1200×627", width: 1200, height: 627 },
  ]

  const socialPlatforms = [
    { id: "instagram", name: "Instagram", icon: <Instagram size={20} />, color: "#E4405F" },
    { id: "twitter", name: "Twitter", icon: <Twitter size={20} />, color: "#1DA1F2" },
    { id: "facebook", name: "Facebook", icon: <Facebook size={20} />, color: "#1877F2" },
    { id: "linkedin", name: "LinkedIn", icon: <Linkedin size={20} />, color: "#0A66C2" },
  ]

  const handleExport = async () => {
    setIsExporting(true)

    try {
      let dataUrl = canvasDataUrl

      // If we have a canvas ref, get the data from it
      if (canvasRef?.current) {
        const canvas = canvasRef.current
        dataUrl = canvas.toDataURL(`image/${exportFormat}`, exportQuality / 100)
      }

      if (!dataUrl) {
        throw new Error("No image data available")
      }

      // Create download link
      const link = document.createElement("a")
      const selectedFormat = exportFormats.find((f) => f.id === exportFormat)
      const selectedSize = exportSizes.find((s) => s.id === exportSize)

      const filename = `pinit-${locationName?.replace(/[^a-zA-Z0-9]/g, "-") || "postcard"}-${Date.now()}${selectedFormat?.extension || ".jpg"}`

      link.download = filename
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Call export callback
      onExport?.({
        format: exportFormat,
        quality: exportQuality,
        size: exportSize,
        filename,
        dataUrl,
      })

      console.log(`✅ Exported as ${filename}`)
    } catch (error) {
      console.error("Export failed:", error)
    } finally {
      setIsExporting(false)
      onExportComplete?.()
    }
  }

  const handleShare = (platformId: string) => {
    onShare?.(platformId)

    // In a real implementation, this would integrate with social media APIs
    const platform = socialPlatforms.find((p) => p.id === platformId)
    console.log(`🚀 Sharing to ${platform?.name}`)

    // For now, just copy to clipboard
    if (canvasDataUrl) {
      navigator.clipboard.writeText(canvasDataUrl).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  const copyToClipboard = async () => {
    if (!canvasDataUrl) return

    try {
      await navigator.clipboard.writeText(canvasDataUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy to clipboard:", error)
    }
  }

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.9)",
        padding: "1rem",
        borderRadius: "1rem",
        color: "white",
        maxHeight: "600px",
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
        <Download size={20} />
        <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "600" }}>Export & Share</h3>
      </div>

      {/* Export Format */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h4
          style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: "0.9rem",
            margin: "0 0 1rem 0",
            fontWeight: "500",
          }}
        >
          Export Format
        </h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "0.5rem",
          }}
        >
          {exportFormats.map((format) => (
            <button
              key={format.id}
              onClick={() => setExportFormat(format.id)}
              style={{
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: exportFormat === format.id ? "2px solid #10B981" : "1px solid rgba(255,255,255,0.2)",
                background: exportFormat === format.id ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ fontWeight: "600", fontSize: "0.8rem" }}>{format.name}</div>
              <div style={{ fontSize: "0.7rem", opacity: 0.7 }}>{format.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Export Quality */}
      {(exportFormat === "jpeg" || exportFormat === "webp") && (
        <div style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
            }}
          >
            <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.8)" }}>Quality</label>
            <span style={{ fontSize: "0.8rem", color: "white" }}>{exportQuality}%</span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            value={exportQuality}
            onChange={(e) => setExportQuality(Number(e.target.value))}
            style={{
              width: "100%",
              height: "4px",
              borderRadius: "2px",
              background: "rgba(255,255,255,0.2)",
              outline: "none",
              cursor: "pointer",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.7rem",
              color: "rgba(255,255,255,0.5)",
              marginTop: "0.25rem",
            }}
          >
            <span>Low</span>
            <span>High</span>
          </div>
        </div>
      )}

      {/* Export Size */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h4
          style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: "0.9rem",
            margin: "0 0 1rem 0",
            fontWeight: "500",
          }}
        >
          Export Size
        </h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "0.5rem",
          }}
        >
          {exportSizes.map((size) => (
            <button
              key={size.id}
              onClick={() => setExportSize(size.id)}
              style={{
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: exportSize === size.id ? "2px solid #10B981" : "1px solid rgba(255,255,255,0.2)",
                background: exportSize === size.id ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ fontWeight: "600", fontSize: "0.8rem" }}>{size.name}</div>
              <div style={{ fontSize: "0.7rem", opacity: 0.7 }}>{size.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Export Button */}
      <div style={{ marginBottom: "1.5rem" }}>
        <button
          onClick={handleExport}
          disabled={isExporting}
          style={{
            width: "100%",
            padding: "1rem",
            borderRadius: "0.75rem",
            border: "none",
            background: isExporting ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #10B981 0%, #059669 100%)",
            color: "white",
            cursor: isExporting ? "not-allowed" : "pointer",
            fontSize: "0.9rem",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            opacity: isExporting ? 0.6 : 1,
          }}
        >
          <Download size={20} />
          {isExporting ? "Exporting..." : "Download Image"}
        </button>
      </div>

      {/* Social Sharing */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h4
          style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: "0.9rem",
            margin: "0 0 1rem 0",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Share2 size={16} />
          Share to Social Media
        </h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "0.5rem",
          }}
        >
          {socialPlatforms.map((platform) => (
            <button
              key={platform.id}
              onClick={() => handleShare(platform.id)}
              style={{
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                fontSize: "0.8rem",
                fontWeight: "500",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${platform.color}20`
                e.currentTarget.style.borderColor = platform.color
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)"
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"
              }}
            >
              {platform.icon}
              {platform.name}
            </button>
          ))}
        </div>
      </div>

      {/* Copy to Clipboard */}
      <div>
        <button
          onClick={copyToClipboard}
          style={{
            width: "100%",
            padding: "0.75rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(255,255,255,0.2)",
            background: copied ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.1)",
            color: "white",
            cursor: "pointer",
            fontSize: "0.8rem",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            transition: "all 0.2s ease",
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Copied!" : "Copy Image Data"}
        </button>
      </div>

      {/* Export Info */}
      <div
        style={{
          marginTop: "1rem",
          padding: "0.75rem",
          borderRadius: "0.5rem",
          background: "rgba(255,255,255,0.05)",
          fontSize: "0.7rem",
          color: "rgba(255,255,255,0.6)",
          lineHeight: "1.4",
        }}
      >
        <div style={{ marginBottom: "0.25rem" }}>
          <strong>Format:</strong> {exportFormats.find((f) => f.id === exportFormat)?.name}
        </div>
        {(exportFormat === "jpeg" || exportFormat === "webp") && (
          <div style={{ marginBottom: "0.25rem" }}>
            <strong>Quality:</strong> {exportQuality}%
          </div>
        )}
        <div>
          <strong>Size:</strong> {exportSizes.find((s) => s.id === exportSize)?.description}
        </div>
      </div>
    </div>
  )
}
