"use client"

import { useState } from "react"

import { Smile, Heart, Star, Trash2 } from "lucide-react"

interface StickersPanelProps {
  stickers: Array<{
    id: string
    emoji: string
    x: number
    y: number
    size: number
  }>
  onUpdate: (stickers: any[]) => void
}

export function StickersPanel({ stickers, onUpdate }: StickersPanelProps) {
  const stickerCategories = {
    faces: {
      name: "Faces & Emotions",
      icon: <Smile size={16} />,
      emojis: [
        "😀",
        "😃",
        "😄",
        "😁",
        "😆",
        "😅",
        "😂",
        "🤣",
        "😊",
        "😇",
        "🙂",
        "🙃",
        "😉",
        "😌",
        "😍",
        "🥰",
        "😘",
        "😗",
        "😙",
        "😚",
        "😋",
        "😛",
        "😝",
        "😜",
        "🤪",
        "🤨",
        "🧐",
        "🤓",
        "😎",
        "🤩",
        "🥳",
      ],
    },
    hearts: {
      name: "Hearts & Love",
      icon: <Heart size={16} />,
      emojis: [
        "❤️",
        "🧡",
        "💛",
        "💚",
        "💙",
        "💜",
        "🖤",
        "🤍",
        "🤎",
        "💔",
        "❣️",
        "💕",
        "💞",
        "💓",
        "💗",
        "💖",
        "💘",
        "💝",
        "💟",
        "♥️",
        "💋",
        "😍",
        "🥰",
        "😘",
        "💑",
        "💏",
      ],
    },
    nature: {
      name: "Nature & Weather",
      icon: <Star size={16} />,
      emojis: [
        "🌟",
        "⭐",
        "🌠",
        "✨",
        "⚡",
        "🔥",
        "💥",
        "☀️",
        "🌤️",
        "⛅",
        "🌦️",
        "🌧️",
        "⛈️",
        "🌩️",
        "❄️",
        "☃️",
        "⛄",
        "🌈",
        "🌊",
        "💧",
        "🌸",
        "🌺",
        "🌻",
        "🌷",
        "🌹",
        "🌿",
        "🍀",
        "🌱",
      ],
    },
    travel: {
      name: "Travel & Places",
      icon: "🗺️",
      emojis: [
        "✈️",
        "🚗",
        "🚕",
        "🚙",
        "🚌",
        "🚎",
        "🏎️",
        "🚓",
        "🚑",
        "🚒",
        "🚐",
        "🛻",
        "🚚",
        "🚛",
        "🚜",
        "🏍️",
        "🛵",
        "🚲",
        "🛴",
        "🛹",
        "🚁",
        "🛸",
        "🚀",
        "🛥️",
        "⛵",
        "🚤",
        "🛳️",
        "⚓",
        "🏖️",
        "🏝️",
        "🗺️",
        "🧭",
      ],
    },
    food: {
      name: "Food & Drinks",
      icon: "🍕",
      emojis: [
        "🍎",
        "🍊",
        "🍋",
        "🍌",
        "🍉",
        "🍇",
        "🍓",
        "🍈",
        "🍒",
        "🍑",
        "🥭",
        "🍍",
        "🥥",
        "🥝",
        "🍅",
        "🍆",
        "🥑",
        "🥦",
        "🥬",
        "🥒",
        "🌶️",
        "🌽",
        "🥕",
        "🧄",
        "🧅",
        "🥔",
        "🍠",
        "🥐",
        "🍞",
        "🥖",
        "🥨",
        "🧀",
        "🥚",
        "🍳",
        "🧈",
        "🥞",
        "🧇",
        "🥓",
        "🥩",
        "🍗",
        "🍖",
        "🌭",
        "🍔",
        "🍟",
        "🍕",
      ],
    },
    activities: {
      name: "Activities & Sports",
      icon: "⚽",
      emojis: [
        "⚽",
        "🏀",
        "🏈",
        "⚾",
        "🥎",
        "🎾",
        "🏐",
        "🏉",
        "🥏",
        "🎱",
        "🪀",
        "🏓",
        "🏸",
        "🏒",
        "🏑",
        "🥍",
        "🏏",
        "🪃",
        "🥅",
        "⛳",
        "🪁",
        "🏹",
        "🎣",
        "🤿",
        "🥊",
        "🥋",
        "🎽",
        "🛹",
        "🛷",
        "⛸️",
        "🥌",
        "🎿",
        "⛷️",
        "🏂",
        "🪂",
        "🏋️",
        "🤸",
        "🤾",
        "🏌️",
        "🏇",
        "🧘",
        "🏃",
        "🚶",
      ],
    },
  }

  const [selectedCategory, setSelectedCategory] = useState<string>("faces")

  const addSticker = (emoji: string) => {
    const newSticker = {
      id: Date.now().toString(),
      emoji,
      x: Math.random() * 80 + 10, // Random position between 10-90%
      y: Math.random() * 80 + 10,
      size: 40,
    }
    onUpdate([...stickers, newSticker])
  }

  const removeSticker = (id: string) => {
    onUpdate(stickers.filter((sticker) => sticker.id !== id))
  }

  const updateStickerSize = (id: string, size: number) => {
    onUpdate(stickers.map((sticker) => (sticker.id === id ? { ...sticker, size } : sticker)))
  }

  const clearAllStickers = () => {
    onUpdate([])
  }

  return (
    <div
      style={{
        flex: 1,
        padding: "1.5rem",
        color: "white",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      <div>
        <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.125rem", fontWeight: "bold" }}>😀 Stickers & Emojis</h3>
      </div>

      {/* Current Stickers */}
      {stickers.length > 0 && (
        <div>
          <div
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}
          >
            <h4 style={{ margin: 0, fontSize: "0.875rem", fontWeight: "bold" }}>
              📌 CURRENT STICKERS ({stickers.length})
            </h4>
            <button
              onClick={clearAllStickers}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.25rem 0.5rem",
                borderRadius: "0.25rem",
                border: "none",
                background: "rgba(239, 68, 68, 0.2)",
                color: "rgba(239, 68, 68, 0.8)",
                cursor: "pointer",
                fontSize: "0.75rem",
              }}
            >
              <Trash2 size={12} />
              Clear All
            </button>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "150px", overflowY: "auto" }}
          >
            {stickers.map((sticker) => (
              <div
                key={sticker.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.5rem",
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "0.5rem",
                }}
              >
                <div style={{ fontSize: `${sticker.size * 0.6}px` }}>{sticker.emoji}</div>
                <div style={{ flex: 1, fontSize: "0.75rem" }}>
                  <div>Size: {sticker.size}px</div>
                  <input
                    type="range"
                    min="20"
                    max="80"
                    value={sticker.size}
                    onChange={(e) => updateStickerSize(sticker.id, Number(e.target.value))}
                    style={{ width: "100%", cursor: "pointer" }}
                  />
                </div>
                <button
                  onClick={() => removeSticker(sticker.id)}
                  style={{
                    padding: "0.25rem",
                    borderRadius: "0.25rem",
                    border: "none",
                    background: "rgba(239, 68, 68, 0.2)",
                    color: "rgba(239, 68, 68, 0.8)",
                    cursor: "pointer",
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div>
        <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.875rem", fontWeight: "bold" }}>🎨 CATEGORIES</h4>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
          {Object.entries(stickerCategories).map(([id, category]) => (
            <button
              key={id}
              onClick={() => setSelectedCategory(id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.5rem 0.75rem",
                borderRadius: "1rem",
                border: "none",
                background: selectedCategory === id ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.1)",
                color: selectedCategory === id ? "#10B981" : "rgba(255,255,255,0.8)",
                cursor: "pointer",
                fontSize: "0.75rem",
                fontWeight: 500,
                transition: "all 0.3s ease",
              }}
            >
              {typeof category.icon === "string" ? category.icon : category.icon}
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Emoji Grid */}
      <div>
        <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.875rem", fontWeight: "bold" }}>
          {stickerCategories[selectedCategory as keyof typeof stickerCategories]?.name.toUpperCase()}
        </h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: "0.5rem",
            maxHeight: "300px",
            overflowY: "auto",
            padding: "0.5rem",
            background: "rgba(255,255,255,0.05)",
            borderRadius: "0.5rem",
          }}
        >
          {stickerCategories[selectedCategory as keyof typeof stickerCategories]?.emojis.map((emoji, index) => (
            <button
              key={index}
              onClick={() => addSticker(emoji)}
              style={{
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "rgba(255,255,255,0.1)",
                cursor: "pointer",
                fontSize: "1.5rem",
                transition: "all 0.3s ease",
                aspectRatio: "1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.2)"
                e.currentTarget.style.transform = "scale(1.1)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)"
                e.currentTarget.style.transform = "scale(1)"
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div
        style={{
          background: "rgba(59, 130, 246, 0.1)",
          border: "1px solid rgba(59, 130, 246, 0.3)",
          borderRadius: "0.5rem",
          padding: "1rem",
          fontSize: "0.75rem",
          opacity: 0.9,
        }}
      >
        <h5 style={{ margin: "0 0 0.5rem 0", fontWeight: "bold" }}>💡 How to use:</h5>
        <ul style={{ margin: 0, paddingLeft: "1rem" }}>
          <li>Click any emoji to add it to your postcard</li>
          <li>Stickers appear at random positions</li>
          <li>Adjust size using the slider</li>
          <li>Remove individual stickers or clear all</li>
        </ul>
      </div>
    </div>
  )
}
