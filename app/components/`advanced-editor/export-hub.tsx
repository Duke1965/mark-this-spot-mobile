"use client"

import { useState } from "react"
import { Download, Instagram, Facebook, Twitter, MessageSquare } from "lucide-react"

interface ExportHubProps {
  canvasDataUrl: string
  platform: any
  locationName: string
  onClose: () => void
}

export function ExportHub({ canvasDataUrl, platform, locationName, onClose }: ExportHubProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportQuality, setExportQuality] = useState(95)
  const [exportFormat, setExportFormat] = useState<"jpeg" | "png">("jpeg")

  const downloadImage = async () => {
    setIsExporting(true)

    try {
      // Create optimized version based on settings
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      canvas.width = platform.dimensions.width
      canvas.height = platform.dimensions.height

      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0)

        const optimizedDataUrl = canvas.toDataURL(
          exportFormat === "png" ? "image/png" : "image/jpeg",
          exportQuality / 100,
        )

        const link = document.createElement("a")
        link.download = `pinit-${platform.id}-${locationName.replace(/[^a-zA-Z0-9]/g, "-")}-${Date.now()}.${exportFormat}`
        link.href = optimizedDataUrl
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        console.log("📥 Image downloaded successfully")
      }
      img.src = canvasDataUrl
    } catch (error) {
      console.error("❌ Download failed:", error)
    } finally {
      setIsExporting(false)
    }
  }

  const shareToSocial = (socialPlatform: string) => {
    const text = `Check out this amazing spot I discovered: ${locationName}! 📍✨ Created with PINIT`

    const urls = {
      instagram: () => {
        navigator.clipboard.writeText(text).then(() => {
          alert("📋 Caption copied! Now save your image and share it on Instagram!")
        })
      },
      facebook: () => {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(text)}`,
          "_blank",
        )
      },
      twitter: () => {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank")
      },
      whatsapp: () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank")
      },
    }

    urls[socialPlatform as keyof typeof urls]?.()
  }

  const copyToClipboard = async () => {
    try {
      const response = await fetch(canvasDataUrl)
      const blob = await response.blob()

      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])

      alert("📋 Image copied to clipboard!")
    } catch (error) {
      console.error("Failed to copy to clipboard:", error)
      alert("❌ Failed to copy to clipboard")
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.95)",
        zIndex: 1001,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #1e40af 50%, #4338ca 100%)",
          borderRadius: "1.5rem",
          padding: "2rem",
          maxWidth: "600px",
          width: "100%",
          color: "white",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🚀</div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: "0 0 0.5rem 0" }}>Export Your Creation</h2>
          <p style={{ fontSize: "0.875rem", opacity: 0.8, margin: 0 }}>
            Optimized for {platform.name} • {platform.dimensions.width} × {platform.dimensions.height}
          </p>
        </div>

        {/* Preview */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              maxWidth: "300px",
              border: `2px solid ${platform.color}`,
              borderRadius: "1rem",
              overflow: "hidden",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            }}
          >
            <img
              src={canvasDataUrl || "/placeholder.svg"}
              alt="Export preview"
              style={{
                width: "100%",
                height: "auto",
                display: "block",
              }}
            />
          </div>
        </div>

        {/* Export Settings */}
        <div style={{ marginBottom: "2rem" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: "bold", margin: "0 0 1rem 0" }}>⚙️ Export Settings</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Format</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {["jpeg", "png"].map((format) => (
                  <button
                    key={format}
                    onClick={() => setExportFormat(format as any)}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "0.5rem",
                      border: "none",
                      background: exportFormat === format ? platform.color : "rgba(255,255,255,0.1)",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                    }}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                Quality: {exportQuality}%
              </label>
              <input
                type="range"
                min="60"
                max="100"
                value={exportQuality}
                onChange={(e) => setExportQuality(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>
          </div>
        </div>

        {/* Download Options */}
        <div style={{ marginBottom: "2rem" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: "bold", margin: "0 0 1rem 0" }}>💾 Download</h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
            <button
              onClick={downloadImage}
              disabled={isExporting}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "1rem",
                borderRadius: "0.75rem",
                border: "none",
                background: isExporting
                  ? "rgba(255,255,255,0.3)"
                  : `linear-gradient(135deg, ${platform.color}, ${platform.color}CC)`,
                color: "white",
                cursor: isExporting ? "not-allowed" : "pointer",
                fontWeight: "bold",
                fontSize: "0.875rem",
                boxShadow: isExporting ? "none" : `0 8px 20px ${platform.color}40`,
              }}
            >
              <Download size={18} />
              {isExporting ? "Exporting..." : "Download"}
            </button>

            <button
              onClick={copyToClipboard}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "1rem",
                borderRadius: "0.75rem",
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "0.875rem",
              }}
            >
              📋 Copy
            </button>
          </div>
        </div>

        {/* Social Sharing */}
        <div style={{ marginBottom: "2rem" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: "bold", margin: "0 0 1rem 0" }}>📱 Share</h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
            {[
              { id: "instagram", name: "Instagram", icon: <Instagram size={16} />, color: "#E4405F" },
              { id: "facebook", name: "Facebook", icon: <Facebook size={16} />, color: "#1877F2" },
              { id: "twitter", name: "Twitter", icon: <Twitter size={16} />, color: "#1DA1F2" },
              { id: "whatsapp", name: "WhatsApp", icon: <MessageSquare size={16} />, color: "#25D366" },
            ].map((social) => (
              <button
                key={social.id}
                onClick={() => shareToSocial(social.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  padding: "0.75rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background: `${social.color}20`,
                  color: social.color,
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "0.75rem",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = social.color
                  e.currentTarget.style.color = "white"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `${social.color}20`
                  e.currentTarget.style.color = social.color
                }}
              >
                {social.icon}
                {social.name}
              </button>
            ))}
          </div>
        </div>

        {/* Close Button */}
        <div style={{ textAlign: "center" }}>
          <button
            onClick={onClose}
            style={{
              padding: "1rem 2rem",
              borderRadius: "1rem",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "1rem",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
