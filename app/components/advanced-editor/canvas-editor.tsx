"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Type, Download, Bold, Italic } from "lucide-react"

interface CanvasEditorProps {
  mediaUrl: string
  mediaType: "photo" | "video"
  onUpdate: (data: any) => void
  onMediaProcess: (processedUrl: string, metadata?: any) => void
}

interface TextElement {
  id: string
  text: string
  x: number
  y: number
  fontSize: number
  fontFamily: string
  color: string
  fontWeight: "normal" | "bold"
  fontStyle: "normal" | "italic"
  align: "left" | "center" | "right"
}

interface Template {
  id: string
  name: string
  background: string
  textElements: Partial<TextElement>[]
}

const FONT_FAMILIES = [
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Verdana",
  "Comic Sans MS",
  "Impact",
  "Trebuchet MS",
  "Courier New",
]

const COLOR_PRESETS = [
  "#000000",
  "#FFFFFF",
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
  "#FFA500",
  "#800080",
  "#FFC0CB",
  "#A52A2A",
  "#808080",
  "#000080",
  "#008000",
]

const TEMPLATES: Template[] = [
  {
    id: "classic",
    name: "Classic Postcard",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    textElements: [
      { fontSize: 32, color: "#FFFFFF", y: 100, text: "Greetings from..." },
      { fontSize: 18, color: "#FFFFFF", y: 500, text: "Having a wonderful time!" },
    ],
  },
  {
    id: "vintage",
    name: "Vintage Style",
    background: "linear-gradient(135deg, #8B4513 0%, #D2691E 100%)",
    textElements: [
      { fontSize: 28, color: "#F5DEB3", y: 120, text: "Vintage Memories" },
      { fontSize: 16, color: "#F5DEB3", y: 480, text: "Captured in time..." },
    ],
  },
  {
    id: "modern",
    name: "Modern Minimal",
    background: "linear-gradient(135deg, #2C3E50 0%, #3498DB 100%)",
    textElements: [
      { fontSize: 36, color: "#FFFFFF", y: 80, text: "ADVENTURE" },
      { fontSize: 14, color: "#BDC3C7", y: 520, text: "Every moment counts" },
    ],
  },
]

export function CanvasEditor({ mediaUrl, mediaType, onUpdate, onMediaProcess }: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [textElements, setTextElements] = useState<TextElement[]>([])
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [isAddingText, setIsAddingText] = useState(false)
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null)
  const [canvasBackground, setCanvasBackground] = useState("#FFFFFF")

  // Text editing controls
  const [fontSize, setFontSize] = useState(24)
  const [fontFamily, setFontFamily] = useState("Arial")
  const [textColor, setTextColor] = useState("#000000")
  const [fontWeight, setFontWeight] = useState<"normal" | "bold">("normal")
  const [fontStyle, setFontStyle] = useState<"normal" | "italic">("normal")
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("center")

  const redrawCanvas = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw background
    if (currentTemplate?.background.startsWith("linear-gradient")) {
      // Parse gradient (simplified)
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, "#667eea")
      gradient.addColorStop(1, "#764ba2")
      ctx.fillStyle = gradient
    } else {
      ctx.fillStyle = canvasBackground
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw main media
    try {
      const img = new Image()
      img.crossOrigin = "anonymous"

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = mediaUrl
      })

      // Calculate dimensions to fit canvas while maintaining aspect ratio
      const aspectRatio = img.width / img.height
      let drawWidth = canvas.width * 0.7
      let drawHeight = drawWidth / aspectRatio

      if (drawHeight > canvas.height * 0.5) {
        drawHeight = canvas.height * 0.5
        drawWidth = drawHeight * aspectRatio
      }

      const x = (canvas.width - drawWidth) / 2
      const y = (canvas.height - drawHeight) / 2

      ctx.drawImage(img, x, y, drawWidth, drawHeight)
    } catch (error) {
      console.error("❌ Failed to draw media:", error)
    }

    // Draw text elements
    textElements.forEach((element) => {
      ctx.font = `${element.fontStyle} ${element.fontWeight} ${element.fontSize}px ${element.fontFamily}`
      ctx.fillStyle = element.color
      ctx.textAlign = element.align as CanvasTextAlign

      // Draw text with outline if selected
      if (selectedElement === element.id) {
        ctx.strokeStyle = "#00FF00"
        ctx.lineWidth = 2
        ctx.strokeText(element.text, element.x, element.y)
      }

      ctx.fillText(element.text, element.x, element.y)
    })
  }, [mediaUrl, textElements, selectedElement, currentTemplate, canvasBackground])

  useEffect(() => {
    redrawCanvas()
  }, [redrawCanvas])

  const addTextElement = useCallback(
    (x: number, y: number) => {
      const newElement: TextElement = {
        id: `text-${Date.now()}`,
        text: "Your text here",
        x,
        y,
        fontSize,
        fontFamily,
        color: textColor,
        fontWeight,
        fontStyle,
        align: textAlign,
      }

      setTextElements((prev) => [...prev, newElement])
      setSelectedElement(newElement.id)
      setIsAddingText(false)
      console.log("📝 Text element added:", newElement)
    },
    [fontSize, fontFamily, textColor, fontWeight, fontStyle, textAlign],
  )

  const updateSelectedElement = useCallback(
    (updates: Partial<TextElement>) => {
      if (!selectedElement) return

      setTextElements((prev) =>
        prev.map((element) => (element.id === selectedElement ? { ...element, ...updates } : element)),
      )
    },
    [selectedElement],
  )

  const deleteSelectedElement = useCallback(() => {
    if (!selectedElement) return

    setTextElements((prev) => prev.filter((element) => element.id !== selectedElement))
    setSelectedElement(null)
  }, [selectedElement])

  const applyTemplate = useCallback((template: Template) => {
    setCurrentTemplate(template)

    const newElements: TextElement[] = template.textElements.map((templateElement, index) => ({
      id: `template-text-${Date.now()}-${index}`,
      text: templateElement.text || "Sample Text",
      x: templateElement.x || 400,
      y: templateElement.y || 100 + index * 50,
      fontSize: templateElement.fontSize || 24,
      fontFamily: templateElement.fontFamily || "Arial",
      color: templateElement.color || "#000000",
      fontWeight: templateElement.fontWeight || "normal",
      fontStyle: templateElement.fontStyle || "normal",
      align: templateElement.align || "center",
    }))

    setTextElements(newElements)
    console.log("🎨 Template applied:", template.name)
  }, [])

  const exportCanvas = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9)
    onMediaProcess(dataUrl, {
      textElements,
      template: currentTemplate?.id,
      background: canvasBackground,
    })

    // Trigger download
    const link = document.createElement("a")
    link.download = "postcard-canvas.jpg"
    link.href = dataUrl
    link.click()

    console.log("💾 Canvas exported")
  }, [textElements, currentTemplate, canvasBackground, onMediaProcess])

  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isAddingText) return

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top

      addTextElement(x, y)
    },
    [isAddingText, addTextElement],
  )

  // Update callback when data changes
  useEffect(() => {
    onUpdate({
      texts: textElements,
      template: currentTemplate,
      background: canvasBackground,
    })
  }, [textElements, currentTemplate, canvasBackground, onUpdate])

  const selectedElementData = textElements.find((el) => el.id === selectedElement)

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        background: "rgba(255,255,255,0.05)",
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
        }}
      >
        <div
          style={{
            position: "relative",
            background: "white",
            borderRadius: "1rem",
            padding: "1rem",
            boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
          }}
        >
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            onClick={handleCanvasClick}
            style={{
              maxWidth: "100%",
              maxHeight: "70vh",
              cursor: isAddingText ? "crosshair" : "default",
              borderRadius: "0.5rem",
            }}
          />

          {isAddingText && (
            <div
              style={{
                position: "absolute",
                top: "1rem",
                left: "1rem",
                background: "rgba(0,0,0,0.8)",
                color: "white",
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
              }}
            >
              Click to add text
            </div>
          )}
        </div>
      </div>

      {/* Controls Panel */}
      <div
        style={{
          width: "350px",
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
          padding: "1.5rem",
          overflowY: "auto",
          borderLeft: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        <h3 style={{ color: "white", marginBottom: "1.5rem", fontSize: "1.25rem" }}>Canvas Tools</h3>

        {/* Templates */}
        <div style={{ marginBottom: "2rem" }}>
          <h4 style={{ color: "white", marginBottom: "1rem", fontSize: "1rem" }}>Templates</h4>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => applyTemplate(template)}
                style={{
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: currentTemplate?.id === template.id ? "2px solid #10B981" : "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  textAlign: "left",
                }}
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>

        {/* Add Text */}
        <div style={{ marginBottom: "2rem" }}>
          <button
            onClick={() => setIsAddingText(!isAddingText)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              width: "100%",
              padding: "1rem",
              borderRadius: "0.5rem",
              border: "none",
              background: isAddingText ? "#10B981" : "rgba(255,255,255,0.2)",
              color: "white",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            <Type size={20} />
            {isAddingText ? "Cancel Adding Text" : "Add Text"}
          </button>
        </div>

        {/* Text Controls */}
        {selectedElementData && (
          <div style={{ marginBottom: "2rem" }}>
            <h4 style={{ color: "white", marginBottom: "1rem" }}>Edit Selected Text</h4>

            <div style={{ display: "grid", gap: "1rem" }}>
              {/* Text Content */}
              <div>
                <label style={{ color: "white", fontSize: "0.875rem", marginBottom: "0.5rem", display: "block" }}>
                  Text
                </label>
                <input
                  type="text"
                  value={selectedElementData.text}
                  onChange={(e) => updateSelectedElement({ text: e.target.value })}
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
              </div>

              {/* Font Size */}
              <div>
                <label style={{ color: "white", fontSize: "0.875rem", marginBottom: "0.5rem", display: "block" }}>
                  Font Size: {selectedElementData.fontSize}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="72"
                  value={selectedElementData.fontSize}
                  onChange={(e) => updateSelectedElement({ fontSize: Number.parseInt(e.target.value) })}
                  style={{ width: "100%" }}
                />
              </div>

              {/* Font Family */}
              <div>
                <label style={{ color: "white", fontSize: "0.875rem", marginBottom: "0.5rem", display: "block" }}>
                  Font Family
                </label>
                <select
                  value={selectedElementData.fontFamily}
                  onChange={(e) => updateSelectedElement({ fontFamily: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    border: "1px solid rgba(255,255,255,0.3)",
                    background: "rgba(255,255,255,0.1)",
                    color: "white",
                    fontSize: "0.875rem",
                  }}
                >
                  {FONT_FAMILIES.map((font) => (
                    <option key={font} value={font} style={{ background: "#333", color: "white" }}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>

              {/* Color */}
              <div>
                <label style={{ color: "white", fontSize: "0.875rem", marginBottom: "0.5rem", display: "block" }}>
                  Color
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: "0.5rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      onClick={() => updateSelectedElement({ color })}
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "0.25rem",
                        border:
                          selectedElementData.color === color ? "3px solid white" : "1px solid rgba(255,255,255,0.3)",
                        background: color,
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={selectedElementData.color}
                  onChange={(e) => updateSelectedElement({ color: e.target.value })}
                  style={{
                    width: "100%",
                    height: "40px",
                    borderRadius: "0.5rem",
                    border: "1px solid rgba(255,255,255,0.3)",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                />
              </div>

              {/* Style Controls */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() =>
                    updateSelectedElement({
                      fontWeight: selectedElementData.fontWeight === "bold" ? "normal" : "bold",
                    })
                  }
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    border: "none",
                    background: selectedElementData.fontWeight === "bold" ? "#10B981" : "rgba(255,255,255,0.2)",
                    color: "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Bold size={16} />
                </button>

                <button
                  onClick={() =>
                    updateSelectedElement({
                      fontStyle: selectedElementData.fontStyle === "italic" ? "normal" : "italic",
                    })
                  }
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    border: "none",
                    background: selectedElementData.fontStyle === "italic" ? "#10B981" : "rgba(255,255,255,0.2)",
                    color: "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Italic size={16} />
                </button>
              </div>

              {/* Delete Button */}
              <button
                onClick={deleteSelectedElement}
                style={{
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: "#EF4444",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Delete Text
              </button>
            </div>
          </div>
        )}

        {/* Export */}
        <div>
          <button
            onClick={exportCanvas}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              width: "100%",
              padding: "1rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              color: "white",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            <Download size={20} />
            Export Canvas
          </button>
        </div>
      </div>
    </div>
  )
}
