"use client"

import { useEffect, useState } from "react"

interface SmartThemeSelectorProps {
  locationCategory: string
  locationTypes: string[]
  onThemeSelected: (theme: any) => void
}

interface Theme {
  name: string
  colors: {
    primary: string
    secondary: string
    accent: string
  }
  emoji: string
}

const THEMES: Record<string, Theme> = {
  beach: {
    name: "Beach Vibes",
    colors: {
      primary: "#0EA5E9",
      secondary: "#38BDF8",
      accent: "#FDE047",
    },
    emoji: "🏖️",
  },
  urban: {
    name: "Urban Style",
    colors: {
      primary: "#6366F1",
      secondary: "#8B5CF6",
      accent: "#EC4899",
    },
    emoji: "🏙️",
  },
  nature: {
    name: "Nature Escape",
    colors: {
      primary: "#10B981",
      secondary: "#34D399",
      accent: "#FCD34D",
    },
    emoji: "🌲",
  },
}

export function SmartThemeSelector({ locationCategory, locationTypes, onThemeSelected }: SmartThemeSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null)
  const [showSelector, setShowSelector] = useState(false)

  useEffect(() => {
    // Auto-select theme based on location
    const theme = THEMES[locationCategory] || THEMES.nature
    setSelectedTheme(theme)
    onThemeSelected(theme)
  }, [locationCategory, onThemeSelected])

  if (!selectedTheme) return null

  return (
    <div
      style={{
        position: "absolute",
        top: "1rem",
        left: "1rem",
        zIndex: 10,
      }}
    >
      <div
        style={{
          background: "rgba(0,0,0,0.7)",
          borderRadius: "12px",
          padding: "0.75rem 1rem",
          backdropFilter: "blur(10px)",
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          cursor: "pointer",
        }}
        onClick={() => setShowSelector(!showSelector)}
      >
        <span style={{ fontSize: "1.25rem" }}>{selectedTheme.emoji}</span>
        <div>
          <div style={{ fontSize: "0.875rem", fontWeight: "bold" }}>{selectedTheme.name}</div>
          <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>Auto-selected</div>
        </div>
        <button
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            borderRadius: "6px",
            padding: "0.25rem 0.5rem",
            color: "white",
            fontSize: "0.75rem",
            cursor: "pointer",
          }}
        >
          Change
        </button>
      </div>

      {showSelector && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: "0.5rem",
            background: "rgba(0,0,0,0.8)",
            borderRadius: "12px",
            padding: "1rem",
            backdropFilter: "blur(10px)",
            minWidth: "200px",
          }}
        >
          {Object.entries(THEMES).map(([key, theme]) => (
            <div
              key={key}
              style={{
                padding: "0.5rem",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "white",
                background: selectedTheme.name === theme.name ? "rgba(255,255,255,0.2)" : "transparent",
              }}
              onClick={() => {
                setSelectedTheme(theme)
                onThemeSelected(theme)
                setShowSelector(false)
              }}
            >
              <span style={{ fontSize: "1.25rem" }}>{theme.emoji}</span>
              <div>
                <div style={{ fontSize: "0.875rem", fontWeight: "bold" }}>{theme.name}</div>
                <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>
                  {key === locationCategory ? "Recommended" : "Available"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
