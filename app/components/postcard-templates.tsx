"use client"

export const postcardTemplates = {
  classic: {
    name: "Classic Postcard",
    preview: "/placeholder.svg?height=200&width=300&text=Classic+Template",
    style: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      textColor: "#FFFFFF",
      textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
      borderRadius: "12px",
      border: "3px solid #FFFFFF",
      fontFamily: "serif",
    },
    layout: {
      titlePosition: { x: 50, y: 20 },
      locationPosition: { x: 50, y: 85 },
      datePosition: { x: 85, y: 95 },
    },
  },

  vintage: {
    name: "Vintage Travel",
    preview: "/placeholder.svg?height=200&width=300&text=Vintage+Template",
    style: {
      background: "linear-gradient(45deg, #8B4513 0%, #D2691E 50%, #F4A460 100%)",
      textColor: "#2F1B14",
      textShadow: "1px 1px 2px rgba(255,255,255,0.3)",
      borderRadius: "8px",
      border: "5px solid #8B4513",
      fontFamily: "serif",
      overlay:
        "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)",
    },
    layout: {
      titlePosition: { x: 50, y: 15 },
      locationPosition: { x: 50, y: 80 },
      datePosition: { x: 80, y: 92 },
    },
  },

  modern: {
    name: "Modern Minimal",
    preview: "/placeholder.svg?height=200&width=300&text=Modern+Template",
    style: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      textColor: "#FFFFFF",
      textShadow: "none",
      borderRadius: "16px",
      border: "1px solid rgba(255,255,255,0.2)",
      fontFamily: "sans-serif",
      backdrop: "blur(10px)",
    },
    layout: {
      titlePosition: { x: 50, y: 25 },
      locationPosition: { x: 50, y: 75 },
      datePosition: { x: 90, y: 90 },
    },
  },

  tropical: {
    name: "Tropical Paradise",
    preview: "/placeholder.svg?height=200&width=300&text=Tropical+Template",
    style: {
      background: "linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #45B7D1 100%)",
      textColor: "#FFFFFF",
      textShadow: "2px 2px 4px rgba(0,0,0,0.6)",
      borderRadius: "20px",
      border: "4px solid #FFFFFF",
      fontFamily: "sans-serif",
    },
    layout: {
      titlePosition: { x: 50, y: 18 },
      locationPosition: { x: 50, y: 82 },
      datePosition: { x: 85, y: 94 },
    },
  },

  neon: {
    name: "Neon Nights",
    preview: "/placeholder.svg?height=200&width=300&text=Neon+Template",
    style: {
      background: "linear-gradient(135deg, #0F0F23 0%, #1a1a2e 50%, #16213e 100%)",
      textColor: "#00FFFF",
      textShadow: "0 0 10px #00FFFF, 0 0 20px #00FFFF, 0 0 30px #00FFFF",
      borderRadius: "12px",
      border: "2px solid #00FFFF",
      fontFamily: "monospace",
      boxShadow: "0 0 20px rgba(0,255,255,0.3)",
    },
    layout: {
      titlePosition: { x: 50, y: 22 },
      locationPosition: { x: 50, y: 78 },
      datePosition: { x: 88, y: 92 },
    },
  },

  sunset: {
    name: "Golden Sunset",
    preview: "/placeholder.svg?height=200&width=300&text=Sunset+Template",
    style: {
      background: "linear-gradient(135deg, #FF512F 0%, #F09819 50%, #FFCC70 100%)",
      textColor: "#2C1810",
      textShadow: "1px 1px 2px rgba(255,255,255,0.4)",
      borderRadius: "15px",
      border: "3px solid #FF512F",
      fontFamily: "serif",
    },
    layout: {
      titlePosition: { x: 50, y: 20 },
      locationPosition: { x: 50, y: 80 },
      datePosition: { x: 82, y: 93 },
    },
  },

  ocean: {
    name: "Ocean Breeze",
    preview: "/placeholder.svg?height=200&width=300&text=Ocean+Template",
    style: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      textColor: "#FFFFFF",
      textShadow: "2px 2px 4px rgba(0,0,0,0.4)",
      borderRadius: "18px",
      border: "4px solid rgba(255,255,255,0.3)",
      fontFamily: "sans-serif",
    },
    layout: {
      titlePosition: { x: 50, y: 19 },
      locationPosition: { x: 50, y: 81 },
      datePosition: { x: 86, y: 94 },
    },
  },

  forest: {
    name: "Forest Adventure",
    preview: "/placeholder.svg?height=200&width=300&text=Forest+Template",
    style: {
      background: "linear-gradient(135deg, #134E5E 0%, #71B280 100%)",
      textColor: "#FFFFFF",
      textShadow: "2px 2px 4px rgba(0,0,0,0.6)",
      borderRadius: "10px",
      border: "3px solid #2D5A27",
      fontFamily: "serif",
    },
    layout: {
      titlePosition: { x: 50, y: 21 },
      locationPosition: { x: 50, y: 79 },
      datePosition: { x: 84, y: 92 },
    },
  },
}

export function PostcardTemplateSelector({
  selectedTemplate,
  onTemplateSelect,
}: {
  selectedTemplate: string
  onTemplateSelect: (templateId: string) => void
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <h4 style={{ color: "white", fontSize: "0.875rem", fontWeight: "bold", margin: 0 }}>🎨 POSTCARD TEMPLATES</h4>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "0.75rem",
          maxHeight: "200px",
          overflowY: "auto",
        }}
      >
        {Object.entries(postcardTemplates).map(([id, template]) => (
          <button
            key={id}
            onClick={() => onTemplateSelect(id)}
            style={{
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: selectedTemplate === id ? "2px solid #10B981" : "1px solid rgba(255,255,255,0.2)",
              background: selectedTemplate === id ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.1)",
              color: "white",
              cursor: "pointer",
              transition: "all 0.3s ease",
              textAlign: "left",
              fontSize: "0.75rem",
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: "0.25rem" }}>{template.name}</div>
            <div
              style={{
                width: "100%",
                height: "40px",
                borderRadius: "4px",
                background: template.style.background,
                border: "1px solid rgba(255,255,255,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.6rem",
                color: template.style.textColor,
                textShadow: template.style.textShadow,
              }}
            >
              Preview
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
