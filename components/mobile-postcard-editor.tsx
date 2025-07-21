"use client"

import { useState, useRef, useEffect } from "react"
import { ArrowLeft, Save, Send, Type, Palette } from "lucide-react"

interface MobilePostcardEditorProps {
  mediaUrl: string
  mediaType: "photo" | "video"
  platform: string
  dimensions: { width: number; height: number }
  locationName: string
  onSave: (postcardData: any) => void
  onClose: () => void
}

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
  const [text, setText] = useState("")
  const [textColor, setTextColor] = useState("#FFFFFF")
  const [textSize, setTextSize] = useState(32)
  const [textPosition, setTextPosition] = useState({ x: 50, y: 80 })
  const [selectedTemplate, setSelectedTemplate] = useState("bottom-overlay")
  const [showSendModal, setShowSendModal] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [customMessage, setCustomMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [mediaLoaded, setMediaLoaded] = useState(false)
  const [mediaError, setMediaError] = useState(false)

  // Platform-specific templates
  const templates = {
    "instagram-story": {
      name: "Story Overlay",
      textPosition: { x: 50, y: 85 },
      textSize: 36,
      textColor: "#FFFFFF",
      background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
    },
    "instagram-post": {
      name: "Center Text",
      textPosition: { x: 50, y: 50 },
      textSize: 28,
      textColor: "#FFFFFF",
      background: "rgba(0,0,0,0.5)",
    },
    whatsapp: {
      name: "Bottom Caption",
      textPosition: { x: 50, y: 90 },
      textSize: 24,
      textColor: "#FFFFFF",
      background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)",
    },
    twitter: {
      name: "Corner Badge",
      textPosition: { x: 20, y: 20 },
      textSize: 20,
      textColor: "#1DA1F2",
      background: "rgba(255,255,255,0.9)",
    },
  }

  const currentTemplate = templates[platform as keyof typeof templates] || templates["instagram-post"]

  useEffect(() => {
    // Set initial template values
    setTextPosition(currentTemplate.textPosition)
    setTextSize(currentTemplate.textSize)
    setTextColor(currentTemplate.textColor)
    setText(`📍 ${locationName}`)
  }, [platform, locationName])

  useEffect(() => {
    drawCanvas()
  }, [text, textColor, textSize, textPosition, selectedTemplate, mediaLoaded])

  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas || !mediaLoaded) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = dimensions.width
    canvas.height = dimensions.height

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Create and draw media
    if (mediaType === "photo") {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        // Draw image to fit canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        drawTextOverlay(ctx)
      }
      img.src = mediaUrl
    }
  }

  const drawTextOverlay = (ctx: CanvasRenderingContext2D) => {
    if (!text.trim()) return

    const canvas = canvasRef.current
    if (!canvas) return

    // Calculate text position
    const x = (textPosition.x / 100) * canvas.width
    const y = (textPosition.y / 100) * canvas.height

    // Draw background overlay
    if (selectedTemplate === "bottom-overlay") {
      const gradient = ctx.createLinearGradient(0, canvas.height - 100, 0, canvas.height)
      gradient.addColorStop(0, "rgba(0,0,0,0)")
      gradient.addColorStop(1, "rgba(0,0,0,0.7)")
      ctx.fillStyle = gradient
      ctx.fillRect(0, canvas.height - 100, canvas.width, 100)
    } else if (selectedTemplate === "center-box") {
      ctx.fillStyle = "rgba(0,0,0,0.5)"
      ctx.fillRect(x - 20, y - textSize - 10, ctx.measureText(text).width + 40, textSize + 20)
    }

    // Draw text
    ctx.font = `bold ${textSize}px Arial, sans-serif`
    ctx.fillStyle = textColor
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    // Add text shadow for better readability
    ctx.shadowColor = "rgba(0,0,0,0.8)"
    ctx.shadowBlur = 4
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 2

    ctx.fillText(text, x, y)

    // Reset shadow
    ctx.shadowColor = "transparent"
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
  }

  const handleSave = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const canvasDataUrl = canvas.toDataURL("image/jpeg", 0.9)

    const postcardData = {
      id: Date.now().toString(),
      mediaUrl,
      mediaType,
      locationName,
      text,
      textColor,
      textSize,
      selectedTemplate,
      platform,
      dimensions,
      timestamp: new Date().toISOString(),
      canvasDataUrl,
    }

    // Save to localStorage
    const savedPostcards = JSON.parse(localStorage.getItem("pinit-saved-postcards") || "[]")
    savedPostcards.unshift(postcardData)
    localStorage.setItem("pinit-saved-postcards", JSON.stringify(savedPostcards))

    onSave(postcardData)
  }

  const handleSend = async () => {
    if (!phoneNumber.trim()) {
      alert("Please enter a phone number")
      return
    }

    setIsSending(true)

    try {
      const canvas = canvasRef.current
      if (!canvas) throw new Error("Canvas not ready")

      const canvasDataUrl = canvas.toDataURL("image/jpeg", 0.9)

      const response = await fetch("/api/send-postcard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber,
          imageDataUrl: canvasDataUrl,
          message: customMessage || `Check out this postcard from ${locationName}!`,
          locationName,
        }),
      })

      const result = await response.json()

      if (result.success) {
        alert("Postcard sent successfully! 📮")
        setShowSendModal(false)
        setPhoneNumber("")
        setCustomMessage("")
      } else {
        throw new Error(result.error || "Failed to send")
      }
    } catch (error) {
      console.error("Send error:", error)
      alert("Failed to send postcard. Please try again.")
    } finally {
      setIsSending(false)
    }
  }

  const handleMediaLoad = () => {
    console.log("📸 Media loaded successfully in editor")
    setMediaLoaded(true)
    setMediaError(false)
  }

  const handleMediaError = () => {
    console.error("❌ Media failed to load in editor:", mediaUrl)
    setMediaError(true)
    setMediaLoaded(false)
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "#000000",
        color: "white",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1rem",
          background: "rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
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
            <h2 style={{ margin: 0, fontSize: "1.125rem" }}>Edit for {platform}</h2>
            <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.7 }}>
              {dimensions.width}×{dimensions.height}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => setShowSendModal(true)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#10B981",
              color: "white",
              cursor: "pointer",
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Send size={16} />
            Send
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#3B82F6",
              color: "white",
              cursor: "pointer",
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Save size={16} />
            Save
          </button>
        </div>
      </div>

      {/* Canvas Area - Fixed */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          background: "#111",
          position: "relative",
          minHeight: 0,
        }}
      >
        {/* Hidden image for loading */}
        <img
          src={mediaUrl || "/placeholder.svg"}
          alt="Media"
          style={{ display: "none" }}
          onLoad={handleMediaLoad}
          onError={handleMediaError}
          crossOrigin="anonymous"
        />

        {mediaError ? (
          <div
            style={{
              textAlign: "center",
              color: "rgba(255,255,255,0.6)",
              padding: "2rem",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>❌</div>
            <p>Failed to load media</p>
            <p style={{ fontSize: "0.875rem" }}>Please try again</p>
          </div>
        ) : !mediaLoaded ? (
          <div
            style={{
              textAlign: "center",
              color: "rgba(255,255,255,0.6)",
              padding: "2rem",
            }}
          >
            <div
              style={{
                width: "3rem",
                height: "3rem",
                border: "3px solid rgba(255,255,255,0.3)",
                borderTop: "3px solid white",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 1rem",
              }}
            />
            <p>Loading media...</p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "0.5rem",
            }}
          />
        )}
      </div>

      {/* Controls - Scrollable */}
      <div
        style={{
          maxHeight: "50vh",
          overflowY: "auto",
          background: "rgba(0,0,0,0.9)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          flexShrink: 0,
        }}
      >
        <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Text Input */}
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem", opacity: 0.8 }}>
              <Type size={16} style={{ display: "inline", marginRight: "0.5rem" }} />
              Text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add your message..."
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                fontSize: "1rem",
                resize: "vertical",
                minHeight: "80px",
              }}
            />
          </div>

          {/* Text Size */}
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem", opacity: 0.8 }}>
              Text Size: {textSize}px
            </label>
            <input
              type="range"
              min="16"
              max="72"
              value={textSize}
              onChange={(e) => setTextSize(Number(e.target.value))}
              style={{
                width: "100%",
                height: "6px",
                borderRadius: "3px",
                background: "rgba(255,255,255,0.2)",
                outline: "none",
              }}
            />
          </div>

          {/* Text Color */}
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem", opacity: 0.8 }}>
              <Palette size={16} style={{ display: "inline", marginRight: "0.5rem" }} />
              Text Color
            </label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {["#FFFFFF", "#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"].map((color) => (
                <button
                  key={color}
                  onClick={() => setTextColor(color)}
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    border: textColor === color ? "3px solid #10B981" : "2px solid rgba(255,255,255,0.3)",
                    background: color,
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Templates */}
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem", opacity: 0.8 }}>
              Template Style
            </label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {[
                { id: "bottom-overlay", name: "Bottom" },
                { id: "center-box", name: "Center" },
                { id: "corner", name: "Corner" },
              ].map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "0.5rem",
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: selectedTemplate === template.id ? "#10B981" : "rgba(255,255,255,0.1)",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                  }}
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>

          {/* Text Position */}
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem", opacity: 0.8 }}>
              Position
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem", opacity: 0.7 }}>Horizontal: {textPosition.x}%</label>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={textPosition.x}
                  onChange={(e) => setTextPosition({ ...textPosition, x: Number(e.target.value) })}
                  style={{
                    width: "100%",
                    height: "4px",
                    borderRadius: "2px",
                    background: "rgba(255,255,255,0.2)",
                    outline: "none",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", opacity: 0.7 }}>Vertical: {textPosition.y}%</label>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={textPosition.y}
                  onChange={(e) => setTextPosition({ ...textPosition, y: Number(e.target.value) })}
                  style={{
                    width: "100%",
                    height: "4px",
                    borderRadius: "2px",
                    background: "rgba(255,255,255,0.2)",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Send Modal */}
      {showSendModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "#1F2937",
              borderRadius: "1rem",
              padding: "2rem",
              width: "100%",
              maxWidth: "400px",
              color: "white",
            }}
          >
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.25rem" }}>Send Postcard</h3>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem", opacity: 0.8 }}>
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                  fontSize: "1rem",
                }}
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem", opacity: 0.8 }}>
                Custom Message (Optional)
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Add a personal message..."
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                  fontSize: "1rem",
                  resize: "vertical",
                  minHeight: "80px",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                onClick={() => setShowSendModal(false)}
                disabled={isSending}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "transparent",
                  color: "white",
                  cursor: isSending ? "not-allowed" : "pointer",
                  opacity: isSending ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={isSending || !phoneNumber.trim()}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: isSending || !phoneNumber.trim() ? "#6B7280" : "#10B981",
                  color: "white",
                  cursor: isSending || !phoneNumber.trim() ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
              >
                {isSending ? (
                  <>
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTop: "2px solid white",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
