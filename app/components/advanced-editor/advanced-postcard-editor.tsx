"use client"

import { useState, useRef, useCallback, useEffect } from "react"
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
  locationName?: string
  onSave: (postcardData: any) => void
  onClose: () => void
}

type EditorTool = "welcome" | "canvas" | "effects" | "stickers" | "video" | "export"

export function AdvancedPostcardEditor({
  mediaUrl,
  mediaType,
  locationName,
  onSave,
  onClose,
}: AdvancedPostcardEditorProps) {
  // 🔧 FIX: Start with canvas if we have media, otherwise welcome
  const [currentTool, setCurrentTool] = useState<EditorTool>(mediaUrl ? "canvas" : "welcome")
  const [processedMediaUrl, setProcessedMediaUrl] = useState(mediaUrl)
  const [canvasData, setCanvasData] = useState<any>(null)
  const [appliedEffects, setAppliedEffects] = useState<string[]>([])
  const [addedStickers, setAddedStickers] = useState<any[]>([])
  const [videoFrame, setVideoFrame] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 🔧 FIX: Auto-switch to canvas when media is provided
  useEffect(() => {
    if (mediaUrl && currentTool === "welcome") {
      console.log("📸 Media detected, switching to canvas:", mediaUrl)
      setCurrentTool("canvas")
    }
  }, [mediaUrl, currentTool])

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
      if (locationName) {
        ctx.font = "16px Arial"
        ctx.fillStyle = "#666666"
        ctx.textAlign = "center"
        ctx.fillText(`📍 ${locationName}`, canvas.width / 2, canvas.height - 20)
      }

      // Convert to data URL
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9)
      console.log("🎨 Final postcard generated")
      return dataUrl
    } catch (error) {
      console.error("❌ Failed to generate postcard:", error)
      return null
    }
  }, [processedMediaUrl, canvasData, addedStickers, locationName])

  const handleSave = useCallback(async () => {
    const finalPostcard = await generateFinalPostcard()
    if (finalPostcard) {
      const postcardData = {
        finalImage: finalPostcard,
        originalMedia: mediaUrl,
        mediaType,
        locationName,
        effects: appliedEffects,
        stickers: addedStickers,
        canvasData,
        timestamp: Date.now(),
      }
      onSave(postcardData)
    }
  }, [generateFinalPostcard, mediaUrl, mediaType, locationName, appliedEffects, addedStickers, canvasData, onSave])

  const renderCurrentTool = () => {
    switch (currentTool) {
      case "welcome":
        return (
          <EditorWelcome
            onToolSelect={handleToolSelect}
            mediaType={mediaType}
            locationName={locationName || "Current Location"}
          />
        )

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
        return (
          <EffectsPanel
            effects={{
              brightness: 100,
              contrast: 100,
              saturation: 100,
              blur: 0,
              sepia: 0,
              hueRotate: 0,
            }}
            onUpdate={(effects) => {
              // Apply effects to media
              console.log("🎨 Effects updated:", effects)
            }}
          />
        )

      case "stickers":
        return <StickersPanel stickers={addedStickers} onUpdate={setAddedStickers} />

      case "video":
        return mediaType === "video" ? (
          <VideoEditor videoUrl={processedMediaUrl} onFrameCapture={handleVideoFrameCapture} />
        ) : (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "white",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <Film size={48} style={{ marginBottom: "1rem", opacity: 0.6 }} />
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.25rem" }}>Video Tools Not Available</h3>
            <p style={{ margin: "0 0 2rem 0", opacity: 0.8 }}>Video editing is only available for video content</p>
            <button
              onClick={() => setCurrentTool("canvas")}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "#3B82F6",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
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
              location: locationName,
              effects: appliedEffects,
              stickers: addedStickers,
              canvasData,
            }}
          />
        )

      default:
        return (
          <EditorWelcome
            onToolSelect={handleToolSelect}
            mediaType={mediaType}
            locationName={locationName || "Current Location"}
          />
        )
    }
  }

  // 🔧 DEBUG: Log the current state
  console.log("🎨 Advanced Editor State:", {
    mediaUrl,
    processedMediaUrl,
    mediaType,
    currentTool,
    locationName,
  })

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
        height: "100vh",
        overflow: "hidden", // Prevent body scroll
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
          borderBottom: "1px solid rgba(255,255,255,0.2)",
          flexShrink: 0, // Don't shrink
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ fontSize: "1.5rem" }}>🎨</div>
          <div>
            <h1 style={{ color: "white", fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>Advanced Editor</h1>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.875rem", margin: 0 }}>
              {/* 🔧 FIX: Show current media info */}
              {mediaUrl
                ? `Working with: ${mediaType} • ${locationName || "Current Location"}`
                : "Create amazing postcards with advanced tools"}
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

      {/* Tool Navigation - Fixed */}
      {currentTool !== "welcome" && (
        <div
          style={{
            display: "flex",
            padding: "1rem 1.5rem",
            background: "rgba(255,255,255,0.05)",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            gap: "0.5rem",
            overflowX: "auto", // Allow horizontal scroll for tabs
            flexShrink: 0, // Don't shrink
            zIndex: 9,
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
                flexShrink: 0, // Don't shrink tabs
              }}
            >
              <tool.icon size={16} />
              {tool.label}
            </button>
          ))}
        </div>
      )}

      {/* Main Content - SCROLLABLE */}
      <div
        style={{
          flex: 1,
          overflow: "hidden", // Container doesn't scroll
          display: "flex",
          flexDirection: "column",
          minHeight: 0, // Allow flex shrinking
        }}
      >
        <div
          style={{
            flex: 1,
            overflowY: "auto", // Enable vertical scrolling
            overflowX: "hidden", // Prevent horizontal scroll
            padding: 0, // Remove padding to let child components handle it
            minHeight: 0, // Allow flex shrinking
          }}
        >
          {renderCurrentTool()}
        </div>
      </div>

      {/* Hidden canvas for final rendering */}
      <canvas ref={canvasRef} style={{ display: "none" }} width={800} height={600} />
    </div>
  )
}
