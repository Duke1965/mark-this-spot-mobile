"use client"

import { useState } from "react"
import { ArrowLeft, Palette, Sticker, Download, Wand2 } from "lucide-react"

interface MobilePostcardEditorProps {
  mediaUrl: string
  mediaType: "photo" | "video"
  platform: string
  dimensions: { width: number; height: number }
  locationName: string
  onSave: (postcardData: any) => void
  onClose: () => void
}

export function MobilePostcardEditor({
  mediaUrl,
  mediaType,
  platform,
  dimensions,
  locationName,
  onSave,
  onClose,
}: MobilePostcardEditorProps) {
  const [activeTab, setActiveTab] = useState<"effects" | "stickers" | "canvas">("effects")
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [selectedFilter, setSelectedFilter] = useState("none")
  const [stickers, setStickers] = useState<any[]>([])
  const [canvasData, setCanvasData] = useState<any>({})

  const filters = [
    { name: "none", label: "Original" },
    { name: "vintage", label: "Vintage" },
    { name: "bw", label: "B&W" },
    { name: "warm", label: "Warm" },
    { name: "cool", label: "Cool" },
  ]

  const availableStickers = ["😊", "❤️", "🌟", "🎉", "📍", "✨", "🔥", "💎", "🏆", "🎯", "💫", "⭐"]

  const generateFilterString = () => {
    let filterString = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
    
    switch (selectedFilter) {
      case "vintage":
        filterString += " sepia(0.8) hue-rotate(30deg)"
        break
      case "bw":
        filterString += " grayscale(1)"
        break
      case "warm":
        filterString += " sepia(0.3) hue-rotate(-10deg)"
        break
      case "cool":
        filterString += " hue-rotate(180deg) saturate(1.2)"
        break
    }
    
    return filterString
  }

  const addSticker = (sticker: string) => {
    const newSticker = {
      id: Date.now(),
      emoji: sticker,
      x: Math.random() * 200,
      y: Math.random() * 200,
      scale: 1,
      rotation: 0,
    }
    setStickers([...stickers, newSticker])
  }

  const removeSticker = (id: number) => {
    setStickers(stickers.filter(s => s.id !== id))
  }

  const handleSave = () => {
    const postcardData = {
      text: `📍 ${locationName}`,
      effects: {
        brightness,
        contrast,
        saturation,
        filter: selectedFilter,
      },
      stickers,
      canvasData,
    }
    onSave(postcardData)
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-black/50 p-4 flex items-center justify-between">
        <button onClick={onClose} className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
          <ArrowLeft size={20} />
        </button>

        <h1 className="text-xl font-bold">🎨 Advanced Editor</h1>

        <button onClick={handleSave} className="p-2 rounded-lg bg-green-500 hover:bg-green-600 transition-colors">
          <Download size={20} />
        </button>
      </div>

      {/* Preview */}
      <div className="bg-gray-800 p-2 flex items-center justify-center relative">
        <div className="w-32 h-32 rounded-lg overflow-hidden relative">
          {mediaType === "photo" ? (
            <img
              src={mediaUrl}
              alt="Preview"
              className="w-full h-full object-cover transition-all duration-300"
              style={{ filter: generateFilterString() }}
            />
          ) : (
            <video
              src={mediaUrl}
              className="w-full h-full object-cover transition-all duration-300"
              style={{ filter: generateFilterString() }}
              controls
              muted
            />
          )}
          
          {/* Stickers Overlay */}
          {stickers.map((sticker) => (
            <div
              key={sticker.id}
              className="absolute cursor-move select-none"
              style={{
                left: sticker.x,
                top: sticker.y,
                transform: `scale(${sticker.scale}) rotate(${sticker.rotation}deg)`,
              }}
              onClick={() => removeSticker(sticker.id)}
            >
              <span className="text-lg">{sticker.emoji}</span>
            </div>
          ))}
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

      {/* Tab Content */}
      <div className="flex-1 bg-gray-800 p-4 overflow-y-auto">
        {activeTab === "effects" && (
          <div className="space-y-6">
            {/* Filters */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Filters</h3>
              <div className="grid grid-cols-3 gap-3">
                {filters.map((filter) => (
                  <button
                    key={filter.name}
                    onClick={() => setSelectedFilter(filter.name)}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      selectedFilter === filter.name
                        ? "border-purple-500 bg-purple-500/20"
                        : "border-gray-600 hover:border-gray-500"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Adjustments */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Adjustments</h3>
              
              <div>
                <label className="block text-sm mb-2">Brightness</label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full"
                />
                <span className="text-xs text-gray-400">{brightness}%</span>
              </div>

              <div>
                <label className="block text-sm mb-2">Contrast</label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full"
                />
                <span className="text-xs text-gray-400">{contrast}%</span>
              </div>

              <div>
                <label className="block text-sm mb-2">Saturation</label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={saturation}
                  onChange={(e) => setSaturation(Number(e.target.value))}
                  className="w-full"
                />
                <span className="text-xs text-gray-400">{saturation}%</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "stickers" && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Add Stickers</h3>
            
            <div className="grid grid-cols-4 gap-3">
              {availableStickers.map((sticker) => (
                <button
                  key={sticker}
                  onClick={() => addSticker(sticker)}
                  className="p-4 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors text-2xl"
                >
                  {sticker}
                </button>
              ))}
            </div>

            {stickers.length > 0 && (
              <div>
                <h4 className="text-md font-semibold mb-3">Active Stickers</h4>
                <div className="space-y-2">
                  {stickers.map((sticker) => (
                    <div key={sticker.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                      <span className="text-xl">{sticker.emoji}</span>
                      <button
                        onClick={() => removeSticker(sticker.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "canvas" && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Canvas Tools</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2">Text Overlay</label>
                <input
                  type="text"
                  placeholder="Add text..."
                  className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-white"
                />
              </div>

              <div>
                <label className="block text-sm mb-2">Text Color</label>
                <div className="flex gap-2">
                  {["#FFFFFF", "#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00"].map((color) => (
                    <button
                      key={color}
                      className="w-8 h-8 rounded-full border-2 border-gray-600"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2">Text Size</label>
                <input
                  type="range"
                  min="12"
                  max="72"
                  defaultValue="24"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
