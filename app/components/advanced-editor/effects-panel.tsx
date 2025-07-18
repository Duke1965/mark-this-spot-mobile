"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { ArrowLeft, Download, RotateCcw, Sparkles } from "lucide-react"

interface EffectsPanelProps {
  mediaUrl: string | null
  mediaType: "photo" | "video"
  currentEffects: string[]
  onEffectsChange: (effects: string[]) => void
  onBack: () => void
}

export function EffectsPanel({ mediaUrl, mediaType, currentEffects, onEffectsChange, onBack }: EffectsPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Effect values
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [hue, setHue] = useState(0)
  const [blur, setBlur] = useState(0)
  const [sepia, setSepia] = useState(0)
  const [grayscale, setGrayscale] = useState(0)
  const [invert, setInvert] = useState(0)

  // Preset filters
  const [selectedPreset, setSelectedPreset] = useState<string>("none")

  const presets = [
    { id: "none", name: "Original", effects: {} },
    { id: "vintage", name: "Vintage", effects: { sepia: 40, contrast: 120, brightness: 110 } },
    { id: "bw", name: "Black & White", effects: { grayscale: 100, contrast: 110 } },
    { id: "warm", name: "Warm", effects: { hue: 15, saturation: 120, brightness: 105 } },
    { id: "cool", name: "Cool", effects: { hue: -15, saturation: 110, brightness: 95 } },
    { id: "dramatic", name: "Dramatic", effects: { contrast: 150, brightness: 90, saturation: 130 } },
    { id: "soft", name: "Soft", effects: { blur: 1, brightness: 105, contrast: 95 } },
    { id: "vivid", name: "Vivid", effects: { saturation: 150, contrast: 120, brightness: 105 } },
    { id: "retro", name: "Retro", effects: { sepia: 30, hue: 20, contrast: 110, brightness: 95 } },
    { id: "noir", name: "Film Noir", effects: { grayscale: 100, contrast: 140, brightness: 85 } },
  ]

  // Generate CSS filter string
  const generateFilterString = useCallback(() => {
    return [
      `brightness(${brightness}%)`,
      `contrast(${contrast}%)`,
      `saturate(${saturation}%)`,
      `hue-rotate(${hue}deg)`,
      `blur(${blur}px)`,
      `sepia(${sepia}%)`,
      `grayscale(${grayscale}%)`,
      `invert(${invert}%)`,
    ].join(" ")
  }, [brightness, contrast, saturation, hue, blur, sepia, grayscale, invert])

  // Apply preset
  const applyPreset = useCallback((preset: (typeof presets)[0]) => {
    setSelectedPreset(preset.id)

    // Reset all values first
    setBrightness(100)
    setContrast(100)
    setSaturation(100)
    setHue(0)
    setBlur(0)
    setSepia(0)
    setGrayscale(0)
    setInvert(0)

    // Apply preset values
    if (preset.effects.brightness) setBrightness(preset.effects.brightness)
    if (preset.effects.contrast) setContrast(preset.effects.contrast)
    if (preset.effects.saturation) setSaturation(preset.effects.saturation)
    if (preset.effects.hue) setHue(preset.effects.hue)
    if (preset.effects.blur) setBlur(preset.effects.blur)
    if (preset.effects.sepia) setSepia(preset.effects.sepia)
    if (preset.effects.grayscale) setGrayscale(preset.effects.grayscale)
    if (preset.effects.invert) setInvert(preset.effects.invert)
  }, [])

  // Reset all effects
  const resetEffects = useCallback(() => {
    setBrightness(100)
    setContrast(100)
    setSaturation(100)
    setHue(0)
    setBlur(0)
    setSepia(0)
    setGrayscale(0)
    setInvert(0)
    setSelectedPreset("none")
  }, [])

  // Update effects array when values change
  useEffect(() => {
    const effects = []
    if (brightness !== 100) effects.push(`brightness-${brightness}`)
    if (contrast !== 100) effects.push(`contrast-${contrast}`)
    if (saturation !== 100) effects.push(`saturation-${saturation}`)
    if (hue !== 0) effects.push(`hue-${hue}`)
    if (blur !== 0) effects.push(`blur-${blur}`)
    if (sepia !== 0) effects.push(`sepia-${sepia}`)
    if (grayscale !== 0) effects.push(`grayscale-${grayscale}`)
    if (invert !== 0) effects.push(`invert-${invert}`)
    if (selectedPreset !== "none") effects.push(`preset-${selectedPreset}`)

    onEffectsChange(effects)
  }, [brightness, contrast, saturation, hue, blur, sepia, grayscale, invert, selectedPreset, onEffectsChange])

  // Download processed image
  const downloadImage = useCallback(async () => {
    if (!mediaUrl || mediaType !== "photo") return

    try {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const img = new Image()
      img.crossOrigin = "anonymous"

      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height

        // Apply filter
        ctx.filter = generateFilterString()
        ctx.drawImage(img, 0, 0)

        // Download
        const link = document.createElement("a")
        link.download = `pinit-effects-${Date.now()}.jpg`
        link.href = canvas.toDataURL("image/jpeg", 0.9)
        link.click()
      }

      img.src = mediaUrl
    } catch (error) {
      console.error("Failed to download image:", error)
    }
  }, [mediaUrl, mediaType, generateFilterString])

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "#1a202c",
        color: "white",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem",
          background: "rgba(0,0,0,0.5)",
        }}
      >
        <button
          onClick={onBack}
          style={{
            padding: "0.5rem",
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={20} />
        </button>

        <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: "bold" }}>Effects & Filters</h2>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={resetEffects}
            style={{
              padding: "0.5rem",
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              cursor: "pointer",
            }}
            title="Reset All"
          >
            <RotateCcw size={16} />
          </button>

          {mediaType === "photo" && (
            <button
              onClick={downloadImage}
              style={{
                padding: "0.5rem",
                borderRadius: "50%",
                border: "none",
                background: "#10B981",
                color: "white",
                cursor: "pointer",
              }}
              title="Download"
            >
              <Download size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Preview */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          background: "#2d3748",
        }}
      >
        {mediaUrl && (
          <div
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              borderRadius: "0.5rem",
              overflow: "hidden",
              boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
            }}
          >
            {mediaType === "photo" ? (
              <img
                src={mediaUrl || "/placeholder.svg"}
                alt="Preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: "400px",
                  objectFit: "contain",
                  filter: generateFilterString(),
                  transition: "filter 0.3s ease",
                }}
              />
            ) : (
              <video
                ref={videoRef}
                src={mediaUrl}
                style={{
                  maxWidth: "100%",
                  maxHeight: "400px",
                  objectFit: "contain",
                  filter: generateFilterString(),
                  transition: "filter 0.3s ease",
                }}
                controls
                muted
              />
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div
        style={{
          padding: "1rem",
          background: "rgba(0,0,0,0.8)",
          maxHeight: "60vh",
          overflowY: "auto",
        }}
      >
        {/* Preset Filters */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <Sparkles size={16} />
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "bold" }}>Preset Filters</h3>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
              gap: "0.5rem",
            }}
          >
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                style={{
                  padding: "0.75rem 0.5rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: selectedPreset === preset.id ? "#3B82F6" : "rgba(255,255,255,0.1)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  textAlign: "center",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  if (selectedPreset !== preset.id) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.15)"
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedPreset !== preset.id) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.1)"
                  }
                }}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Manual Adjustments */}
        <div>
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: "bold" }}>⚡ Manual Adjustments</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Brightness */}
            <div>
              <label
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.875rem",
                  marginBottom: "0.5rem",
                }}
              >
                <span>Brightness</span>
                <span>{brightness}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="200"
                value={brightness}
                onChange={(e) => {
                  setBrightness(Number(e.target.value))
                  setSelectedPreset("custom")
                }}
                style={{ width: "100%" }}
              />
            </div>

            {/* Contrast */}
            <div>
              <label
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.875rem",
                  marginBottom: "0.5rem",
                }}
              >
                <span>Contrast</span>
                <span>{contrast}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="200"
                value={contrast}
                onChange={(e) => {
                  setContrast(Number(e.target.value))
                  setSelectedPreset("custom")
                }}
                style={{ width: "100%" }}
              />
            </div>

            {/* Saturation */}
            <div>
              <label
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.875rem",
                  marginBottom: "0.5rem",
                }}
              >
                <span>Saturation</span>
                <span>{saturation}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="200"
                value={saturation}
                onChange={(e) => {
                  setSaturation(Number(e.target.value))
                  setSelectedPreset("custom")
                }}
                style={{ width: "100%" }}
              />
            </div>

            {/* Hue */}
            <div>
              <label
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.875rem",
                  marginBottom: "0.5rem",
                }}
              >
                <span>Hue</span>
                <span>{hue}°</span>
              </label>
              <input
                type="range"
                min="-180"
                max="180"
                value={hue}
                onChange={(e) => {
                  setHue(Number(e.target.value))
                  setSelectedPreset("custom")
                }}
                style={{ width: "100%" }}
              />
            </div>

            {/* Blur */}
            <div>
              <label
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.875rem",
                  marginBottom: "0.5rem",
                }}
              >
                <span>Blur</span>
                <span>{blur}px</span>
              </label>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={blur}
                onChange={(e) => {
                  setBlur(Number(e.target.value))
                  setSelectedPreset("custom")
                }}
                style={{ width: "100%" }}
              />
            </div>

            {/* Sepia */}
            <div>
              <label
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.875rem",
                  marginBottom: "0.5rem",
                }}
              >
                <span>Sepia</span>
                <span>{sepia}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={sepia}
                onChange={(e) => {
                  setSepia(Number(e.target.value))
                  setSelectedPreset("custom")
                }}
                style={{ width: "100%" }}
              />
            </div>

            {/* Grayscale */}
            <div>
              <label
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.875rem",
                  marginBottom: "0.5rem",
                }}
              >
                <span>Grayscale</span>
                <span>{grayscale}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={grayscale}
                onChange={(e) => {
                  setGrayscale(Number(e.target.value))
                  setSelectedPreset("custom")
                }}
                style={{ width: "100%" }}
              />
            </div>

            {/* Invert */}
            <div>
              <label
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.875rem",
                  marginBottom: "0.5rem",
                }}
              >
                <span>Invert</span>
                <span>{invert}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={invert}
                onChange={(e) => {
                  setInvert(Number(e.target.value))
                  setSelectedPreset("custom")
                }}
                style={{ width: "100%" }}
              />
            </div>
          </div>
        </div>

        {/* Current Filter Info */}
        <div
          style={{
            marginTop: "2rem",
            padding: "1rem",
            background: "rgba(59, 130, 246, 0.1)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            borderRadius: "0.5rem",
          }}
        >
          <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.875rem", fontWeight: "bold", color: "#60A5FA" }}>
            Current Filter
          </h4>
          <code style={{ fontSize: "0.75rem", opacity: 0.8, wordBreak: "break-all" }}>{generateFilterString()}</code>
        </div>
      </div>
    </div>
  )
}
