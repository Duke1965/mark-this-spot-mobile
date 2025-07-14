"use client"

import { useState } from "react"
import { Sliders, RotateCcw } from "lucide-react"

interface EffectsPanelProps {
  onEffectApply: (effect: string, value?: number) => void
  currentEffect: string
}

export function EffectsPanel({ onEffectApply, currentEffect }: EffectsPanelProps) {
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [blur, setBlur] = useState(0)

  const effects = [
    { id: "none", name: "Original", filter: "none" },
    { id: "vintage", name: "Vintage", filter: "sepia(0.5) contrast(1.2) brightness(1.1)" },
    { id: "bw", name: "B&W", filter: "grayscale(1) contrast(1.1)" },
    { id: "vibrant", name: "Vibrant", filter: "saturate(1.5) contrast(1.2)" },
    { id: "cool", name: "Cool", filter: "hue-rotate(180deg) saturate(1.2)" },
    { id: "warm", name: "Warm", filter: "hue-rotate(30deg) saturate(1.1) brightness(1.1)" },
    { id: "dramatic", name: "Dramatic", filter: "contrast(1.5) brightness(0.9) saturate(1.3)" },
    { id: "soft", name: "Soft Focus", filter: "blur(1px) brightness(1.1)" },
  ]

  const handleManualAdjustment = () => {
    const customFilter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`
    onEffectApply("custom", 0)
    // Apply custom filter through a callback or state management
  }

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.9)",
        padding: "1rem",
        borderRadius: "1rem",
        color: "white",
        maxHeight: "400px",
        overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
        <Sliders size={20} />
        <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Effects & Filters</h3>
      </div>

      {/* Preset Effects */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h4 style={{ fontSize: "0.9rem", marginBottom: "0.75rem", opacity: 0.8 }}>Preset Effects</h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
            gap: "0.5rem",
          }}
        >
          {effects.map((effect) => (
            <button
              key={effect.id}
              onClick={() => onEffectApply(effect.id)}
              style={{
                padding: "0.75rem 0.5rem",
                borderRadius: "0.5rem",
                border: "1px solid rgba(255,255,255,0.2)",
                background: currentEffect === effect.id ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                fontSize: "0.75rem",
                textAlign: "center",
                transition: "all 0.2s ease",
              }}
            >
              {effect.name}
            </button>
          ))}
        </div>
      </div>

      {/* Manual Adjustments */}
      <div>
        <h4 style={{ fontSize: "0.9rem", marginBottom: "0.75rem", opacity: 0.8 }}>Manual Adjustments</h4>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Brightness */}
          <div>
            <label style={{ fontSize: "0.8rem", opacity: 0.9, marginBottom: "0.25rem", display: "block" }}>
              Brightness: {brightness}%
            </label>
            <input
              type="range"
              min="50"
              max="150"
              value={brightness}
              onChange={(e) => {
                setBrightness(Number(e.target.value))
                handleManualAdjustment()
              }}
              style={{
                width: "100%",
                height: "4px",
                borderRadius: "2px",
                background: "rgba(255,255,255,0.2)",
                outline: "none",
              }}
            />
          </div>

          {/* Contrast */}
          <div>
            <label style={{ fontSize: "0.8rem", opacity: 0.9, marginBottom: "0.25rem", display: "block" }}>
              Contrast: {contrast}%
            </label>
            <input
              type="range"
              min="50"
              max="150"
              value={contrast}
              onChange={(e) => {
                setContrast(Number(e.target.value))
                handleManualAdjustment()
              }}
              style={{
                width: "100%",
                height: "4px",
                borderRadius: "2px",
                background: "rgba(255,255,255,0.2)",
                outline: "none",
              }}
            />
          </div>

          {/* Saturation */}
          <div>
            <label style={{ fontSize: "0.8rem", opacity: 0.9, marginBottom: "0.25rem", display: "block" }}>
              Saturation: {saturation}%
            </label>
            <input
              type="range"
              min="0"
              max="200"
              value={saturation}
              onChange={(e) => {
                setSaturation(Number(e.target.value))
                handleManualAdjustment()
              }}
              style={{
                width: "100%",
                height: "4px",
                borderRadius: "2px",
                background: "rgba(255,255,255,0.2)",
                outline: "none",
              }}
            />
          </div>

          {/* Blur */}
          <div>
            <label style={{ fontSize: "0.8rem", opacity: 0.9, marginBottom: "0.25rem", display: "block" }}>
              Blur: {blur}px
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={blur}
              onChange={(e) => {
                setBlur(Number(e.target.value))
                handleManualAdjustment()
              }}
              style={{
                width: "100%",
                height: "4px",
                borderRadius: "2px",
                background: "rgba(255,255,255,0.2)",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Reset Button */}
        <button
          onClick={() => {
            setBrightness(100)
            setContrast(100)
            setSaturation(100)
            setBlur(0)
            onEffectApply("none")
          }}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(239, 68, 68, 0.2)",
            color: "white",
            cursor: "pointer",
            fontSize: "0.8rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            width: "100%",
            justifyContent: "center",
          }}
        >
          <RotateCcw size={16} />
          Reset All
        </button>
      </div>
    </div>
  )
}
