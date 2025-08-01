"use client"

import { useState, useRef, useEffect } from "react"
import { ArrowLeft, Download, Wand2, Sticker, Palette, Sparkles } from "lucide-react"

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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [activeTab, setActiveTab] = useState<"effects" | "stickers" | "canvas">("effects")
  
  // Advanced effects state
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [hue, setHue] = useState(0)
  const [blur, setBlur] = useState(0)
  const [sepia, setSepia] = useState(0)
  const [grayscale, setGrayscale] = useState(0)
  const [invert, setInvert] = useState(0)
  const [selectedPreset, setSelectedPreset] = useState("none")
  
  // Stickers state
  const [stickers, setStickers] = useState<any[]>([])
  const [selectedCategory, setSelectedCategory] = useState("all")
  
  // Canvas state
  const [textOverlay, setTextOverlay] = useState("")
  const [textStyle, setTextStyle] = useState("bold")
  const [textColor, setTextColor] = useState("#FFFFFF")

  // Advanced presets
  const presets = [
    { id: "none", name: "Original", effects: {} },
    { id: "vintage", name: "Vintage", effects: { sepia: 40, contrast: 120, brightness: 110 } },
    { id: "bw", name: "Black & White", effects: { grayscale: 100, contrast: 110 } },
    { id: "warm", name: "Warm", effects: { hue: 15, saturation: 120, brightness: 105 } },
    { id: "cool", name: "Cool", effects: { hue: -15, saturation: 110, brightness: 95 } },
    { id: "dramatic", name: "Dramatic", effects: { contrast: 150, brightness: 90, saturation: 130 } },
    { id: "soft", name: "Soft", effects: { blur: 1, brightness: 105, contrast: 95 } },
    { id: "vivid", name: "Vivid", effects: { saturation: 150, contrast: 120, brightness: 105 } },
    { id: "retro", name: "Retro", effects: { sepia: 30, hue: 20, contrast: 110, brightness: 95 } },
    { id: "noir", name: "Film Noir", effects: { grayscale: 100, contrast: 140, brightness: 85 } },
  ]

  // Sticker categories
  const categories = [
    { id: "all", name: "All", icon: "🎯" },
    { id: "faces", name: "Faces", icon: "😊" },
    { id: "hearts", name: "Hearts", icon: "❤️" },
    { id: "nature", name: "Nature", icon: "🌿" },
    { id: "travel", name: "Travel", icon: "✈️" },
    { id: "activities", name: "Fun", icon: "🎉" },
  ]

  // Available stickers
  const availableStickers = [
    // Faces
    { id: "1", emoji: "😊", category: "faces", name: "Happy" },
    { id: "2", emoji: "😍", category: "faces", name: "Love Eyes" },
    { id: "3", emoji: "🤩", category: "faces", name: "Star Eyes" },
    { id: "4", emoji: "😎", category: "faces", name: "Cool" },
    { id: "5", emoji: "🥳", category: "faces", name: "Party" },
    { id: "6", emoji: "😂", category: "faces", name: "Laughing" },
    
    // Hearts
    { id: "7", emoji: "❤️", category: "hearts", name: "Red Heart" },
    { id: "8", emoji: "💙", category: "hearts", name: "Blue Heart" },
    { id: "9", emoji: "💚", category: "hearts", name: "Green Heart" },
    { id: "10", emoji: "💛", category: "hearts", name: "Yellow Heart" },
    { id: "11", emoji: "🧡", category: "hearts", name: "Orange Heart" },
    { id: "12", emoji: "💜", category: "hearts", name: "Purple Heart" },
    
    // Nature
    { id: "13", emoji: "🌟", category: "nature", name: "Star" },
    { id: "14", emoji: "⭐", category: "nature", name: "Star 2" },
    { id: "15", emoji: "🌙", category: "nature", name: "Moon" },
    { id: "16", emoji: "☀️", category: "nature", name: "Sun" },
    { id: "17", emoji: "🌈", category: "nature", name: "Rainbow" },
    { id: "18", emoji: "🌸", category: "nature", name: "Cherry Blossom" },
    
    // Travel
    { id: "19", emoji: "✈️", category: "travel", name: "Airplane" },
    { id: "20", emoji: "🚗", category: "travel", name: "Car" },
    { id: "21", emoji: "🏖️", category: "travel", name: "Beach" },
    { id: "22", emoji: "🏔️", category: "travel", name: "Mountain" },
    { id: "23", emoji: "🗽", category: "travel", name: "Statue of Liberty" },
    { id: "24", emoji: "📍", category: "travel", name: "Pin" },
    
    // Activities
    { id: "25", emoji: "🎉", category: "activities", name: "Party" },
    { id: "26", emoji: "🎊", category: "activities", name: "Confetti" },
    { id: "27", emoji: "🎈", category: "activities", name: "Balloon" },
    { id: "28", emoji: "🎁", category: "activities", name: "Gift" },
    { id: "29", emoji: "🎵", category: "activities", name: "Music" },
    { id: "30", emoji: "⚽", category: "activities", name: "Soccer" },
  ]

  // Generate advanced filter string
  const generateFilterString = () => {
    return [
      `brightness(${brightness}%)`,
      `contrast(${contrast}%)`,
      `saturate(${saturation}%)`,
      `hue-rotate(${hue}deg)`,
      `blur(${blur}px)`,
      `sepia(${sepia}%)`,
      `grayscale(${grayscale}%)`,
      `invert(${invert}%)`,
    ].join(" ")
  }

  // Apply preset
  const applyPreset = (preset: any) => {
    setSelectedPreset(preset.id)
    
    // Reset all values first
    setBrightness(100)
    setContrast(100)
    setSaturation(100)
    setHue(0)
    setBlur(0)
    setSepia(0)
    setGrayscale(0)
    setInvert(0)
    
    // Apply preset values
    if (preset.effects.brightness) setBrightness(preset.effects.brightness)
    if (preset.effects.contrast) setContrast(preset.effects.contrast)
    if (preset.effects.saturation) setSaturation(preset.effects.saturation)
    if (preset.effects.hue) setHue(preset.effects.hue)
    if (preset.effects.blur) setBlur(preset.effects.blur)
    if (preset.effects.sepia) setSepia(preset.effects.sepia)
    if (preset.effects.grayscale) setGrayscale(preset.effects.grayscale)
    if (preset.effects.invert) setInvert(preset.effects.invert)
  }

  // Add sticker
  const addSticker = (sticker: any) => {
    const newSticker = {
      id: Date.now(),
      emoji: sticker.emoji,
      x: Math.random() * 200,
      y: Math.random() * 200,
      scale: 1,
      rotation: 0,
    }
    setStickers([...stickers, newSticker])
  }

  // Remove sticker
  const removeSticker = (id: number) => {
    setStickers(stickers.filter(s => s.id !== id))
  }

  // Handle save
  const handleSave = () => {
    const postcardData = {
      text: `📍 ${locationName}`,
      effects: {
        brightness,
        contrast,
        saturation,
        hue,
        blur,
        sepia,
        grayscale,
        invert,
        preset: selectedPreset,
      },
      stickers,
      canvasData: {
        textOverlay,
        textStyle,
        textColor,
      },
    }
    onSave(postcardData)
  }

  // Filter stickers by category
  const filteredStickers = availableStickers.filter(sticker => 
    selectedCategory === "all" || sticker.category === selectedCategory
  )

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
      <div className="bg-black/20 p-2 flex items-center justify-center relative">
        <div className="w-24 h-24 rounded-lg overflow-hidden relative border border-white/20" style={{maxWidth: '96px', maxHeight: '96px', minWidth: '96px', minHeight: '96px'}}>
          {mediaType === "photo" ? (
            <img
              src={mediaUrl}
              alt="Preview"
              className="w-full h-full object-cover transition-all duration-300"
              style={{ filter: generateFilterString(), maxWidth: '96px', maxHeight: '96px', width: '96px', height: '96px' }}
            />
          ) : (
            <video
              src={mediaUrl}
              className="w-full h-full object-cover transition-all duration-300"
              style={{ filter: generateFilterString(), maxWidth: '96px', maxHeight: '96px', width: '96px', height: '96px' }}
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
              <span className="text-sm">{sticker.emoji}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex" style={{backgroundColor: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
        <button
          onClick={() => setActiveTab("effects")}
          style={{
            flex: 1,
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: activeTab === "effects" ? 'white' : 'rgba(255,255,255,0.7)',
            backgroundColor: activeTab === "effects" ? 'rgba(255,255,255,0.2)' : 'transparent',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <Wand2 size={18} />
          Effects
        </button>

        <button
          onClick={() => setActiveTab("stickers")}
          style={{
            flex: 1,
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: activeTab === "stickers" ? 'white' : 'rgba(255,255,255,0.7)',
            backgroundColor: activeTab === "stickers" ? 'rgba(255,255,255,0.2)' : 'transparent',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <Sticker size={18} />
          Stickers
        </button>

        <button
          onClick={() => setActiveTab("canvas")}
          style={{
            flex: 1,
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: activeTab === "canvas" ? 'white' : 'rgba(255,255,255,0.7)',
            backgroundColor: activeTab === "canvas" ? 'rgba(255,255,255,0.2)' : 'transparent',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <Palette size={18} />
          Canvas
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-4 overflow-y-auto" style={{backgroundColor: 'rgba(0,0,0,0.2)'}}>
        {activeTab === "effects" && (
          <div className="space-y-6">
                         {/* Presets */}
             <div>
               <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'white'}}>Presets</h3>
               <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px'}}>
                 {presets.map((preset) => (
                   <button
                     key={preset.id}
                     onClick={() => applyPreset(preset)}
                     style={{
                       padding: '8px',
                       borderRadius: '8px',
                       border: selectedPreset === preset.id ? '1px solid white' : '1px solid rgba(255,255,255,0.3)',
                       backgroundColor: selectedPreset === preset.id ? 'rgba(255,255,255,0.2)' : 'transparent',
                       color: selectedPreset === preset.id ? 'white' : 'rgba(255,255,255,0.7)',
                       fontSize: '14px',
                       cursor: 'pointer'
                     }}
                   >
                     {preset.name}
                   </button>
                 ))}
               </div>
             </div>

                         {/* Advanced Adjustments */}
             <div style={{marginTop: '24px'}}>
               <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'white'}}>Advanced Adjustments</h3>
               
               <div style={{marginBottom: '16px'}}>
                 <label style={{display: 'block', fontSize: '14px', marginBottom: '8px', color: 'rgba(255,255,255,0.8)'}}>Brightness</label>
                 <input
                   type="range"
                   min="0"
                   max="200"
                   value={brightness}
                   onChange={(e) => setBrightness(Number(e.target.value))}
                   style={{
                     width: '100%',
                     height: '6px',
                     borderRadius: '3px',
                     background: 'rgba(255,255,255,0.3)',
                     outline: 'none',
                     WebkitAppearance: 'none',
                     appearance: 'none'
                   }}
                 />
                 <span style={{fontSize: '12px', color: 'rgba(255,255,255,0.6)'}}>{brightness}%</span>
               </div>

               <div style={{marginBottom: '16px'}}>
                 <label style={{display: 'block', fontSize: '14px', marginBottom: '8px', color: 'rgba(255,255,255,0.8)'}}>Contrast</label>
                 <input
                   type="range"
                   min="0"
                   max="200"
                   value={contrast}
                   onChange={(e) => setContrast(Number(e.target.value))}
                   style={{
                     width: '100%',
                     height: '6px',
                     borderRadius: '3px',
                     background: 'rgba(255,255,255,0.3)',
                     outline: 'none',
                     WebkitAppearance: 'none',
                     appearance: 'none'
                   }}
                 />
                 <span style={{fontSize: '12px', color: 'rgba(255,255,255,0.6)'}}>{contrast}%</span>
               </div>

               <div style={{marginBottom: '16px'}}>
                 <label style={{display: 'block', fontSize: '14px', marginBottom: '8px', color: 'rgba(255,255,255,0.8)'}}>Saturation</label>
                 <input
                   type="range"
                   min="0"
                   max="200"
                   value={saturation}
                   onChange={(e) => setSaturation(Number(e.target.value))}
                   style={{
                     width: '100%',
                     height: '6px',
                     borderRadius: '3px',
                     background: 'rgba(255,255,255,0.3)',
                     outline: 'none',
                     WebkitAppearance: 'none',
                     appearance: 'none'
                   }}
                 />
                 <span style={{fontSize: '12px', color: 'rgba(255,255,255,0.6)'}}>{saturation}%</span>
               </div>

               <div style={{marginBottom: '16px'}}>
                 <label style={{display: 'block', fontSize: '14px', marginBottom: '8px', color: 'rgba(255,255,255,0.8)'}}>Hue</label>
                 <input
                   type="range"
                   min="-180"
                   max="180"
                   value={hue}
                   onChange={(e) => setHue(Number(e.target.value))}
                   style={{
                     width: '100%',
                     height: '6px',
                     borderRadius: '3px',
                     background: 'rgba(255,255,255,0.3)',
                     outline: 'none',
                     WebkitAppearance: 'none',
                     appearance: 'none'
                   }}
                 />
                 <span style={{fontSize: '12px', color: 'rgba(255,255,255,0.6)'}}>{hue}°</span>
               </div>

               <div style={{marginBottom: '16px'}}>
                 <label style={{display: 'block', fontSize: '14px', marginBottom: '8px', color: 'rgba(255,255,255,0.8)'}}>Blur</label>
                 <input
                   type="range"
                   min="0"
                   max="10"
                   value={blur}
                   onChange={(e) => setBlur(Number(e.target.value))}
                   style={{
                     width: '100%',
                     height: '6px',
                     borderRadius: '3px',
                     background: 'rgba(255,255,255,0.3)',
                     outline: 'none',
                     WebkitAppearance: 'none',
                     appearance: 'none'
                   }}
                 />
                 <span style={{fontSize: '12px', color: 'rgba(255,255,255,0.6)'}}>{blur}px</span>
               </div>

               <div style={{marginBottom: '16px'}}>
                 <label style={{display: 'block', fontSize: '14px', marginBottom: '8px', color: 'rgba(255,255,255,0.8)'}}>Sepia</label>
                 <input
                   type="range"
                   min="0"
                   max="100"
                   value={sepia}
                   onChange={(e) => setSepia(Number(e.target.value))}
                   style={{
                     width: '100%',
                     height: '6px',
                     borderRadius: '3px',
                     background: 'rgba(255,255,255,0.3)',
                     outline: 'none',
                     WebkitAppearance: 'none',
                     appearance: 'none'
                   }}
                 />
                 <span style={{fontSize: '12px', color: 'rgba(255,255,255,0.6)'}}>{sepia}%</span>
               </div>

               <div style={{marginBottom: '16px'}}>
                 <label style={{display: 'block', fontSize: '14px', marginBottom: '8px', color: 'rgba(255,255,255,0.8)'}}>Grayscale</label>
                 <input
                   type="range"
                   min="0"
                   max="100"
                   value={grayscale}
                   onChange={(e) => setGrayscale(Number(e.target.value))}
                   style={{
                     width: '100%',
                     height: '6px',
                     borderRadius: '3px',
                     background: 'rgba(255,255,255,0.3)',
                     outline: 'none',
                     WebkitAppearance: 'none',
                     appearance: 'none'
                   }}
                 />
                 <span style={{fontSize: '12px', color: 'rgba(255,255,255,0.6)'}}>{grayscale}%</span>
               </div>

               <div style={{marginBottom: '16px'}}>
                 <label style={{display: 'block', fontSize: '14px', marginBottom: '8px', color: 'rgba(255,255,255,0.8)'}}>Invert</label>
                 <input
                   type="range"
                   min="0"
                   max="100"
                   value={invert}
                   onChange={(e) => setInvert(Number(e.target.value))}
                   style={{
                     width: '100%',
                     height: '6px',
                     borderRadius: '3px',
                     background: 'rgba(255,255,255,0.3)',
                     outline: 'none',
                     WebkitAppearance: 'none',
                     appearance: 'none'
                   }}
                 />
                 <span style={{fontSize: '12px', color: 'rgba(255,255,255,0.6)'}}>{invert}%</span>
               </div>
             </div>
          </div>
        )}

        {activeTab === "stickers" && (
          <div className="space-y-6">
            {/* Categories */}
            <div>
              <h3 className="text-base font-semibold mb-3 text-white">Categories</h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-3 py-2 rounded-lg border transition-colors text-sm whitespace-nowrap ${
                      selectedCategory === category.id
                        ? "border-white bg-white/20 text-white"
                        : "border-white/30 text-white/70 hover:border-white/50 hover:text-white"
                    }`}
                  >
                    <span className="mr-1">{category.icon}</span>
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Stickers Grid */}
            <div>
              <h3 className="text-base font-semibold mb-3 text-white">Stickers</h3>
              <div className="grid grid-cols-4 gap-3">
                {filteredStickers.map((sticker) => (
                  <button
                    key={sticker.id}
                    onClick={() => addSticker(sticker)}
                    className="p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-2xl border border-white/20"
                  >
                    {sticker.emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Stickers */}
            {stickers.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 text-white">Active Stickers</h4>
                <div className="space-y-2">
                  {stickers.map((sticker) => (
                    <div key={sticker.id} className="flex items-center justify-between p-2 bg-white/10 rounded-lg border border-white/20">
                      <span className="text-lg">{sticker.emoji}</span>
                      <button
                        onClick={() => removeSticker(sticker.id)}
                        className="text-red-300 hover:text-red-200 text-sm"
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
            <h3 className="text-base font-semibold text-white">Canvas Tools</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2 text-white/80">Text Overlay</label>
                <input
                  type="text"
                  value={textOverlay}
                  onChange={(e) => setTextOverlay(e.target.value)}
                  placeholder="Add text..."
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-white/80">Text Style</label>
                <div className="grid grid-cols-2 gap-2">
                  {["bold", "elegant", "modern", "playful"].map((style) => (
                    <button
                      key={style}
                      onClick={() => setTextStyle(style)}
                      className={`p-2 rounded-lg border transition-colors text-sm ${
                        textStyle === style
                          ? "border-white bg-white/20 text-white"
                          : "border-white/30 text-white/70 hover:border-white/50 hover:text-white"
                      }`}
                    >
                      {style.charAt(0).toUpperCase() + style.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2 text-white/80">Text Color</label>
                <div className="flex gap-2">
                  {["#FFFFFF", "#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00"].map((color) => (
                    <button
                      key={color}
                      onClick={() => setTextColor(color)}
                      className={`w-8 h-8 rounded-full border-2 ${
                        textColor === color ? "border-white" : "border-white/30"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
