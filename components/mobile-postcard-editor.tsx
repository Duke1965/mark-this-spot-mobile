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
                         {/* Filters */}
             <div>
               <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: 'white'}}>Filters</h3>
               <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px'}}>
                 {filters.map((filter) => (
                   <button
                     key={filter.name}
                     onClick={() => setSelectedFilter(filter.name)}
                     style={{
                       padding: '8px',
                       borderRadius: '8px',
                       border: selectedFilter === filter.name ? '1px solid white' : '1px solid rgba(255,255,255,0.3)',
                       backgroundColor: selectedFilter === filter.name ? 'rgba(255,255,255,0.2)' : 'transparent',
                       color: selectedFilter === filter.name ? 'white' : 'rgba(255,255,255,0.7)',
                       fontSize: '14px',
                       cursor: 'pointer'
                     }}
                   >
                     {filter.label}
                   </button>
                 ))}
               </div>
             </div>

             {/* Adjustments */}
             <div style={{marginTop: '24px'}}>
               <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'white'}}>Adjustments</h3>
               
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
             </div>
          </div>
        )}

                 {activeTab === "stickers" && (
           <div className="space-y-6">
             <h3 className="text-base font-semibold text-white">Add Stickers</h3>
             
             <div className="grid grid-cols-4 gap-2">
               {availableStickers.map((sticker) => (
                 <button
                   key={sticker}
                   onClick={() => addSticker(sticker)}
                   className="p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-xl border border-white/20"
                 >
                   {sticker}
                 </button>
               ))}
             </div>

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
                   placeholder="Add text..."
                   className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
                 />
               </div>

               <div>
                 <label className="block text-sm mb-2 text-white/80">Text Color</label>
                 <div className="flex gap-2">
                   {["#FFFFFF", "#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00"].map((color) => (
                     <button
                       key={color}
                       className="w-8 h-8 rounded-full border-2 border-white/30"
                       style={{ backgroundColor: color }}
                     />
                   ))}
                 </div>
               </div>

               <div>
                 <label className="block text-sm mb-2 text-white/80">Text Size</label>
                 <input
                   type="range"
                   min="12"
                   max="72"
                   defaultValue="24"
                   className="w-full accent-white"
                 />
               </div>
             </div>
           </div>
         )}
      </div>
    </div>
  )
}
