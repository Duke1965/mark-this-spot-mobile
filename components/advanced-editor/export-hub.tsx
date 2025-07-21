"use client"

import { useState, useCallback, useRef } from "react"
import { ArrowLeft, Download, Share, Copy, Instagram, Facebook, Twitter } from "lucide-react"

interface PostcardData {
  mediaUrl: string
  mediaType: "photo" | "video"
  location?: string
  effects: string[]
  stickers: any[]
  canvasData: any
}

interface ExportHubProps {
  generatePostcard: () => Promise<string | null>
  postcardData: PostcardData
}

export function ExportHub({ generatePostcard, postcardData }: ExportHubProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPostcard, setGeneratedPostcard] = useState<string | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<"postcard" | "square" | "story">("postcard")
  const [selectedQuality, setSelectedQuality] = useState<"high" | "medium" | "low">("high")
  const [includeWatermark, setIncludeWatermark] = useState(true)

  const formats = [
    { id: "postcard", name: "Postcard", dimensions: "800x600", ratio: "4:3" },
    { id: "square", name: "Square", dimensions: "800x800", ratio: "1:1" },
    { id: "story", name: "Story", dimensions: "600x800", ratio: "3:4" },
  ]

  const qualitySettings = [
    { id: "high", name: "High Quality", size: "~2MB", quality: 0.95 },
    { id: "medium", name: "Medium Quality", size: "~1MB", quality: 0.8 },
    { id: "low", name: "Low Quality", size: "~500KB", quality: 0.6 },
  ]

  const generateCustomPostcard = useCallback(async () => {
    if (!postcardData.mediaUrl || !canvasRef.current) return null

    setIsGenerating(true)

    try {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) return null

      // Set canvas dimensions based on format
      const formatConfig = formats.find((f) => f.id === selectedFormat)
      if (selectedFormat === "postcard") {
        canvas.width = 800
        canvas.height = 600
      } else if (selectedFormat === "square") {
        canvas.width = 800
        canvas.height = 800
      } else if (selectedFormat === "story") {
        canvas.width = 600
        canvas.height = 800
      }

      // Background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, "#f8fafc")
      gradient.addColorStop(1, "#e2e8f0")
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Load and draw media
      if (postcardData.mediaType === "photo") {
        const img = new Image()
        img.crossOrigin = "anonymous"

        return new Promise<string>((resolve) => {
          img.onload = () => {
            // Calculate image placement
            const padding = 40
            const availableWidth = canvas.width - padding * 2
            const availableHeight = canvas.height - 160 // Space for text

            const imgAspect = img.width / img.height
            const availableAspect = availableWidth / availableHeight

            let drawWidth, drawHeight, drawX, drawY

            if (imgAspect > availableAspect) {
              drawWidth = availableWidth
              drawHeight = availableWidth / imgAspect
              drawX = padding
              drawY = padding + (availableHeight - drawHeight) / 2
            } else {
              drawHeight = availableHeight
              drawWidth = availableHeight * imgAspect
              drawX = padding + (availableWidth - drawWidth) / 2
              drawY = padding
            }

            // Draw image with rounded corners
            ctx.save()
            ctx.beginPath()
            ctx.roundRect(drawX, drawY, drawWidth, drawHeight, 12)
            ctx.clip()
            ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
            ctx.restore()

            // Add subtle shadow
            ctx.shadowColor = "rgba(0,0,0,0.1)"
            ctx.shadowBlur = 10
            ctx.shadowOffsetY = 4
            ctx.strokeStyle = "rgba(0,0,0,0.1)"
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.roundRect(drawX, drawY, drawWidth, drawHeight, 12)
            ctx.stroke()
            ctx.shadowColor = "transparent"

            // Location text
            if (postcardData.location) {
              ctx.fillStyle = "#1e293b"
              ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
              ctx.textAlign = "center"
              ctx.fillText(postcardData.location, canvas.width / 2, canvas.height - 80)
            }

            // Date
            ctx.fillStyle = "#64748b"
            ctx.font = "18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            ctx.textAlign = "center"
            const dateText = new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
            ctx.fillText(dateText, canvas.width / 2, canvas.height - 45)

            // Watermark
            if (includeWatermark) {
              ctx.fillStyle = "rgba(100, 116, 139, 0.6)"
              ctx.font = "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
              ctx.textAlign = "right"
              ctx.fillText("Created with PINIT", canvas.width - 20, canvas.height - 15)
            }

            // Decorative elements
            ctx.strokeStyle = "#cbd5e1"
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.roundRect(20, 20, canvas.width - 40, canvas.height - 40, 16)
            ctx.stroke()

            const quality = qualitySettings.find((q) => q.id === selectedQuality)?.quality || 0.9
            const result = canvas.toDataURL("image/jpeg", quality)
            setGeneratedPostcard(result)
            resolve(result)
          }
          img.src = postcardData.mediaUrl
        })
      }
    } catch (error) {
      console.error("Failed to generate postcard:", error)
      return null
    } finally {
      setIsGenerating(false)
    }
  }, [postcardData, selectedFormat, selectedQuality, includeWatermark])

  const handleDownload = useCallback(async () => {
    const postcard = generatedPostcard || (await generateCustomPostcard())
    if (postcard) {
      const link = document.createElement("a")
      link.download = `pinit-${selectedFormat}-${Date.now()}.jpg`
      link.href = postcard
      link.click()
    }
  }, [generatedPostcard, generateCustomPostcard, selectedFormat])

  const handleShare = useCallback(
    async (platform?: string) => {
      const postcard = generatedPostcard || (await generateCustomPostcard())
      if (!postcard) return

      if (platform) {
        // Platform-specific sharing
        const text = `Check out my ${postcardData.location ? `postcard from ${postcardData.location}` : "PINIT creation"}! 📍✨`
        const url = window.location.href

        switch (platform) {
          case "twitter":
            window.open(
              `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
            )
            break
          case "facebook":
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)
            break
          case "instagram":
            // Instagram doesn't support direct sharing, so copy to clipboard
            navigator.clipboard.writeText(text)
            alert("Caption copied to clipboard! Open Instagram to share your image.")
            break
        }
      } else if (navigator.share) {
        // Native sharing
        try {
          const response = await fetch(postcard)
          const blob = await response.blob()
          const file = new File([blob], `pinit-${selectedFormat}.jpg`, { type: "image/jpeg" })

          await navigator.share({
            title: "My PINIT Creation",
            text: `Check out my ${postcardData.location ? `postcard from ${postcardData.location}` : "PINIT creation"}!`,
            files: [file],
          })
        } catch (error) {
          console.error("Share failed:", error)
        }
      }
    },
    [generatedPostcard, generateCustomPostcard, postcardData.location, selectedFormat],
  )

  const copyToClipboard = useCallback(async () => {
    const postcard = generatedPostcard || (await generateCustomPostcard())
    if (postcard) {
      try {
        const response = await fetch(postcard)
        const blob = await response.blob()
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
        alert("Image copied to clipboard!")
      } catch (error) {
        console.error("Copy failed:", error)
        // Fallback: copy the data URL
        navigator.clipboard.writeText(postcard)
        alert("Image URL copied to clipboard!")
      }
    }
  }, [generatedPostcard, generateCustomPostcard])

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "#1a202c",
        color: "white",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem",
          background: "rgba(0,0,0,0.5)",
        }}
      >
        <button
          onClick={() => window.history.back()}
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

        <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: "bold" }}>Export & Share</h2>

        <button
          onClick={generateCustomPostcard}
          disabled={isGenerating}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "none",
            background: isGenerating ? "rgba(255,255,255,0.2)" : "#8B5CF6",
            color: "white",
            cursor: isGenerating ? "not-allowed" : "pointer",
            fontSize: "0.75rem",
            fontWeight: "bold",
            opacity: isGenerating ? 0.5 : 1,
          }}
        >
          {isGenerating ? "Generating..." : "Generate"}
        </button>
      </div>

      {/* Preview */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          background: "#2d3748",
        }}
      >
        {generatedPostcard ? (
          <img
            src={generatedPostcard || "/placeholder.svg"}
            alt="Generated Postcard"
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              borderRadius: "0.5rem",
              boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
              opacity: 0.6,
            }}
          >
            <div style={{ fontSize: "4rem" }}>📮</div>
            <p style={{ margin: 0, textAlign: "center" }}>
              {isGenerating ? "Generating your postcard..." : "Click Generate to create your postcard"}
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div
        style={{
          padding: "1rem",
          background: "rgba(0,0,0,0.8)",
          maxHeight: "60vh",
          overflowY: "auto",
        }}
      >
        {/* Format Selection */}
        <div style={{ marginBottom: "2rem" }}>
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: "bold" }}>📐 Format</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.5rem" }}>
            {formats.map((format) => (
              <button
                key={format.id}
                onClick={() => setSelectedFormat(format.id as any)}
                style={{
                  padding: "1rem 0.5rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: selectedFormat === format.id ? "#3B82F6" : "rgba(255,255,255,0.1)",
                  color: "white",
                  cursor: "pointer",
                  textAlign: "center",
                  fontSize: "0.75rem",
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: "0.25rem" }}>{format.name}</div>
                <div style={{ opacity: 0.8 }}>{format.dimensions}</div>
                <div style={{ opacity: 0.6 }}>{format.ratio}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Quality Selection */}
        <div style={{ marginBottom: "2rem" }}>
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: "bold" }}>⚡ Quality</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {qualitySettings.map((quality) => (
              <button
                key={quality.id}
                onClick={() => setSelectedQuality(quality.id as any)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: selectedQuality === quality.id ? "#3B82F6" : "rgba(255,255,255,0.1)",
                  color: "white",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ fontWeight: "bold" }}>{quality.name}</span>
                <span style={{ opacity: 0.8, fontSize: "0.75rem" }}>{quality.size}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div style={{ marginBottom: "2rem" }}>
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: "bold" }}>⚙️ Options</h3>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.75rem",
              background: "rgba(255,255,255,0.05)",
              borderRadius: "0.5rem",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={includeWatermark}
              onChange={(e) => setIncludeWatermark(e.target.checked)}
              style={{ width: "16px", height: "16px" }}
            />
            <span>Include PINIT watermark</span>
          </label>
        </div>

        {/* Export Actions */}
        <div style={{ marginBottom: "2rem" }}>
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: "bold" }}>💾 Export</h3>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={handleDownload}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "#10B981",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              <Download size={16} />
              Download
            </button>

            <button
              onClick={copyToClipboard}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "#6366F1",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              <Copy size={16} />
              Copy
            </button>
          </div>
        </div>

        {/* Share Options */}
        <div>
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: "bold" }}>🚀 Share</h3>

          {/* Native Share */}
          <button
            onClick={() => handleShare()}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#3B82F6",
              color: "white",
              cursor: "pointer",
              fontWeight: "bold",
              marginBottom: "1rem",
            }}
          >
            <Share size={16} />
            Share
          </button>

          {/* Social Media */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
            <button
              onClick={() => handleShare("twitter")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "#1DA1F2",
                color: "white",
                cursor: "pointer",
                fontSize: "0.75rem",
              }}
            >
              <Twitter size={16} />
              Twitter
            </button>

            <button
              onClick={() => handleShare("facebook")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "#4267B2",
                color: "white",
                cursor: "pointer",
                fontSize: "0.75rem",
              }}
            >
              <Facebook size={16} />
              Facebook
            </button>

            <button
              onClick={() => handleShare("instagram")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)",
                color: "white",
                cursor: "pointer",
                fontSize: "0.75rem",
              }}
            >
              <Instagram size={16} />
              Instagram
            </button>
          </div>
        </div>
      </div>

      {/* Hidden canvas for generation */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  )
}
