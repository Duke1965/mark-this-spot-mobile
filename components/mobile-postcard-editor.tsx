"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { ArrowLeft, Download, Share } from "lucide-react"

interface MobilePostcardEditorProps {
  mediaUrl: string | null
  mediaType: "photo" | "video"
  location: string
  onBack: () => void
  onAdvancedEdit: () => void
  onEffectsChange: (effects: string[]) => void
  onStickersChange: (stickers: any[]) => void
}

export function MobilePostcardEditor({
  mediaUrl,
  mediaType,
  location,
  onBack,
  onAdvancedEdit,
  onEffectsChange,
  onStickersChange,
}: MobilePostcardEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [selectedFilter, setSelectedFilter] = useState<string>("none")
  const [textOverlay, setTextOverlay] = useState("")
  const [showTextInput, setShowTextInput] = useState(false)

  const filters = [
    { name: "none", label: "Original", filter: "" },
    { name: "vintage", label: "Vintage", filter: "sepia(0.5) contrast(1.2)" },
    { name: "bw", label: "B&W", filter: "grayscale(1)" },
    { name: "warm", label: "Warm", filter: "hue-rotate(15deg) saturate(1.2)" },
    { name: "cool", label: "Cool", filter: "hue-rotate(-15deg) saturate(1.1)" },
    { name: "dramatic", label: "Dramatic", filter: "contrast(1.5) brightness(0.9)" },
  ]

  const generatePostcard = useCallback(async () => {
    if (!mediaUrl || !canvasRef.current) return null

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    canvas.width = 800
    canvas.height = 600

    try {
      // Load media
      if (mediaType === "photo") {
        const img = new Image()
        img.crossOrigin = "anonymous"

        return new Promise<string>((resolve) => {
          img.onload = () => {
            // Background
            ctx.fillStyle = "#f8f9fa"
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            // Apply filters
            ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) ${
              filters.find((f) => f.name === selectedFilter)?.filter || ""
            }`

            // Draw image
            const imgAspect = img.width / img.height
            const canvasAspect = (canvas.width - 100) / (canvas.height - 200)

            let drawWidth, drawHeight, drawX, drawY

            if (imgAspect > canvasAspect) {
              drawWidth = canvas.width - 100
              drawHeight = drawWidth / imgAspect
              drawX = 50
              drawY = 50 + (canvas.height - 200 - drawHeight) / 2
            } else {
              drawHeight = canvas.height - 200
              drawWidth = drawHeight * imgAspect
              drawX = 50 + (canvas.width - 100 - drawWidth) / 2
              drawY = 50
            }

            ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)

            // Reset filter for text
            ctx.filter = "none"

            // Location text
            ctx.fillStyle = "#2d3748"
            ctx.font = "bold 28px Arial"
            ctx.textAlign = "center"
            ctx.fillText(location, canvas.width / 2, canvas.height - 120)

            // Custom text overlay
            if (textOverlay) {
              ctx.fillStyle = "#4a5568"
              ctx.font = "20px Arial"
              ctx.fillText(textOverlay, canvas.width / 2, canvas.height - 80)
            }

            // Date
            ctx.fillStyle = "#718096"
            ctx.font = "16px Arial"
            ctx.fillText(new Date().toLocaleDateString(), canvas.width / 2, canvas.height - 40)

            // Decorative border
            ctx.strokeStyle = "#e2e8f0"
            ctx.lineWidth = 2
            ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40)

            resolve(canvas.toDataURL("image/jpeg", 0.9))
          }
          img.src = mediaUrl
        })
      }
    } catch (error) {
      console.error("Failed to generate postcard:", error)
      return null
    }
  }, [mediaUrl, mediaType, location, brightness, contrast, saturation, selectedFilter, textOverlay])

  const handleDownload = useCallback(async () => {
    const postcardUrl = await generatePostcard()
    if (postcardUrl) {
      const link = document.createElement("a")
      link.download = `pinit-postcard-${Date.now()}.jpg`
      link.href = postcardUrl
      link.click()
    }
  }, [generatePostcard])

  const handleShare = useCallback(async () => {
    const postcardUrl = await generatePostcard()
    if (postcardUrl && navigator.share) {
      try {
        const response = await fetch(postcardUrl)
        const blob = await response.blob()
        const file = new File([blob], "pinit-postcard.jpg", { type: "image/jpeg" })

        await navigator.share({
          title: "My PINIT Postcard",
          text: `Check out my postcard from ${location}!`,
          files: [file],
        })
      } catch (error) {
        console.error("Share failed:", error)
      }
    }
  }, [generatePostcard, location])

  // Update effects when values change
  useEffect(() => {
    const effects = []
    if (brightness !== 100) effects.push(`brightness-${brightness}`)
    if (contrast !== 100) effects.push(`contrast-${contrast}`)
    if (saturation !== 100) effects.push(`saturation-${saturation}`)
    if (selectedFilter !== "none") effects.push(`filter-${selectedFilter}`)
    onEffectsChange(effects)
  }, [brightness, contrast, saturation, selectedFilter, onEffectsChange])

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

        <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: "bold" }}>Quick Edit</h2>

        <button
          onClick={onAdvancedEdit}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "#8B5CF6",
            color: "white",
            cursor: "pointer",
            fontSize: "0.875rem",
            fontWeight: "bold",
          }}
        >
          Advanced
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
        {mediaUrl && (
          <div
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              borderRadius: "0.5rem",
              overflow: "hidden",
              boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
            }}
          >
            {mediaType === "photo" ? (
              <img
                src={mediaUrl || "/placeholder.svg"}
                alt="Preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: "400px",
                  objectFit: "contain",
                  filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) ${
                    filters.find((f) => f.name === selectedFilter)?.filter || ""
                  }`,
                }}
              />
            ) : (
              <video
                src={mediaUrl}
                style={{
                  maxWidth: "100%",
                  maxHeight: "400px",
                  objectFit: "contain",
                  filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) ${
                    filters.find((f) => f.name === selectedFilter)?.filter || ""
                  }`,
                }}
                controls
                muted
              />
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div
        style={{
          padding: "1rem",
          background: "rgba(0,0,0,0.8)",
          maxHeight: "50vh",
          overflowY: "auto",
        }}
      >
        {/* Filters */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "1rem", fontWeight: "bold" }}>🎨 Filters</h3>
          <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
            {filters.map((filter) => (
              <button
                key={filter.name}
                onClick={() => setSelectedFilter(filter.name)}
                style={{
                  minWidth: "80px",
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: selectedFilter === filter.name ? "#3B82F6" : "rgba(255,255,255,0.1)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Adjustments */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "1rem", fontWeight: "bold" }}>⚡ Adjustments</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                Brightness: {brightness}%
              </label>
              <input
                type="range"
                min="50"
                max="150"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                Contrast: {contrast}%
              </label>
              <input
                type="range"
                min="50"
                max="150"
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                Saturation: {saturation}%
              </label>
              <input
                type="range"
                min="0"
                max="200"
                value={saturation}
                onChange={(e) => setSaturation(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>
          </div>
        </div>

        {/* Text Overlay */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}
          >
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "bold" }}>📝 Text Overlay</h3>
            <button
              onClick={() => setShowTextInput(!showTextInput)}
              style={{
                padding: "0.25rem 0.5rem",
                borderRadius: "0.25rem",
                border: "none",
                background: "#3B82F6",
                color: "white",
                cursor: "pointer",
                fontSize: "0.75rem",
              }}
            >
              {showTextInput ? "Hide" : "Add Text"}
            </button>
          </div>

          {showTextInput && (
            <input
              type="text"
              value={textOverlay}
              onChange={(e) => setTextOverlay(e.target.value)}
              placeholder="Enter your text..."
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                fontSize: "0.875rem",
              }}
            />
          )}
        </div>

        {/* Action Buttons */}
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
            onClick={handleShare}
            style={{
              flex: 1,
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
            }}
          >
            <Share size={16} />
            Share
          </button>
        </div>
      </div>

      {/* Hidden canvas for postcard generation */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  )
}
