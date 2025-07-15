"use client"

import { useState } from "react"
import { MapPin, Camera, Heart, Star, Coffee, Mountain, Building, Plane, Car, Music } from "lucide-react"

interface CategorySelectorProps {
  onCategorySelect: (category: string) => void
  selectedCategory?: string
}

const categories = [
  { id: "travel", name: "Travel", icon: Plane, color: "#3B82F6", emoji: "✈️" },
  { id: "food", name: "Food", icon: Coffee, color: "#F59E0B", emoji: "🍕" },
  { id: "nature", name: "Nature", icon: Mountain, color: "#10B981", emoji: "🌲" },
  { id: "city", name: "City", icon: Building, color: "#6B7280", emoji: "🏙️" },
  { id: "adventure", name: "Adventure", icon: Car, color: "#EF4444", emoji: "🚗" },
  { id: "culture", name: "Culture", icon: Music, color: "#8B5CF6", emoji: "🎭" },
  { id: "romantic", name: "Romantic", icon: Heart, color: "#EC4899", emoji: "💕" },
  { id: "memorable", name: "Memorable", icon: Star, color: "#F59E0B", emoji: "⭐" },
  { id: "scenic", name: "Scenic", icon: MapPin, color: "#06B6D4", emoji: "🏞️" },
  { id: "fun", name: "Fun", icon: Camera, color: "#84CC16", emoji: "🎉" },
]

export function CategorySelector({ onCategorySelect, selectedCategory }: CategorySelectorProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        padding: "2rem 1rem",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "3rem", color: "white" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📍</div>
        <h1 style={{ fontSize: "2rem", fontWeight: "bold", margin: "0 0 0.5rem 0" }}>What's Your Vibe?</h1>
        <p style={{ fontSize: "1.125rem", opacity: 0.9, margin: 0 }}>Choose a category that matches your moment</p>
      </div>

      {/* Categories Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "1.5rem",
          maxWidth: "600px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        {categories.map((category) => {
          const Icon = category.icon
          const isSelected = selectedCategory === category.id
          const isHovered = hoveredCategory === category.id

          return (
            <button
              key={category.id}
              onClick={() => onCategorySelect(category.id)}
              onMouseEnter={() => setHoveredCategory(category.id)}
              onMouseLeave={() => setHoveredCategory(null)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1rem",
                padding: "1.5rem 1rem",
                borderRadius: "1.5rem",
                border: "none",
                background: isSelected
                  ? "rgba(255, 255, 255, 0.95)"
                  : isHovered
                    ? "rgba(255, 255, 255, 0.2)"
                    : "rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(10px)",
                color: isSelected ? category.color : "white",
                cursor: "pointer",
                transition: "all 0.3s ease",
                transform: isSelected ? "scale(1.05)" : isHovered ? "scale(1.02)" : "scale(1)",
                boxShadow: isSelected
                  ? `0 20px 40px rgba(0, 0, 0, 0.2), 0 0 0 3px ${category.color}40`
                  : isHovered
                    ? "0 10px 30px rgba(0, 0, 0, 0.15)"
                    : "0 5px 15px rgba(0, 0, 0, 0.1)",
                minHeight: "120px",
                justifyContent: "center",
              }}
            >
              {/* Emoji */}
              <div
                style={{
                  fontSize: "2rem",
                  marginBottom: "0.25rem",
                  filter: isSelected ? "none" : "grayscale(0.3)",
                  transition: "all 0.3s ease",
                }}
              >
                {category.emoji}
              </div>

              {/* Icon */}
              <Icon
                size={24}
                style={{
                  transition: "all 0.3s ease",
                  opacity: isSelected ? 1 : 0.8,
                }}
              />

              {/* Name */}
              <span
                style={{
                  fontSize: "0.875rem",
                  fontWeight: isSelected ? "bold" : "600",
                  textAlign: "center",
                  transition: "all 0.3s ease",
                }}
              >
                {category.name}
              </span>

              {/* Selection indicator */}
              {isSelected && (
                <div
                  style={{
                    position: "absolute",
                    top: "0.75rem",
                    right: "0.75rem",
                    width: "1.5rem",
                    height: "1.5rem",
                    borderRadius: "50%",
                    background: category.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "0.75rem",
                    fontWeight: "bold",
                  }}
                >
                  ✓
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Continue Button */}
      {selectedCategory && (
        <div
          style={{
            position: "fixed",
            bottom: "2rem",
            left: "1rem",
            right: "1rem",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <button
            onClick={() => {
              const selected = categories.find((cat) => cat.id === selectedCategory)
              if (selected) {
                console.log(`📂 Category selected: ${selected.name}`)
                // This would typically navigate to the next step
                // For now, we'll just log the selection
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "1rem 2rem",
              borderRadius: "2rem",
              border: "none",
              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              color: "white",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "1.125rem",
              boxShadow: "0 10px 30px rgba(16, 185, 129, 0.4)",
              transition: "all 0.3s ease",
              minWidth: "200px",
              justifyContent: "center",
            }}
          >
            <span>Continue</span>
            <div style={{ fontSize: "1.25rem" }}>→</div>
          </button>
        </div>
      )}

      {/* Background Pattern */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.1,
          pointerEvents: "none",
          background: `
            radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 60%, rgba(255, 255, 255, 0.05) 0%, transparent 50%)
          `,
        }}
      />
    </div>
  )
}
