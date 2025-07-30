"use client"

import { useState, useRef, useEffect } from "react"
import { ArrowLeft, Save, Share2, RotateCw, ZoomIn, ZoomOut, Palette, Sparkles, Image, Smile } from "lucide-react"

interface AdvancedPhotoEditorProps {
  imageUrl: string
  onSave: (editedImageUrl: string) => void
  onShare: (editedImageUrl: string) => void
  onBack: () => void
}

interface Sticker {
  id: string
  text: string
  x: number
  y: number
  scale: number
  rotation: number
  color: string
}

interface Template {
  id: string
  name: string
  type: "frame" | "border" | "decorative"
  url: string
}

export function AdvancedPhotoEditor({ imageUrl, onSave, onShare, onBack }: AdvancedPhotoEditorProps) {
  const [activeTab, setActiveTab] = useState<"edit" | "templates" | "stickers">("edit")
  const [contrast, setContrast] = useState(100)
  const [brightness, setBrightness] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [lensFlare, setLensFlare] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [stickers, setStickers] = useState<Sticker[]>([])
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // Available stickers
  const availableStickers = [
    { text: "WOW!", color: "#FF6B6B" },
    { text: "Amazing!", color: "#4ECDC4" },
    { text: "Perfect spot!", color: "#45B7D1" },
    { text: "Memory made!", color: "#96CEB4" },
    { text: "BOOM!", color: "#FFEAA7" },
    { text: "Incredible!", color: "#DDA0DD" },
    { text: "Love this place!", color: "#FFB6C1" },
    { text: "Bucket list!", color: "#98D8C8" },
    { text: "Dream come true!", color: "#F7DC6F" },
    { text: "Wish you were here!", color: "#BB8FCE" },
  ]

  // Available templates
  const availableTemplates = [
    { id: "vintage-frame", name: "Vintage Frame", type: "frame" as const, url: "/templates/vintage-frame.png" },
    { id: "flower-border", name: "Flower Border", type: "border" as const, url: "/templates/flower-border.png" },
    { id: "geometric", name: "Geometric", type: "decorative" as const, url: "/templates/geometric.png" },
    { id: "summer", name: "Summer Flowers", type: "border" as const, url: "/templates/summer.png" },
    { id: "winter", name: "Winter Snow", type: "border" as const, url: "/templates/winter.png" },
  ]

  // Add sticker
  const addSticker = (text: string, color: string) => {
    const newSticker: Sticker = {
      id: Date.now().toString(),
      text,
      x: 100,
      y: 100,
      scale: 1,
      rotation: 0,
      color
    }
    setStickers([...stickers, newSticker])
    setSelectedSticker(newSticker.id)
  }

  // Update sticker position
  const updateSticker = (id: string, updates: Partial<Sticker>) => {
    setStickers(stickers.map(sticker => 
      sticker.id === id ? { ...sticker, ...updates } : sticker
    ))
  }

  // Remove sticker
  const removeSticker = (id: string) => {
    setStickers(stickers.filter(sticker => sticker.id !== id))
    setSelectedSticker(null)
  }

  // Render canvas with all effects
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    const img = imageRef.current

    if (!canvas || !ctx || !img) return

    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Apply filters
    ctx.filter = `contrast(${contrast}%) brightness(${brightness}%) saturate(${saturation}%)`

    // Draw image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    // Reset filter
    ctx.filter = "none"

    // Add lens flare effect
    if (lensFlare) {
      const gradient = ctx.createRadialGradient(
        canvas.width * 0.8, canvas.height * 0.2, 0,
        canvas.width * 0.8, canvas.height * 0.2, 100
      )
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.8)")
      gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.4)")
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)")
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    // Draw stickers
    stickers.forEach(sticker => {
      ctx.save()
      ctx.translate(sticker.x, sticker.y)
      ctx.rotate((sticker.rotation * Math.PI) / 180)
      ctx.scale(sticker.scale, sticker.scale)
      
      // Sticker background
      ctx.fillStyle = sticker.color
      ctx.fillRect(-50, -20, 100, 40)
      
      // Sticker text
      ctx.fillStyle = "white"
      ctx.font = "bold 16px Arial"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(sticker.text, 0, 0)
      
      ctx.restore()
    })

    // Draw template overlay
    if (selectedTemplate) {
      const templateImg = new Image()
      templateImg.onload = () => {
        ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height)
      }
      templateImg.src = selectedTemplate.url
    }
  }, [imageUrl, contrast, brightness, saturation, lensFlare, stickers, selectedTemplate])

  // Export edited image
  const exportImage = () => {
    const canvas = canvasRef.current
    if (canvas) {
      return canvas.toDataURL("image/jpeg", 0.9)
    }
    return imageUrl
  }

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "linear-gradient(135deg, #002c7c 0%, #9ddbeb 100%)",
      display: "flex",
      flexDirection: "column",
      color: "white",
      zIndex: 1000
    }}>
      {/* Header */}
      <div style={{
        padding: "1rem",
        background: "rgba(0,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <button
          onClick={onBack}
          style={{
            background: "rgba(255,255,255,0.2)",
            color: "white",
            padding: "0.5rem",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          <ArrowLeft size={20} />
          Back
        </button>
        
        <div style={{ fontSize: "1.125rem", fontWeight: "600" }}>
          Photo Editor
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => onSave(exportImage())}
            style={{
              background: "#10B981",
              color: "white",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}
          >
            <Save size={16} />
            Save
          </button>
          <button
            onClick={() => onShare(exportImage())}
            style={{
              background: "rgba(255,255,255,0.2)",
              color: "white",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}
          >
            <Share2 size={16} />
            Share
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        padding: "0.5rem 1rem",
        background: "rgba(0,0,0,0.2)",
        display: "flex",
        gap: "0.25rem"
      }}>
        <button
          onClick={() => setActiveTab("edit")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            background: activeTab === "edit" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
            color: activeTab === "edit" ? "white" : "rgba(255,255,255,0.7)"
          }}
        >
          <Palette size={16} />
          Edit
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            background: activeTab === "templates" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
            color: activeTab === "templates" ? "white" : "rgba(255,255,255,0.7)"
          }}
        >
          <Image size={16} />
          Templates
        </button>
        <button
          onClick={() => setActiveTab("stickers")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            background: activeTab === "stickers" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
            color: activeTab === "stickers" ? "white" : "rgba(255,255,255,0.7)"
          }}
        >
          <Smile size={16} />
          Stickers
        </button>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Canvas Area */}
        <div style={{ flex: 1, padding: "1rem", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ position: "relative", maxWidth: "100%", maxHeight: "100%" }}>
            <canvas
              ref={canvasRef}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                border: "2px solid rgba(255,255,255,0.3)",
                borderRadius: "0.5rem"
              }}
            />
            <img
              ref={imageRef}
              src={imageUrl}
              style={{ display: "none" }}
              onLoad={() => {
                // Canvas will be rendered when image loads
              }}
            />
          </div>
        </div>

        {/* Control Panel */}
        <div style={{
          width: "300px",
          background: "rgba(0,0,0,0.3)",
          padding: "1rem",
          overflowY: "auto"
        }}>
          {activeTab === "edit" && (
            <div>
              <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.125rem" }}>Photo Adjustments</h3>
              
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                  Contrast: {contrast}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                  Brightness: {brightness}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
                  Saturation: {saturation}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={saturation}
                  onChange={(e) => setSaturation(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={lensFlare}
                    onChange={(e) => setLensFlare(e.target.checked)}
                  />
                  <Sparkles size={16} />
                  Lens Flare Effect
                </label>
              </div>
            </div>
          )}

          {activeTab === "templates" && (
            <div>
              <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.125rem" }}>Postcard Templates</h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem" }}>
                {availableTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(selectedTemplate?.id === template.id ? null : template)}
                    style={{
                      padding: "0.5rem",
                      borderRadius: "0.5rem",
                      border: selectedTemplate?.id === template.id ? "2px solid #10B981" : "1px solid rgba(255,255,255,0.2)",
                      background: selectedTemplate?.id === template.id ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.1)",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "0.75rem"
                    }}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "stickers" && (
            <div>
              <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.125rem" }}>Fun Stickers</h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem", marginBottom: "1rem" }}>
                {availableStickers.map((sticker) => (
                  <button
                    key={sticker.text}
                    onClick={() => addSticker(sticker.text, sticker.color)}
                    style={{
                      padding: "0.5rem",
                      borderRadius: "0.5rem",
                      border: "1px solid rgba(255,255,255,0.2)",
                      background: sticker.color,
                      color: "white",
                      cursor: "pointer",
                      fontSize: "0.75rem",
                      fontWeight: "bold"
                    }}
                  >
                    {sticker.text}
                  </button>
                ))}
              </div>

              {stickers.length > 0 && (
                <div>
                  <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem" }}>Placed Stickers</h4>
                  {stickers.map((sticker) => (
                    <div key={sticker.id} style={{
                      padding: "0.5rem",
                      marginBottom: "0.5rem",
                      background: "rgba(255,255,255,0.1)",
                      borderRadius: "0.5rem",
                      border: selectedSticker === sticker.id ? "2px solid #10B981" : "1px solid rgba(255,255,255,0.2)"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.875rem", color: sticker.color, fontWeight: "bold" }}>
                          {sticker.text}
                        </span>
                        <button
                          onClick={() => removeSticker(sticker.id)}
                          style={{
                            background: "#EF4444",
                            color: "white",
                            border: "none",
                            borderRadius: "0.25rem",
                            padding: "0.25rem 0.5rem",
                            cursor: "pointer",
                            fontSize: "0.75rem"
                          }}
                        >
                          Remove
                        </button>
                      </div>
                      
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <button
                          onClick={() => updateSticker(sticker.id, { scale: Math.max(0.5, sticker.scale - 0.1) })}
                          style={{
                            background: "rgba(255,255,255,0.2)",
                            color: "white",
                            border: "none",
                            borderRadius: "0.25rem",
                            padding: "0.25rem 0.5rem",
                            cursor: "pointer"
                          }}
                        >
                          <ZoomOut size={12} />
                        </button>
                        <button
                          onClick={() => updateSticker(sticker.id, { scale: Math.min(2, sticker.scale + 0.1) })}
                          style={{
                            background: "rgba(255,255,255,0.2)",
                            color: "white",
                            border: "none",
                            borderRadius: "0.25rem",
                            padding: "0.25rem 0.5rem",
                            cursor: "pointer"
                          }}
                        >
                          <ZoomIn size={12} />
                        </button>
                        <button
                          onClick={() => updateSticker(sticker.id, { rotation: sticker.rotation + 15 })}
                          style={{
                            background: "rgba(255,255,255,0.2)",
                            color: "white",
                            border: "none",
                            borderRadius: "0.25rem",
                            padding: "0.25rem 0.5rem",
                            cursor: "pointer"
                          }}
                        >
                          <RotateCw size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 
