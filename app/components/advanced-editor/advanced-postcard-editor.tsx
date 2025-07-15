"use client"

import { useState, useRef, useCallback } from "react"
import { X, Share2, Palette, Type, Sparkles, Film, Save } from "lucide-react"
import { CanvasEditor } from "./canvas-editor"
import { EffectsPanel } from "./effects-panel"
import { StickersPanel } from "./stickers-panel"
import { VideoEditor } from "./video-editor"
import { ExportHub } from "./export-hub"
import { EditorWelcome } from "./editor-welcome"

interface AdvancedPostcardEditorProps {
  mediaUrl: string
  mediaType: "photo" | "video"
  location?: string
  onSave: (postcardData: any) => void
  onClose: () => void
}

type EditorTool = "welcome" | "canvas" | "effects" | "stickers" | "video" | "export"

export function AdvancedPostcardEditor({
  mediaUrl,
  mediaType,
  location,
  onSave,
  onClose,
}: AdvancedPostcardEditorProps) {
  const [currentTool, setCurrentTool] = useState<EditorTool>("welcome")
  const [processedMediaUrl, setProcessedMediaUrl] = useState(mediaUrl)
  const [canvasData, setCanvasData] = useState<any>(null)
  const [appliedEffects, setAppliedEffects] = useState<string[]>([])
  const [addedStickers, setAddedStickers] = useState<any[]>([])
  const [videoFrame, setVideoFrame] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleToolSelect = useCallback((tool: EditorTool) => {
    setCurrentTool(tool)
    console.log(`🎨 Switched to ${tool} tool`)
  }, [])

  const handleMediaProcess = useCallback((newMediaUrl: string, metadata?: any) => {
    setProcessedMediaUrl(newMediaUrl)
    console.log("🖼️ Media processed:", metadata)
  }, [])

  const handleCanvasUpdate = useCallback((data: any) => {
    setCanvasData(data)
    console.log("🎨 Canvas updated:", data)
  }, [])

  const handleEffectApply = useCallback((effectId: string, processedUrl: string) => {
    setProcessedMediaUrl(processedUrl)
    setAppliedEffects((prev) => [...prev, effectId])
    console.log(`✨ Effect applied: ${effectId}`)
  }, [])

  const handleStickerAdd = useCallback((sticker: any) => {
    setAddedStickers((prev) => [...prev, { ...sticker, id: Date.now() }])
    console.log("🎭 Sticker added:", sticker)
  }, [])

  const handleVideoFrameCapture = useCallback((frameUrl: string) => {
    setVideoFrame(frameUrl)
    setProcessedMediaUrl(frameUrl)
    console.log("🎬 Video frame captured")
  }, [])

  const generateFinalPostcard = useCallback(async () => {
    if (!canvasRef.current) return null

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    // Set canvas size
    canvas.width = 800
    canvas.height = 600

    try {
      // Draw background
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw main media
      const img = new Image()
      img.crossOrigin = "anonymous"

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = processedMediaUrl
      })

      // Calculate image dimensions to fit canvas
      const aspectRatio = img.width / img.height
      let drawWidth = canvas.width * 0.8
      let drawHeight = drawWidth / aspectRatio

      if (drawHeight > canvas.height * 0.6) {
        drawHeight = canvas.height * 0.6
        drawWidth = drawHeight * aspectRatio
      }

      const x = (canvas.width - drawWidth) / 2
      const y = 50

      ctx.drawImage(img, x, y, drawWidth, drawHeight)

      // Draw stickers
      for (const sticker of addedStickers) {
        ctx.font = `${sticker.size || 40}px Arial`
        ctx.fillText(
          sticker.emoji || sticker.text || "🎉",
          sticker.x || canvas.width / 2,
          sticker.y || canvas.height - 100,
        )
      }

      // Draw text overlays from canvas data
      if (canvasData?.texts) {
        canvasData.texts.forEach((textItem: any) => {
          ctx.font = `${textItem.fontSize || 24}px ${textItem.fontFamily || "Arial"}`
          ctx.fillStyle = textItem.color || "#000000"
          ctx.textAlign = textItem.align || "center"
          ctx.fillText(textItem.text, textItem.x || canvas.width / 2, textItem.y || canvas.height - 50)
        })
      }

      // Draw location if provided
      if (location) {
        ctx.font = "16px Arial"
        ctx.fillStyle = "#666666"
        ctx.textAlign = "center"
        ctx.fillText(`📍 ${location}`, canvas.width / 2, canvas.height - 20)
      }

      // Convert to data URL
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9)
      console.log("🎨 Final postcard generated")
      return dataUrl
    } catch (error) {
      console.error("❌ Failed to generate postcard:", error)
      return null
    }
  }, [processedMediaUrl, canvasData, addedStickers, location])

  const handleSave = useCallback(async () => {
    const finalPostcard = await generateFinalPostcard()
    if (finalPostcard) {
      const postcardData = {
        finalImage: finalPostcard,
        originalMedia: mediaUrl,
        mediaType,
        location,
        effects: appliedEffects,
        stickers: addedStickers,
        canvasData,
        timestamp: Date.now(),
      }
      onSave(postcardData)
    }
  }, [generateFinalPostcard, mediaUrl, mediaType, location, appliedEffects, addedStickers, canvasData, onSave])

  const renderCurrentTool = () => {
    switch (currentTool) {
      case "welcome":
        return <EditorWelcome onToolSelect={handleToolSelect} />

      case "canvas":
        return (
          <CanvasEditor
            mediaUrl={processedMediaUrl}
            mediaType={mediaType}
            onUpdate={handleCanvasUpdate}
            onMediaProcess={handleMediaProcess}
          />
        )

      case "effects":
        return <EffectsPanel mediaUrl={processedMediaUrl} mediaType={mediaType} onEffectApply={handleEffectApply} />

      case "stickers":
        return (
          <StickersPanel
            onStickerAdd={handleStickerAdd}
            addedStickers={addedStickers}
            onStickersUpdate={setAddedStickers}
          />
        )

      case "video":
        return mediaType === "video" ? (
          <VideoEditor videoUrl={processedMediaUrl} onFrameCapture={handleVideoFrameCapture} />
        ) : (
          <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
            <Film size={48} style={{ marginBottom: "1rem" }} />
            <p>Video editing is only available for video content</p>
            <button
              onClick={() => setCurrentTool("canvas")}
              style={{
                marginTop: "1rem",
                padding: "0.75rem 1.5rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "#3B82F6",
                color: "white",
                cursor: "pointer",
              }}
            >
              Go to Canvas Editor
            </button>
          </div>
        )

      case "export":
        return (
          <ExportHub
            generatePostcard={generateFinalPostcard}
            postcardData={{
              mediaUrl: processedMediaUrl,
              mediaType,
              location,
              effects: appliedEffects,
              stickers: addedStickers,
              canvasData,
            }}
          />
        )

      default:
        return <EditorWelcome onToolSelect={handleToolSelect} />
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
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
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
          borderBottom: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ fontSize: "1.5rem" }}>🎨</div>
          <div>
            <h1 style={{ color: "white", fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>Postcard Editor</h1>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.875rem", margin: 0 }}>
              Create amazing postcards with advanced tools
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            onClick={handleSave}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "rgba(16, 185, 129, 0.9)",
              color: "white",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "0.875rem",
            }}
          >
            <Save size={16} />
            Save
          </button>

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
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Tool Navigation */}
      {currentTool !== "welcome" && (
        <div
          style={{
            display: "flex",
            padding: "1rem 1.5rem",
            background: "rgba(255,255,255,0.05)",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            gap: "0.5rem",
            overflowX: "auto",
          }}
        >
          {[
            { id: "canvas", icon: Type, label: "Canvas" },
            { id: "effects", icon: Palette, label: "Effects" },
            { id: "stickers", icon: Sparkles, label: "Stickers" },
            { id: "video", icon: Film, label: "Video" },
            { id: "export", icon: Share2, label: "Export" },
          ].map((tool) => (
            <button
              key={tool.id}
              onClick={() => handleToolSelect(tool.id as EditorTool)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1rem",
                borderRadius: "0.5rem",
                border: "none",
                background: currentTool === tool.id ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: currentTool === tool.id ? "bold" : "normal",
                transition: "all 0.3s ease",
                whiteSpace: "nowrap",
              }}
            >
              <tool.icon size={16} />
              {tool.label}
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div style={{ flex: 1, overflow: "hidden" }}>{renderCurrentTool()}</div>

      {/* Hidden canvas for final rendering */}
      <canvas ref={canvasRef} style={{ display: "none" }} width={800} height={600} />
    </div>
  )
}
