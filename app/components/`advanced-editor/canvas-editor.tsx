"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { ArrowLeft, Type, ImageIcon, Palette, Layers, Download, Undo, Redo, ZoomIn, ZoomOut } from "lucide-react"
import { EffectsPanel } from "./effects-panel"
import { StickersPanel } from "./stickers-panel"
import { VideoEditor } from "./video-editor"
import { ExportHub } from "./export-hub"

interface Platform {
  id: string
  name: string
  dimensions: { width: number; height: number }
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
  const [activeTab, setActiveTab] = useState<"text" | "effects" | "stickers" | "layers">("text")
  const [textElements, setTextElements] = useState<TextElement[]>([])
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [canvasScale, setCanvasScale] = useState(1)
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [history, setHistory] = useState<any[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [selectedEffect, setSelectedEffect] = useState("none")
  const [stickerElements, setStickerElements] = useState<any[]>([])
  const [showVideoEditor, setShowVideoEditor] = useState(false)
  const [showExportHub, setShowExportHub] = useState(false)
  const [exportDataUrl, setExportDataUrl] = useState<string | null>(null)

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions based on platform
    canvas.width = platform.dimensions.width
    canvas.height = platform.dimensions.height

    // Load and draw media
    if (mediaType === "photo") {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        // Clear canvas
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Draw image to fit canvas while maintaining aspect ratio
        const imgAspect = img.width / img.height
        const canvasAspect = canvas.width / canvas.height

        let drawWidth, drawHeight, drawX, drawY

        if (imgAspect > canvasAspect) {
          // Image is wider than canvas
          drawWidth = canvas.width
          drawHeight = canvas.width / imgAspect
          drawX = 0
          drawY = (canvas.height - drawHeight) / 2
        } else {
          // Image is taller than canvas
          drawHeight = canvas.height
          drawWidth = canvas.height * imgAspect
          drawX = (canvas.width - drawWidth) / 2
          drawY = 0
        }

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
        redrawCanvas()
      }
      img.src = mediaUrl
    }
  }, [mediaUrl, mediaType, platform])

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Apply effects to the canvas
    if (selectedEffect !== "none") {
      const effects = {
        vintage: "sepia(0.5) contrast(1.2) brightness(1.1)",
        bw: "grayscale(1) contrast(1.1)",
        vibrant: "saturate(1.4) contrast(1.1) brightness(1.05)",
        cool: "hue-rotate(180deg) saturate(1.2)",
        warm: "hue-rotate(20deg) saturate(1.3) brightness(1.1)",
        dramatic: "contrast(1.5) brightness(0.9) saturate(1.2)",
        soft: "blur(0.5px) brightness(1.1) contrast(0.9)",
      }
      canvas.style.filter = effects[selectedEffect as keyof typeof effects] || "none"
    } else {
      canvas.style.filter = "none"
    }

    // Redraw stickers
    stickerElements.forEach((sticker) => {
      ctx.save()
      ctx.translate(sticker.x, sticker.y)
      ctx.rotate((sticker.rotation * Math.PI) / 180)
      ctx.font = `${sticker.size}px Arial`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(sticker.emoji, 0, 0)
      ctx.restore()
    })

    // Redraw all text elements
    textElements.forEach((element) => {
      ctx.save()

      // Apply transformations
      ctx.translate(element.x, element.y)
      ctx.rotate((element.rotation * Math.PI) / 180)

      // Set text properties
      ctx.font = `${element.fontSize}px ${element.fontFamily}`
      ctx.fillStyle = element.color
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      // Add shadow if enabled
      if (element.shadow) {
        ctx.shadowColor = "rgba(0,0,0,0.5)"
        ctx.shadowBlur = 4
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2
      }

      ctx.fillText(element.text, 0, 0)

      // Draw selection outline if selected
      if (selectedElement === element.id) {
        ctx.strokeStyle = platform.color
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        const metrics = ctx.measureText(element.text)
        const width = metrics.width + 20
        const height = element.fontSize + 20
        ctx.strokeRect(-width / 2, -height / 2, width, height)
      }

      ctx.restore()
    })
  }, [textElements, stickerElements, selectedElement, selectedEffect, platform.color])

  const addTextElement = () => {
    const newElement: TextElement = {
      id: Date.now().toString(),
      text: "Your text here",
      x: platform.dimensions.width / 2,
      y: platform.dimensions.height / 2,
      fontSize: 48,
      color: "#FFFFFF",
      fontFamily: "Arial",
      rotation: 0,
      shadow: true,
    }

    setTextElements((prev) => [...prev, newElement])
    setSelectedElement(newElement.id)
    saveToHistory()
  }

  const updateSelectedElement = (updates: Partial<TextElement>) => {
    if (!selectedElement) return

    setTextElements((prev) => prev.map((el) => (el.id === selectedElement ? { ...el, ...updates } : el)))
    saveToHistory()
  }

  const addStickerElement = (sticker: any) => {
    const newSticker = {
      id: Date.now().toString(),
      emoji: sticker.emoji,
      x: platform.dimensions.width / 2,
      y: platform.dimensions.height / 2,
      size: sticker.size,
      rotation: 0,
    }

    setStickerElements((prev) => [...prev, newSticker])
    saveToHistory()
  }

  const saveToHistory = () => {
    const state = { textElements }
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), state])
    setHistoryIndex((prev) => prev + 1)
  }

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1)
      const prevState = history[historyIndex - 1]
      setTextElements(prevState.textElements)
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1)
      const nextState = history[historyIndex + 1]
      setTextElements(nextState.textElements)
    }
  }

  const exportCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dataUrl = canvas.toDataURL("image/jpeg", 0.95)
    setExportDataUrl(dataUrl)
    setShowExportHub(true)
  }

  const selectedElementData = textElements.find((el) => el.id === selectedElement)

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "#1a1a1a",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        color: "white",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem 2rem",
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
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
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>{platform.name} Editor</h2>
            <p style={{ margin: 0, fontSize: "0.875rem", opacity: 0.7 }}>
              {platform.dimensions.width} × {platform.dimensions.height}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            style={{
              padding: "0.5rem",
              borderRadius: "0.5rem",
              border: "none",
              background: historyIndex > 0 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
              color: historyIndex > 0 ? "white" : "rgba(255,255,255,0.5)",
              cursor: historyIndex > 0 ? "pointer" : "not-allowed",
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
              background: historyIndex < history.length - 1 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
              color: historyIndex < history.length - 1 ? "white" : "rgba(255,255,255,0.5)",
              cursor: historyIndex < history.length - 1 ? "pointer" : "not-allowed",
            }}
          >
            <Redo size={16} />
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
            background: "#2a2a2a",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "80%",
              maxHeight: "80%",
              border: `2px solid ${platform.color}`,
              borderRadius: "8px",
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
                objectFit: "contain",
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const x = ((e.clientX - rect.left) / rect.width) * platform.dimensions.width
                const y = ((e.clientY - rect.top) / rect.height) * platform.dimensions.height

                // Check if clicked on any text element
                let clickedElement = null
                for (const element of textElements) {
                  const distance = Math.sqrt(Math.pow(x - element.x, 2) + Math.pow(y - element.y, 2))
                  if (distance < element.fontSize) {
                    clickedElement = element.id
                    break
                  }
                }

                setSelectedElement(clickedElement)
              }}
            />
          </div>

          {/* Canvas Controls */}
          <div
            style={{
              position: "absolute",
              bottom: "2rem",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: "0.5rem",
              background: "rgba(0,0,0,0.8)",
              padding: "0.5rem",
              borderRadius: "1rem",
            }}
          >
            <button
              onClick={() => setCanvasScale((prev) => Math.max(0.5, prev - 0.1))}
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
            <span
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
              }}
            >
              {Math.round(canvasScale * 100)}%
            </span>
            <button
              onClick={() => setCanvasScale((prev) => Math.min(2, prev + 0.1))}
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
          </div>
        </div>

        {/* Tools Panel */}
        <div
          style={{
            width: "350px",
            background: "#1e1e1e",
            borderLeft: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Tool Tabs */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {[
              { id: "text", icon: <Type size={16} />, label: "Text" },
              { id: "effects", icon: <Palette size={16} />, label: "Effects" },
              { id: "stickers", icon: <ImageIcon size={16} />, label: "Stickers" },
              { id: "layers", icon: <Layers size={16} />, label: "Layers" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  flex: 1,
                  padding: "1rem 0.5rem",
                  border: "none",
                  background: activeTab === tab.id ? platform.color : "transparent",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.25rem",
                  fontSize: "0.75rem",
                  transition: "all 0.3s ease",
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Video Editor Button - only show for videos */}
          {mediaType === "video" && (
            <div style={{ padding: "1rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <button
                onClick={() => setShowVideoEditor(!showVideoEditor)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: showVideoEditor ? platform.color : "rgba(255,255,255,0.1)",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "0.875rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
              >
                🎬 {showVideoEditor ? "Hide" : "Show"} Video Editor
              </button>
            </div>
          )}

          {/* Tool Content */}
          <div style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
            {activeTab === "text" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <button
                  onClick={addTextElement}
                  style={{
                    padding: "1rem",
                    borderRadius: "0.5rem",
                    border: "none",
                    background: `linear-gradient(135deg, ${platform.color}, ${platform.color}CC)`,
                    color: "white",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "1rem",
                  }}
                >
                  + Add Text
                </button>

                {selectedElementData && (
                  <>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                        Text Content
                      </label>
                      <textarea
                        value={selectedElementData.text}
                        onChange={(e) => updateSelectedElement({ text: e.target.value })}
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
                          rows: 3,
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                        Font Size: {selectedElementData.fontSize}px
                      </label>
                      <input
                        type="range"
                        min="12"
                        max="120"
                        value={selectedElementData.fontSize}
                        onChange={(e) => updateSelectedElement({ fontSize: Number(e.target.value) })}
                        style={{ width: "100%" }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                        Text Color
                      </label>
                      <input
                        type="color"
                        value={selectedElementData.color}
                        onChange={(e) => updateSelectedElement({ color: e.target.value })}
                        style={{
                          width: "100%",
                          height: "3rem",
                          borderRadius: "0.5rem",
                          border: "none",
                          cursor: "pointer",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                        Font Family
                      </label>
                      <select
                        value={selectedElementData.fontFamily}
                        onChange={(e) => updateSelectedElement({ fontFamily: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          borderRadius: "0.5rem",
                          border: "none",
                          background: "rgba(255,255,255,0.1)",
                          color: "white",
                          fontSize: "0.875rem",
                          outline: "none",
                        }}
                      >
                        <option value="Arial">Arial</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Impact">Impact</option>
                        <option value="Comic Sans MS">Comic Sans MS</option>
                        <option value="Trebuchet MS">Trebuchet MS</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                        Rotation: {selectedElementData.rotation}°
                      </label>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        value={selectedElementData.rotation}
                        onChange={(e) => updateSelectedElement({ rotation: Number(e.target.value) })}
                        style={{ width: "100%" }}
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          cursor: "pointer",
                          fontSize: "0.875rem",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedElementData.shadow}
                          onChange={(e) => updateSelectedElement({ shadow: e.target.checked })}
                        />
                        Text Shadow
                      </label>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "effects" && (
              <EffectsPanel
                selectedEffect={selectedEffect}
                onEffectSelect={setSelectedEffect}
                platformColor={platform.color}
              />
            )}

            {activeTab === "stickers" && (
              <StickersPanel onStickerAdd={addStickerElement} platformColor={platform.color} />
            )}

            {activeTab === "layers" && (
              <div>
                <h4 style={{ margin: "0 0 1rem 0", fontSize: "1rem" }}>Layers</h4>
                {textElements.map((element, index) => (
                  <div
                    key={element.id}
                    onClick={() => setSelectedElement(element.id)}
                    style={{
                      padding: "0.75rem",
                      marginBottom: "0.5rem",
                      borderRadius: "0.5rem",
                      background: selectedElement === element.id ? `${platform.color}40` : "rgba(255,255,255,0.1)",
                      border: selectedElement === element.id ? `1px solid ${platform.color}` : "1px solid transparent",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <div style={{ fontSize: "0.875rem", fontWeight: "bold" }}>Text Layer {index + 1}</div>
                    <div style={{ fontSize: "0.75rem", opacity: 0.7, marginTop: "0.25rem" }}>
                      "{element.text.substring(0, 20)}
                      {element.text.length > 20 ? "..." : ""}"
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showVideoEditor && mediaType === "video" && (
              <VideoEditor
                videoUrl={mediaUrl}
                onTrimComplete={(trimmedUrl) => {
                  console.log("Video trimmed:", trimmedUrl)
                  setShowVideoEditor(false)
                }}
                platformColor={platform.color}
              />
            )}
          </div>
        </div>
      </div>

      {/* Export Hub */}
      {showExportHub && exportDataUrl && (
        <ExportHub
          canvasDataUrl={exportDataUrl}
          platform={platform}
          locationName={locationName}
          onClose={() => {
            setShowExportHub(false)
            setExportDataUrl(null)
            onSave(exportDataUrl)
          }}
        />
      )}

      {/* Bottom Actions */}
      <div
        style={{
          padding: "1.5rem 2rem",
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          onClick={onClose}
          style={{
            padding: "1rem 2rem",
            borderRadius: "1rem",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "1rem",
          }}
        >
          Cancel
        </button>

        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={exportCanvas}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "1rem 2rem",
              borderRadius: "1rem",
              border: "none",
              background: `linear-gradient(135deg, ${platform.color}, ${platform.color}CC)`,
              color: "white",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "1rem",
              boxShadow: `0 8px 20px ${platform.color}40`,
            }}
          >
            <Download size={18} />
            Export
          </button>
        </div>
      </div>
    </div>
  )
}
