"use client"

import { useState } from "react"
import { ArrowLeft, Save, Share2 } from "lucide-react"

interface ContentEditorProps {
  mediaUrl: string
  mediaType: "photo" | "video"
  platform: string
  onBack: () => void
  onPost: (contentData: any) => void
  onSave: (contentData: any) => void
}

interface Sticker {
  id: string
  emoji: string
  x: number
  y: number
  scale: number
  rotation: number
}

interface DraggableStickerProps {
  sticker: Sticker
  onUpdate: (updates: Partial<Sticker>) => void
  onRemove: () => void
}

interface DraggableTextProps {
  text: string
  style: string
  onUpdate: (updates: any) => void
}

function DraggableSticker({ sticker, onUpdate, onRemove }: DraggableStickerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    setStartPos({ x: touch.clientX - sticker.x, y: touch.clientY - sticker.y })
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()
    if (!isDragging) return
    const touch = e.touches[0]
    onUpdate({
      x: touch.clientX - startPos.x,
      y: touch.clientY - startPos.y
    })
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI
    onUpdate({ rotation: angle })
  }

  return (
    <div
      style={{
        position: "absolute",
        left: sticker.x,
        top: sticker.y,
        transform: `scale(${sticker.scale}) rotate(${sticker.rotation}deg)`,
        cursor: "move",
        userSelect: "none",
        touchAction: "none",
              fontSize: "48px", // Much larger for easier dragging
      zIndex: isDragging ? 1000 : 1,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={onRemove}
    >
      {sticker.emoji}
      <button
        onClick={handleRotate}
        style={{
          position: "absolute",
          top: "-20px",
          right: "-20px",
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          background: "rgba(0,0,0,0.8)",
          color: "white",
          border: "none",
          fontSize: "12px",
          cursor: "pointer",
        }}
      >
        🔄
      </button>
    </div>
  )
}

function DraggableText({ text, style, onUpdate }: DraggableTextProps) {
  const [position, setPosition] = useState({ x: 10, y: 10 })
  const [isDragging, setIsDragging] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    setStartPos({ x: touch.clientX - position.x, y: touch.clientY - position.y })
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()
    if (!isDragging) return
    const touch = e.touches[0]
    setPosition({
      x: touch.clientX - startPos.x,
      y: touch.clientY - startPos.y
    })
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  return (
    <div
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        fontSize: style === "bold" ? "16px" : "14px",
        fontWeight: style === "bold" ? "bold" : "normal",
        color: "white",
        textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
        cursor: "move",
        userSelect: "none",
        touchAction: "none",
        zIndex: isDragging ? 1000 : 1,
        maxWidth: "calc(100% - 20px)",
        wordWrap: "break-word",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {text}
    </div>
  )
}

export function ContentEditor({ mediaUrl, mediaType, platform, onBack, onPost, onSave }: ContentEditorProps) {
  const [activeTab, setActiveTab] = useState<"stickers" | "text">("stickers")
  const [stickers, setStickers] = useState<Sticker[]>([])
  const [textOverlay, setTextOverlay] = useState("")
  const [textStyle, setTextStyle] = useState("bold")

  // Available stickers (placeholder - you'll add your comic style stickers)
  const availableStickers = [
    "😊", "😍", "🤩", "😎", "🥳", "😂", "❤️", "💙", "💚", "💛", "🧡", "💜",
    "🌟", "⭐", "🌙", "☀️", "🌈", "🌸", "✈️", "🚗", "🏖️", "🏔️", "🗽", "📍",
    "🎉", "🎊", "🎈", "🎁", "🎵", "⚽"
  ]

  // Add sticker
  const addSticker = (emoji: string) => {
    const newSticker: Sticker = {
      id: Date.now().toString(),
      emoji,
      x: Math.random() * 100,
      y: Math.random() * 100,
      scale: 1,
      rotation: 0,
    }
    setStickers([...stickers, newSticker])
  }

  // Remove sticker
  const removeSticker = (id: string) => {
    setStickers(stickers.filter(s => s.id !== id))
  }

  // Handle post
  const handlePost = () => {
    const contentData = {
      stickers,
      text: textOverlay,
      textStyle,
      platform,
    }
    onPost(contentData)
  }

  // Handle save
  const handleSave = () => {
    const contentData = {
      stickers,
      text: textOverlay,
      textStyle,
      platform,
    }
    onSave(contentData)
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #581c87 100%)",
        display: "flex",
        flexDirection: "column",
        color: "white",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(0,0,0,0.2)",
        }}
      >
        <button
          onClick={onBack}
          style={{
            padding: "0.75rem",
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>
          Add Content for {platform}
        </h1>
        <div style={{ width: "48px" }} />
      </div>

      {/* Preview */}
      <div
        style={{
          padding: "1rem",
          display: "flex",
          justifyContent: "center",
          background: "rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            width: "90vw",
            height: "50vh",
            borderRadius: "0.5rem",
            overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.2)",
            position: "relative",
            touchAction: "none",
          }}
        >
          {mediaType === "photo" ? (
            <img
              src={mediaUrl}
              alt="Preview"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <video
              src={mediaUrl}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              muted
              autoPlay
              loop
            />
          )}
          
          {/* Draggable Stickers Overlay */}
          {stickers.map((sticker) => (
            <DraggableSticker
              key={sticker.id}
              sticker={sticker}
              onUpdate={(updates) => {
                setStickers(stickers.map(s => 
                  s.id === sticker.id ? { ...s, ...updates } : s
                ))
              }}
              onRemove={() => removeSticker(sticker.id)}
            />
          ))}

          {/* Draggable Text Overlay */}
          {textOverlay && (
            <DraggableText
              text={textOverlay}
              style={textStyle}
              onUpdate={(updates) => {
                // Update text position if needed
                console.log("Text position updated:", updates)
              }}
            />
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex" style={{backgroundColor: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
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
          🎯 Stickers
        </button>

        <button
          onClick={() => setActiveTab("text")}
          style={{
            flex: 1,
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: activeTab === "text" ? 'white' : 'rgba(255,255,255,0.7)',
            backgroundColor: activeTab === "text" ? 'rgba(255,255,255,0.2)' : 'transparent',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          ✏️ Text
        </button>
      </div>

      {/* Tab Content */}
      <div style={{flex: 1, padding: '16px', overflowY: 'auto', backgroundColor: 'rgba(0,0,0,0.2)'}}>
        {activeTab === "stickers" && (
          <div>
            <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'white'}}>
              Add Stickers
            </h3>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px'}}>
              {availableStickers.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => addSticker(emoji)}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    fontSize: '20px',
                    cursor: 'pointer'
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === "text" && (
          <div>
            <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: 'white'}}>
              Add Text
            </h3>
            <div style={{marginBottom: '16px'}}>
              <label style={{display: 'block', fontSize: '14px', marginBottom: '8px', color: 'rgba(255,255,255,0.8)'}}>
                Your Message
              </label>
              <input
                type="text"
                value={textOverlay}
                onChange={(e) => setTextOverlay(e.target.value)}
                placeholder="Add your message..."
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{display: 'block', fontSize: '14px', marginBottom: '8px', color: 'rgba(255,255,255,0.8)'}}>
                Text Style
              </label>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px'}}>
                {["bold", "normal"].map((style) => (
                  <button
                    key={style}
                    onClick={() => setTextStyle(style)}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      border: textStyle === style ? '1px solid white' : '1px solid rgba(255,255,255,0.3)',
                      background: textStyle === style ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                      color: 'white',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{padding: '16px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.1)'}}>
        <div style={{display: 'flex', gap: '8px'}}>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Save size={16} />
            Save
          </button>
          <button
            onClick={handlePost}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.3)',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Share2 size={16} />
            Post
          </button>
        </div>
      </div>
    </div>
  )
} 
