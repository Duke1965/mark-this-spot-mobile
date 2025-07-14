"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { ArrowLeft, Undo, Redo, ZoomIn, ZoomOut, Type, Sparkles, Sticker, Download, RotateCw } from "lucide-react"
import { EffectsPanel } from "./effects-panel"
import { StickersPanel } from "./stickers-panel"
import { VideoEditor } from "./video-editor"
import { ExportHub } from "./export-hub"

interface Platform {
  id: string
  name: string
  icon: React.ReactNode
  dimensions: { width: number; height: number }
  description: string
  color: string
}

interface CanvasEditorProps {
  mediaUrl: string
  mediaType: "photo" | "video"
  locationName: string
  platform: Platform
  onBack: () => void
  onSave: (canvasDataUrl: string) => void
  onClose: () => void
}

interface TextElement {
  id: string
  text: string
  x: number
  y: number
  fontSize: number
  color: string
  fontFamily: string
  rotation: number
}

interface StickerElement {
  id: string
  emoji: string
  x: number
  y: number
  size: number
  rotation: number
}

export function CanvasEditor({
  mediaUrl,
  mediaType,
  locationName,
  platform,
  onBack,
  onSave,
  onClose,
}: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [activePanel, setActivePanel] = useState<"text" | "effects" | "stickers" | "video" | "export" | null>(null)
  const [zoom, setZoom] = useState(1)
  const [currentEffect, setCurrentEffect] = useState("none")
  const [textElements, setTextElements] = useState<TextElement[]>([])
  const [stickerElements, setStickerElements] = useState<StickerElement[]>([])
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Text editing states
  const [newText, setNewText] = useState("")
  const [textColor, setTextColor] = useState("#ffffff")
  const [fontSize, setFontSize] = useState(32)
  const [fontFamily, setFontFamily] = useState("Arial")

  const effects = {
    none: "none",
    vintage: "sepia(0.5) contrast(1.2) brightness(1.1)",
    bw: "grayscale(1) contrast(1.1)",
    vibrant: "saturate(1.5) contrast(1.2)",
    cool: "hue-rotate(180deg) saturate(1.2)",
    warm: "hue-rotate(30deg) saturate(1.1) brightness(1.1)",
    dramatic: "contrast(1.5) brightness(0.9) saturate(1.3)",
    soft: "blur(1px) brightness(1.1)",
  }

  const fonts = [
    "Arial",
    "Helvetica",
    "Times New Roman",
    "Georgia",
    "Verdana",
    "Comic Sans MS",
    "Impact",
    "Trebuchet MS",
  ]

  useEffect(() => {
    drawCanvas()
  }, [mediaUrl, currentEffect, textElements, stickerElements, zoom])

  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size to platform dimensions
    canvas.width = platform.dimensions.width
    canvas.height = platform.dimensions.height

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw background media
    if (mediaType === "photo") {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        // Apply filter
        ctx.filter = effects[currentEffect as keyof typeof effects] || "none"

        // Draw image to fit canvas
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height)
        const x = (canvas.width - img.width * scale) / 2
        const y = (canvas.height - img.height * scale) / 2

        ctx.drawImage(img, x, y, img.width * scale, img.height * scale)

        // Reset filter for other elements
        ctx.filter = "none"

        // Draw text elements
        textElements.forEach((element) => {
          ctx.save()
          ctx.translate(element.x, element.y)
          ctx.rotate((element.rotation * Math.PI) / 180)
          ctx.font = `${element.fontSize}px ${element.fontFamily}`
          ctx.fillStyle = element.color
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"

          // Add text shadow for better visibility
          ctx.shadowColor = "rgba(0,0,0,0.5)"
          ctx.shadowBlur = 4
          ctx.shadowOffsetX = 2
          ctx.shadowOffsetY = 2

          ctx.fillText(element.text, 0, 0)
          ctx.restore()
        })

        // Draw sticker elements
        stickerElements.forEach((element) => {
          ctx.save()
          ctx.translate(element.x, element.y)
          ctx.rotate((element.rotation * Math.PI) / 180)
          ctx.font = `${element.size}px Arial`
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillText(element.emoji, 0, 0)
          ctx.restore()
        })
      }
      img.src = mediaUrl
    }
  }

  const addTextElement = () => {
    if (!newText.trim()) return

    const newElement: TextElement = {
      id: Date.now().toString(),
      text: newText,
      x: platform.dimensions.width / 2,
      y: platform.dimensions.height / 2,
      fontSize,
      color: textColor,
      fontFamily,
      rotation: 0,
    }

    setTextElements((prev) => [...prev, newElement])
    setNewText("")
    saveToHistory()
  }

  const addStickerElement = (emoji: string) => {
    const newSticker: StickerElement = {
      id: Date.now().toString(),
      emoji,
      x: platform.dimensions.width / 2,
      y: platform.dimensions.height / 2,
      size: 40,
      rotation: 0,
    }

    setStickerElements((prev) => [...prev, newSticker])
    saveToHistory()
  }

  const saveToHistory = () => {
    const canvasData = canvasRef.current?.toDataURL()
    if (!canvasData) return

    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(canvasData)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      // Restore canvas from history
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      // Restore canvas from history
    }
  }

  const handleSave = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9)
    onSave(dataUrl)
  }

  const toolButtons = [
    { id: "text", icon: <Type size={20} />, label: "Text", color: "rgba(59, 130, 246, 0.3)" },
    { id: "effects", icon: <Sparkles size={20} />, label: "Effects", color: "rgba(168, 85, 247, 0.3)" },
    { id: "stickers", icon: <Sticker size={20} />, label: "Stickers", color: "rgba(245, 158, 11, 0.3)" },
    ...(mediaType === "video"
      ? [{ id: "video", icon: <RotateCw size={20} />, label: "Video", color: "rgba(239, 68, 68, 0.3)" }]
      : []),
    { id: "export", icon: <Download size={20} />, label: "Export", color: "rgba(16, 185, 129, 0.3)" },
  ]

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "linear-gradient(135deg, #1e293b 0%, #1e40af 50%, #4338ca 100%)",
        color: "white",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1rem 2rem",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
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
          <div>
            <h2 style={{ fontSize: "1.2rem", margin: 0 }}>{platform.name} Editor</h2>
            <p style={{ fontSize: "0.8rem", opacity: 0.7, margin: 0 }}>{locationName}</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            style={{
              padding: "0.5rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "rgba(255,255,255,0.1)",
              color: "white",
              cursor: historyIndex <= 0 ? "not-allowed" : "pointer",
              opacity: historyIndex <= 0 ? 0.5 : 1,
            }}
          >
            <Undo size={16} />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            style={{
              padding: "0.5rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "rgba(255,255,255,0.1)",
              color: "white",
              cursor: historyIndex >= history.length - 1 ? "not-allowed" : "pointer",
              opacity: historyIndex >= history.length - 1 ? 0.5 : 1,
            }}
          >
            <Redo size={16} />
          </button>
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            style={{
              padding: "0.5rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "rgba(255,255,255,0.1)",
              color: "white",
              cursor: "pointer",
            }}
          >
            <ZoomOut size={16} />
          </button>
          <span style={{ fontSize: "0.8rem", minWidth: "50px", textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
            style={{
              padding: "0.5rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "rgba(255,255,255,0.1)",
              color: "white",
              cursor: "pointer",
            }}
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Canvas Area */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            background: "rgba(0,0,0,0.2)",
          }}
        >
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "center",
              border: "2px solid rgba(255,255,255,0.3)",
              borderRadius: "0.5rem",
              overflow: "hidden",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                display: "block",
                maxWidth: "100%",
                maxHeight: "100%",
              }}
            />
          </div>
        </div>

        {/* Side Panel */}
        {activePanel && (
          <div
            style={{
              width: "350px",
              background: "rgba(0,0,0,0.8)",
              borderLeft: "1px solid rgba(255,255,255,0.1)",
              padding: "1rem",
              overflowY: "auto",
              flexShrink: 0,
            }}
          >
            {activePanel === "text" && (
              <div>
                <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem" }}>Add Text</h3>

                <div style={{ marginBottom: "1rem" }}>
                  <input
                    type="text"
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder="Enter your text..."
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      border: "1px solid rgba(255,255,255,0.2)",
                      background: "rgba(255,255,255,0.1)",
                      color: "white",
                      fontSize: "0.9rem",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={{ fontSize: "0.8rem", opacity: 0.9, marginBottom: "0.25rem", display: "block" }}>
                      Font Size: {fontSize}px
                    </label>
                    <input
                      type="range"
                      min="16"
                      max="72"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
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
                    <label style={{ fontSize: "0.8rem", opacity: 0.9, marginBottom: "0.5rem", display: "block" }}>
                      Color
                    </label>
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      style={{
                        width: "100%",
                        height: "40px",
                        borderRadius: "0.5rem",
                        border: "1px solid rgba(255,255,255,0.2)",
                        background: "transparent",
                        cursor: "pointer",
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ fontSize: "0.8rem", opacity: 0.9, marginBottom: "0.5rem", display: "block" }}>
                    Font Family
                  </label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "0.5rem",
                      border: "1px solid rgba(255,255,255,0.2)",
                      background: "rgba(255,255,255,0.1)",
                      color: "white",
                      fontSize: "0.9rem",
                    }}
                  >
                    {fonts.map((font) => (
                      <option key={font} value={font} style={{ background: "#1e293b" }}>
                        {font}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={addTextElement}
                  disabled={!newText.trim()}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    border: "none",
                    background: newText.trim() ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.1)",
                    color: "white",
                    cursor: newText.trim() ? "pointer" : "not-allowed",
                    fontSize: "0.9rem",
                    opacity: newText.trim() ? 1 : 0.5,
                  }}
                >
                  Add Text to Canvas
                </button>
              </div>
            )}

            {activePanel === "effects" && (
              <EffectsPanel onEffectApply={(effect) => setCurrentEffect(effect)} currentEffect={currentEffect} />
            )}

            {activePanel === "stickers" && <StickersPanel onStickerAdd={addStickerElement} />}

            {activePanel === "video" && mediaType === "video" && (
              <VideoEditor
                videoUrl={mediaUrl}
                onVideoUpdate={(videoData) => {
                  console.log("Video updated:", videoData)
                }}
              />
            )}

            {activePanel === "export" && (
              <ExportHub
                canvasRef={canvasRef}
                platform={platform}
                onExport={(exportData) => {
                  console.log("Export completed:", exportData)
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Bottom Toolbar */}
      <div
        style={{
          padding: "1rem 2rem",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        {/* Tool Buttons */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {toolButtons.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActivePanel(activePanel === tool.id ? null : (tool.id as any))}
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "0.5rem",
                border: "1px solid rgba(255,255,255,0.2)",
                background: activePanel === tool.id ? tool.color : "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                fontSize: "0.8rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.2s ease",
              }}
            >
              {tool.icon}
              {tool.label}
            </button>
          ))}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          style={{
            padding: "0.75rem 2rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "rgba(16, 185, 129, 0.3)",
            color: "white",
            cursor: "pointer",
            fontSize: "0.9rem",
            fontWeight: "bold",
          }}
        >
          Save Creation
        </button>
      </div>
    </div>
  )
}
