"use client"

import { useState, useRef, useCallback } from "react"
import { ArrowLeft, Save, RotateCcw, Palette, Type, Sparkles } from "lucide-react"
import type { LocationData } from "@/hooks/useLocationServices"
import type { MediaType } from "@/app/page"

interface PhotoEditorProps {
  mediaUrl: string
  mediaType: MediaType
  location: LocationData | null
  onSave: (editedUrl: string) => void
  onBack: () => void
}

const filters = [
  { name: "none", label: "Original", filter: "" },
  { name: "vintage", label: "Vintage", filter: "sepia(0.5) contrast(1.2) brightness(1.1)" },
  { name: "bw", label: "B&W", filter: "grayscale(1) contrast(1.1)" },
  { name: "warm", label: "Warm", filter: "hue-rotate(15deg) saturate(1.2) brightness(1.05)" },
  { name: "cool", label: "Cool", filter: "hue-rotate(-15deg) saturate(1.1) brightness(0.95)" },
  { name: "dramatic", label: "Dramatic", filter: "contrast(1.5) brightness(0.9) saturate(1.3)" },
  { name: "soft", label: "Soft", filter: "blur(0.5px) brightness(1.1) contrast(0.9)" },
  { name: "vivid", label: "Vivid", filter: "saturate(1.5) contrast(1.2) brightness(1.05)" },
]

const textStyles = [
  { name: "bold", label: "Bold", style: "font-weight: bold; font-size: 24px;" },
  { name: "elegant", label: "Elegant", style: "font-family: serif; font-size: 20px; font-style: italic;" },
  { name: "modern", label: "Modern", style: "font-family: sans-serif; font-size: 18px; letter-spacing: 1px;" },
  { name: "playful", label: "Playful", style: "font-family: cursive; font-size: 22px; color: #ff6b6b;" },
]

export function PhotoEditor({ mediaUrl, mediaType, location, onSave, onBack }: PhotoEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedFilter, setSelectedFilter] = useState("none")
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [textOverlay, setTextOverlay] = useState("")
  const [textStyle, setTextStyle] = useState("bold")
  const [showTextInput, setShowTextInput] = useState(false)

  const generateFilterString = useCallback(() => {
    const baseFilter = filters.find((f) => f.name === selectedFilter)?.filter || ""
    const adjustments = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
    return `${baseFilter} ${adjustments}`.trim()
  }, [selectedFilter, brightness, contrast, saturation])

  const applyEdits = useCallback(async () => {
    if (!canvasRef.current) return mediaUrl

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return mediaUrl

    // For photos, apply edits to canvas
    if (mediaType === "photo") {
      const img = new Image()
      img.crossOrigin = "anonymous"

      return new Promise<string>((resolve) => {
        img.onload = () => {
          canvas.width = img.width
          canvas.height = img.height

          // Apply filter
          ctx.filter = generateFilterString()
          ctx.drawImage(img, 0, 0)

          // Add text overlay
          if (textOverlay) {
            ctx.filter = "none"
            const style = textStyles.find((s) => s.name === textStyle)
            if (style) {
              // Parse style (simplified)
              ctx.font = style.style.includes("24px") ? "bold 24px Arial" : "20px Arial"
              ctx.fillStyle = style.style.includes("#ff6b6b") ? "#ff6b6b" : "white"
              ctx.strokeStyle = "black"
              ctx.lineWidth = 2
              ctx.textAlign = "center"

              // Add text with stroke for visibility
              const x = canvas.width / 2
              const y = canvas.height - 50
              ctx.strokeText(textOverlay, x, y)
              ctx.fillText(textOverlay, x, y)
            }
          }

          // Add location watermark
          if (location) {
            ctx.font = "16px Arial"
            ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
            ctx.textAlign = "right"
            ctx.fillText(`📍 ${location.name}`, canvas.width - 20, canvas.height - 20)
          }

          resolve(canvas.toDataURL("image/jpeg", 0.9))
        }
        img.src = mediaUrl
      })
    }

    return mediaUrl
  }, [mediaUrl, mediaType, generateFilterString, textOverlay, textStyle, location])

  const handleSave = useCallback(async () => {
    const editedUrl = await applyEdits()
    onSave(editedUrl)
  }, [applyEdits, onSave])

  const resetEdits = useCallback(() => {
    setSelectedFilter("none")
    setBrightness(100)
    setContrast(100)
    setSaturation(100)
    setTextOverlay("")
    setShowTextInput(false)
  }, [])

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-purple-600 to-blue-600">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm p-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>

        <h1 className="text-xl font-bold">Edit {mediaType === "photo" ? "Photo" : "Video"}</h1>

        <div className="flex gap-2">
          <button
            onClick={resetEdits}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            title="Reset"
          >
            <RotateCcw size={20} />
          </button>

          <button
            onClick={handleSave}
            className="p-2 bg-green-500 hover:bg-green-600 rounded-full transition-colors"
            title="Save"
          >
            <Save size={20} />
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-black/20 p-4 flex items-center justify-center">
        <div className="relative max-w-sm max-h-64 rounded-xl overflow-hidden">
          {mediaType === "photo" ? (
            <img
              src={mediaUrl || "/placeholder.svg"}
              alt="Preview"
              className="w-full h-full object-contain transition-all duration-300"
              style={{ filter: generateFilterString() }}
            />
          ) : (
            <video
              src={mediaUrl}
              className="w-full h-full object-contain transition-all duration-300"
              style={{ filter: generateFilterString() }}
              controls
              muted
            />
          )}

          {/* Text Overlay Preview */}
          {textOverlay && (
            <div
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-center px-2"
              style={{
                textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
                ...textStyles.find((s) => s.name === textStyle)?.style,
              }}
            >
              {textOverlay}
            </div>
          )}
        </div>
      </div>

      {/* Editor Controls */}
      <div className="flex-1 p-4 overflow-y-auto space-y-6">
        {/* Filters */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={20} />
            <h3 className="font-bold text-white">Filters</h3>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {filters.map((filter) => (
              <button
                key={filter.name}
                onClick={() => setSelectedFilter(filter.name)}
                className={`p-2 rounded-lg text-xs font-bold transition-colors ${
                  selectedFilter === filter.name
                    ? "bg-blue-500 text-white"
                    : "bg-white/20 text-white/80 hover:bg-white/30"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Adjustments */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Palette size={20} />
            <h3 className="font-bold text-white">Adjustments</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-white/90 text-sm mb-2">Brightness: {brightness}%</label>
              <input
                type="range"
                min="50"
                max="150"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-white/90 text-sm mb-2">Contrast: {contrast}%</label>
              <input
                type="range"
                min="50"
                max="150"
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-white/90 text-sm mb-2">Saturation: {saturation}%</label>
              <input
                type="range"
                min="0"
                max="200"
                value={saturation}
                onChange={(e) => setSaturation(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Text Overlay */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Type size={20} />
              <h3 className="font-bold text-white">Text Overlay</h3>
            </div>
            <button
              onClick={() => setShowTextInput(!showTextInput)}
              className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors"
            >
              {showTextInput ? "Hide" : "Add Text"}
            </button>
          </div>

          {showTextInput && (
            <div className="space-y-3">
              <input
                type="text"
                value={textOverlay}
                onChange={(e) => setTextOverlay(e.target.value)}
                placeholder="Enter your text..."
                className="w-full bg-white/20 text-white placeholder-white/60 rounded-lg p-3 border border-white/30"
              />

              <div className="grid grid-cols-2 gap-2">
                {textStyles.map((style) => (
                  <button
                    key={style.name}
                    onClick={() => setTextStyle(style.name)}
                    className={`p-2 rounded-lg text-sm font-bold transition-colors ${
                      textStyle === style.name
                        ? "bg-purple-500 text-white"
                        : "bg-white/20 text-white/80 hover:bg-white/30"
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-4 rounded-xl font-bold text-lg transition-colors"
        >
          Save Edited {mediaType === "photo" ? "Photo" : "Video"}
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
