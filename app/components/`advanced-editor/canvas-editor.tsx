"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { ArrowLeft, Undo, Redo, Type, Sticker, Palette, Download, ZoomIn, ZoomOut, RotateCw, Save } from "lucide-react"
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
  shadow: boolean
}

interface StickerElement {
  id: string
  emoji: string
  x: number
  y: number
  size: number
  rotation: number
}

interface HistoryState {
  textElements: TextElement[]
  stickerElements: StickerElement[]
  currentEffect: string
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
  const [activePanel, setActivePanel] = useState<"text" | "stickers" | "effects" | "video" | "export" | null>(null)
  const [textElements, setTextElements] = useState<TextElement[]>([])
  const [stickerElements, setStickerElements] = useState<StickerElement[]>([])
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [currentEffect, setCurrentEffect] = useState("none")
  const [zoom, setZoom] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [history, setHistory] = useState<HistoryState[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [canvasDataUrl, setCanvasDataUrl] = useState("")

  // Text editing states
  const [newText, setNewText] = useState("Add your text here")
  const [textColor, setTextColor] = useState("#FFFFFF")
  const [fontSize, setFontSize] = useState(32)
  const [fontFamily, setFontFamily] = useState("Arial")
  const [textShadow, setTextShadow] = useState(true)

  // Video settings
  const [videoSettings, setVideoSettings] = useState({
    startTime: 0,
    endTime: 0,
    playbackSpeed: 1,
    volume: 100,
    muted: false,
  })

  const FONT_FAMILIES = [
    "Arial",
    "Helvetica",
    "Times New Roman",
    "Georgia",
    "Verdana",
    "Comic Sans MS",
    "Impact",
    "Trebuchet MS",
  ]

  // Save current state to history
  const saveToHistory = () => {
    const newState: HistoryState = {
      textElements: [...textElements],
      stickerElements: [...stickerElements],
      currentEffect,
    }

    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newState)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  // Undo/Redo functions
  const undo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1]
      setTextElements(prevState.textElements)
      setStickerElements(prevState.stickerElements)
      setCurrentEffect(prevState.currentEffect)
      setHistoryIndex(historyIndex - 1)
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      setTextElements(nextState.textElements)
      setStickerElements(nextState.stickerElements)
      setCurrentEffect(nextState.currentEffect)
      setHistoryIndex(historyIndex + 1)
    }
  }

  // Draw canvas
  const drawCanvas = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = platform.dimensions.width
    canvas.height = platform.dimensions.height

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw media (photo or video frame)
    const media = new Image()
    media.crossOrigin = "anonymous"

    media.onload = () => {
      // Apply effects
      if (currentEffect !== "none") {
        ctx.filter = currentEffect
      }

      ctx.drawImage(media, 0, 0, canvas.width, canvas.height)
      ctx.filter = "none" // Reset filter

      // Draw text elements
      textElements.forEach((element) => {
        ctx.save()
        ctx.translate(element.x, element.y)
        ctx.rotate((element.rotation * Math.PI) / 180)

        ctx.font = `${element.fontSize}px ${element.fontFamily}`
        ctx.fillStyle = element.color
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"

        if (element.shadow) {
          ctx.shadowColor = "rgba(0,0,0,0.8)"
          ctx.shadowBlur = 4
          ctx.shadowOffsetX = 2
          ctx.shadowOffsetY = 2
        }

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

      // Update canvas data URL
      setCanvasDataUrl(canvas.toDataURL("image/jpeg", 0.9))
    }

    media.src = mediaUrl
  }

  // Redraw canvas when elements change
  useEffect(() => {
    drawCanvas()
  }, [textElements, stickerElements, currentEffect, mediaUrl])

  // Add text element
  const addTextElement = () => {
    const newElement: TextElement = {
      id: Date.now().toString(),
      text: newText,
      x: platform.dimensions.width / 2,
      y: platform.dimensions.height / 2,
      fontSize,
      color: textColor,
      fontFamily,
      rotation: 0,
      shadow: textShadow,
    }

    setTextElements([...textElements, newElement])
    saveToHistory()
    setSelectedElement(newElement.id)
  }

  // Add sticker element
  const addStickerElement = (sticker: any, size: number) => {
    const newElement: StickerElement = {
      id: Date.now().toString(),
      emoji: sticker.emoji,
      x: platform.dimensions.width / 2,
      y: platform.dimensions.height / 2,
      size,
      rotation: 0,
    }

    setStickerElements([...stickerElements, newElement])
    saveToHistory()
    setSelectedElement(newElement.id)
  }

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    // Check if clicked on any element
    let clickedElement = null

    // Check text elements
    textElements.forEach((element) => {
      const distance = Math.sqrt((x - element.x) ** 2 + (y - element.y) ** 2)
      if (distance < element.fontSize) {
        clickedElement = element.id
      }
    })

    // Check sticker elements
    stickerElements.forEach((element) => {
      const distance = Math.sqrt((x - element.x) ** 2 + (y - element.y) ** 2)
      if (distance < element.size / 2) {
        clickedElement = element.id
      }
    })

    setSelectedElement(clickedElement)
  }

  // Handle element drag
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedElement) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const element =
      textElements.find((el) => el.id === selectedElement) || stickerElements.find((el) => el.id === selectedElement)

    if (element) {
      setIsDragging(true)
      setDragOffset({ x: x - element.x, y: y - element.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedElement) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const x = (e.clientX - rect.left) * scaleX - dragOffset.x
    const y = (e.clientY - rect.top) * scaleY - dragOffset.y

    // Update element position
    setTextElements((prev) => prev.map((el) => (el.id === selectedElement ? { ...el, x, y } : el)))
    setStickerElements((prev) => prev.map((el) => (el.id === selectedElement ? { ...el, x, y } : el)))
  }

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false)
      saveToHistory()
    }
  }

  // Delete selected element
  const deleteSelectedElement = () => {
    if (!selectedElement) return

    setTextElements((prev) => prev.filter((el) => el.id !== selectedElement))
    setStickerElements((prev) => prev.filter((el) => el.id !== selectedElement))
    setSelectedElement(null)
    saveToHistory()
  }

  // Handle save
  const handleSave = () => {
    onSave(canvasDataUrl)
  }

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
            <p style={{ fontSize: "0.8rem", opacity: 0.7, margin: 0 }}>
              {locationName} • {platform.dimensions.width}×{platform.dimensions.height}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* Undo/Redo */}
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            style={{
              padding: "0.5rem",
              borderRadius: "0.5rem",
              border: "none",
              background: historyIndex <= 0 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.2)",
              color: historyIndex <= 0 ? "rgba(255,255,255,0.5)" : "white",
              cursor: historyIndex <= 0 ? "not-allowed" : "pointer",
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
              background: historyIndex >= history.length - 1 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.2)",
              color: historyIndex >= history.length - 1 ? "rgba(255,255,255,0.5)" : "white",
              cursor: historyIndex >= history.length - 1 ? "not-allowed" : "pointer",
            }}
          >
            <Redo size={16} />
          </button>

          {/* Zoom Controls */}
          <button
            onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
            style={{
              padding: "0.5rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              cursor: "pointer",
            }}
          >
            <ZoomOut size={16} />
          </button>
          <span style={{ fontSize: "0.8rem", minWidth: "3rem", textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(Math.min(2, zoom + 0.25))}
            style={{
              padding: "0.5rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              cursor: "pointer",
            }}
          >
            <ZoomIn size={16} />
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              border: "none",
              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              color: "white",
              cursor: "pointer",
              fontSize: "0.9rem",
              fontWeight: "600",
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

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
        }}
      >
        {/* Canvas Area */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            position: "relative",
          }}
        >
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "center",
              transition: "transform 0.3s ease",
            }}
          >
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                border: "2px solid rgba(255,255,255,0.3)",
                borderRadius: "1rem",
                cursor: isDragging ? "grabbing" : selectedElement ? "grab" : "default",
                boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
              }}
            />
          </div>

          {/* Selected Element Controls */}
          {selectedElement && (
            <div
              style={{
                position: "absolute",
                bottom: "2rem",
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(0,0,0,0.9)",
                padding: "1rem",
                borderRadius: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <button
                onClick={() => {
                  const element =
                    textElements.find((el) => el.id === selectedElement) ||
                    stickerElements.find((el) => el.id === selectedElement)
                  if (element) {
                    if ("rotation" in element) {
                      if (textElements.find((el) => el.id === selectedElement)) {
                        setTextElements((prev) =>
                          prev.map((el) => (el.id === selectedElement ? { ...el, rotation: el.rotation + 15 } : el)),
                        )
                      } else {
                        setStickerElements((prev) =>
                          prev.map((el) => (el.id === selectedElement ? { ...el, rotation: el.rotation + 15 } : el)),
                        )
                      }
                    }
                  }
                }}
                style={{
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                <RotateCw size={16} />
              </button>
              <button
                onClick={deleteSelectedElement}
                style={{
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: "rgba(239, 68, 68, 0.3)",
                  color: "rgba(239, 68, 68, 0.9)",
                  cursor: "pointer",
                }}
              >
                🗑️
              </button>
            </div>
          )}
        </div>

        {/* Tools Panel */}
        <div
          style={{
            width: "350px",
            background: "rgba(0,0,0,0.5)",
            borderLeft: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
          }}
        >
          {/* Tool Buttons */}
          <div
            style={{
              padding: "1rem",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              gap: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => setActivePanel(activePanel === "text" ? null : "text")}
              style={{
                padding: "0.75rem",
                borderRadius: "0.75rem",
                border: activePanel === "text" ? "2px solid #10B981" : "1px solid rgba(255,255,255,0.2)",
                background: activePanel === "text" ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.8rem",
                fontWeight: "500",
              }}
            >
              <Type size={16} />
              Text
            </button>
            <button
              onClick={() => setActivePanel(activePanel === "stickers" ? null : "stickers")}
              style={{
                padding: "0.75rem",
                borderRadius: "0.75rem",
                border: activePanel === "stickers" ? "2px solid #10B981" : "1px solid rgba(255,255,255,0.2)",
                background: activePanel === "stickers" ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.8rem",
                fontWeight: "500",
              }}
            >
              <Sticker size={16} />
              Stickers
            </button>
            <button
              onClick={() => setActivePanel(activePanel === "effects" ? null : "effects")}
              style={{
                padding: "0.75rem",
                borderRadius: "0.75rem",
                border: activePanel === "effects" ? "2px solid #10B981" : "1px solid rgba(255,255,255,0.2)",
                background: activePanel === "effects" ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.8rem",
                fontWeight: "500",
              }}
            >
              <Palette size={16} />
              Effects
            </button>
            {mediaType === "video" && (
              <button
                onClick={() => setActivePanel(activePanel === "video" ? null : "video")}
                style={{
                  padding: "0.75rem",
                  borderRadius: "0.75rem",
                  border: activePanel === "video" ? "2px solid #10B981" : "1px solid rgba(255,255,255,0.2)",
                  background: activePanel === "video" ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.1)",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.8rem",
                  fontWeight: "500",
                }}
              >
                🎬 Video
              </button>
            )}
            <button
              onClick={() => setActivePanel(activePanel === "export" ? null : "export")}
              style={{
                padding: "0.75rem",
                borderRadius: "0.75rem",
                border: activePanel === "export" ? "2px solid #10B981" : "1px solid rgba(255,255,255,0.2)",
                background: activePanel === "export" ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.8rem",
                fontWeight: "500",
              }}
            >
              <Download size={16} />
              Export
            </button>
          </div>

          {/* Active Panel Content */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            {activePanel === "text" && (
              <div style={{ padding: "1rem" }}>
                <div
                  style={{
                    background: "rgba(0,0,0,0.9)",
                    padding: "1rem",
                    borderRadius: "1rem",
                  }}
                >
                  <h3
                    style={{
                      color: "white",
                      margin: "0 0 1rem 0",
                      fontSize: "1.1rem",
                      fontWeight: "600",
                    }}
                  >
                    Add Text
                  </h3>

                  <div style={{ marginBottom: "1rem" }}>
                    <input
                      type="text"
                      value={newText}
                      onChange={(e) => setNewText(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        borderRadius: "0.5rem",
                        border: "1px solid rgba(255,255,255,0.2)",
                        background: "rgba(255,255,255,0.1)",
                        color: "white",
                        fontSize: "0.9rem",
                        outline: "none",
                      }}
                      placeholder="Enter your text..."
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                    <div>
                      <label
                        style={{
                          color: "rgba(255,255,255,0.8)",
                          fontSize: "0.8rem",
                          display: "block",
                          marginBottom: "0.5rem",
                        }}
                      >
                        Font Size
                      </label>
                      <input
                        type="range"
                        min={16}
                        max={72}
                        value={fontSize}
                        onChange={(e) => setFontSize(Number.parseInt(e.target.value))}
                        style={{
                          width: "100%",
                          height: "4px",
                          borderRadius: "2px",
                          background: "rgba(255,255,255,0.2)",
                          outline: "none",
                          cursor: "pointer",
                        }}
                      />
                      <span style={{ color: "white", fontSize: "0.8rem" }}>{fontSize}px</span>
                    </div>

                    <div>
                      <label
                        style={{
                          color: "rgba(255,255,255,0.8)",
                          fontSize: "0.8rem",
                          display: "block",
                          marginBottom: "0.5rem",
                        }}
                      >
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
                    <label
                      style={{
                        color: "rgba(255,255,255,0.8)",
                        fontSize: "0.8rem",
                        display: "block",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Font Family
                    </label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        borderRadius: "0.5rem",
                        border: "1px solid rgba(255,255,255,0.2)",
                        background: "rgba(255,255,255,0.1)",
                        color: "white",
                        fontSize: "0.9rem",
                        outline: "none",
                      }}
                    >
                      {FONT_FAMILIES.map((font) => (
                        <option key={font} value={font} style={{ background: "#1e293b" }}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "1rem",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={textShadow}
                      onChange={(e) => setTextShadow(e.target.checked)}
                      style={{ cursor: "pointer" }}
                    />
                    <label
                      style={{
                        color: "rgba(255,255,255,0.8)",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      Add Shadow
                    </label>
                  </div>

                  <button
                    onClick={addTextElement}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "0.75rem",
                      border: "none",
                      background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                    }}
                  >
                    Add Text
                  </button>
                </div>
              </div>
            )}

            {activePanel === "stickers" && (
              <div style={{ padding: "1rem" }}>
                <StickersPanel onStickerAdd={addStickerElement} />
              </div>
            )}

            {activePanel === "effects" && (
              <div style={{ padding: "1rem" }}>
                <EffectsPanel onEffectChange={setCurrentEffect} currentEffect={currentEffect} />
              </div>
            )}

            {activePanel === "video" && mediaType === "video" && (
              <div style={{ padding: "1rem" }}>
                <VideoEditor videoUrl={mediaUrl} onVideoUpdate={setVideoSettings} />
              </div>
            )}

            {activePanel === "export" && (
              <div style={{ padding: "1rem" }}>
                <ExportHub
                  canvasDataUrl={canvasDataUrl}
                  platform={platform}
                  onExport={(settings) => {
                    console.log("Export settings:", settings)
                  }}
                  onShare={(platform) => {
                    console.log("Share to:", platform)
                    // Implement social sharing logic here
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
