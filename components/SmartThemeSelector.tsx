"use client"

import { useState, useCallback, useEffect } from "react"

interface ThemeConfig {
  id: string
  name: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
  }
  fonts: {
    heading: string
    body: string
  }
  filters: string[]
  emoji: string
}

const LOCATION_THEMES: Record<string, ThemeConfig> = {
  beach: {
    id: "beach",
    name: "Beach Vibes",
    colors: {
      primary: "#0EA5E9",
      secondary: "#F59E0B",
      accent: "#FBBF24",
      background: "linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)",
    },
    fonts: {
      heading: "Poppins",
      body: "Inter",
    },
    filters: ["brightness(1.1)", "saturate(1.2)", "contrast(1.05)"],
    emoji: "🏖️",
  },
  nature: {
    id: "nature",
    name: "Nature Escape",
    colors: {
      primary: "#10B981",
      secondary: "#059669",
      accent: "#34D399",
      background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
    },
    fonts: {
      heading: "Montserrat",
      body: "Source Sans Pro",
    },
    filters: ["saturate(1.3)", "contrast(1.1)", "brightness(1.05)"],
    emoji: "🌲",
  },
  city: {
    id: "city",
    name: "Urban Style",
    colors: {
      primary: "#6366F1",
      secondary: "#4F46E5",
      accent: "#8B5CF6",
      background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
    },
    fonts: {
      heading: "Roboto",
      body: "Open Sans",
    },
    filters: ["contrast(1.15)", "saturate(0.9)", "brightness(0.95)"],
    emoji: "🏙️",
  },
  food: {
    id: "food",
    name: "Foodie",
    colors: {
      primary: "#EF4444",
      secondary: "#DC2626",
      accent: "#F87171",
      background: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
    },
    fonts: {
      heading: "Playfair Display",
      body: "Lato",
    },
    filters: ["saturate(1.4)", "warmth(1.1)", "brightness(1.1)"],
    emoji: "🍽️",
  },
  adventure: {
    id: "adventure",
    name: "Adventure",
    colors: {
      primary: "#F59E0B",
      secondary: "#D97706",
      accent: "#FBBF24",
      background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
    },
    fonts: {
      heading: "Oswald",
      body: "Nunito",
    },
    filters: ["contrast(1.2)", "saturate(1.1)", "brightness(1.05)"],
    emoji: "⛰️",
  },
}

interface SmartThemeSelectorProps {
  locationCategory: string
  locationTypes: string[]
  onThemeSelected: (theme: ThemeConfig) => void
  allowOverride?: boolean
}

export function SmartThemeSelector({
  locationCategory,
  locationTypes,
  onThemeSelected,
  allowOverride = true,
}: SmartThemeSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState<ThemeConfig | null>(null)
  const [showOverride, setShowOverride] = useState(false)

  const detectTheme = useCallback(() => {
    // Smart theme detection based on location
    if (locationTypes.includes("natural_feature") || locationTypes.includes("park")) {
      return LOCATION_THEMES.nature
    }

    if (
      locationTypes.includes("restaurant") ||
      locationTypes.includes("food") ||
      locationTypes.includes("meal_takeaway")
    ) {
      return LOCATION_THEMES.food
    }

    if (locationCategory.includes("beach") || locationTypes.includes("beach")) {
      return LOCATION_THEMES.beach
    }

    if (
      locationTypes.includes("locality") ||
      locationTypes.includes("sublocality") ||
      locationCategory.includes("city")
    ) {
      return LOCATION_THEMES.city
    }

    if (locationTypes.includes("tourist_attraction") || locationCategory.includes("adventure")) {
      return LOCATION_THEMES.adventure
    }

    // Default to nature theme
    return LOCATION_THEMES.nature
  }, [locationCategory, locationTypes])

  useEffect(() => {
    const autoTheme = detectTheme()
    setSelectedTheme(autoTheme)
    onThemeSelected(autoTheme)
  }, [detectTheme, onThemeSelected])

  const handleThemeChange = useCallback(
    (theme: ThemeConfig) => {
      setSelectedTheme(theme)
      onThemeSelected(theme)
      setShowOverride(false)
    },
    [onThemeSelected],
  )

  if (!selectedTheme) return null

  return (
    <div
      style={{
        position: "absolute",
        top: "1rem",
        left: "1rem",
        zIndex: 20,
        background: "rgba(0,0,0,0.8)",
        borderRadius: "0.75rem",
        padding: "0.75rem",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.2)",
      }}
    >
      {!showOverride ? (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: selectedTheme.colors.background,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1rem",
            }}
          >
            {selectedTheme.emoji}
          </div>

          <div>
            <div style={{ color: "white", fontSize: "0.875rem", fontWeight: "bold" }}>{selectedTheme.name}</div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.75rem" }}>Auto-selected</div>
          </div>

          {allowOverride && (
            <button
              onClick={() => setShowOverride(true)}
              style={{
                padding: "0.25rem 0.5rem",
                borderRadius: "0.25rem",
                border: "1px solid rgba(255,255,255,0.3)",
                background: "transparent",
                color: "white",
                cursor: "pointer",
                fontSize: "0.75rem",
              }}
            >
              Change
            </button>
          )}
        </div>
      ) : (
        <div>
          <div
            style={{
              color: "white",
              fontSize: "0.875rem",
              fontWeight: "bold",
              marginBottom: "0.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            Choose Theme
            <button
              onClick={() => setShowOverride(false)}
              style={{
                padding: "0.25rem",
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
                borderRadius: "0.25rem",
                fontSize: "0.75rem",
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem" }}>
            {Object.values(LOCATION_THEMES).map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme)}
                style={{
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  border: selectedTheme.id === theme.id ? "2px solid #10B981" : "2px solid transparent",
                  background: theme.colors.background,
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  minWidth: "120px",
                }}
              >
                <span>{theme.emoji}</span>
                <span>{theme.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
