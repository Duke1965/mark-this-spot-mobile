"use client"

import { useState, useCallback } from "react"
import { ArrowLeft, Search } from "lucide-react"

interface Sticker {
  id: string
  emoji: string
  category: string
  name: string
}

interface StickersPanelProps {
  onStickersChange: (stickers: any[]) => void
  currentStickers: any[]
  onBack: () => void
}

export function StickersPanel({ onStickersChange, currentStickers, onBack }: StickersPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [placedStickers, setPlacedStickers] = useState<any[]>(currentStickers)

  const categories = [
    { id: "all", name: "All", icon: "🎯" },
    { id: "faces", name: "Faces", icon: "😊" },
    { id: "hearts", name: "Hearts", icon: "❤️" },
    { id: "nature", name: "Nature", icon: "🌿" },
    { id: "food", name: "Food", icon: "🍕" },
    { id: "travel", name: "Travel", icon: "✈️" },
    { id: "activities", name: "Fun", icon: "🎉" },
    { id: "objects", name: "Objects", icon: "📱" },
  ]

  const stickers: Sticker[] = [
    // Faces
    { id: "1", emoji: "😊", category: "faces", name: "Happy" },
    { id: "2", emoji: "😍", category: "faces", name: "Love Eyes" },
    { id: "3", emoji: "🤩", category: "faces", name: "Star Eyes" },
    { id: "4", emoji: "😎", category: "faces", name: "Cool" },
    { id: "5", emoji: "🥳", category: "faces", name: "Party" },
    { id: "6", emoji: "😂", category: "faces", name: "Laughing" },
    { id: "7", emoji: "🤔", category: "faces", name: "Thinking" },
    { id: "8", emoji: "😴", category: "faces", name: "Sleeping" },

    // Hearts
    { id: "9", emoji: "❤️", category: "hearts", name: "Red Heart" },
    { id: "10", emoji: "💙", category: "hearts", name: "Blue Heart" },
    { id: "11", emoji: "💚", category: "hearts", name: "Green Heart" },
    { id: "12", emoji: "💛", category: "hearts", name: "Yellow Heart" },
    { id: "13", emoji: "🧡", category: "hearts", name: "Orange Heart" },
    { id: "14", emoji: "💜", category: "hearts", name: "Purple Heart" },
    { id: "15", emoji: "🖤", category: "hearts", name: "Black Heart" },
    { id: "16", emoji: "💕", category: "hearts", name: "Two Hearts" },

    // Nature
    { id: "17", emoji: "🌟", category: "nature", name: "Star" },
    { id: "18", emoji: "⭐", category: "nature", name: "Star 2" },
    { id: "19", emoji: "🌙", category: "nature", name: "Moon" },
    { id: "20", emoji: "☀️", category: "nature", name: "Sun" },
    { id: "21", emoji: "🌈", category: "nature", name: "Rainbow" },
    { id: "22", emoji: "🌸", category: "nature", name: "Cherry Blossom" },
    { id: "23", emoji: "🌺", category: "nature", name: "Hibiscus" },
    { id: "24", emoji: "🍀", category: "nature", name: "Four Leaf Clover" },

    // Food
    { id: "25", emoji: "🍕", category: "food", name: "Pizza" },
    { id: "26", emoji: "🍔", category: "food", name: "Burger" },
    { id: "27", emoji: "🍟", category: "food", name: "Fries" },
    { id: "28", emoji: "🍦", category: "food", name: "Ice Cream" },
    { id: "29", emoji: "🍰", category: "food", name: "Cake" },
    { id: "30", emoji: "🍩", category: "food", name: "Donut" },
    { id: "31", emoji: "☕", category: "food", name: "Coffee" },
    { id: "32", emoji: "🥤", category: "food", name: "Drink" },

    // Travel
    { id: "33", emoji: "✈️", category: "travel", name: "Airplane" },
    { id: "34", emoji: "🚗", category: "travel", name: "Car" },
    { id: "35", emoji: "🏖️", category: "travel", name: "Beach" },
    { id: "36", emoji: "🏔️", category: "travel", name: "Mountain" },
    { id: "37", emoji: "🗽", category: "travel", name: "Statue of Liberty" },
    { id: "38", emoji: "🎡", category: "travel", name: "Ferris Wheel" },
    { id: "39", emoji: "🏰", category: "travel", name: "Castle" },
    { id: "40", emoji: "📍", category: "travel", name: "Pin" },

    // Activities
    { id: "41", emoji: "🎉", category: "activities", name: "Party" },
    { id: "42", emoji: "🎊", category: "activities", name: "Confetti" },
    { id: "43", emoji: "🎈", category: "activities", name: "Balloon" },
    { id: "44", emoji: "🎁", category: "activities", name: "Gift" },
    { id: "45", emoji: "🎵", category: "activities", name: "Music" },
    { id: "46", emoji: "⚽", category: "activities", name: "Soccer" },
    { id: "47", emoji: "🏀", category: "activities", name: "Basketball" },
    { id: "48", emoji: "🎮", category: "activities", name: "Gaming" },

    // Objects
    { id: "49", emoji: "📱", category: "objects", name: "Phone" },
    { id: "50", emoji: "💎", category: "objects", name: "Diamond" },
    { id: "51", emoji: "👑", category: "objects", name: "Crown" },
    { id: "52", emoji: "🔥", category: "objects", name: "Fire" },
    { id: "53", emoji: "💫", category: "objects", name: "Sparkles" },
    { id: "54", emoji: "⚡", category: "objects", name: "Lightning" },
    { id: "55", emoji: "💰", category: "objects", name: "Money" },
    { id: "56", emoji: "🎯", category: "objects", name: "Target" },
  ]

  const filteredStickers = stickers.filter((sticker) => {
    const matchesCategory = selectedCategory === "all" || sticker.category === selectedCategory
    const matchesSearch =
      sticker.name.toLowerCase().includes(searchTerm.toLowerCase()) || sticker.emoji.includes(searchTerm)
    return matchesCategory && matchesSearch
  })

  const addSticker = useCallback(
    (sticker: Sticker) => {
      const newSticker = {
        id: `${sticker.id}-${Date.now()}`,
        emoji: sticker.emoji,
        name: sticker.name,
        x: Math.random() * 300 + 50, // Random position
        y: Math.random() * 200 + 50,
        size: 48,
        rotation: 0,
      }

      const updatedStickers = [...placedStickers, newSticker]
      setPlacedStickers(updatedStickers)
      onStickersChange(updatedStickers)
    },
    [placedStickers, onStickersChange],
  )

  const removeSticker = useCallback(
    (stickerId: string) => {
      const updatedStickers = placedStickers.filter((s) => s.id !== stickerId)
      setPlacedStickers(updatedStickers)
      onStickersChange(updatedStickers)
    },
    [placedStickers, onStickersChange],
  )

  const clearAllStickers = useCallback(() => {
    setPlacedStickers([])
    onStickersChange([])
  }, [onStickersChange])

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "#1a202c",
        color: "white",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem",
          background: "rgba(0,0,0,0.5)",
        }}
      >
        <button
          onClick={onBack}
          style={{
            padding: "0.5rem",
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={20} />
        </button>

        <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: "bold" }}>Stickers & Emojis</h2>

        {placedStickers.length > 0 && (
          <button
            onClick={clearAllStickers}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#EF4444",
              color: "white",
              cursor: "pointer",
              fontSize: "0.75rem",
              fontWeight: "bold",
            }}
          >
            Clear All
          </button>
        )}
      </div>

      {/* Search */}
      <div style={{ padding: "1rem", background: "rgba(0,0,0,0.3)" }}>
        <div style={{ position: "relative" }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              opacity: 0.5,
            }}
          />
          <input
            type="text"
            placeholder="Search stickers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem 0.75rem 0.75rem 2.5rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.1)",
              color: "white",
              fontSize: "0.875rem",
            }}
          />
        </div>
      </div>

      {/* Categories */}
      <div
        style={{
          padding: "0 1rem 1rem 1rem",
          background: "rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            overflowX: "auto",
            paddingBottom: "0.5rem",
          }}
        >
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                borderRadius: "1rem",
                border: "none",
                background: selectedCategory === category.id ? "#3B82F6" : "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                fontSize: "0.75rem",
                fontWeight: "bold",
                whiteSpace: "nowrap",
                transition: "all 0.3s ease",
              }}
            >
              <span>{category.icon}</span>
              <span>{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Placed Stickers Preview */}
      {placedStickers.length > 0 && (
        <div
          style={{
            padding: "1rem",
            background: "rgba(0,0,0,0.3)",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <h3 style={{ margin: "0 0 0.75rem 0", fontSize: "0.875rem", fontWeight: "bold" }}>
            Placed Stickers ({placedStickers.length})
          </h3>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {placedStickers.map((sticker) => (
              <div
                key={sticker.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem",
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "0.5rem",
                  fontSize: "0.75rem",
                }}
              >
                <span style={{ fontSize: "1.25rem" }}>{sticker.emoji}</span>
                <span>{sticker.name}</span>
                <button
                  onClick={() => removeSticker(sticker.id)}
                  style={{
                    padding: "0.25rem",
                    borderRadius: "50%",
                    border: "none",
                    background: "#EF4444",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    width: "20px",
                    height: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stickers Grid */}
      <div
        style={{
          flex: 1,
          padding: "1rem",
          overflowY: "auto",
        }}
      >
        {filteredStickers.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "200px",
              opacity: 0.6,
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔍</div>
            <p style={{ margin: 0, textAlign: "center" }}>
              {searchTerm ? `No stickers found for "${searchTerm}"` : "No stickers in this category"}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
              gap: "1rem",
            }}
          >
            {filteredStickers.map((sticker) => (
              <button
                key={sticker.id}
                onClick={() => addSticker(sticker)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "1rem 0.5rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background: "rgba(255,255,255,0.05)",
                  color: "white",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)"
                  e.currentTarget.style.transform = "scale(1.05)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)"
                  e.currentTarget.style.transform = "scale(1)"
                }}
              >
                <div style={{ fontSize: "2rem" }}>{sticker.emoji}</div>
                <div style={{ fontSize: "0.75rem", textAlign: "center", opacity: 0.8 }}>{sticker.name}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tips */}
      <div
        style={{
          padding: "1rem",
          background: "rgba(245, 158, 11, 0.1)",
          border: "1px solid rgba(245, 158, 11, 0.3)",
          borderRadius: "0.75rem",
          margin: "1rem",
        }}
      >
        <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.875rem", fontWeight: "bold", color: "#FBBF24" }}>
          💡 Sticker Tips
        </h4>
        <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.75rem", opacity: 0.9, lineHeight: "1.4" }}>
          <li>Tap any sticker to add it to your image</li>
          <li>Added stickers appear randomly positioned</li>
          <li>Use search to quickly find specific emojis</li>
          <li>Clear all stickers to start fresh</li>
        </ul>
      </div>
    </div>
  )
}
