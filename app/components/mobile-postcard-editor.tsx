"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { X, Save } from "lucide-react"

interface MobilePostcardEditorProps {
  mediaUrl: string
  mediaType: "photo" | "video"
  platform: string
  dimensions: { width: number; height: number }
  locationName: string
  onSave: (postcardData: any) => void
  onClose: () => void
}

interface TextElement {
  id: string
  text: string
  x: number
  y: number
  fontSize: number
  color: string
  fontWeight: "normal" | "bold"
}

const PLATFORM_TEMPLATES = {
  "instagram-story": [
    { name: "Story Classic", textColor: "#FFFFFF", fontSize: 32, position: "bottom" },
    { name: "Story Bold", textColor: "#FFD700", fontSize: 40, position: "top" },
    { name: "Story Minimal", textColor: "#000000", fontSize: 24, position: "center" },
  ],
  "instagram-post": [
    { name: "Post Classic", textColor: "#FFFFFF", fontSize: 28, position: "bottom" },
    { name: "Post Vibrant", textColor: "#FF6B6B", fontSize: 32, position: "top" },
  ],
  whatsapp: [
    { name: "WhatsApp Simple", textColor: "#FFFFFF", fontSize: 24, position: "bottom" },
    { name: "WhatsApp Fun", textColor: "#25D366", fontSize: 28, position: "center" },
  ],
  twitter: [
    { name: "Twitter Clean", textColor: "#FFFFFF", fontSize: 26, position: "bottom" },
    { name: "Twitter Bold", textColor: "#1DA1F2", fontSize: 30, position: "top" },
  ],
  facebook: [{ name: "Facebook Standard", textColor: "#FFFFFF", fontSize: 24, position: "bottom" }],
  generic: [{ name: "Universal", textColor: "#FFFFFF", fontSize: 28, position: "bottom" }],
}

const QUICK_COLORS = ["#FFFFFF", "#000000", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD"]

export function MobilePostcardEditor({
  mediaUrl,
  mediaType,
  platform,
  dimensions,
  locationName,
  onSave,
  onClose,
}: MobilePostcardEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [textElements, setTextElements] = useState<TextElement[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState(0)
  const [currentText, setCurrentText] = useState(`Amazing spot in ${locationName}! 📍`)
  const [textColor, setTextColor] = useState("#FFFFFF")
  const [fontSize, setFontSize] = useState(28)
  const [showTextControls, setShowTextControls] = useState(false)
  const [canvasReady, setCanvasReady] = useState(false)

  const templates = PLATFORM_TEMPLATES[platform as keyof typeof PLATFORM_TEMPLATES] || PLATFORM_TEMPLATES.generic

  const redrawCanvas = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size to platform dimensions
    canvas.width = dimensions.width
    canvas.height = dimensions.height

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    try {
      // Draw media
      const img = new Image()
      img.crossOrigin = "anonymous"

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = mediaUrl
      })

      // Calculate dimensions to fill canvas
      const imgAspect = img.width / img.height
      const canvasAspect = canvas.width / canvas.height

      let drawWidth, drawHeight, offsetX, offsetY

      if (imgAspect > canvasAspect) {
        // Image is wider - fit to height
        drawHeight = canvas.height
        drawWidth = drawHeight * imgAspect
        offsetX = (canvas.width - drawWidth) / 2
        offsetY = 0
      } else {
        // Image is taller - fit to width
        drawWidth = canvas.width
        drawHeight = drawWidth / imgAspect
        offsetX = 0
        offsetY = (canvas.height - drawHeight) / 2
      }

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)

      // Draw text overlay
      if (currentText.trim()) {
        const template = templates[selectedTemplate]
        ctx.font = `bold ${fontSize}px Arial`
        ctx.fillStyle = textColor
        ctx.strokeStyle = textColor === "#FFFFFF" ? "#000000" : "#FFFFFF"
        ctx.lineWidth = 2
        ctx.textAlign = "center"

        let textY
        switch (template.position) {
          case "top":
            textY = fontSize + 40
            break
          case "center":
            textY = canvas.height / 2
            break
          case "bottom":
          default:
            textY = canvas.height - 40
            break
        }

        // Draw text with stroke for better visibility
        ctx.strokeText(currentText, canvas.width / 2, textY)
        ctx.fillText(currentText, canvas.width / 2, textY)
      }

      setCanvasReady(true)
      console.log("✅ Canvas redrawn successfully")
    } catch (error) {
      console.error("❌ Failed to draw canvas:", error)
    }
  }, [mediaUrl, currentText, textColor, fontSize, selectedTemplate, dimensions, templates])

  useEffect(() => {
    redrawCanvas()
  }, [redrawCanvas])

  const handleSave = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9)

    const postcardData = {
      id: Date.now().toString(),
      mediaUrl,
      mediaType,
      locationName,
      text: currentText,
      textColor,
      textSize: fontSize,
      selectedTemplate,
      platform,
      dimensions,
      timestamp: new Date().toISOString(),
      canvasDataUrl: dataUrl,
    }

    // Save to localStorage
    const existingPostcards = JSON.parse(localStorage.getItem("pinit-saved-postcards") || "[]")
    existingPostcards.unshift(postcardData)
    localStorage.setItem("pinit-saved-postcards", JSON.stringify(existingPostcards))

    onSave(postcardData)
    console.log("💾 Postcard saved:", postcardData)
  }, [
    mediaUrl,
    mediaType,
    locationName,
    currentText,
    textColor,
    fontSize,
    selectedTemplate,
    platform,
    dimensions,
    onSave,
  ])

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "#000000",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        color: "white",
      }}
    >
      {/* Compact Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.75rem 1rem",
          background: "rgba(0,0,0,0.8)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
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
            fontSize: "1rem",
          }}
        >
          <X size={16} />
        </button>

        <div style={{ textAlign: "center" }}>
          <h3 style={{ margin: 0, fontSize: "0.875rem", fontWeight: "bold" }}>
            {platform.replace("-", " ").toUpperCase()}
          </h3>
          <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.7 }}>
            {dimensions.width}×{dimensions.height}
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={!canvasReady}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            padding: "0.5rem 0.75rem",
            borderRadius: "1rem",
            border: "none",
            background: canvasReady ? "#10B981" : "#6B7280",
            color: "white",
            cursor: canvasReady ? "pointer" : "not-allowed",
            fontSize: "0.75rem",
            fontWeight: "bold",
          }}
        >
          <Save size={14} />
          Save
        </button>
      </div>

      {/* Main Canvas Area - FULL SCREEN */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0.5rem",
          position: "relative",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            borderRadius: "0.5rem",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          }}
        />

        {!canvasReady && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "rgba(0,0,0,0.8)",
              padding: "1rem",
              borderRadius: "0.5rem",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "2rem",
                height: "2rem",
                border: "3px solid rgba(255,255,255,0.3)",
                borderTop: "3px solid white",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 0.5rem",
              }}
            />
            <p style={{ margin: 0, fontSize: "0.875rem" }}>Loading...</p>
          </div>
        )}
      </div>

      {/* Compact Bottom Controls */}
      <div
        style={{
          background: "rgba(0,0,0,0.9)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          flexShrink: 0,
        }}
      >
        {/* Template Selector */}
        <div
          style={{
            padding: "0.75rem 1rem",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              overflowX: "auto",
              paddingBottom: "0.25rem",
            }}
          >
            {templates.map((template, index) => (
              <button
                key={index}
                onClick={() => setSelectedTemplate(index)}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "1rem",
                  border: "none",
                  background: selectedTemplate === index ? "#3B82F6" : "rgba(255,255,255,0.1)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>

        {/* Text Input */}
        <div style={{ padding: "0.75rem 1rem" }}>
          <textarea
            value={currentText}
            onChange={(e) => setCurrentText(e.target.value)}
            placeholder="Add your message..."
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(255,255,255,0.3)",
              background: "rgba(255,255,255,0.1)",
              color: "white",
              fontSize: "0.875rem",
              resize: "none",
              minHeight: "60px",
            }}
          />
        </div>

        {/* Quick Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            padding: "0.75rem 1rem",
          }}
        >
          {/* Font Size */}
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "0.75rem", opacity: 0.8, display: "block", marginBottom: "0.25rem" }}>
              Size: {fontSize}px
            </label>
            <input
              type="range"
              min="16"
              max="48"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          {/* Color Picker */}
          <div>
            <label style={{ fontSize: "0.75rem", opacity: 0.8, display: "block", marginBottom: "0.25rem" }}>
              Color
            </label>
            <div style={{ display: "flex", gap: "0.25rem" }}>
              {QUICK_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setTextColor(color)}
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    border: textColor === color ? "2px solid white" : "1px solid rgba(255,255,255,0.3)",
                    background: color,
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
