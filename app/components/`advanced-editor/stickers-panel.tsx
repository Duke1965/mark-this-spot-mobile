"use client"

import { useState } from "react"
import { Smile, Heart, Star, Music, Coffee, Plane } from "lucide-react"

interface Sticker {
  id: string
  emoji: string
  category: string
  name: string
}

interface StickersPanelProps {
  onStickerAdd: (sticker: Sticker, size: number) => void
}

const STICKER_CATEGORIES = [
  { id: "faces", name: "Faces", icon: <Smile size={16} /> },
  { id: "hearts", name: "Hearts", icon: <Heart size={16} /> },
  { id: "nature", name: "Nature", icon: <Star size={16} /> },
  { id: "travel", name: "Travel", icon: <Plane size={16} /> },
  { id: "food", name: "Food", icon: <Coffee size={16} /> },
  { id: "activities", name: "Fun", icon: <Music size={16} /> },
]

const STICKERS: Sticker[] = [
  // Faces
  { id: "smile", emoji: "😊", category: "faces", name: "Smile" },
  { id: "laugh", emoji: "😂", category: "faces", name: "Laugh" },
  { id: "love", emoji: "😍", category: "faces", name: "Love" },
  { id: "cool", emoji: "😎", category: "faces", name: "Cool" },
  { id: "wink", emoji: "😉", category: "faces", name: "Wink" },

  // Hearts
  { id: "red-heart", emoji: "❤️", category: "hearts", name: "Red Heart" },
  { id: "pink-heart", emoji: "💕", category: "hearts", name: "Pink Hearts" },
  { id: "sparkle-heart", emoji: "💖", category: "hearts", name: "Sparkle Heart" },
  { id: "heart-eyes", emoji: "😍", category: "hearts", name: "Heart Eyes" },
  { id: "kiss", emoji: "💋", category: "hearts", name: "Kiss" },

  // Nature
  { id: "sun", emoji: "☀️", category: "nature", name: "Sun" },
  { id: "moon", emoji: "🌙", category: "nature", name: "Moon" },
  { id: "star", emoji: "⭐", category: "nature", name: "Star" },
  { id: "rainbow", emoji: "🌈", category: "nature", name: "Rainbow" },
  { id: "flower", emoji: "🌸", category: "nature", name: "Flower" },

  // Travel
  { id: "plane", emoji: "✈️", category: "travel", name: "Airplane" },
  { id: "car", emoji: "🚗", category: "travel", name: "Car" },
  { id: "camera", emoji: "📸", category: "travel", name: "Camera" },
  { id: "map", emoji: "🗺️", category: "travel", name: "Map" },
  { id: "luggage", emoji: "🧳", category: "travel", name: "Luggage" },

  // Food
  { id: "pizza", emoji: "🍕", category: "food", name: "Pizza" },
  { id: "coffee", emoji: "☕", category: "food", name: "Coffee" },
  { id: "cake", emoji: "🎂", category: "food", name: "Cake" },
  { id: "ice-cream", emoji: "🍦", category: "food", name: "Ice Cream" },
  { id: "burger", emoji: "🍔", category: "food", name: "Burger" },

  // Activities
  { id: "music", emoji: "🎵", category: "activities", name: "Music" },
  { id: "party", emoji: "🎉", category: "activities", name: "Party" },
  { id: "fire", emoji: "🔥", category: "activities", name: "Fire" },
  { id: "thumbs-up", emoji: "👍", category: "activities", name: "Thumbs Up" },
  { id: "clap", emoji: "👏", category: "activities", name: "Clap" },
]

export function StickersPanel({ onStickerAdd }: StickersPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState("faces")
  const [stickerSize, setStickerSize] = useState(60)

  const filteredStickers = STICKERS.filter((sticker) => sticker.category === selectedCategory)

  const handleStickerClick = (sticker: Sticker) => {
    onStickerAdd(sticker, stickerSize)
  }

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.9)",
        padding: "1rem",
        borderRadius: "1rem",
        maxHeight: "400px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <h3
          style={{
            color: "white",
            margin: 0,
            fontSize: "1.1rem",
            fontWeight: "600",
          }}
        >
          Stickers & Emojis
        </h3>
      </div>

      {/* Size Control */}
      <div style={{ marginBottom: "1rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.5rem",
          }}
        >
          <label
            style={{
              color: "rgba(255,255,255,0.8)",
              fontSize: "0.8rem",
            }}
          >
            Sticker Size
          </label>
          <span
            style={{
              color: "white",
              fontSize: "0.8rem",
              fontWeight: "500",
            }}
          >
            {stickerSize}px
          </span>
        </div>
        <input
          type="range"
          min={30}
          max={120}
          value={stickerSize}
          onChange={(e) => setStickerSize(Number.parseInt(e.target.value))}
          style={{
            width: "100%",
            height: "4px",
            borderRadius: "2px",
            background: "rgba(255,255,255,0.2)",
            outline: "none",
            cursor: "pointer",
          }}
        />
      </div>

      {/* Category Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1rem",
          overflowX: "auto",
          paddingBottom: "0.5rem",
        }}
      >
        {STICKER_CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: "0.5rem",
              border: selectedCategory === category.id ? "2px solid #10B981" : "1px solid rgba(255,255,255,0.2)",
              background: selectedCategory === category.id ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.1)",
              color: "white",
              cursor: "pointer",
              transition: "all 0.3s ease",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.8rem",
              fontWeight: "500",
              whiteSpace: "nowrap",
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
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "0.75rem",
        }}
      >
        {filteredStickers.map((sticker) => (
          <button
            key={sticker.id}
            onClick={() => handleStickerClick(sticker)}
            style={{
              padding: "0.75rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.1)",
              cursor: "pointer",
              transition: "all 0.3s ease",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.25rem",
              aspectRatio: "1",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(16, 185, 129, 0.2)"
              e.currentTarget.style.transform = "scale(1.05)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)"
              e.currentTarget.style.transform = "scale(1)"
            }}
          >
            <div style={{ fontSize: "1.5rem" }}>{sticker.emoji}</div>
            <div
              style={{
                color: "rgba(255,255,255,0.8)",
                fontSize: "0.7rem",
                textAlign: "center",
                lineHeight: "1",
              }}
            >
              {sticker.name}
            </div>
          </button>
        ))}
      </div>

      {/* Preview */}
      <div
        style={{
          marginTop: "1rem",
          padding: "1rem",
          background: "rgba(255,255,255,0.05)",
          borderRadius: "0.75rem",
          border: "1px solid rgba(255,255,255,0.1)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: "0.8rem",
            marginBottom: "0.5rem",
          }}
        >
          Preview Size
        </div>
        <div style={{ fontSize: `${stickerSize}px`, lineHeight: "1" }}>😊</div>
      </div>
    </div>
  )
}
