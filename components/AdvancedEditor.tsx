"use client"

import { useState } from "react"
import { ArrowLeft, Palette, Sticker, Download, Wand2 } from "lucide-react"
import type { MediaType } from "@/app/page"

interface AdvancedEditorProps {
  mediaUrl: string
  mediaType: MediaType
  location: string
  onBack: () => void
  onEffectsChange: (effects: string[]) => void
  onStickersChange: (stickers: any[]) => void
  onCanvasChange: (canvasData: any) => void
}

export function AdvancedEditor({
  mediaUrl,
  mediaType,
  location,
  onBack,
  onEffectsChange,
  onStickersChange,
  onCanvasChange,
}: AdvancedEditorProps) {
  const [activeTab, setActiveTab] = useState<"effects" | "stickers" | "canvas">("effects")
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)

  const filters = [
    { name: "none", label: "Original" },
    { name: "vintage", label: "Vintage" },
    { name: "bw", label: "B&W" },
    { name: "warm", label: "Warm" },
    { name: "cool", label: "Cool" },
  ]

  const stickers = ["😊", "❤️", "🌟", "🎉", "📍", "✨", "🔥", "💎"]

  const generateFilterString = () => {
    return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
  }

  const downloadImage = () => {
    // Simulate download
    alert("Image downloaded! (Demo)")
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-black/50 p-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
          <ArrowLeft size={20} />
        </button>

        <h1 className="text-xl font-bold">🎨 Advanced Editor</h1>

        <button onClick={downloadImage} className="p-2 rounded-lg bg-green-500 hover:bg-green-600 transition-colors">
          <Download size={20} />
        </button>
      </div>

      {/* Preview */}
      <div className="bg-gray-800 p-4 flex items-center justify-center">
        <div className="max-w-sm max-h-64 rounded-lg overflow-hidden">
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
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-800 border-b border-gray-700">
        <button
          onClick={() => setActiveTab("effects")}
          className={`flex-1 p-4 flex items-center justify-center gap-2 transition-colors ${
            activeTab === "effects" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          <Wand2 size={20} />
          Effects
        </button>

        <button
          onClick={() => setActiveTab("stickers")}
          className={`flex-1 p-4 flex items-center justify-center gap-2 transition-colors ${
            activeTab === "stickers" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          <Sticker size={20} />
          Stickers
        </button>

        <button
          onClick={() => setActiveTab("canvas")}
          className={`flex-1 p-4 flex items-center justify-center gap-2 transition-colors ${
            activeTab === "canvas" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          <Palette size={20} />
          Canvas
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === "effects" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-4">🎨 Filters</h3>
              <div className="grid grid-cols-3 gap-2">
                {filters.map((filter) => (
                  <button
                    key={filter.name}
                    className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-bold transition-colors"
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4">⚡ Adjustments</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">Brightness: {brightness}%</label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2">Contrast: {contrast}%</label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2">Saturation: {saturation}%</label>
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
          </div>
        )}

        {activeTab === "stickers" && (
          <div>
            <h3 className="text-lg font-bold mb-4">😊 Stickers & Emojis</h3>
            <div className="grid grid-cols-4 gap-4">
              {stickers.map((sticker, index) => (
                <button
                  key={index}
                  className="aspect-square bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center text-2xl transition-colors"
                  onClick={() => alert(`Added ${sticker} sticker! (Demo)`)}
                >
                  {sticker}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === "canvas" && (
          <div>
            <h3 className="text-lg font-bold mb-4">🎨 Canvas Tools</h3>
            <div className="space-y-4">
              <button className="w-full p-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors">
                🖌️ Brush Tool
              </button>
              <button className="w-full p-4 bg-red-600 hover:bg-red-700 rounded-lg font-bold transition-colors">
                🧽 Eraser Tool
              </button>
              <button className="w-full p-4 bg-green-600 hover:bg-green-700 rounded-lg font-bold transition-colors">
                📝 Text Tool
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
