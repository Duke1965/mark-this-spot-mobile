"use client"

import { Sun, Contrast, Droplets, CloudyIcon as Blur, PaletteIcon as Palette2, RotateCcw } from "lucide-react"

interface EffectsPanelProps {
  effects: {
    brightness: number
    contrast: number
    saturation: number
    blur: number
    sepia: number
    hueRotate: number
  }
  onUpdate: (effects: any) => void
}

export function EffectsPanel({ effects, onUpdate }: EffectsPanelProps) {
  const updateEffect = (key: string, value: number) => {
    onUpdate({ ...effects, [key]: value })
  }

  const resetEffects = () => {
    onUpdate({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      blur: 0,
      sepia: 0,
      hueRotate: 0,
    })
  }

  const presets = {
    vintage: {
      name: "Vintage",
      effects: { brightness: 110, contrast: 120, saturation: 80, blur: 0, sepia: 30, hueRotate: 0 },
    },
    dramatic: {
      name: "Dramatic",
      effects: { brightness: 90, contrast: 140, saturation: 120, blur: 0, sepia: 0, hueRotate: 0 },
    },
    soft: {
      name: "Soft",
      effects: { brightness: 105, contrast: 90, saturation: 90, blur: 1, sepia: 10, hueRotate: 0 },
    },
    vibrant: {
      name: "Vibrant",
      effects: { brightness: 105, contrast: 110, saturation: 140, blur: 0, sepia: 0, hueRotate: 15 },
    },
    monochrome: {
      name: "Monochrome",
      effects: { brightness: 100, contrast: 110, saturation: 0, blur: 0, sepia: 0, hueRotate: 0 },
    },
    warm: {
      name: "Warm",
      effects: { brightness: 105, contrast: 105, saturation: 110, blur: 0, sepia: 20, hueRotate: 10 },
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
        <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.125rem", fontWeight: "bold" }}>✨ Photo Effects</h3>
      </div>

      {/* Quick Presets */}
      <div>
        <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.875rem", fontWeight: "bold" }}>🎨 QUICK PRESETS</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem" }}>
          {Object.entries(presets).map(([id, preset]) => (
            <button
              key={id}
              onClick={() => onUpdate(preset.effects)}
              style={{
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                transition: "all 0.3s ease",
                fontSize: "0.75rem",
                fontWeight: "bold",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.15)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)"
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Manual Controls */}
      <div>
        <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: "bold" }}>🎛️ MANUAL CONTROLS</h4>

        {/* Brightness */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <Sun size={16} />
            Brightness: {effects.brightness}%
          </label>
          <input
            type="range"
            min="50"
            max="150"
            value={effects.brightness}
            onChange={(e) => updateEffect("brightness", Number(e.target.value))}
            style={{
              width: "100%",
              cursor: "pointer",
            }}
          />
        </div>

        {/* Contrast */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <Contrast size={16} />
            Contrast: {effects.contrast}%
          </label>
          <input
            type="range"
            min="50"
            max="150"
            value={effects.contrast}
            onChange={(e) => updateEffect("contrast", Number(e.target.value))}
            style={{
              width: "100%",
              cursor: "pointer",
            }}
          />
        </div>

        {/* Saturation */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <Droplets size={16} />
            Saturation: {effects.saturation}%
          </label>
          <input
            type="range"
            min="0"
            max="200"
            value={effects.saturation}
            onChange={(e) => updateEffect("saturation", Number(e.target.value))}
            style={{
              width: "100%",
              cursor: "pointer",
            }}
          />
        </div>

        {/* Blur */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <Blur size={16} />
            Blur: {effects.blur}px
          </label>
          <input
            type="range"
            min="0"
            max="10"
            value={effects.blur}
            onChange={(e) => updateEffect("blur", Number(e.target.value))}
            style={{
              width: "100%",
              cursor: "pointer",
            }}
          />
        </div>

        {/* Sepia */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <Palette2 size={16} />
            Sepia: {effects.sepia}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={effects.sepia}
            onChange={(e) => updateEffect("sepia", Number(e.target.value))}
            style={{
              width: "100%",
              cursor: "pointer",
            }}
          />
        </div>

        {/* Hue Rotate */}
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <Palette2 size={16} />
            Hue Shift: {effects.hueRotate}°
          </label>
          <input
            type="range"
            min="0"
            max="360"
            value={effects.hueRotate}
            onChange={(e) => updateEffect("hueRotate", Number(e.target.value))}
            style={{
              width: "100%",
              cursor: "pointer",
            }}
          />
        </div>
      </div>

      {/* Reset Button */}
      <button
        onClick={resetEffects}
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
        Reset All Effects
      </button>
    </div>
  )
}

