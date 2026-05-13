"use client"

import { useState, useCallback } from "react"
import { ArrowLeft, Play, Share2, Download, Plus } from "lucide-react"
import type { PinData } from "@/lib/types"

interface PinStoryBuilderProps {
  pins: PinData[]
  onBack: () => void
  onCreateStory: (selectedPins: PinData[], storyTitle: string) => void
}

export function PinStoryBuilder({ pins, onBack, onCreateStory }: PinStoryBuilderProps) {
  const [selectedPins, setSelectedPins] = useState<PinData[]>([])
  const [storyTitle, setStoryTitle] = useState("")
  const [showPreview, setShowPreview] = useState(false)

  const togglePinSelection = useCallback((pin: PinData) => {
    setSelectedPins((prev) => {
      const isSelected = prev.some((p) => p.id === pin.id)
      if (isSelected) {
        return prev.filter((p) => p.id !== pin.id)
      } else {
        return [...prev, pin]
      }
    })
  }, [])

  const handleCreateStory = useCallback(() => {
    if (selectedPins.length > 0 && storyTitle.trim()) {
      onCreateStory(selectedPins, storyTitle)
    }
  }, [selectedPins, storyTitle, onCreateStory])

  const pinsWithMedia = pins.filter((pin) => pin.mediaUrl)

  if (showPreview) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
            backgroundColor: "#eef8f4",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1rem",
            background: "rgba(255,255,255,0.7)", backdropFilter: "blur(18px)", borderBottom: "1px solid rgba(0,0,0,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#3a2e1e",
            backdropFilter: "blur(15px)",
            borderBottom: "1px solid rgba(79,59,43,0.1)",
          }}
        >
          <button
            onClick={() => setShowPreview(false)}
            style={{
            padding: "0.75rem",
            borderRadius: "0.75rem",
            border: "1px solid rgba(79,59,43,0.12)",
            background: "rgba(79,59,43,0.06)",
              color: "#3a2e1e",
              cursor: "pointer",
            transition: "all 0.2s ease",
            backdropFilter: "blur(10px)",
            }}
          >
            <ArrowLeft size={20} />
          </button>

          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "bold" }}>Story Preview</h1>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => alert("Story shared! (Demo)")}
              style={{
                padding: "0.5rem",
                border: "none",
                background: "#10B981",
                color: "#3a2e1e",
                cursor: "pointer",
                borderRadius: "0.5rem",
              }}
            >
              <Share2 size={20} />
            </button>
            <button
              onClick={() => alert("Story downloaded! (Demo)")}
              style={{
                padding: "0.5rem",
                border: "none",
                background: "#3B82F6",
                color: "#3a2e1e",
                cursor: "pointer",
                borderRadius: "0.5rem",
              }}
            >
              <Download size={20} />
            </button>
          </div>
        </div>

        {/* Story Preview */}
        <div style={{ flex: 1, padding: "1rem", overflowY: "auto" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.55)",
              borderRadius: "1rem",
              padding: "1.5rem",
              color: "#3a2e1e",
              textAlign: "center",
            }}
          >
            <h2 style={{ margin: "0 0 1rem 0", fontSize: "2rem", fontWeight: "bold" }}>{storyTitle}</h2>

            <div style={{ display: "grid", gap: "1rem" }}>
              {selectedPins.map((pin, index) => (
                <div
                  key={pin.id}
                  style={{
                    background: "rgba(255,255,255,0.55)",
                    borderRadius: "0.5rem",
                    padding: "1rem",
                    display: "flex",
                    gap: "1rem",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      background: "#3B82F6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#3a2e1e",
                      fontWeight: "bold",
                    }}
                  >
                    {index + 1}
                  </div>

                  {pin.mediaUrl && (
                    <img
                      src={pin.mediaUrl || "/placeholder.svg"}
                      alt={pin.title}
                      style={{
                        width: "80px",
                        height: "80px",
                        objectFit: "cover",
                        borderRadius: "0.5rem",
                      }}
                    />
                  )}

                  <div style={{ flex: 1, textAlign: "left" }}>
                    <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", fontWeight: "bold" }}>{pin.title}</h3>
                    <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.875rem", opacity: 0.8 }}>📍 {pin.locationName}</p>
                    {pin.description && (
                      <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.7 }}>{pin.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleCreateStory}
              style={{
                marginTop: "2rem",
                padding: "1rem 2rem",
                border: "none",
                background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                color: "#3a2e1e",
                cursor: "pointer",
                borderRadius: "0.5rem",
                fontSize: "1rem",
                fontWeight: "bold",
              }}
            >
              Create Story
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#eef8f4",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1rem",
          background: "rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "#3a2e1e",
        }}
      >
        <button
          onClick={onBack}
          style={{
            padding: "0.5rem",
            border: "none",
            background: "rgba(79,59,43,0.08)",
            color: "#3a2e1e",
            cursor: "pointer",
            borderRadius: "0.5rem",
          }}
        >
          <ArrowLeft size={20} />
        </button>

        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "bold" }}>📖 Create Story</h1>

        <button
          onClick={() => setShowPreview(true)}
          disabled={selectedPins.length === 0 || !storyTitle.trim()}
          style={{
            padding: "0.5rem 1rem",
            border: "none",
            background: selectedPins.length > 0 && storyTitle.trim() ? "#10B981" : "rgba(79,59,43,0.08)",
            color: "#3a2e1e",
            cursor: selectedPins.length > 0 && storyTitle.trim() ? "pointer" : "not-allowed",
            borderRadius: "0.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Play size={16} />
          Preview
        </button>
      </div>

      {/* Story Title Input */}
      <div style={{ padding: "1rem", background: "rgba(0,0,0,0.2)" }}>
        <input
          type="text"
          value={storyTitle}
          onChange={(e) => setStoryTitle(e.target.value)}
          placeholder="Enter your story title..."
          style={{
            width: "100%",
            padding: "0.75rem",
            border: "none",
            borderRadius: "0.5rem",
            background: "rgba(255,255,255,0.55)",
            color: "#3a2e1e",
            fontSize: "1rem",
            outline: "none",
          }}
        />
      </div>

      {/* Selected Pins Counter */}
      {selectedPins.length > 0 && (
        <div
          style={{
            padding: "0.5rem 1rem",
            background: "rgba(16,185,129,0.2)",
            color: "#3a2e1e",
            textAlign: "center",
            fontSize: "0.875rem",
          }}
        >
          {selectedPins.length} pin{selectedPins.length !== 1 ? "s" : ""} selected for your story
        </div>
      )}

      {/* Pins Selection */}
      <div style={{ flex: 1, padding: "1rem", overflowY: "auto" }}>
        {pinsWithMedia.length === 0 ? (
          <div style={{ textAlign: "center", color: "#3a2e1e", padding: "2rem" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📸</div>
            <h2>No Media Pins Yet</h2>
            <p>Create pins with photos or videos to build stories!</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {pinsWithMedia.map((pin) => {
              const isSelected = selectedPins.some((p) => p.id === pin.id)
              return (
                <div
                  key={pin.id}
                  onClick={() => togglePinSelection(pin)}
                  style={{
                    background: isSelected ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.55)",
                    borderRadius: "0.5rem",
                    padding: "1rem",
                    color: "#3a2e1e",
                    cursor: "pointer",
                    border: isSelected ? "2px solid #10B981" : "2px solid transparent",
                    transition: "all 0.2s ease",
                    display: "flex",
                    gap: "1rem",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: isSelected ? "#10B981" : "rgba(79,59,43,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {isSelected ? (
                      <span style={{ fontSize: "0.75rem" }}>✓</span>
                    ) : (
                      <Plus size={12} style={{ opacity: 0.6 }} />
                    )}
                  </div>

                  {pin.mediaUrl && (
                    <img
                      src={pin.mediaUrl || "/placeholder.svg"}
                      alt={pin.title}
                      style={{
                        width: "60px",
                        height: "60px",
                        objectFit: "cover",
                        borderRadius: "0.5rem",
                        flexShrink: 0,
                      }}
                    />
                  )}

                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", fontWeight: "bold" }}>{pin.title}</h3>
                    <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.875rem", opacity: 0.8 }}>📍 {pin.locationName}</p>
                    <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.6 }}>
                      {new Date(pin.timestamp).toLocaleDateString()}
                    </p>
                  </div>

                  {isSelected && (
                    <div
                      style={{
                        background: "#10B981",
                        color: "#3a2e1e",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "0.25rem",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                      }}
                    >
                      #{selectedPins.findIndex((p) => p.id === pin.id) + 1}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
