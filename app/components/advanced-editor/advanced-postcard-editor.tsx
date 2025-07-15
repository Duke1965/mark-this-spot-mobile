"use client"

import { useState, useRef } from "react"
import { X, Save, Sparkles } from "lucide-react"
import { CanvasEditor } from "./canvas-editor"
import { EffectsPanel } from "./effects-panel"
import { StickersPanel } from "./stickers-panel"
import { VideoEditor } from "./video-editor"
import { ExportHub } from "./export-hub"
import { EditorWelcome } from "./editor-welcome"

interface AdvancedPostcardEditorProps {
  mediaUrl: string
  mediaType: "photo" | "video"
  locationName: string
  onSave: (postcard: any) => void
  onClose: () => void
}

export function AdvancedPostcardEditor({
  mediaUrl,
  mediaType,
  locationName,
  onSave,
  onClose,
}: AdvancedPostcardEditorProps) {
  const [currentTool, setCurrentTool] = useState<"welcome" | "canvas" | "effects" | "stickers" | "video" | "export">(
    "welcome",
  )
  const [projectData, setProjectData] = useState({
    mediaUrl,
    mediaType,
    locationName,
    text: `Amazing moment at ${locationName}!`,
    textColor: "#FFFFFF",
    textSize: 24,
    textPosition: { x: 50, y: 80 },
    backgroundColor: "rgba(0,0,0,0.5)",
    selectedTemplate: "modern",
    effects: {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
      sepia: 0,
      hueRotate: 0,
    },
    stickers: [] as any[],
    videoSettings: {
      currentTime: 0,
      duration: 0,
      isPlaying: false,
    },
  })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPostcard, setGeneratedPostcard] = useState<string | null>(null)

  const updateProjectData = (updates: any) => {
    setProjectData((prev) => ({ ...prev, ...updates }))
  }

  const generateFinalPostcard = async () => {
    setIsGenerating(true)

    try {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Set canvas size for social media
      canvas.width = 1080
      canvas.height = 1080

      // Load and draw media
      if (mediaType === "photo") {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
          // Draw image
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

          // Apply effects
          applyCanvasEffects(ctx, canvas)

          // Add text and stickers
          addTextAndStickers(ctx, canvas)

          const postcardDataUrl = canvas.toDataURL("image/jpeg", 0.9)
          setGeneratedPostcard(postcardDataUrl)
          setCurrentTool("export")
        }
        img.src = mediaUrl
      } else {
        // For video, create thumbnail
        const video = document.createElement("video")
        video.crossOrigin = "anonymous"
        video.onloadeddata = () => {
          video.currentTime = projectData.videoSettings.currentTime || 1
        }
        video.onseeked = () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          applyCanvasEffects(ctx, canvas)
          addTextAndStickers(ctx, canvas)

          const postcardDataUrl = canvas.toDataURL("image/jpeg", 0.9)
          setGeneratedPostcard(postcardDataUrl)
          setCurrentTool("export")
        }
        video.src = mediaUrl
      }
    } catch (error) {
      console.error("❌ Failed to generate postcard:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const applyCanvasEffects = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const { effects } = projectData

    ctx.filter = `
      brightness(${effects.brightness}%)
      contrast(${effects.contrast}%)
      saturate(${effects.saturation}%)
      blur(${effects.blur}px)
      sepia(${effects.sepia}%)
      hue-rotate(${effects.hueRotate}deg)
    `
  }

  const addTextAndStickers = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    // Reset filter for text/stickers
    ctx.filter = "none"

    // Add background overlay
    ctx.fillStyle = projectData.backgroundColor
    ctx.fillRect(0, canvas.height - 150, canvas.width, 150)

    // Add text
    ctx.fillStyle = projectData.textColor
    ctx.font = `bold ${projectData.textSize * 2}px sans-serif`
    ctx.textAlign = "center"
    ctx.shadowColor = "rgba(0,0,0,0.5)"
    ctx.shadowBlur = 4
    ctx.shadowOffsetX = 2
    ctx.shadowOffsetY = 2

    const textY = canvas.height - 100 + (projectData.textPosition.y - 50) * 2
    ctx.fillText(projectData.text, canvas.width / 2, textY)

    // Add location subtitle
    ctx.font = `${projectData.textSize * 1.2}px sans-serif`
    ctx.fillStyle = "rgba(255,255,255,0.8)"
    ctx.fillText(locationName, canvas.width / 2, textY + 40)

    // Add stickers
    projectData.stickers.forEach((sticker) => {
      ctx.font = `${sticker.size || 40}px sans-serif`
      ctx.fillText(sticker.emoji, (sticker.x / 100) * canvas.width, (sticker.y / 100) * canvas.height)
    })
  }

  const handleSave = () => {
    if (generatedPostcard) {
      const postcardData = {
        id: Date.now().toString(),
        ...projectData,
        timestamp: new Date().toISOString(),
        canvasDataUrl: generatedPostcard,
      }
      onSave(postcardData)
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
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem 1.5rem",
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ fontSize: "1.5rem" }}>🎨</div>
          <div>
            <h2 style={{ color: "white", fontSize: "1.25rem", fontWeight: "bold", margin: 0 }}>Advanced Editor</h2>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem", margin: 0 }}>
              Create stunning social media content
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
          }}
        >
          <X size={24} />
        </button>
      </div>

      {/* Tool Navigation */}
      <div
        style={{
          display: "flex",
          padding: "0 1rem",
          background: "rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          overflowX: "auto",
          flexShrink: 0,
        }}
      >
        {[
          { id: "welcome", label: "🏠 Start", icon: "🏠" },
          { id: "canvas", label: "🎨 Design", icon: "🎨" },
          { id: "effects", label: "✨ Effects", icon: "✨" },
          { id: "stickers", label: "😀 Stickers", icon: "😀" },
          ...(mediaType === "video" ? [{ id: "video", label: "🎥 Video", icon: "🎥" }] : []),
          { id: "export", label: "📤 Export", icon: "📤" },
        ].map((tool) => (
          <button
            key={tool.id}
            onClick={() => setCurrentTool(tool.id as any)}
            style={{
              padding: "1rem 1.5rem",
              border: "none",
              background: "transparent",
              color: currentTool === tool.id ? "white" : "rgba(255,255,255,0.6)",
              cursor: "pointer",
              borderBottom: currentTool === tool.id ? "2px solid #10B981" : "2px solid transparent",
              fontSize: "0.875rem",
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            {tool.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Media Preview */}
        <div
          style={{
            flex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            background: "rgba(0,0,0,0.3)",
          }}
        >
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
                alt="Preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  filter: `
                    brightness(${projectData.effects.brightness}%)
                    contrast(${projectData.effects.contrast}%)
                    saturate(${projectData.effects.saturation}%)
                    blur(${projectData.effects.blur}px)
                    sepia(${projectData.effects.sepia}%)
                    hue-rotate(${projectData.effects.hueRotate}deg)
                  `,
                }}
              />
            ) : (
              <video
                src={mediaUrl}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  filter: `
                    brightness(${projectData.effects.brightness}%)
                    contrast(${projectData.effects.contrast}%)
                    saturate(${projectData.effects.saturation}%)
                    blur(${projectData.effects.blur}px)
                    sepia(${projectData.effects.sepia}%)
                    hue-rotate(${projectData.effects.hueRotate}deg)
                  `,
                }}
                controls={currentTool === "video"}
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
                background: projectData.backgroundColor,
                padding: "1rem",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  color: projectData.textColor,
                  fontSize: `${projectData.textSize * 0.8}px`,
                  fontWeight: "bold",
                  marginBottom: "0.5rem",
                  textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
                }}
              >
                {projectData.text}
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.8)",
                  fontSize: `${projectData.textSize * 0.5}px`,
                }}
              >
                {locationName}
              </div>
            </div>

            {/* Stickers Overlay */}
            {projectData.stickers.map((sticker, index) => (
              <div
                key={index}
                style={{
                  position: "absolute",
                  left: `${sticker.x}%`,
                  top: `${sticker.y}%`,
                  fontSize: `${sticker.size || 40}px`,
                  transform: "translate(-50%, -50%)",
                  pointerEvents: "none",
                }}
              >
                {sticker.emoji}
              </div>
            ))}
          </div>
        </div>

        {/* Tool Panel */}
        <div
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {currentTool === "welcome" && (
            <EditorWelcome onToolSelect={setCurrentTool} mediaType={mediaType} locationName={locationName} />
          )}

          {currentTool === "canvas" && <CanvasEditor projectData={projectData} onUpdate={updateProjectData} />}

          {currentTool === "effects" && (
            <EffectsPanel effects={projectData.effects} onUpdate={(effects) => updateProjectData({ effects })} />
          )}

          {currentTool === "stickers" && (
            <StickersPanel stickers={projectData.stickers} onUpdate={(stickers) => updateProjectData({ stickers })} />
          )}

          {currentTool === "video" && mediaType === "video" && (
            <VideoEditor
              videoUrl={mediaUrl}
              settings={projectData.videoSettings}
              onUpdate={(videoSettings) => updateProjectData({ videoSettings })}
            />
          )}

          {currentTool === "export" && (
            <ExportHub
              projectData={projectData}
              generatedPostcard={generatedPostcard}
              onGenerate={generateFinalPostcard}
              onSave={handleSave}
              isGenerating={isGenerating}
            />
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div
        style={{
          padding: "1rem 1.5rem",
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onClose}
          style={{
            padding: "0.75rem 1.5rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Cancel
        </button>

        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={generateFinalPostcard}
            disabled={isGenerating}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.5rem",
              border: "none",
              background: isGenerating ? "rgba(255,255,255,0.3)" : "#3B82F6",
              color: "white",
              cursor: isGenerating ? "not-allowed" : "pointer",
              fontWeight: "bold",
            }}
          >
            <Sparkles size={18} />
            {isGenerating ? "Creating..." : "Generate"}
          </button>

          {generatedPostcard && (
            <button
              onClick={handleSave}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.5rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "#10B981",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              <Save size={18} />
              Save
            </button>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  )
}

