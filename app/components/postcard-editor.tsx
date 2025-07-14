"use client"

import { useState, useRef, useEffect } from "react"
import { X, Download, Type, Palette, Save, Share2 } from "lucide-react"
import { PostcardTemplateSelector, postcardTemplates } from "./postcard-templates"
import { SocialSharing } from "./social-sharing"

interface PostcardEditorProps {
  mediaUrl: string
  mediaType: "photo" | "video"
  locationName: string
  onSave: (postcard: any) => void
  onClose: () => void
}

export function PostcardEditor({ mediaUrl, mediaType, locationName, onSave, onClose }: PostcardEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [text, setText] = useState(`Greetings from ${locationName}!`)
  const [textColor, setTextColor] = useState("#FFFFFF")
  const [textSize, setTextSize] = useState(24)
  const [textPosition, setTextPosition] = useState({ x: 50, y: 80 })
  const [backgroundColor, setBackgroundColor] = useState("rgba(0,0,0,0.5)")
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState("classic")
  const [showSharing, setShowSharing] = useState(false)
  const [generatedPostcard, setGeneratedPostcard] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState(false)

  // Add this useEffect after the existing state declarations
  useEffect(() => {
    // Update preview when template changes
    console.log(`🎨 Template changed to: ${selectedTemplate}`)
  }, [selectedTemplate])

  const generatePostcard = async (action: "save" | "share" | "create") => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsGenerating(true)
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    try {
      // Set canvas size
      canvas.width = 800
      canvas.height = 600

      // Load and draw media
      if (mediaType === "photo") {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
          // Draw image
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

          // Add text overlay
          addTextOverlay(ctx)

          // Generate final postcard
          const postcardDataUrl = canvas.toDataURL("image/jpeg", 0.9)
          const postcardData = {
            id: Date.now().toString(),
            mediaUrl,
            mediaType,
            locationName,
            text,
            textColor,
            textSize,
            textPosition,
            backgroundColor,
            selectedTemplate,
            timestamp: new Date().toISOString(),
            canvasDataUrl: postcardDataUrl,
          }

          setGeneratedPostcard(postcardDataUrl)
          handlePostcardAction(action, postcardData, postcardDataUrl)
          setIsGenerating(false)
        }
        img.src = mediaUrl
      } else {
        // For video, create a thumbnail
        const video = document.createElement("video")
        video.crossOrigin = "anonymous"
        video.onloadeddata = () => {
          video.currentTime = 1 // Get frame at 1 second
        }
        video.onseeked = () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          addTextOverlay(ctx)

          const postcardDataUrl = canvas.toDataURL("image/jpeg", 0.9)
          const postcardData = {
            id: Date.now().toString(),
            mediaUrl,
            mediaType,
            locationName,
            text,
            textColor,
            textSize,
            textPosition,
            backgroundColor,
            selectedTemplate,
            timestamp: new Date().toISOString(),
            canvasDataUrl: postcardDataUrl,
          }

          setGeneratedPostcard(postcardDataUrl)
          handlePostcardAction(action, postcardData, postcardDataUrl)
          setIsGenerating(false)
        }
        video.src = mediaUrl
      }
    } catch (error) {
      console.error("❌ Failed to generate postcard:", error)
      setIsGenerating(false)
    }
  }

  const handlePostcardAction = (action: "save" | "share" | "create", postcardData: any, postcardDataUrl: string) => {
    switch (action) {
      case "save":
        // Save to localStorage for later
        const savedPostcards = JSON.parse(localStorage.getItem("pinit-saved-postcards") || "[]")
        savedPostcards.unshift(postcardData)
        localStorage.setItem("pinit-saved-postcards", JSON.stringify(savedPostcards))
        setIsSaved(true)
        console.log("💾 Postcard saved for later!")

        // Show success message
        setTimeout(() => setIsSaved(false), 2000)
        break

      case "share":
        // Save and show sharing options
        const savedPostcardsForShare = JSON.parse(localStorage.getItem("pinit-saved-postcards") || "[]")
        savedPostcardsForShare.unshift(postcardData)
        localStorage.setItem("pinit-saved-postcards", JSON.stringify(savedPostcardsForShare))
        setShowSharing(true)
        break

      case "create":
        // Just create and save to pin
        onSave(postcardData)
        break
    }
  }

  const addTextOverlay = (ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const template = postcardTemplates[selectedTemplate as keyof typeof postcardTemplates]

    // Apply template background
    ctx.fillStyle = template.style.background
    ctx.fillRect(0, canvas.height - 120, canvas.width, 120)

    // Add text with template styling
    ctx.fillStyle = template.style.textColor
    ctx.font = `bold ${textSize}px ${template.style.fontFamily}`
    ctx.textAlign = "center"
    if (template.style.textShadow) {
      ctx.shadowColor = "rgba(0,0,0,0.5)"
      ctx.shadowBlur = 4
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2
    }

    const layout = template.layout
    ctx.fillText(text, (layout.titlePosition.x * canvas.width) / 100, (layout.titlePosition.y * canvas.height) / 100)

    // Add location subtitle
    ctx.font = `${textSize * 0.6}px ${template.style.fontFamily}`
    ctx.fillStyle = "rgba(255,255,255,0.8)"
    ctx.fillText(
      locationName,
      (layout.locationPosition.x * canvas.width) / 100,
      (layout.locationPosition.y * canvas.height) / 100,
    )
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
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        height: "100dvh", // Use dynamic viewport height for better mobile support
        overflow: "hidden",
        paddingBottom: "env(safe-area-inset-bottom)", // Add safe area padding for mobile
      }}
    >
      {/* Header - Fixed */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem 1.5rem",
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          flexShrink: 0, // Don't shrink
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ fontSize: "1.5rem" }}>📮</div>
          <div>
            <h2 style={{ color: "white", fontSize: "1.25rem", fontWeight: "bold", margin: 0 }}>Create Postcard</h2>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem", margin: 0 }}>
              Add text and customize your memory
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            padding: "0.75rem",
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
        >
          <X size={24} />
        </button>
      </div>

      {/* Success Message */}
      {isSaved && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(16, 185, 129, 0.95)",
            color: "white",
            padding: "1rem 2rem",
            borderRadius: "1rem",
            zIndex: 1001,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "1rem",
            fontWeight: "bold",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          }}
        >
          💾 Postcard Saved!
        </div>
      )}

      {/* Preview Area - Scrollable */}
      <div
        style={{
          flex: 1,
          display: "flex",
          gap: "1rem",
          padding: "1rem",
          overflow: "hidden", // Container doesn't scroll
          minHeight: 0, // Allow flex shrinking
        }}
      >
        {/* Media Preview - Fixed */}
        <div style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              position: "relative",
              maxWidth: "100%",
              maxHeight: "100%",
              borderRadius: "1rem",
              overflow: "hidden",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            }}
          >
            {mediaType === "photo" ? (
              <img
                src={mediaUrl || "/placeholder.svg"}
                alt="Postcard preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
              />
            ) : (
              <video
                src={mediaUrl}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
                controls
                muted
              />
            )}

            {/* Text Overlay Preview */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background:
                  postcardTemplates[selectedTemplate as keyof typeof postcardTemplates]?.style.background ||
                  backgroundColor,
                padding: "1rem",
                textAlign: "center",
                borderRadius: "0 0 1rem 1rem",
                ...(postcardTemplates[selectedTemplate as keyof typeof postcardTemplates]?.style.overlay && {
                  backgroundImage: postcardTemplates[selectedTemplate as keyof typeof postcardTemplates].style.overlay,
                }),
              }}
            >
              <div
                style={{
                  color:
                    postcardTemplates[selectedTemplate as keyof typeof postcardTemplates]?.style.textColor || textColor,
                  fontSize: `${textSize * 0.8}px`,
                  fontWeight: "bold",
                  marginBottom: "0.5rem",
                  fontFamily:
                    postcardTemplates[selectedTemplate as keyof typeof postcardTemplates]?.style.fontFamily ||
                    "sans-serif",
                  textShadow:
                    postcardTemplates[selectedTemplate as keyof typeof postcardTemplates]?.style.textShadow || "none",
                }}
              >
                {text}
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.8)",
                  fontSize: `${textSize * 0.5}px`,
                  fontFamily:
                    postcardTemplates[selectedTemplate as keyof typeof postcardTemplates]?.style.fontFamily ||
                    "sans-serif",
                }}
              >
                {locationName}
              </div>
            </div>
          </div>
        </div>

        {/* Controls Panel - NOW SCROLLABLE! */}
        <div
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)",
            borderRadius: "1rem",
            display: "flex",
            flexDirection: "column",
            color: "white",
            overflow: "hidden", // Container setup
            minHeight: 0, // Allow flex shrinking
          }}
        >
          {/* Controls Header - Fixed */}
          <div
            style={{
              padding: "1.5rem 1.5rem 1rem 1.5rem",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              flexShrink: 0,
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: "bold" }}>🎨 Customize</h3>
          </div>

          {/* Scrollable Controls Content */}
          <div
            style={{
              flex: 1,
              overflowY: "auto", // Enable vertical scrolling
              padding: "1rem 1.5rem 1.5rem 1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
            }}
          >
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <Type size={16} />
                Text Message
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter your postcard message..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                  fontSize: "0.875rem",
                  outline: "none",
                  resize: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <Palette size={16} />
                Text Color
              </label>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  style={{
                    width: "3rem",
                    height: "2rem",
                    borderRadius: "0.25rem",
                    border: "none",
                    cursor: "pointer",
                  }}
                />
                <span style={{ fontSize: "0.875rem", opacity: 0.8 }}>{textColor}</span>
              </div>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                Text Size: {textSize}px
              </label>
              <input
                type="range"
                min="16"
                max="48"
                value={textSize}
                onChange={(e) => setTextSize(Number(e.target.value))}
                style={{
                  width: "100%",
                  cursor: "pointer",
                }}
              />
            </div>

            <div>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <Palette size={16} />
                Background
              </label>
              <select
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "0.25rem",
                  border: "none",
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                  fontSize: "0.875rem",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="rgba(0,0,0,0.5)">Semi-transparent Black</option>
                <option value="rgba(0,0,0,0.8)">Dark Black</option>
                <option value="rgba(255,255,255,0.8)">Light White</option>
                <option value="rgba(59,130,246,0.8)">Blue</option>
                <option value="rgba(16,185,129,0.8)">Green</option>
              </select>
            </div>

            <PostcardTemplateSelector selectedTemplate={selectedTemplate} onTemplateSelect={setSelectedTemplate} />
          </div>
        </div>
      </div>

      {/* Action Buttons - Fixed at bottom with MORE OPTIONS */}
      <div
        style={{
          padding: "1rem 1.5rem",
          paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 1rem))", // Extra padding for mobile
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          flexShrink: 0,
          minHeight: "120px", // Increased for more buttons
        }}
      >
        {/* Primary Actions Row */}
        <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1.5rem",
              borderRadius: "1rem",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "0.875rem",
              transition: "all 0.3s ease",
            }}
          >
            Cancel
          </button>

          <button
            onClick={() => generatePostcard("save")}
            disabled={isGenerating}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1.5rem",
              borderRadius: "1rem",
              border: "none",
              background: isGenerating ? "rgba(255,255,255,0.3)" : "rgba(59, 130, 246, 0.8)",
              color: "white",
              cursor: isGenerating ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: "0.875rem",
              transition: "all 0.3s ease",
            }}
          >
            <Save size={18} />
            Save for Later
          </button>
        </div>

        {/* Secondary Actions Row */}
        <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
          <button
            onClick={() => generatePostcard("create")}
            disabled={isGenerating}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1.5rem",
              borderRadius: "1rem",
              border: "none",
              background: isGenerating ? "rgba(255,255,255,0.3)" : "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              color: "white",
              cursor: isGenerating ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: "0.875rem",
              transition: "all 0.3s ease",
              boxShadow: isGenerating ? "none" : "0 8px 20px rgba(16, 185, 129, 0.4)",
            }}
          >
            <Download size={18} />
            {isGenerating ? "Creating..." : "Create & Save"}
          </button>

          <button
            onClick={() => generatePostcard("share")}
            disabled={isGenerating}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1.5rem",
              borderRadius: "1rem",
              border: "none",
              background: isGenerating ? "rgba(255,255,255,0.3)" : "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
              color: "white",
              cursor: isGenerating ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: "0.875rem",
              transition: "all 0.3s ease",
              boxShadow: isGenerating ? "none" : "0 8px 20px rgba(245, 158, 11, 0.4)",
            }}
          >
            <Share2 size={18} />
            Create & Share
          </button>
        </div>
      </div>

      {/* Social Sharing Overlay */}
      {showSharing && generatedPostcard && (
        <div
          style={{
            position: "absolute",
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
          <SocialSharing
            postcardDataUrl={generatedPostcard}
            locationName={locationName}
            onComplete={() => {
              setShowSharing(false)
              onClose()
            }}
          />
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  )
}
