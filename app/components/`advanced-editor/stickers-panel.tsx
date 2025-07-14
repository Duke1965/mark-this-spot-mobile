"use client"

import { useState } from "react"
import { Search, Heart, Smile, Sun, Coffee, Car } from "lucide-react"

interface StickersPanelProps {
  onStickerSelect: (emoji: string) => void
}

export function StickersPanel({ onStickerSelect }: StickersPanelProps) {
  const [activeCategory, setActiveCategory] = useState("faces")
  const [searchTerm, setSearchTerm] = useState("")
  const [stickerSize, setStickerSize] = useState(50)

  const stickerCategories = {
    faces: {
      icon: <Smile size={16} />,
      name: "Faces",
      emojis: [
        "😀",
        "😃",
        "😄",
        "😁",
        "😆",
        "😅",
        "🤣",
        "😂",
        "🙂",
        "🙃",
        "😉",
        "😊",
        "😇",
        "🥰",
        "😍",
        "🤩",
        "😘",
        "😗",
        "😚",
        "😙",
        "😋",
        "😛",
        "😜",
        "🤪",
        "😝",
        "🤑",
        "🤗",
        "🤭",
        "🤫",
        "🤔",
        "🤐",
        "🤨",
        "😐",
        "😑",
        "😶",
        "😏",
        "😒",
        "🙄",
        "😬",
        "🤥",
        "😔",
        "😪",
        "🤤",
        "😴",
        "😷",
        "🤒",
        "🤕",
        "🤢",
        "🤮",
        "🤧",
        "🥵",
        "🥶",
        "🥴",
        "😵",
        "🤯",
        "🤠",
        "🥳",
        "😎",
        "🤓",
        "🧐",
      ],
    },
    hearts: {
      icon: <Heart size={16} />,
      name: "Hearts",
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
        "💌",
        "💋",
        "💍",
        "💎",
        "🌹",
        "🌺",
        "🌻",
        "🌷",
        "🌸",
        "💐",
        "🎀",
        "🎁",
        "🍫",
        "🍰",
        "🧁",
        "🍭",
        "🍬",
        "🍯",
        "🥰",
        "😍",
      ],
    },
    nature: {
      icon: <Sun size={16} />,
      name: "Nature",
      emojis: [
        "🌞",
        "🌝",
        "🌛",
        "🌜",
        "🌚",
        "🌕",
        "🌖",
        "🌗",
        "🌘",
        "🌑",
        "🌒",
        "🌓",
        "🌔",
        "🌙",
        "🌟",
        "⭐",
        "🌠",
        "☀️",
        "⛅",
        "⛈️",
        "🌤️",
        "🌦️",
        "🌧️",
        "⛈️",
        "🌩️",
        "🌨️",
        "❄️",
        "☃️",
        "⛄",
        "🌬️",
        "💨",
        "🌪️",
        "🌈",
        "☔",
        "💧",
        "💦",
        "🌊",
        "🔥",
        "💥",
        "⚡",
      ],
    },
    animals: {
      icon: <span style={{ fontSize: "16px" }}>🐶</span>,
      name: "Animals",
      emojis: [
        "🐶",
        "🐱",
        "🐭",
        "🐹",
        "🐰",
        "🦊",
        "🐻",
        "🐼",
        "🐨",
        "🐯",
        "🦁",
        "🐮",
        "🐷",
        "🐽",
        "🐸",
        "🐵",
        "🙈",
        "🙉",
        "🙊",
        "🐒",
        "🐔",
        "🐧",
        "🐦",
        "🐤",
        "🐣",
        "🐥",
        "🦆",
        "🦅",
        "🦉",
        "🦇",
        "🐺",
        "🐗",
        "🐴",
        "🦄",
        "🐝",
        "🐛",
        "🦋",
        "🐌",
        "🐞",
        "🐜",
      ],
    },
    food: {
      icon: <Coffee size={16} />,
      name: "Food",
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
      ],
    },
    objects: {
      icon: <Car size={16} />,
      name: "Objects",
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
        "🤼",
        "🤸",
        "⛹️",
        "🤺",
      ],
    },
  }

  const filteredEmojis = searchTerm
    ? Object.values(stickerCategories)
        .flatMap((cat) => cat.emojis)
        .filter((emoji) =>
          // Simple search - you could enhance this with emoji names
          emoji.includes(searchTerm),
        )
    : stickerCategories[activeCategory as keyof typeof stickerCategories]?.emojis || []

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.1)",
        padding: "1rem",
        borderRadius: "1rem",
        backdropFilter: "blur(10px)",
      }}
    >
      <h3 style={{ color: "white", margin: "0 0 1rem 0" }}>Stickers</h3>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: "1rem" }}>
        <Search
          size={16}
          style={{
            position: "absolute",
            left: "0.75rem",
            top: "50%",
            transform: "translateY(-50%)",
            color: "rgba(255,255,255,0.7)",
          }}
        />
        <input
          type="text"
          placeholder="Search stickers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            padding: "0.5rem 0.5rem 0.5rem 2.5rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            fontSize: "0.8rem",
          }}
        />
      </div>

      {/* Size Control */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ color: "white", fontSize: "0.8rem", display: "block", marginBottom: "0.25rem" }}>
          Size: {stickerSize}px
        </label>
        <input
          type="range"
          min="20"
          max="100"
          value={stickerSize}
          onChange={(e) => setStickerSize(Number(e.target.value))}
          style={{ width: "100%" }}
        />
      </div>

      {/* Categories */}
      {!searchTerm && (
        <div
          style={{
            display: "flex",
            gap: "0.25rem",
            marginBottom: "1rem",
            overflowX: "auto",
          }}
        >
          {Object.entries(stickerCategories).map(([key, category]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              style={{
                padding: "0.5rem",
                borderRadius: "0.5rem",
                border: "none",
                background: activeCategory === key ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
                fontSize: "0.7rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.25rem",
                minWidth: "60px",
              }}
            >
              {category.icon}
              {category.name}
            </button>
          ))}
        </div>
      )}

      {/* Stickers Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))",
          gap: "0.5rem",
          maxHeight: "300px",
          overflowY: "auto",
        }}
      >
        {filteredEmojis.map((emoji, index) => (
          <button
            key={`${emoji}-${index}`}
            onClick={() => onStickerSelect(emoji)}
            style={{
              padding: "0.5rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              cursor: "pointer",
              fontSize: `${stickerSize * 0.6}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              aspectRatio: "1",
              transition: "transform 0.1s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.1)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)"
            }}
          >
            {emoji}
          </button>
        ))}
      </div>

      {filteredEmojis.length === 0 && searchTerm && (
        <div
          style={{
            textAlign: "center",
            color: "rgba(255,255,255,0.7)",
            fontSize: "0.8rem",
            padding: "2rem",
          }}
        >
          No stickers found for "{searchTerm}"
        </div>
      )}
    </div>
  )
}
