"use client"

import type React from "react"

import { useState } from "react"
import { Sun, Moon, Droplets, Sparkles, Zap, Eye, Camera } from "lucide-react"

interface Effect {
  id: string
  name: string
  icon: React.ReactNode
  description: string
  filter: string
  preview: string
}

const EFFECTS: Effect[] = [
  {
    id: "none",
    name: "Original",
    icon: <Camera size={20} />,
    description: "No filter applied",
    filter: "none",
    preview: "Original photo",
  },
  {
    id: "vintage",
    name: "Vintage",
    icon: <Sun size={20} />,
    description: "Warm, nostalgic feel",
    filter: "sepia(0.5) contrast(1.2) brightness(1.1)",
    preview: "Warm sepia tones",
  },
  {
    id: "bw",
    name: "Black & White",
    icon: <Moon size={20} />,
    description: "Classic monochrome",
    filter: "grayscale(1) contrast(1.1)",
    preview: "Timeless B&W",
  },
  {
    id: "vibrant",
    name: "Vibrant",
    icon: <Sparkles size={20} />,
    description: "Enhanced colors",
    filter: "saturate(1.4) contrast(1.1) brightness(1.05)",
    preview: "Pop of color",
  },
  {
    id: "cool",
    name: "Cool Blue",
    icon: <Droplets size={20} />,
    description: "Cool blue tones",
    filter: "hue-rotate(180deg) saturate(1.2)",
    preview: "Ocean vibes",
  },
  {
    id: "warm",
    name: "Golden Hour",
    icon: <Sun size={20} />,
    description: "Warm golden tones",
    filter: "hue-rotate(20deg) saturate(1.3) brightness(1.1)",
    preview: "Sunset glow",
  },
  {
    id: "dramatic",
    name: "Dramatic",
    icon: <Zap size={20} />,
    description: "High contrast drama",
    filter: "contrast(1.5) brightness(0.9) saturate(1.2)",
    preview: "Bold & striking",
  },
  {
    id: "soft",
    name: "Soft Focus",
    icon: <Eye size={20} />,
    description: "Dreamy soft look",
    filter: "blur(0.5px) brightness(1.1) contrast(0.9)",
    preview: "Dreamy & soft",
  },
]

interface EffectsPanelProps {
  selectedEffect: string
  onEffectSelect: (effectId: string) => void
  platformColor: string
}

export function EffectsPanel({ selectedEffect, onEffectSelect, platformColor }: EffectsPanelProps) {
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [blur, setBlur] = useState(0)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h4 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: "bold" }}>🎨 Photo Effects</h4>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "0.75rem",
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {EFFECTS.map((effect) => (
            <button
              key={effect.id}
              onClick={() => onEffectSelect(effect.id)}
              style={{
                padding: "1rem 0.75rem",
                borderRadius: "0.75rem",
                border: selectedEffect === effect.id ? `2px solid ${platformColor}` : "1px solid rgba(255,255,255,0.2)",
                background: selectedEffect === effect.id ? `${platformColor}20` : "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                transition: "all 0.3s ease",
                textAlign: "left",
                fontSize: "0.75rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    background: `linear-gradient(135deg, ${platformColor}40, ${platformColor}20)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: platformColor,
                  }}
                >
                  {effect.icon}
                </div>
                <div>
                  <div style={{ fontWeight: "bold", fontSize: "0.8rem" }}>{effect.name}</div>
                </div>
              </div>
              <div style={{ fontSize: "0.7rem", opacity: 0.8, lineHeight: 1.3 }}>{effect.description}</div>

              {/* Mini preview */}
              <div
                style={{
                  width: "100%",
                  height: "30px",
                  borderRadius: "4px",
                  background: "linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1)",
                  filter: effect.filter,
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Manual Adjustments */}
      <div>
        <h4 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: "bold" }}>🔧 Manual Adjustments</h4>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
              Brightness: {brightness}%
            </label>
            <input
              type="range"
              min="50"
              max="150"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
              Contrast: {contrast}%
            </label>
            <input
              type="range"
              min="50"
              max="150"
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
              Saturation: {saturation}%
            </label>
            <input
              type="range"
              min="0"
              max="200"
              value={saturation}
              onChange={(e) => setSaturation(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Blur: {blur}px</label>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={blur}
              onChange={(e) => setBlur(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <button
          onClick={() => {
            setBrightness(100)
            setContrast(100)
            setSaturation(100)
            setBlur(0)
          }}
          style={{
            width: "100%",
            padding: "0.75rem",
            marginTop: "1rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "rgba(255,255,255,0.1)",
            color: "white",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          Reset All
        </button>
      </div>
    </div>
  )
}
