"use client"

import { Palette, Sparkles, Smile, Video, Download } from "lucide-react"

interface EditorWelcomeProps {
  onToolSelect: (tool: string) => void
  mediaType: "photo" | "video"
  locationName: string
}

export function EditorWelcome({ onToolSelect, mediaType, locationName }: EditorWelcomeProps) {
  const tools = [
    {
      id: "canvas",
      name: "Design Canvas",
      description: "Add text, choose colors, and select templates",
      icon: <Palette size={24} />,
      color: "#3B82F6",
    },
    {
      id: "effects",
      name: "Photo Effects",
      description: "Adjust brightness, contrast, and apply filters",
      icon: <Sparkles size={24} />,
      color: "#8B5CF6",
    },
    {
      id: "stickers",
      name: "Stickers & Emojis",
      description: "Add fun stickers and emojis to your content",
      icon: <Smile size={24} />,
      color: "#F59E0B",
    },
    ...(mediaType === "video"
      ? [
          {
            id: "video",
            name: "Video Editor",
            description: "Trim video and select the perfect frame",
            icon: <Video size={24} />,
            color: "#EF4444",
          },
        ]
      : []),
    {
      id: "export",
      name: "Export & Share",
      description: "Generate and share your creation",
      icon: <Download size={24} />,
      color: "#10B981",
    },
  ]

  return (
    <div
      style={{
        flex: 1,
        padding: "2rem",
        color: "white",
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
        overflowY: "auto",
      }}
    >
      {/* Welcome Header */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎨</div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: "0 0 0.5rem 0" }}>Advanced Editor</h2>
        <p style={{ fontSize: "0.875rem", opacity: 0.8, margin: 0 }}>
          Create stunning social media content for {locationName}
        </p>
      </div>

      {/* Media Type Info */}
      <div
        style={{
          background: "rgba(59, 130, 246, 0.1)",
          border: "1px solid rgba(59, 130, 246, 0.3)",
          borderRadius: "0.75rem",
          padding: "1rem",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{mediaType === "photo" ? "📸" : "🎥"}</div>
        <p style={{ fontSize: "0.875rem", margin: 0 }}>
          Working with: <strong>{mediaType === "photo" ? "Photo" : "Video"}</strong>
        </p>
      </div>

      {/* Tools Grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: "bold", margin: 0, opacity: 0.9 }}>🛠️ Available Tools</h3>

        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolSelect(tool.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              padding: "1rem",
              borderRadius: "0.75rem",
              border: "none",
              background: "rgba(255,255,255,0.1)",
              color: "white",
              cursor: "pointer",
              transition: "all 0.3s ease",
              textAlign: "left",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.15)"
              e.currentTarget.style.transform = "translateY(-2px)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)"
              e.currentTarget.style.transform = "translateY(0)"
            }}
          >
            <div
              style={{
                padding: "0.75rem",
                borderRadius: "0.5rem",
                background: tool.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {tool.icon}
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "1rem", fontWeight: "bold" }}>{tool.name}</h4>
              <p style={{ margin: 0, fontSize: "0.875rem", opacity: 0.8 }}>{tool.description}</p>
            </div>
            <div style={{ fontSize: "1.5rem", opacity: 0.6 }}>→</div>
          </button>
        ))}
      </div>

      {/* Quick Start Tips */}
      <div
        style={{
          background: "rgba(16, 185, 129, 0.1)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          borderRadius: "0.75rem",
          padding: "1rem",
        }}
      >
        <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.875rem", fontWeight: "bold" }}>💡 Quick Start Tips</h4>
        <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.75rem", opacity: 0.9 }}>
          <li>Start with the Design Canvas to add text and choose templates</li>
          <li>Use Effects to enhance your {mediaType} with filters</li>
          <li>Add personality with Stickers and Emojis</li>
          {mediaType === "video" && <li>Use Video Editor to select the perfect frame</li>}
          <li>Export when you're ready to share your creation</li>
        </ul>
      </div>
    </div>
  )
}

