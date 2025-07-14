"use client"

import { useState, useRef, useEffect } from "react"
import { Sparkles, Sun } from "lucide-react"

interface EffectsPanelProps {
  mediaUrl: string
  onApplyEffect: (effect: any) => void
}

export function EffectsPanel({ mediaUrl, onApplyEffect }: EffectsPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedEffect, setSelectedEffect] = useState<string | null>(null)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [blur, setBlur] = useState(0)

  const effects = [
    { id: "vintage", name: "Vintage", icon: "📸", filter: "sepia(0.8) contrast(1.2) brightness(1.1)" },
    { id: "bw", name: "Black & White", icon: "⚫", filter: "grayscale(1)" },
    { id: "warm", name: "Warm", icon: "🌅", filter: "sepia(0.3) saturate(1.4) hue-rotate(15deg)" },
    { id: "cool", name: "Cool", icon: "❄️", filter: "saturate(1.2) hue-rotate(180deg) brightness(1.1)" },
    { id: "dramatic", name: "Dramatic", icon: "⚡", filter: "contrast(1.5) brightness(0.9) saturate(1.3)" },
    { id: "soft", name: "Soft", icon: "☁️", filter: "blur(0.5px) brightness(1.1) contrast(0.9)" },
    { id: "vibrant", name: "Vibrant", icon: "🌈", filter: "saturate(1.8) contrast(1.2)" },
    { id: "retro", name: "Retro", icon: "📺", filter: "sepia(0.5) hue-rotate(320deg) saturate(1.2)" },
  ]

  useEffect(() => {
    drawPreview()
  }, [mediaUrl, selectedEffect, brightness, contrast, saturation, blur])

  const drawPreview = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = 400
    canvas.height = 300

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      // Apply manual adjustments
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`

      // Draw image
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // Apply selected effect overlay
      if (selectedEffect) {
        const effect = effects.find((e) => e.id === selectedEffect)
        if (effect) {
          ctx.globalCompositeOperation = "multiply"
          ctx.fillStyle = getEffectColor(selectedEffect)
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.globalCompositeOperation = "source-over"
        }
      }
    }
    img.src = mediaUrl
  }

  const getEffectColor = (effectId: string) => {
    switch (effectId) {
      case "vintage":
        return "rgba(255, 204, 153, 0.3)"
      case "warm":
        return "rgba(255, 165, 0, 0.2)"
      case "cool":
        return "rgba(0, 191, 255, 0.2)"
      case "dramatic":
        return "rgba(0, 0, 0, 0.1)"
      default:
        return "transparent"
    }
  }

  const applyEffect = () => {
    const effectData = {
      type: selectedEffect,
      brightness,
      contrast,
      saturation,
      blur,
      timestamp: Date.now(),
    }
    onApplyEffect(effectData)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%" }}>
      {/* Preview Canvas */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          background: "rgba(255,255,255,0.1)",
          borderRadius: "1rem",
          padding: "1.5rem",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            maxWidth: "100%",
            border: "2px solid rgba(255,255,255,0.2)",
            borderRadius: "0.5rem",
          }}
        />
      </div>

      {/* Effect Presets */}
      <div
        style={{
          background: "rgba(255,255,255,0.1)",
          borderRadius: "1rem",
          padding: "1.5rem",
        }}
      >
        <h3 style={{ margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Sparkles size={20} />
          Effect Presets
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
            gap: "0.75rem",
          }}
        >
          {effects.map((effect) => (
            <button
              key={effect.id}
              onClick={() => setSelectedEffect(effect.id)}
              style={{
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: selectedEffect === effect.id ? "2px solid #10B981" : "1px solid rgba(255,255,255,0.2)",
                background: selectedEffect === effect.id ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                textAlign: "center",
                fontSize: "0.75rem",
                transition: "all 0.3s ease",
              }}
            >
              <div style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>{effect.icon}</div>
              {effect.name}
            </button>
          ))}
        </div>
      </div>

      {/* Manual Adjustments */}
      <div
        style={{
          background: "rgba(255,255,255,0.1)",
          borderRadius: "1rem",
          padding: "1.5rem",
        }}
      >
        <h3 style={{ margin: "0 0 1rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Sun size={20} />
          Manual Adjustments
        </h3>
        <div style={{ display: "grid", gap: "1rem" }}>
          {/* Brightness */}
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
              Brightness: {brightness}%
            </label>
            <input
              type="range"
              min="50"
              max="200"
              value={brightness}
              onChange={(e) => setBrightness(Number.parseInt(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          {/* Contrast */}
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
              Contrast: {contrast}%
            </label>
            <input
              type="range"
              min="50"
              max="200"
              value={contrast}
              onChange={(e) => setContrast(Number.parseInt(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          {/* Saturation */}
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
              Saturation: {saturation}%
            </label>
            <input
              type="range"
              min="0"
              max="200"
              value={saturation}
              onChange={(e) => setSaturation(Number.parseInt(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          {/* Blur */}
          <div>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Blur: {blur}px</label>
            <input
              type="range"
              min="0"
              max="10"
              value={blur}
              onChange={(e) => setBlur(Number.parseInt(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </div>

      {/* Apply Button */}
      <button
        onClick={applyEffect}
        style={{
          padding: "1rem 2rem",
          borderRadius: "0.5rem",
          border: "none",
          background: "linear-gradient(45deg, #10B981, #059669)",
          color: "white",
          cursor: "pointer",
          fontSize: "1rem",
          fontWeight: "bold",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
        }}
      >
        <Sparkles size={20} />
        Apply Effect
      </button>
    </div>
  )
}
