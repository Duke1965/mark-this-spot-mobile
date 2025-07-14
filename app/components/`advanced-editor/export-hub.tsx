"use client"

import { useState, type RefObject } from "react"
import { Download, Share2, Mail, MessageCircle, Instagram, Facebook, Twitter } from "lucide-react"

interface ExportHubProps {
  canvasRef: RefObject<HTMLCanvasElement>
  locationName: string
  onExportComplete: () => void
}

export function ExportHub({ canvasRef, locationName, onExportComplete }: ExportHubProps) {
  const [exportFormat, setExportFormat] = useState("jpeg")
  const [exportQuality, setExportQuality] = useState(90)
  const [exportSize, setExportSize] = useState("original")
  const [isExporting, setIsExporting] = useState(false)

  const exportFormats = [
    { id: "jpeg", name: "JPEG", description: "Best for photos, smaller file size" },
    { id: "png", name: "PNG", description: "Best for graphics, supports transparency" },
    { id: "webp", name: "WebP", description: "Modern format, great compression" },
  ]

  const exportSizes = [
    { id: "original", name: "Original", width: 800, height: 600 },
    { id: "instagram", name: "Instagram Post", width: 1080, height: 1080 },
    { id: "story", name: "Instagram Story", width: 1080, height: 1920 },
    { id: "facebook", name: "Facebook Post", width: 1200, height: 630 },
    { id: "twitter", name: "Twitter Post", width: 1200, height: 675 },
  ]

  const handleDownload = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsExporting(true)

    try {
      // Get the selected size
      const selectedSize = exportSizes.find((size) => size.id === exportSize)
      if (!selectedSize) return

      // Create a new canvas with the desired size
      const exportCanvas = document.createElement("canvas")
      const exportCtx = exportCanvas.getContext("2d")
      if (!exportCtx) return

      exportCanvas.width = selectedSize.width
      exportCanvas.height = selectedSize.height

      // Draw the original canvas content scaled to the new size
      exportCtx.drawImage(canvas, 0, 0, selectedSize.width, selectedSize.height)

      // Convert to the desired format
      const mimeType = exportFormat === "jpeg" ? "image/jpeg" : exportFormat === "png" ? "image/png" : "image/webp"

      const quality = exportFormat === "jpeg" ? exportQuality / 100 : undefined
      const dataUrl = exportCanvas.toDataURL(mimeType, quality)

      // Create download link
      const link = document.createElement("a")
      link.download = `pinit-postcard-${locationName.replace(/[^a-zA-Z0-9]/g, "-")}-${Date.now()}.${exportFormat}`
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      onExportComplete()
    } catch (error) {
      console.error("Export failed:", error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleShare = async (platform: string) => {
    const canvas = canvasRef.current
    if (!canvas) return

    try {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9)

      if (navigator.share && platform === "native") {
        // Use native sharing if available
        const blob = await (await fetch(dataUrl)).blob()
        const file = new File([blob], `pinit-postcard-${Date.now()}.jpg`, { type: "image/jpeg" })

        await navigator.share({
          title: `📍 ${locationName}`,
          text: `Check out this postcard from ${locationName}!`,
          files: [file],
        })
      } else {
        // Fallback to platform-specific URLs
        const text = encodeURIComponent(`Check out this postcard from ${locationName}!`)
        const urls = {
          twitter: `https://twitter.com/intent/tweet?text=${text}`,
          facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
          instagram: "https://www.instagram.com/", // Instagram doesn't support direct sharing
          email: `mailto:?subject=Postcard from ${locationName}&body=${text}`,
          sms: `sms:?body=${text}`,
        }

        if (urls[platform as keyof typeof urls]) {
          window.open(urls[platform as keyof typeof urls], "_blank")
        }
      }
    } catch (error) {
      console.error("Sharing failed:", error)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%" }}>
      {/* Export Settings */}
      <div
        style={{
          background: "rgba(255,255,255,0.1)",
          borderRadius: "1rem",
          padding: "1.5rem",
        }}
      >
        <h3 style={{ margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Download size={20} />
          Export Settings
        </h3>

        {/* Format Selection */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "bold" }}>
            Format
          </label>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {exportFormats.map((format) => (
              <label
                key={format.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: exportFormat === format.id ? "2px solid #10B981" : "1px solid rgba(255,255,255,0.2)",
                  background: exportFormat === format.id ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.1)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="format"
                  value={format.id}
                  checked={exportFormat === format.id}
                  onChange={(e) => setExportFormat(e.target.value)}
                  style={{ margin: 0 }}
                />
                <div>
                  <div style={{ fontWeight: "bold" }}>{format.name}</div>
                  <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>{format.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Quality Setting (for JPEG) */}
        {exportFormat === "jpeg" && (
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "bold" }}>
              Quality: {exportQuality}%
            </label>
            <input
              type="range"
              min="10"
              max="100"
              value={exportQuality}
              onChange={(e) => setExportQuality(Number.parseInt(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
        )}

        {/* Size Selection */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "bold" }}>
            Size
          </label>
          <select
            value={exportSize}
            onChange={(e) => setExportSize(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.1)",
              color: "white",
              fontSize: "0.875rem",
            }}
          >
            {exportSizes.map((size) => (
              <option key={size.id} value={size.id} style={{ background: "#1e293b", color: "white" }}>
                {size.name} ({size.width}×{size.height})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Download Button */}
      <button
        onClick={handleDownload}
        disabled={isExporting}
        style={{
          padding: "1rem 2rem",
          borderRadius: "0.5rem",
          border: "none",
          background: isExporting ? "rgba(107, 114, 128, 0.5)" : "linear-gradient(45deg, #10B981, #059669)",
          color: "white",
          cursor: isExporting ? "not-allowed" : "pointer",
          fontSize: "1rem",
          fontWeight: "bold",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
        }}
      >
        <Download size={20} />
        {isExporting ? "Exporting..." : "Download Postcard"}
      </button>

      {/* Share Options */}
      <div
        style={{
          background: "rgba(255,255,255,0.1)",
          borderRadius: "1rem",
          padding: "1.5rem",
        }}
      >
        <h3 style={{ margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Share2 size={20} />
          Share Postcard
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: "0.75rem",
          }}
        >
          <button
            onClick={() => handleShare("native")}
            style={{
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.1)",
              color: "white",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.75rem",
            }}
          >
            <Share2 size={20} />
            Share
          </button>
          <button
            onClick={() => handleShare("twitter")}
            style={{
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(29, 161, 242, 0.2)",
              color: "white",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.75rem",
            }}
          >
            <Twitter size={20} />
            Twitter
          </button>
          <button
            onClick={() => handleShare("facebook")}
            style={{
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(24, 119, 242, 0.2)",
              color: "white",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.75rem",
            }}
          >
            <Facebook size={20} />
            Facebook
          </button>
          <button
            onClick={() => handleShare("instagram")}
            style={{
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(225, 48, 108, 0.2)",
              color: "white",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.75rem",
            }}
          >
            <Instagram size={20} />
            Instagram
          </button>
          <button
            onClick={() => handleShare("email")}
            style={{
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(107, 114, 128, 0.2)",
              color: "white",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.75rem",
            }}
          >
            <Mail size={20} />
            Email
          </button>
          <button
            onClick={() => handleShare("sms")}
            style={{
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(34, 197, 94, 0.2)",
              color: "white",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.75rem",
            }}
          >
            <MessageCircle size={20} />
            SMS
          </button>
        </div>
      </div>
    </div>
  )
}
