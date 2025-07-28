"use client"

import { useEffect } from "react"

interface SmartThemeSelectorProps {
  locationCategory: string
  locationTypes: string[]
  onThemeSelected: (theme: any) => void
}

const themes = {
  urban: {
    name: "Urban Style",
    colors: {
      primary: "#4F46E5",
      secondary: "#7C3AED",
      accent: "#06B6D4",
    },
    fonts: {
      heading: "Inter, sans-serif",
      body: "Inter, sans-serif",
    },
    filters: "contrast(1.1) saturate(1.2)",
  },
  beach: {
    name: "Beach Vibes",
    colors: {
      primary: "#0EA5E9",
      secondary: "#F59E0B",
      accent: "#10B981",
    },
    fonts: {
      heading: "Poppins, sans-serif",
      body: "Poppins, sans-serif",
    },
    filters: "brightness(1.1) saturate(1.3) hue-rotate(10deg)",
  },
  nature: {
    name: "Nature Escape",
    colors: {
      primary: "#059669",
      secondary: "#DC2626",
      accent: "#F59E0B",
    },
    fonts: {
      heading: "Merriweather, serif",
      body: "Open Sans, sans-serif",
    },
    filters: "saturate(1.4) contrast(1.1)",
  },
  restaurant: {
    name: "Foodie",
    colors: {
      primary: "#DC2626",
      secondary: "#F59E0B",
      accent: "#059669",
    },
    fonts: {
      heading: "Playfair Display, serif",
      body: "Lato, sans-serif",
    },
    filters: "warmth(1.2) saturate(1.3)",
  },
  tourist: {
    name: "Adventure",
    colors: {
      primary: "#7C2D12",
      secondary: "#EA580C",
      accent: "#0EA5E9",
    },
    fonts: {
      heading: "Montserrat, sans-serif",
      body: "Source Sans Pro, sans-serif",
    },
    filters: "contrast(1.2) brightness(1.05)",
  },
}

export function SmartThemeSelector({ locationCategory, locationTypes, onThemeSelected }: SmartThemeSelectorProps) {
  useEffect(() => {
    // Auto-select theme based on location category
    const selectedTheme = themes[locationCategory as keyof typeof themes] || themes.urban
    onThemeSelected(selectedTheme)
  }, [locationCategory, locationTypes, onThemeSelected])

  // This component is invisible - it just provides theme data
  return null
}
