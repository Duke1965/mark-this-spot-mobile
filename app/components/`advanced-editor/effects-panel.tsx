"use client"

import { useState } from "react"
import { Sparkles, Sun, Contrast, Palette, Zap, Eye, Droplets, Snowflake } from "lucide-react"

interface EffectsPanelProps {
  imageUrl: string
  onEffectApply: (effect: string) => void
}

export function EffectsPanel({ imageUrl, onEffectApply }: EffectsPanelProps) {
  const [selectedEffect, setSelectedEffect] = useState<string | null>(null)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [blur, setBlur] = useState(0)

  const effects = [
    { id: "vintage", name: "Vintage", icon: Palette, filter: "sepia(0.8) contrast(1.2) brightness(1.1)" },
    { id: "bw", name: "B&W", icon: Eye, filter: "grayscale(1) contrast(1.1)" },
    { id: "warm", name: "Warm", icon: Sun, filter: "sepia(0.3) saturate(1.4) brightness(1.1)" },
    { id: "cool", name: "Cool", icon: Snowflake, filter: "hue-rotate(180deg) saturate(1.2)" },
    { id: "dramatic", name: "Dramatic", icon: Zap, filter: "contrast(1.5) brightness(0.9) saturate(1.3)" },
    { id: "soft", name: "Soft", icon: Droplets, filter: "blur(1px) brightness(1.1) contrast(0.9)" },
    { id: "vibrant", name: "Vibrant", icon: Sparkles, filter: "saturate(1.8) contrast(1.2)" },
    { id: "retro", name: "Retro", icon: Contrast, filter: "sepia(0.5) hue-rotate(315deg) saturate(1.5)" },
  ]

  const applyEffect = (effectId: string) => {
    setSelectedEffect(effectId)
    onEffectApply(effectId)
  }

  const customFilter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.1)",
        padding: "1rem",
        borderRadius: "1rem",
        backdropFilter: "blur(10px)",
        maxHeight: "500px",
        overflowY: "auto",
      }}
    >
      <h3 style={{ color: "white", margin: "0 0 1rem 0", fontSize: "1.1rem" }}>Photo Effects</h3>

      {/* Preset Effects */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h4 style={{ color: "rgba(255,255,255,0.8)", margin: "0 0 0.75rem 0", fontSize: "0.9rem" }}>Preset Filters</h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "0.5rem",
          }}
        >
          {effects.map((effect) => {
            const IconComponent = effect.icon
            return (
              <button
                key={effect.id}
                onClick={() => applyEffect(effect.id)}
                style={{
                  padding: "0.75rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background: selectedEffect === effect.id ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.2)",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.75rem",
                  transition: "all 0.3s ease",
                }}
              >
                <IconComponent size={20} />
                {effect.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Manual Adjustments */}
      <div>
        <h4 style={{ color: "rgba(255,255,255,0.8)", margin: "0 0 1rem 0", fontSize: "0.9rem" }}>Manual Adjustments</h4>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Brightness */}
          <div>
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}
            >
              <label style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.8rem" }}>
                <Sun size={14} style={{ marginRight: "0.5rem", verticalAlign: "middle" }} />
                Brightness
              </label>
              <span style={{ color: "white", fontSize: "0.8rem" }}>{brightness}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="200"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              style={{
                width: "100%",
                height: "4px",
                borderRadius: "2px",
                background: "rgba(255,255,255,0.2)",
                outline: "none",
                cursor: "pointer",
              }}
            />
          </div>

          {/* Contrast */}
          <div>
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}
            >
              <label style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.8rem" }}>
                <Contrast size={14} style={{ marginRight: "0.5rem", verticalAlign: "middle" }} />
                Contrast
              </label>
              <span style={{ color: "white", fontSize: "0.8rem" }}>{contrast}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="200"
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              style={{
                width: "100%",
                height: "4px",
                borderRadius: "2px",
                background: "rgba(255,255,255,0.2)",
                outline: "none",
                cursor: "pointer",
              }}
            />
          </div>

          {/* Saturation */}
          <div>
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}
            >
              <label style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.8rem" }}>
                <Palette size={14} style={{ marginRight: "0.5rem", verticalAlign: "middle" }} />
                Saturation
              </label>
              <span style={{ color: "white", fontSize: "0.8rem" }}>{saturation}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              value={saturation}
              onChange={(e) => setSaturation(Number(e.target.value))}
              style={{
                width: "100%",
                height: "4px",
                borderRadius: "2px",
                background: "rgba(255,255,255,0.2)",
                outline: "none",
                cursor: "pointer",
              }}
            />
          </div>

          {/* Blur */}
          <div>
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}
            >
              <label style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.8rem" }}>
                <Droplets size={14} style={{ marginRight: "0.5rem", verticalAlign: "middle" }} />
                Blur
              </label>
              <span style={{ color: "white", fontSize: "0.8rem" }}>{blur}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              value={blur}
              onChange={(e) => setBlur(Number(e.target.value))}
              style={{
                width: "100%",
                height: "4px",
                borderRadius: "2px",
                background: "rgba(255,255,255,0.2)",
                outline: "none",
                cursor: "pointer",
              }}
            />
          </div>
        </div>

        {/* Preview */}
        <div style={{ marginTop: "1rem" }}>
          <h5 style={{ color: "rgba(255,255,255,0.8)", margin: "0 0 0.5rem 0", fontSize: "0.8rem" }}>Preview</h5>
          <div
            style={{
              width: "100%",
              height: "100px",
              borderRadius: "0.5rem",
              overflow: "hidden",
              background: "rgba(255,255,255,0.1)",
            }}
          >
            <img
              src={imageUrl || "/placeholder.svg"}
              alt="Effect preview"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: selectedEffect ? effects.find((e) => e.id === selectedEffect)?.filter : customFilter,
              }}
            />
          </div>
        </div>

        {/* Apply Button */}
        <button
          onClick={() => onEffectApply(selectedEffect || "custom")}
          style={{
            width: "100%",
            padding: "0.75rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "rgba(16, 185, 129, 0.3)",
            color: "white",
            cursor: "pointer",
            fontSize: "0.9rem",
            marginTop: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          <Sparkles size={16} />
          Apply Effect
        </button>
      </div>
    </div>
  )
}
