"use client"

import { useState } from "react"
import { Palette, StickerIcon as Stickers, Video, Download, Wand2, Layers } from "lucide-react"

interface EditorWelcomeProps {
  onToolSelect: (tool: "canvas" | "effects" | "stickers" | "video" | "export") => void
  mediaType: "photo" | "video"
  locationName: string
}

export function EditorWelcome({ onToolSelect, mediaType, locationName }: EditorWelcomeProps) {
  const [selectedTool, setSelectedTool] = useState<string | null>(null)

  const tools = [
    {
      id: "canvas",
      name: "Canvas Editor",
      description: "Draw, annotate, and add creative elements",
      icon: <Layers size={24} />,
      color: "#8B5CF6",
      available: true,
    },
    {
      id: "effects",
      name: "Effects & Filters",
      description: "Apply professional filters and adjustments",
      icon: <Wand2 size={24} />,
      color: "#10B981",
      available: true,
    },
    {
      id: "stickers",
      name: "Stickers & Emojis",
      description: "Add fun stickers and emoji overlays",
      icon: <Stickers size={24} />,
      color: "#F59E0B",
      available: true,
    },
    {
      id: "video",
      name: "Video Editor",
      description: "Trim, crop, and enhance your videos",
      icon: <Video size={24} />,
      color: "#EF4444",
      available: mediaType === "video",
    },
    {
      id: "export",
      name: "Export & Share",
      description: "Generate postcards and share your creations",
      icon: <Download size={24} />,
      color: "#3B82F6",
      available: true,
    },
  ]

  const handleToolClick = (toolId: string) => {
    if (tools.find((t) => t.id === toolId)?.available) {
      setSelectedTool(toolId)
      setTimeout(() => {
        onToolSelect(toolId as any)
      }, 200)
    }
  }

  return (
    <div
      style={{
        flex: 1,
        padding: "1.5rem",
        background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
        color: "white",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)",
            marginBottom: "1rem",
          }}
        >
          <Palette size={32} />
        </div>
        <h1 style={{ margin: "0 0 0.5rem 0", fontSize: "1.5rem", fontWeight: "bold" }}>Advanced Editor</h1>
        <p style={{ margin: 0, opacity: 0.8, fontSize: "0.875rem" }}>
          Enhance your {mediaType} from {locationName}
        </p>
      </div>

      {/* Tools Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1rem",
          flex: 1,
        }}
      >
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool.id)}
            disabled={!tool.available}
            style={{
              padding: "1.5rem",
              borderRadius: "1rem",
              border: "none",
              background: tool.available
                ? selectedTool === tool.id
                  ? `linear-gradient(135deg, ${tool.color}40 0%, ${tool.color}20 100%)`
                  : "rgba(255,255,255,0.05)"
                : "rgba(255,255,255,0.02)",
              color: tool.available ? "white" : "rgba(255,255,255,0.4)",
              cursor: tool.available ? "pointer" : "not-allowed",
              textAlign: "left",
              transition: "all 0.3s ease",
              transform: selectedTool === tool.id ? "scale(0.98)" : "scale(1)",
              border: selectedTool === tool.id ? `2px solid ${tool.color}` : "2px solid transparent",
            }}
            onMouseEnter={(e) => {
              if (tool.available && selectedTool !== tool.id) {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)"
                e.currentTarget.style.transform = "translateY(-2px)"
              }
            }}
            onMouseLeave={(e) => {
              if (tool.available && selectedTool !== tool.id) {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)"
                e.currentTarget.style.transform = "translateY(0)"
              }
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
              <div
                style={{
                  padding: "0.75rem",
                  borderRadius: "0.75rem",
                  background: tool.available ? `${tool.color}20` : "rgba(255,255,255,0.05)",
                  color: tool.available ? tool.color : "rgba(255,255,255,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {tool.icon}
              </div>

              <div style={{ flex: 1 }}>
                <h3
                  style={{
                    margin: "0 0 0.5rem 0",
                    fontSize: "1.125rem",
                    fontWeight: "bold",
                    color: tool.available ? "white" : "rgba(255,255,255,0.4)",
                  }}
                >
                  {tool.name}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.875rem",
                    opacity: tool.available ? 0.8 : 0.4,
                    lineHeight: "1.4",
                  }}
                >
                  {tool.description}
                </p>

                {!tool.available && (
                  <div
                    style={{
                      marginTop: "0.5rem",
                      padding: "0.25rem 0.5rem",
                      borderRadius: "0.25rem",
                      background: "rgba(239, 68, 68, 0.2)",
                      color: "#FCA5A5",
                      fontSize: "0.75rem",
                      fontWeight: "bold",
                      display: "inline-block",
                    }}
                  >
                    {mediaType === "photo" ? "Video Only" : "Not Available"}
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Quick Tips */}
      <div
        style={{
          background: "rgba(59, 130, 246, 0.1)",
          border: "1px solid rgba(59, 130, 246, 0.3)",
          borderRadius: "0.75rem",
          padding: "1rem",
        }}
      >
        <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.875rem", fontWeight: "bold", color: "#60A5FA" }}>
          💡 Pro Tips
        </h4>
        <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.75rem", opacity: 0.9, lineHeight: "1.5" }}>
          <li>Start with Effects & Filters for quick enhancements</li>
          <li>Use Canvas Editor for detailed annotations and drawings</li>
          <li>Add Stickers to make your content more engaging</li>
          <li>Export & Share creates beautiful postcards automatically</li>
          {mediaType === "video" && <li>Video Editor allows precise trimming and cropping</li>}
        </ul>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem",
          padding: "1rem",
          background: "rgba(255,255,255,0.05)",
          borderRadius: "0.75rem",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#10B981" }}>
            {tools.filter((t) => t.available).length}
          </div>
          <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>Available Tools</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#F59E0B" }}>
            {mediaType === "photo" ? "📸" : "🎥"}
          </div>
          <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>Media Type</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#8B5CF6" }}>📍</div>
          <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>Location Tagged</div>
        </div>
      </div>
    </div>
  )
}
