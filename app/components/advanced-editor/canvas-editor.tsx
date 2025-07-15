"use client"

import { Type, Palette, Move, RotateCcw } from "lucide-react"

interface CanvasEditorProps {
  projectData: any
  onUpdate: (updates: any) => void
}

export function CanvasEditor({ projectData, onUpdate }: CanvasEditorProps) {
  const templates = {
    modern: {
      name: "Modern",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      textColor: "#FFFFFF",
    },
    vintage: {
      name: "Vintage",
      background: "linear-gradient(45deg, #8B4513 0%, #D2691E 50%, #F4A460 100%)",
      textColor: "#2F1B14",
    },
    neon: {
      name: "Neon",
      background: "linear-gradient(135deg, #0F0F23 0%, #1a1a2e 50%, #16213e 100%)",
      textColor: "#00FFFF",
    },
    tropical: {
      name: "Tropical",
      background: "linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #45B7D1 100%)",
      textColor: "#FFFFFF",
    },
  }

  return (
    <div
      style={{
        flex: 1,
        padding: "1.5rem",
        color: "white",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      <div>
        <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.125rem", fontWeight: "bold" }}>🎨 Canvas Design</h3>
      </div>

      {/* Text Controls */}
      <div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <Type size={16} />
          Text Message
        </label>
        <textarea
          value={projectData.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          placeholder="Enter your message..."
          rows={3}
          style={{
            width: "100%",
            padding: "0.75rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "rgba(255,255,255,0.1)",
            color: "white",
            fontSize: "0.875rem",
            outline: "none",
            resize: "none",
          }}
        />
      </div>

      {/* Text Color */}
      <div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <Palette size={16} />
          Text Color
        </label>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            type="color"
            value={projectData.textColor}
            onChange={(e) => onUpdate({ textColor: e.target.value })}
            style={{
              width: "3rem",
              height: "2rem",
              borderRadius: "0.25rem",
              border: "none",
              cursor: "pointer",
            }}
          />
          <span style={{ fontSize: "0.875rem", opacity: 0.8 }}>{projectData.textColor}</span>
        </div>
      </div>

      {/* Text Size */}
      <div>
        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
          Text Size: {projectData.textSize}px
        </label>
        <input
          type="range"
          min="16"
          max="48"
          value={projectData.textSize}
          onChange={(e) => onUpdate({ textSize: Number(e.target.value) })}
          style={{
            width: "100%",
            cursor: "pointer",
          }}
        />
      </div>

      {/* Text Position */}
      <div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <Move size={16} />
          Text Position
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
          <div>
            <label style={{ fontSize: "0.75rem", opacity: 0.8 }}>Horizontal: {projectData.textPosition.x}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={projectData.textPosition.x}
              onChange={(e) =>
                onUpdate({
                  textPosition: { ...projectData.textPosition, x: Number(e.target.value) },
                })
              }
              style={{ width: "100%", cursor: "pointer" }}
            />
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", opacity: 0.8 }}>Vertical: {projectData.textPosition.y}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={projectData.textPosition.y}
              onChange={(e) =>
                onUpdate({
                  textPosition: { ...projectData.textPosition, y: Number(e.target.value) },
                })
              }
              style={{ width: "100%", cursor: "pointer" }}
            />
          </div>
        </div>
      </div>

      {/* Background Overlay */}
      <div>
        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Background Overlay</label>
        <select
          value={projectData.backgroundColor}
          onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
          style={{
            width: "100%",
            padding: "0.5rem",
            borderRadius: "0.25rem",
            border: "none",
            background: "rgba(255,255,255,0.1)",
            color: "white",
            fontSize: "0.875rem",
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="rgba(0,0,0,0.5)">Semi-transparent Black</option>
          <option value="rgba(0,0,0,0.8)">Dark Black</option>
          <option value="rgba(255,255,255,0.8)">Light White</option>
          <option value="rgba(59,130,246,0.8)">Blue</option>
          <option value="rgba(16,185,129,0.8)">Green</option>
          <option value="rgba(239,68,68,0.8)">Red</option>
          <option value="rgba(245,158,11,0.8)">Orange</option>
        </select>
      </div>

      {/* Templates */}
      <div>
        <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.875rem", fontWeight: "bold" }}>🎨 QUICK TEMPLATES</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
          {Object.entries(templates).map(([id, template]) => (
            <button
              key={id}
              onClick={() =>
                onUpdate({
                  selectedTemplate: id,
                  backgroundColor: template.background,
                  textColor: template.textColor,
                })
              }
              style={{
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: projectData.selectedTemplate === id ? "2px solid #10B981" : "1px solid rgba(255,255,255,0.2)",
                background: projectData.selectedTemplate === id ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                transition: "all 0.3s ease",
                textAlign: "left",
                fontSize: "0.75rem",
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>{template.name}</div>
              <div
                style={{
                  width: "100%",
                  height: "30px",
                  borderRadius: "4px",
                  background: template.background,
                  border: "1px solid rgba(255,255,255,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.6rem",
                  color: template.textColor,
                }}
              >
                Sample
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Reset Button */}
      <button
        onClick={() =>
          onUpdate({
            text: `Amazing moment at ${projectData.locationName}!`,
            textColor: "#FFFFFF",
            textSize: 24,
            textPosition: { x: 50, y: 80 },
            backgroundColor: "rgba(0,0,0,0.5)",
            selectedTemplate: "modern",
          })
        }
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          padding: "0.75rem",
          borderRadius: "0.5rem",
          border: "none",
          background: "rgba(239, 68, 68, 0.2)",
          color: "rgba(239, 68, 68, 0.8)",
          cursor: "pointer",
          fontWeight: "bold",
          fontSize: "0.875rem",
          marginTop: "1rem",
        }}
      >
        <RotateCcw size={16} />
        Reset to Defaults
      </button>
    </div>
  )
}

