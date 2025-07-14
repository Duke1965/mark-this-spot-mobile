"use client"

import { useState } from "react"
import { Smile, Heart, Star, MapPin, Camera, Plane, Plus, Minus } from "lucide-react"

interface StickersPanelProps {
  onSelectSticker: (sticker: any) => void
}

export function StickersPanel({ onSelectSticker }: StickersPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState("emojis")
  const [stickerSize, setStickerSize] = useState(50)

  const stickerCategories = {
    emojis: {
      name: "Emojis",
      icon: <Smile size={16} />,
      stickers: ["😀", "😍", "🤩", "😎", "🥳", "😊", "🤗", "😘", "🤔", "😴", "🤯", "🥰"],
    },
    hearts: {
      name: "Hearts",
      icon: <Heart size={16} />,
      stickers: ["❤️", "💙", "💚", "💛", "🧡", "💜", "🖤", "🤍", "🤎", "💕", "💖", "💗"],
    },
    travel: {
      name: "Travel",
      icon: <Plane size={16} />,
      stickers: ["✈️", "🚗", "🚢", "🚁", "🚂", "🏖️", "🏔️", "🗺️", "🧳", "📍", "🌍", "🏝️"],
    },
    nature: {
      name: "Nature",
      icon: <Star size={16} />,
      stickers: ["🌸", "🌺", "🌻", "🌷", "🌹", "🌿", "🍃", "🌳", "🌲", "🌴", "🌵", "🌾"],
    },
    food: {
      name: "Food",
      icon: <Camera size={16} />,
      stickers: ["🍕", "🍔", "🍟", "🌭", "🥪", "🌮", "🍝", "🍜", "🍱", "🍣", "🍰", "🧁"],
    },
    activities: {
      name: "Activities",
      icon: <MapPin size={16} />,
      stickers: ["⚽", "🏀", "🎾", "🏈", "🎱", "🎯", "🎮", "🎲", "🎪", "🎨", "🎭", "🎪"],
    },
  }

  const handleStickerSelect = (sticker: string) => {
    onSelectSticker({
      type: "sticker",
      content: sticker,
      size: stickerSize,
      position: { x: 50, y: 50 },
      timestamp: Date.now(),
    })
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%" }}>
      {/* Size Control */}
      <div
        style={{
          background: "rgba(255,255,255,0.1)",
          borderRadius: "1rem",
          padding: "1.5rem",
        }}
      >
        <h3 style={{ margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          Sticker Size: {stickerSize}px
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={() => setStickerSize(Math.max(20, stickerSize - 10))}
            style={{
              padding: "0.5rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              cursor: "pointer",
            }}
          >
            <Minus size={16} />
          </button>
          <input
            type="range"
            min="20"
            max="100"
            value={stickerSize}
            onChange={(e) => setStickerSize(Number.parseInt(e.target.value))}
            style={{ flex: 1 }}
          />
          <button
            onClick={() => setStickerSize(Math.min(100, stickerSize + 10))}
            style={{
              padding: "0.5rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              cursor: "pointer",
            }}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          background: "rgba(255,255,255,0.1)",
          borderRadius: "1rem",
          padding: "1rem",
        }}
      >
        {Object.entries(stickerCategories).map(([key, category]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              background: selectedCategory === key ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.1)",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.875rem",
            }}
          >
            {category.icon}
            {category.name}
          </button>
        ))}
      </div>

      {/* Stickers Grid */}
      <div
        style={{
          background: "rgba(255,255,255,0.1)",
          borderRadius: "1rem",
          padding: "1.5rem",
          flex: 1,
          overflowY: "auto",
        }}
      >
        <h3 style={{ margin: "0 0 1rem 0" }}>
          {stickerCategories[selectedCategory as keyof typeof stickerCategories].name}
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))",
            gap: "0.75rem",
          }}
        >
          {stickerCategories[selectedCategory as keyof typeof stickerCategories].stickers.map((sticker, index) => (
            <button
              key={index}
              onClick={() => handleStickerSelect(sticker)}
              style={{
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.1)",
                cursor: "pointer",
                fontSize: `${stickerSize * 0.6}px`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.3s ease",
                minHeight: "60px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(16, 185, 129, 0.2)"
                e.currentTarget.style.transform = "scale(1.1)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)"
                e.currentTarget.style.transform = "scale(1)"
              }}
            >
              {sticker}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div
        style={{
          background: "rgba(255,255,255,0.1)",
          borderRadius: "1rem",
          padding: "1rem",
          textAlign: "center",
        }}
      >
        <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.875rem", opacity: 0.8 }}>Preview Size: {stickerSize}px</p>
        <div
          style={{
            fontSize: `${stickerSize}px`,
            lineHeight: 1,
          }}
        >
          😀
        </div>
      </div>
    </div>
  )
}
