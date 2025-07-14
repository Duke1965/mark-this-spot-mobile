"use client"

import { useState } from "react"
import { Heart, MapPin, Smile, Sun, Coffee } from "lucide-react"

interface Sticker {
  id: string
  emoji: string
  name: string
  category: string
  size: number
}

const STICKER_CATEGORIES = {
  emotions: {
    name: "Emotions",
    icon: <Smile size={16} />,
    stickers: [
      { id: "smile", emoji: "😊", name: "Smile", size: 48 },
      { id: "love", emoji: "😍", name: "Love", size: 48 },
      { id: "cool", emoji: "😎", name: "Cool", size: 48 },
      { id: "wink", emoji: "😉", name: "Wink", size: 48 },
      { id: "laugh", emoji: "😂", name: "Laugh", size: 48 },
      { id: "heart-eyes", emoji: "🥰", name: "Heart Eyes", size: 48 },
    ],
  },
  travel: {
    name: "Travel",
    icon: <MapPin size={16} />,
    stickers: [
      { id: "plane", emoji: "✈️", name: "Airplane", size: 48 },
      { id: "camera", emoji: "📸", name: "Camera", size: 48 },
      { id: "map", emoji: "🗺️", name: "Map", size: 48 },
      { id: "compass", emoji: "🧭", name: "Compass", size: 48 },
      { id: "luggage", emoji: "🧳", name: "Luggage", size: 48 },
      { id: "passport", emoji: "📔", name: "Passport", size: 48 },
    ],
  },
  nature: {
    name: "Nature",
    icon: <Sun size={16} />,
    stickers: [
      { id: "sun", emoji: "☀️", name: "Sun", size: 48 },
      { id: "moon", emoji: "🌙", name: "Moon", size: 48 },
      { id: "star", emoji: "⭐", name: "Star", size: 48 },
      { id: "tree", emoji: "🌳", name: "Tree", size: 48 },
      { id: "flower", emoji: "🌸", name: "Flower", size: 48 },
      { id: "mountain", emoji: "⛰️", name: "Mountain", size: 48 },
    ],
  },
  food: {
    name: "Food",
    icon: <Coffee size={16} />,
    stickers: [
      { id: "coffee", emoji: "☕", name: "Coffee", size: 48 },
      { id: "pizza", emoji: "🍕", name: "Pizza", size: 48 },
      { id: "burger", emoji: "🍔", name: "Burger", size: 48 },
      { id: "ice-cream", emoji: "🍦", name: "Ice Cream", size: 48 },
      { id: "cake", emoji: "🎂", name: "Cake", size: 48 },
      { id: "wine", emoji: "🍷", name: "Wine", size: 48 },
    ],
  },
  symbols: {
    name: "Symbols",
    icon: <Heart size={16} />,
    stickers: [
      { id: "heart", emoji: "❤️", name: "Heart", size: 48 },
      { id: "fire", emoji: "🔥", name: "Fire", size: 48 },
      { id: "lightning", emoji: "⚡", name: "Lightning", size: 48 },
      { id: "sparkles", emoji: "✨", name: "Sparkles", size: 48 },
      { id: "crown", emoji: "👑", name: "Crown", size: 48 },
      { id: "gem", emoji: "💎", name: "Gem", size: 48 },
    ],
  },
}

interface StickersPanelProps {
  onStickerAdd: (sticker: Sticker) => void
  platformColor: string
}

export function StickersPanel({ onStickerAdd, platformColor }: StickersPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("emotions")
  const [stickerSize, setStickerSize] = useState(48)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Category Tabs */}
      <div>
        <h4 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: "bold" }}>🎭 Stickers</h4>

        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "1rem",
            overflowX: "auto",
            paddingBottom: "0.5rem",
          }}
        >
          {Object.entries(STICKER_CATEGORIES).map(([categoryId, category]) => (
            <button
              key={categoryId}
              onClick={() => setSelectedCategory(categoryId)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                borderRadius: "1rem",
                border: "none",
                background: selectedCategory === categoryId ? platformColor : "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                fontSize: "0.75rem",
                fontWeight: "bold",
                whiteSpace: "nowrap",
                transition: "all 0.3s ease",
              }}
            >
              {category.icon}
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Sticker Size Control */}
      <div>
        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
          Sticker Size: {stickerSize}px
        </label>
        <input
          type="range"
          min="24"
          max="120"
          value={stickerSize}
          onChange={(e) => setStickerSize(Number(e.target.value))}
          style={{ width: "100%" }}
        />
      </div>

      {/* Stickers Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "0.75rem",
          maxHeight: "300px",
          overflowY: "auto",
        }}
      >
        {STICKER_CATEGORIES[selectedCategory as keyof typeof STICKER_CATEGORIES]?.stickers.map((sticker) => (
          <button
            key={sticker.id}
            onClick={() => onStickerAdd({ ...sticker, size: stickerSize, category: selectedCategory })}
            style={{
              padding: "1rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.1)",
              color: "white",
              cursor: "pointer",
              transition: "all 0.3s ease",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.75rem",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${platformColor}20`
              e.currentTarget.style.borderColor = platformColor
              e.currentTarget.style.transform = "scale(1.05)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)"
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"
              e.currentTarget.style.transform = "scale(1)"
            }}
          >
            <div style={{ fontSize: `${Math.min(stickerSize * 0.6, 32)}px` }}>{sticker.emoji}</div>
            <div style={{ fontSize: "0.7rem", textAlign: "center" }}>{sticker.name}</div>
          </button>
        ))}
      </div>

      {/* Custom Sticker Upload */}
      <div
        style={{
          padding: "1rem",
          borderRadius: "0.75rem",
          border: "2px dashed rgba(255,255,255,0.3)",
          textAlign: "center",
          color: "rgba(255,255,255,0.6)",
        }}
      >
        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📁</div>
        <p style={{ margin: 0, fontSize: "0.875rem" }}>Custom stickers coming soon!</p>
        <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.75rem" }}>Upload your own images</p>
      </div>
    </div>
  )
}
