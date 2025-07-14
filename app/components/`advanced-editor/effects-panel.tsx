"use client"

import { useState } from "react"
import { Sparkles, Sliders, RotateCcw } from "lucide-react"

interface EffectsPanelProps {
  imageUrl: string
  onEffectApply: (effect: string) => void
}

export function EffectsPanel({ imageUrl, onEffectApply }: EffectsPanelProps) {
  const [activeTab, setActiveTab] = useState<"presets" | "manual">("presets")
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [blur, setBlur] = useState(0)
  const [hue, setHue] = useState(0)

  const presetEffects = [
    { name: "Original", filter: "none" },
    { name: "Vintage", filter: "sepia(0.5) contrast(1.2) brightness(0.9)" },
    { name: "B&W", filter: "grayscale(1)" },
    { name: "Warm", filter: "sepia(0.3) saturate(1.4) brightness(1.1)" },
    { name: "Cool", filter: "hue-rotate(180deg) saturate(1.2)" },
    { name: "High Contrast", filter: "contrast(1.5) brightness(1.1)" },
    { name: "Soft", filter: "blur(1px) brightness(1.1)" },
    { name: "Dramatic", filter: "contrast(1.8) brightness(0.8) saturate(1.3)" },
  ]

  const resetManualControls = () => {
    setBrightness(100)
    setContrast(100)
    setSaturation(100)
    setBlur(0)
    setHue(0)
  }

  const applyManualEffect = () => {
    const filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px) hue-rotate(${hue}deg)`
    onEffectApply(filter)
  }

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.1)",
        padding: "1rem",
        borderRadius: "1rem",
        backdropFilter: "blur(10px)",
      }}
    >
      <h3 style={{ color: "white", margin: "0 0 1rem 0" }}>Effects</h3>

      {/* Tab Buttons */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        <button
          onClick={() => setActiveTab("presets")}
          style={{
            flex: 1,
            padding: "0.5rem",
            borderRadius: "0.5rem",
            border: "none",
            background: activeTab === "presets" ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
            fontSize: "0.8rem",
          }}
        >
          <Sparkles size={16} style={{ marginRight: "0.25rem" }} />
          Presets
        </button>
        <button
          onClick={() => setActiveTab("manual")}
          style={{
            flex: 1,
            padding: "0.5rem",
            borderRadius: "0.5rem",
            border: "none",
            background: activeTab === "manual" ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
            fontSize: "0.8rem",
          }}
        >
          <Sliders size={16} style={{ marginRight: "0.25rem" }} />
          Manual
        </button>
      </div>

      {/* Preset Effects */}
      {activeTab === "presets" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.5rem",
          }}
        >
          {presetEffects.map((effect) => (
            <button
              key={effect.name}
              onClick={() => onEffectApply(effect.filter)}
              style={{
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
                fontSize: "0.8rem",
                textAlign: "center",
              }}
            >
              {effect.name}
            </button>
          ))}
        </div>
      )}

      {/* Manual Controls */}
      {activeTab === "manual" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ color: "white", fontSize: "0.8rem", display: "block", marginBottom: "0.25rem" }}>
              Brightness: {brightness}%
            </label>
            <input
              type="range"
              min="0"
              max="200"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label style={{ color: "white", fontSize: "0.8rem", display: "block", marginBottom: "0.25rem" }}>
              Contrast: {contrast}%
            </label>
            <input
              type="range"
              min="0"
              max="200"
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label style={{ color: "white", fontSize: "0.8rem", display: "block", marginBottom: "0.25rem" }}>
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
            <label style={{ color: "white", fontSize: "0.8rem", display: "block", marginBottom: "0.25rem" }}>
              Blur: {blur}px
            </label>
            <input
              type="range"
              min="0"
              max="10"
              value={blur}
              onChange={(e) => setBlur(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label style={{ color: "white", fontSize: "0.8rem", display: "block", marginBottom: "0.25rem" }}>
              Hue: {hue}°
            </label>
            <input
              type="range"
              min="-180"
              max="180"
              value={hue}
              onChange={(e) => setHue(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={applyManualEffect}
              style={{
                flex: 1,
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "rgba(16, 185, 129, 0.3)",
                color: "white",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
            >
              Apply
            </button>
            <button
              onClick={resetManualControls}
              style={{
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
