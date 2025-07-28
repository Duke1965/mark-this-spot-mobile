"use client"

import type React from "react"

import { useRef, useEffect, useState, useCallback } from "react"
import { ArrowLeft, Palette, Eraser, Download, Undo, Redo, Type } from "lucide-react"

interface CanvasEditorProps {
  mediaUrl: string | null
  mediaType: "photo" | "video"
  onCanvasChange: (canvasData: any) => void
  onBack: () => void
}

export function CanvasEditor({ mediaUrl, mediaType, onCanvasChange, onBack }: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [brushSize, setBrushSize] = useState(5)
  const [brushColor, setBrushColor] = useState("#FF0000")
  const [tool, setTool] = useState<"brush" | "eraser" | "text">("brush")
  const [history, setHistory] = useState<ImageData[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [textInput, setTextInput] = useState("")
  const [showTextInput, setShowTextInput] = useState(false)
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 })

  const colors = ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF", "#FFFFFF", "#000000"]

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || !overlayCanvasRef.current || !mediaUrl) return

    const canvas = canvasRef.current
    const overlayCanvas = overlayCanvasRef.current
    const ctx = canvas.getContext("2d")
    const overlayCtx = overlayCanvas.getContext("2d")

    if (!ctx || !overlayCtx) return

    // Set canvas size
    canvas.width = 800
    canvas.height = 600
    overlayCanvas.width = 800
    overlayCanvas.height = 600

    // Load and draw media
    if (mediaType === "photo") {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        // Calculate aspect ratio
        const imgAspect = img.width / img.height
        const canvasAspect = canvas.width / canvas.height

        let drawWidth, drawHeight, drawX, drawY

        if (imgAspect > canvasAspect) {
          drawWidth = canvas.width
          drawHeight = canvas.width / imgAspect
          drawX = 0
          drawY = (canvas.height - drawHeight) / 2
        } else {
          drawHeight = canvas.height
          drawWidth = canvas.height * imgAspect
          drawX = (canvas.width - drawWidth) / 2
          drawY = 0
        }

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
        saveToHistory()
      }
      img.src = mediaUrl
    }
  }, [mediaUrl, mediaType])

  const saveToHistory = useCallback(() => {
    if (!overlayCanvasRef.current) return

    const ctx = overlayCanvasRef.current.getContext("2d")
    if (!ctx) return

    const imageData = ctx.getImageData(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height)
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(imageData)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)

    // Update parent component
    onCanvasChange({
      imageData: imageData,
      brushSize,
      brushColor,
      tool,
    })
  }, [history, historyIndex, brushSize, brushColor, tool, onCanvasChange])

  const undo = useCallback(() => {
    if (historyIndex > 0 && overlayCanvasRef.current) {
      const ctx = overlayCanvasRef.current.getContext("2d")
      if (ctx) {
        setHistoryIndex(historyIndex - 1)
        ctx.putImageData(history[historyIndex - 1], 0, 0)
      }
    }
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1 && overlayCanvasRef.current) {
      const ctx = overlayCanvasRef.current.getContext("2d")
      if (ctx) {
        setHistoryIndex(historyIndex + 1)
        ctx.putImageData(history[historyIndex + 1], 0, 0)
      }
    }
  }, [history, historyIndex])

  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }, [])

  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (tool === "text") {
        const pos = getMousePos(e)
        setTextPosition(pos)
        setShowTextInput(true)
        return
      }

      setIsDrawing(true)
      const pos = getMousePos(e)

      if (!overlayCanvasRef.current) return
      const ctx = overlayCanvasRef.current.getContext("2d")
      if (!ctx) return

      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
    },
    [tool, getMousePos],
  )

  const draw = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !overlayCanvasRef.current) return

      const ctx = overlayCanvasRef.current.getContext("2d")
      if (!ctx) return

      const pos = getMousePos(e)

      ctx.lineWidth = brushSize
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      if (tool === "brush") {
        ctx.globalCompositeOperation = "source-over"
        ctx.strokeStyle = brushColor
      } else if (tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out"
      }

      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
    },
    [isDrawing, brushSize, brushColor, tool, getMousePos],
  )

  const stopDrawing = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false)
      saveToHistory()
    }
  }, [isDrawing, saveToHistory])

  const addText = useCallback(() => {
    if (!textInput.trim() || !overlayCanvasRef.current) return

    const ctx = overlayCanvasRef.current.getContext("2d")
    if (!ctx) return

    ctx.font = `${brushSize * 4}px Arial`
    ctx.fillStyle = brushColor
    ctx.textAlign = "left"
    ctx.textBaseline = "top"
    ctx.fillText(textInput, textPosition.x, textPosition.y)

    setTextInput("")
    setShowTextInput(false)
    saveToHistory()
  }, [textInput, textPosition, brushSize, brushColor, saveToHistory])

  const downloadCanvas = useCallback(() => {
    if (!canvasRef.current || !overlayCanvasRef.current) return

    // Create a temporary canvas to combine both layers
    const tempCanvas = document.createElement("canvas")
    const tempCtx = tempCanvas.getContext("2d")
    if (!tempCtx) return

    tempCanvas.width = canvasRef.current.width
    tempCanvas.height = canvasRef.current.height

    // Draw background image
    tempCtx.drawImage(canvasRef.current, 0, 0)
    // Draw overlay
    tempCtx.drawImage(overlayCanvasRef.current, 0, 0)

    // Download
    const link = document.createElement("a")
    link.download = `pinit-canvas-${Date.now()}.png`
    link.href = tempCanvas.toDataURL()
    link.click()
  }, [])

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "#1a202c",
        color: "white",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem",
          background: "rgba(0,0,0,0.5)",
        }}
      >
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

        <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: "bold" }}>Canvas Editor</h2>

        <button
          onClick={downloadCanvas}
          style={{
            padding: "0.5rem",
            borderRadius: "50%",
            border: "none",
            background: "#10B981",
            color: "white",
            cursor: "pointer",
          }}
        >
          <Download size={20} />
        </button>
      </div>

      {/* Canvas Container */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          background: "#2d3748",
          position: "relative",
        }}
      >
        <div style={{ position: "relative", maxWidth: "100%", maxHeight: "100%" }}>
          <canvas
            ref={canvasRef}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              borderRadius: "0.5rem",
              boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
            }}
          />
          <canvas
            ref={overlayCanvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              maxWidth: "100%",
              maxHeight: "100%",
              cursor: tool === "brush" ? "crosshair" : tool === "eraser" ? "grab" : "text",
            }}
          />
        </div>

        {/* Text Input Modal */}
        {showTextInput && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "rgba(0,0,0,0.9)",
              padding: "1.5rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(255,255,255,0.2)",
              minWidth: "300px",
            }}
          >
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: "bold" }}>Add Text</h3>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Enter your text..."
              autoFocus
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                fontSize: "0.875rem",
                marginBottom: "1rem",
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  addText()
                }
              }}
            />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={addText}
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: "#10B981",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Add Text
              </button>
              <button
                onClick={() => setShowTextInput(false)}
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tools */}
      <div
        style={{
          padding: "1rem",
          background: "rgba(0,0,0,0.8)",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {/* Tool Selection */}
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
          <button
            onClick={() => setTool("brush")}
            style={{
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "none",
              background: tool === "brush" ? "#3B82F6" : "rgba(255,255,255,0.1)",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Palette size={16} />
            Brush
          </button>
          <button
            onClick={() => setTool("eraser")}
            style={{
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "none",
              background: tool === "eraser" ? "#3B82F6" : "rgba(255,255,255,0.1)",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Eraser size={16} />
            Eraser
          </button>
          <button
            onClick={() => setTool("text")}
            style={{
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "none",
              background: tool === "text" ? "#3B82F6" : "rgba(255,255,255,0.1)",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Type size={16} />
            Text
          </button>
        </div>

        {/* History Controls */}
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
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

        {/* Brush Size */}
        <div>
          <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
            {tool === "text" ? "Text Size" : "Brush Size"}: {tool === "text" ? brushSize * 4 : brushSize}px
          </label>
          <input
            type="range"
            min="1"
            max={tool === "text" ? "20" : "50"}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        {/* Color Palette */}
        {tool !== "eraser" && (
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Color:</label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setBrushColor(color)}
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    border: brushColor === color ? "3px solid white" : "2px solid rgba(255,255,255,0.3)",
                    background: color,
                    cursor: "pointer",
                  }}
                />
              ))}
              <input
                type="color"
                value={brushColor}
                onChange={(e) => setBrushColor(e.target.value)}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.3)",
                  cursor: "pointer",
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
