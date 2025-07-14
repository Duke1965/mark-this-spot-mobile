"use client"

import { useState } from "react"
import { Smile, Heart, Star, MapPin } from "lucide-react"

interface StickersPanelProps {
  onStickerAdd: (sticker: string, category: string) => void
}

export function StickersPanel({ onStickerAdd }: StickersPanelProps) {
  const [activeCategory, setActiveCategory] = useState("emojis")

  const stickerCategories = {
    emojis: {
      icon: <Smile size={16} />,
      name: "Emojis",
      items: ["😀", "😂", "🥰", "😎", "🤔", "😍", "🔥", "💯", "👍", "👏", "🙌", "💪"],
    },
    hearts: {
      icon: <Heart size={16} />,
      name: "Hearts",
      items: ["❤️", "💙", "💚", "💛", "🧡", "💜", "🖤", "🤍", "💖", "💕", "💗", "💓"],
    },
    nature: {
      icon: <Star size={16} />,
      name: "Nature",
      items: ["🌟", "⭐", "✨", "🌙", "☀️", "🌈", "🌸", "🌺", "🌻", "🌷", "🍀", "🌿"],
    },
    travel: {
      icon: <MapPin size={16} />,
      name: "Travel",
      items: ["✈️", "🗺️", "🏖️", "🏔️", "🏝️", "🗽", "🗼", "🏰", "🎡", "🎢", "🚗", "🚲"],
    },
  }

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.9)",
        padding: "1rem",
        borderRadius: "1rem",
        color: "white",
        maxHeight: "400px",
        overflowY: "auto",
      }}
    >
      <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem" }}>Stickers & Emojis</h3>

      {/* Category Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1rem",
          overflowX: "auto",
        }}
      >
        {Object.entries(stickerCategories).map(([key, category]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(255,255,255,0.2)",
              background: activeCategory === key ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.1)",
              color: "white",
              cursor: "pointer",
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
            }}
          >
            {category.icon}
            {category.name}
          </button>
        ))}
      </div>

      {/* Sticker Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(50px, 1fr))",
          gap: "0.5rem",
        }}
      >
        {stickerCategories[activeCategory as keyof typeof stickerCategories].items.map((sticker, index) => (
          <button
            key={index}
            onClick={() => onStickerAdd(sticker, activeCategory)}
            style={{
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.1)",
              cursor: "pointer",
              fontSize: "1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
              aspectRatio: "1",
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

      {/* Size Control */}
      <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <label style={{ fontSize: "0.8rem", opacity: 0.9, marginBottom: "0.5rem", display: "block" }}>
          Sticker Size
        </label>
        <input
          type="range"
          min="20"
          max="100"
          defaultValue="40"
          onChange={(e) => {
            // This would control the size of newly added stickers
            console.log("Sticker size:", e.target.value)
          }}
          style={{
            width: "100%",
            height: "4px",
            borderRadius: "2px",
            background: "rgba(255,255,255,0.2)",
            outline: "none",
          }}
        />
      </div>
    </div>
  )
}
