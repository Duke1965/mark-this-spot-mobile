"use client"

import { ArrowLeft } from "lucide-react"

interface CategorySelectorProps {
  categories: Record<string, { name: string; emoji: string; color: string }>
  selectedCategory: string
  onCategorySelect: (category: string) => void
  onClose: () => void
}

export function CategorySelector({ categories, selectedCategory, onCategorySelect, onClose }: CategorySelectorProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1e293b 0%, #7c3aed 50%, #4f46e5 100%)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1.5rem",
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 900, color: "white", margin: 0 }}>🏷️ Choose Category</h1>
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1rem",
              background: "rgba(255,255,255,0.2)",
              backdropFilter: "blur(10px)",
              color: "white",
              borderRadius: "0.75rem",
              border: "none",
              cursor: "pointer",
              transition: "all 0.3s ease",
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={20} />
            Done
          </button>
        </div>
      </div>

      {/* Categories Grid */}
      <div style={{ flex: 1, padding: "1.5rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1rem",
            maxWidth: "800px",
            margin: "0 auto",
          }}
        >
          {Object.entries(categories).map(([key, category]) => (
            <button
              key={key}
              onClick={() => {
                onCategorySelect(key)
                onClose()
              }}
              style={{
                padding: "1.5rem",
                borderRadius: "1rem",
                border: selectedCategory === key ? "3px solid #3B82F6" : "3px solid transparent",
                background: selectedCategory === key ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
                color: "white",
                cursor: "pointer",
                transition: "all 0.3s ease",
                textAlign: "left",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                if (selectedCategory !== key) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.15)"
                  e.currentTarget.style.transform = "scale(1.02)"
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCategory !== key) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)"
                  e.currentTarget.style.transform = "scale(1)"
                }
              }}
            >
              {/* Selection indicator */}
              {selectedCategory === key && (
                <div
                  style={{
                    position: "absolute",
                    top: "1rem",
                    right: "1rem",
                    width: "2rem",
                    height: "2rem",
                    borderRadius: "50%",
                    background: "#3B82F6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "0.875rem",
                    fontWeight: "bold",
                  }}
                >
                  ✓
                </div>
              )}

              {/* Category content */}
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
                <div
                  style={{
                    fontSize: "3rem",
                    width: "4rem",
                    height: "4rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "1rem",
                    background: `${category.color}20`,
                    border: `2px solid ${category.color}40`,
                  }}
                >
                  {category.emoji}
                </div>
                <div>
                  <h3 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0, marginBottom: "0.25rem" }}>
                    {category.name}
                  </h3>
                  <div
                    style={{
                      fontSize: "0.875rem",
                      opacity: 0.8,
                      background: `${category.color}30`,
                      padding: "0.25rem 0.75rem",
                      borderRadius: "1rem",
                      display: "inline-block",
                    }}
                  >
                    {key.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Hover effect */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(135deg, ${category.color}10, transparent)`,
                  opacity: selectedCategory === key ? 1 : 0,
                  transition: "opacity 0.3s ease",
                  borderRadius: "1rem",
                  pointerEvents: "none",
                }}
              />
            </button>
          ))}
        </div>

        {/* Current selection display */}
        <div
          style={{
            marginTop: "2rem",
            textAlign: "center",
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)",
            borderRadius: "1rem",
            padding: "1rem",
            maxWidth: "400px",
            margin: "2rem auto 0 auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "2rem" }}>{categories[selectedCategory].emoji}</span>
            <div>
              <div style={{ color: "white", fontWeight: "bold", fontSize: "1.125rem" }}>
                Current: {categories[selectedCategory].name}
              </div>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem" }}>
                Your next spot will be tagged as this category
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
