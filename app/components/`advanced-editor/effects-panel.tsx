"use client"

import { useState } from "react"
import { Sparkles, Sliders, RotateCcw } from "lucide-react"

interface EffectsPanelProps {
  onEffectChange?: (effect: string) => void
  currentEffect?: string
  mediaUrl?: string
  onApplyEffect?: (effect: string) => void
}

export function EffectsPanel({ onEffectChange, currentEffect = "none", mediaUrl, onApplyEffect }: EffectsPanelProps) {
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [blur, setBlur] = useState(0)
  const [hue, setHue] = useState(0)

  const presetEffects = [
    {
      id: "none",
      name: "Original",
      filter: "none",
      preview: "🖼️",
      description: "No effects applied",
    },
    {
      id: "vintage",
      name: "Vintage",
      filter: "sepia(0.5) contrast(1.2) brightness(1.1)",
      preview: "📸",
      description: "Classic vintage look",
    },
    {
      id: "blackwhite",
      name: "B&W",
      filter: "grayscale(1) contrast(1.1)",
      preview: "⚫",
      description: "Black and white",
    },
    {
      id: "vibrant",
      name: "Vibrant",
      filter: "saturate(1.5) contrast(1.2)",
      preview: "🌈",
      description: "Enhanced colors",
    },
    {
      id: "cool",
      name: "Cool",
      filter: "hue-rotate(180deg) saturate(1.2)",
      preview: "❄️",
      description: "Cool blue tones",
    },
    {
      id: "warm",
      name: "Warm",
      filter: "hue-rotate(30deg) saturate(1.1) brightness(1.1)",
      preview: "🔥",
      description: "Warm orange tones",
    },
    {
      id: "dramatic",
      name: "Dramatic",
      filter: "contrast(1.5) brightness(0.9) saturate(1.3)",
      preview: "⚡",
      description: "High contrast",
    },
    {
      id: "soft",
      name: "Soft",
      filter: "blur(1px) brightness(1.1)",
      preview: "☁️",
      description: "Soft dreamy look",
    },
  ]

  const handleEffectSelect = (effectId: string) => {
    const effect = presetEffects.find((e) => e.id === effectId)
    if (effect) {
      onEffectChange?.(effect.filter)
      onApplyEffect?.(effect.filter)
    }
  }

  const generateCustomFilter = () => {
    const filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px) hue-rotate(${hue}deg)`
    onEffectChange?.(filter)
    onApplyEffect?.(filter)
  }

  const resetCustomSettings = () => {
    setBrightness(100)
    setContrast(100)
    setSaturation(100)
    setBlur(0)
    setHue(0)
    onEffectChange?.("none")
    onApplyEffect?.("none")
  }

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.9)",
        padding: "1rem",
        borderRadius: "1rem",
        color: "white",
        maxHeight: "600px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <Sparkles size={20} />
        <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "600" }}>Photo Effects</h3>
      </div>

      {/* Preset Effects */}
      <div style={{ marginBottom: "2rem" }}>
        <h4
          style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: "0.9rem",
            margin: "0 0 1rem 0",
            fontWeight: "500",
          }}
        >
          Preset Effects
        </h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "0.75rem",
          }}
        >
          {presetEffects.map((effect) => (
            <button
              key={effect.id}
              onClick={() => handleEffectSelect(effect.id)}
              style={{
                padding: "1rem",
                borderRadius: "0.75rem",
                border: currentEffect === effect.filter ? "2px solid #10B981" : "1px solid rgba(255,255,255,0.2)",
                background: currentEffect === effect.filter ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.2s ease",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "1.5rem" }}>{effect.preview}</div>
              <div style={{ fontSize: "0.8rem", fontWeight: "600" }}>{effect.name}</div>
              <div style={{ fontSize: "0.7rem", opacity: 0.7 }}>{effect.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Adjustments */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Sliders size={16} />
            <h4
              style={{
                color: "rgba(255,255,255,0.8)",
                fontSize: "0.9rem",
                margin: 0,
                fontWeight: "500",
              }}
            >
              Custom Adjustments
            </h4>
          </div>
          <button
            onClick={resetCustomSettings}
            style={{
              padding: "0.25rem 0.5rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.7)",
              cursor: "pointer",
              fontSize: "0.7rem",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
          >
            <RotateCcw size={12} />
            Reset
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Brightness */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.8)" }}>Brightness</label>
              <span style={{ fontSize: "0.8rem", color: "white" }}>{brightness}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={150}
              value={brightness}
              onChange={(e) => {
                setBrightness(Number(e.target.value))
                generateCustomFilter()
              }}
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
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.8)" }}>Contrast</label>
              <span style={{ fontSize: "0.8rem", color: "white" }}>{contrast}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={150}
              value={contrast}
              onChange={(e) => {
                setContrast(Number(e.target.value))
                generateCustomFilter()
              }}
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
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.8)" }}>Saturation</label>
              <span style={{ fontSize: "0.8rem", color: "white" }}>{saturation}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={200}
              value={saturation}
              onChange={(e) => {
                setSaturation(Number(e.target.value))
                generateCustomFilter()
              }}
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
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.8)" }}>Blur</label>
              <span style={{ fontSize: "0.8rem", color: "white" }}>{blur}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              value={blur}
              onChange={(e) => {
                setBlur(Number(e.target.value))
                generateCustomFilter()
              }}
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

          {/* Hue */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.5rem",
              }}
            >
              <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.8)" }}>Hue</label>
              <span style={{ fontSize: "0.8rem", color: "white" }}>{hue}°</span>
            </div>
            <input
              type="range"
              min={-180}
              max={180}
              value={hue}
              onChange={(e) => {
                setHue(Number(e.target.value))
                generateCustomFilter()
              }}
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
      </div>

      {/* Preview */}
      {mediaUrl && (
        <div style={{ marginTop: "1.5rem" }}>
          <h4
            style={{
              color: "rgba(255,255,255,0.8)",
              fontSize: "0.9rem",
              margin: "0 0 0.5rem 0",
              fontWeight: "500",
            }}
          >
            Preview
          </h4>
          <div
            style={{
              width: "100%",
              height: "120px",
              borderRadius: "0.5rem",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <img
              src={mediaUrl || "/placeholder.svg"}
              alt="Effect preview"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: currentEffect,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
