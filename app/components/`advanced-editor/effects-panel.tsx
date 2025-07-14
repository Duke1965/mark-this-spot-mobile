"use client"

import type React from "react"

import { useState } from "react"
import { Sliders, Palette, Sun, Moon, Zap, Heart, Sparkles, Camera } from "lucide-react"

interface Effect {
  id: string
  name: string
  icon: React.ReactNode
  filter: string
  description: string
}

interface EffectsPanelProps {
  onEffectChange: (filter: string) => void
  currentEffect: string
}

const PHOTO_EFFECTS: Effect[] = [
  {
    id: "none",
    name: "Original",
    icon: <Camera size={16} />,
    filter: "none",
    description: "No filter applied",
  },
  {
    id: "vintage",
    name: "Vintage",
    icon: <Sun size={16} />,
    filter: "sepia(0.8) contrast(1.2) brightness(1.1)",
    description: "Classic vintage look",
  },
  {
    id: "bw",
    name: "B&W",
    icon: <Moon size={16} />,
    filter: "grayscale(1) contrast(1.2)",
    description: "Black and white",
  },
  {
    id: "vibrant",
    name: "Vibrant",
    icon: <Zap size={16} />,
    filter: "saturate(1.5) contrast(1.3) brightness(1.1)",
    description: "Enhanced colors",
  },
  {
    id: "cool",
    name: "Cool",
    icon: <Sparkles size={16} />,
    filter: "hue-rotate(180deg) saturate(1.2)",
    description: "Cool blue tones",
  },
  {
    id: "warm",
    name: "Warm",
    icon: <Heart size={16} />,
    filter: "hue-rotate(30deg) saturate(1.3) brightness(1.1)",
    description: "Warm golden tones",
  },
  {
    id: "dramatic",
    name: "Dramatic",
    icon: <Palette size={16} />,
    filter: "contrast(1.5) saturate(0.8) brightness(0.9)",
    description: "High contrast",
  },
  {
    id: "soft",
    name: "Soft Focus",
    icon: <Sliders size={16} />,
    filter: "blur(0.5px) brightness(1.1) saturate(1.1)",
    description: "Dreamy soft look",
  },
]

export function EffectsPanel({ onEffectChange, currentEffect }: EffectsPanelProps) {
  const [selectedEffect, setSelectedEffect] = useState(currentEffect)
  const [showManualControls, setShowManualControls] = useState(false)
  const [manualSettings, setManualSettings] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    hue: 0,
  })

  const handleEffectSelect = (effect: Effect) => {
    setSelectedEffect(effect.filter)
    onEffectChange(effect.filter)
  }

  const handleManualChange = (setting: string, value: number) => {
    const newSettings = { ...manualSettings, [setting]: value }
    setManualSettings(newSettings)

    const filter = `brightness(${newSettings.brightness}%) contrast(${newSettings.contrast}%) saturate(${newSettings.saturation}%) blur(${newSettings.blur}px) hue-rotate(${newSettings.hue}deg)`
    setSelectedEffect(filter)
    onEffectChange(filter)
  }

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.9)",
        padding: "1rem",
        borderRadius: "1rem",
        maxHeight: "400px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <h3
          style={{
            color: "white",
            margin: 0,
            fontSize: "1.1rem",
            fontWeight: "600",
          }}
        >
          Effects & Filters
        </h3>
        <button
          onClick={() => setShowManualControls(!showManualControls)}
          style={{
            padding: "0.5rem",
            borderRadius: "0.5rem",
            border: "none",
            background: showManualControls ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.1)",
            color: "white",
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
        >
          <Sliders size={16} />
        </button>
      </div>

      {/* Preset Effects */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "0.75rem",
          marginBottom: showManualControls ? "1.5rem" : "0",
        }}
      >
        {PHOTO_EFFECTS.map((effect) => (
          <button
            key={effect.id}
            onClick={() => handleEffectSelect(effect)}
            style={{
              padding: "0.75rem",
              borderRadius: "0.75rem",
              border: selectedEffect === effect.filter ? "2px solid #10B981" : "1px solid rgba(255,255,255,0.2)",
              background: selectedEffect === effect.filter ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.1)",
              color: "white",
              cursor: "pointer",
              transition: "all 0.3s ease",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
              textAlign: "center",
            }}
          >
            {effect.icon}
            <div>
              <div style={{ fontSize: "0.875rem", fontWeight: "500" }}>{effect.name}</div>
              <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>{effect.description}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Manual Controls */}
      {showManualControls && (
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            padding: "1rem",
            borderRadius: "0.75rem",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <h4
            style={{
              color: "white",
              margin: "0 0 1rem 0",
              fontSize: "0.9rem",
              fontWeight: "500",
            }}
          >
            Manual Adjustments
          </h4>

          {Object.entries(manualSettings).map(([key, value]) => (
            <div key={key} style={{ marginBottom: "1rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <label
                  style={{
                    color: "rgba(255,255,255,0.8)",
                    fontSize: "0.8rem",
                    textTransform: "capitalize",
                  }}
                >
                  {key}
                </label>
                <span
                  style={{
                    color: "white",
                    fontSize: "0.8rem",
                    fontWeight: "500",
                  }}
                >
                  {value}
                  {key === "blur" ? "px" : key === "hue" ? "°" : "%"}
                </span>
              </div>
              <input
                type="range"
                min={key === "blur" ? 0 : key === "hue" ? -180 : 0}
                max={key === "blur" ? 10 : key === "hue" ? 180 : 200}
                value={value}
                onChange={(e) => handleManualChange(key, Number.parseInt(e.target.value))}
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
          ))}

          <button
            onClick={() => {
              const resetSettings = {
                brightness: 100,
                contrast: 100,
                saturation: 100,
                blur: 0,
                hue: 0,
              }
              setManualSettings(resetSettings)
              onEffectChange("none")
              setSelectedEffect("none")
            }}
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(239, 68, 68, 0.2)",
              color: "rgba(239, 68, 68, 0.9)",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: "500",
              transition: "all 0.3s ease",
            }}
          >
            Reset All
          </button>
        </div>
      )}
    </div>
  )
}
