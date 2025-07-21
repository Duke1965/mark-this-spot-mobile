"use client"

import { useState, useCallback } from "react"
import { ArrowLeft, Play } from "lucide-react"
import type { PinData } from "@/app/page"

interface PinStoryBuilderProps {
  pins: PinData[]
  onBack: () => void
  onCreateStory: (selectedPins: PinData[], title: string) => void
}

export function PinStoryBuilder({ pins, onBack, onCreateStory }: PinStoryBuilderProps) {
  const [selectedPins, setSelectedPins] = useState<PinData[]>([])
  const [storyTitle, setStoryTitle] = useState("")
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  const pinsWithMedia = pins.filter((pin) => pin.mediaUrl)

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

  const startPreview = useCallback(() => {
    if (selectedPins.length === 0) return
    setIsPlaying(true)
    setCurrentPreviewIndex(0)

    // Auto-advance preview every 3 seconds
    const interval = setInterval(() => {
      setCurrentPreviewIndex((prev) => {
        if (prev >= selectedPins.length - 1) {
          setIsPlaying(false)
          clearInterval(interval)
          return 0
        }
        return prev + 1
      })
    }, 3000)
  }, [selectedPins])

  const generateStoryTitle = useCallback(() => {
    if (selectedPins.length === 0) return

    const locations = selectedPins.map((pin) => pin.locationName.split(",")[0]).slice(0, 2)
    const suggestedTitle = `Journey through ${locations.join(" & ")}`
    setStoryTitle(suggestedTitle)
  }, [selectedPins])

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #581c87 100%)",
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
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            onClick={onBack}
            style={{
              padding: "0.5rem",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              cursor: "pointer",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "bold" }}>📖 Story Builder</h1>
        </div>

        {selectedPins.length > 0 && (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={startPreview}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                border: "none",
                background: "#8B5CF6",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Play size={16} />
              Preview
            </button>
          </div>
        )}
      </div>

      {/* Story Title Input */}
      <div style={{ padding: "1rem", background: "rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Enter story title..."
            value={storyTitle}
            onChange={(e) => setStoryTitle(e.target.value)}
            style={{
              flex: 1,
              padding: "0.75rem",
              borderRadius: "8px",
              border: "none",
              background: "rgba(255,255,255,0.1)",
              color: "white",
              fontSize: "1rem",
            }}
          />
          <button
            onClick={generateStoryTitle}
            style={{
              padding: "0.75rem",
              borderRadius: "8px",
              border: "none",
              background: "#10B981",
              color: "white",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            ✨ Auto
          </button>
        </div>
        <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", opacity: 0.7, color: "white" }}>
          {selectedPins.length} pins selected
        </p>
      </div>

      {/* Pin Selection Grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
        {pinsWithMedia.length === 0 ? (
          <div style={{ textAlign: "center", color: "white", padding: "2rem" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📸</div>
            <h2>No Media Pins Yet</h2>
            <p>Create pins with photos or videos to build stories!</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "1rem" }}>
            {pinsWithMedia.map((pin) => {
              const isSelected = selectedPins.some((p) => p.id === pin.id)
              return (
                <div
                  key={pin.id}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    overflow: "hidden",
                    cursor: "pointer",
                    border: isSelected ? "3px solid #10B981" : "3px solid transparent",
                    transition: "all 0.3s ease",
                  }}
                  onClick={() => togglePinSelection(pin)}
                >
                  {pin.mediaUrl && (
                    <div style={{ position: "relative" }}>
                      <img
                        src={pin.mediaUrl || "/placeholder.svg"}
                        alt={pin.title}
                        style={{
                          width: "100%",
                          height: "120px",
                          objectFit: "cover",
                        }}
                      />
                      {isSelected && (
                        <div
                          style={{
                            position: "absolute",
                            top: "0.5rem",
                            right: "0.5rem",
                            background: "#10B981",
                            borderRadius: "50%",
                            width: "24px",
                            height: "24px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: "0.75rem",
                            fontWeight: "bold",
                          }}
                        >
                          ✓
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ padding: "0.75rem", color: "white" }}>
                    <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "0.875rem", fontWeight: "bold" }}>{pin.title}</h4>
                    <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.8 }}>{pin.locationName.split(",")[0]}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Story Button */}
      {selectedPins.length > 0 && storyTitle.trim() && (
        <div style={{ padding: "1rem", background: "rgba(0,0,0,0.3)" }}>
          <button
            onClick={handleCreateStory}
            style={{
              width: "100%",
              padding: "1rem",
              borderRadius: "12px",
              border: "none",
              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
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
            📖 Create Story ({selectedPins.length} pins)
          </button>
        </div>
      )}

      {/* Preview Modal */}
      {isPlaying && selectedPins.length > 0 && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.95)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div style={{ textAlign: "center", color: "white", maxWidth: "90%", maxHeight: "90%" }}>
            <button
              onClick={() => setIsPlaying(false)}
              style={{
                position: "absolute",
                top: "2rem",
                right: "2rem",
                padding: "0.5rem",
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
                borderRadius: "8px",
                fontSize: "1.5rem",
              }}
            >
              ✕
            </button>

            {selectedPins[currentPreviewIndex]?.mediaUrl && (
              <img
                src={selectedPins[currentPreviewIndex].mediaUrl || "/placeholder.svg"}
                alt={selectedPins[currentPreviewIndex].title}
                style={{
                  maxWidth: "100%",
                  maxHeight: "70vh",
                  objectFit: "contain",
                  borderRadius: "12px",
                }}
              />
            )}

            <div style={{ marginTop: "1rem" }}>
              <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.5rem" }}>{selectedPins[currentPreviewIndex]?.title}</h3>
              <p style={{ margin: 0, opacity: 0.8 }}>{selectedPins[currentPreviewIndex]?.locationName}</p>
              <div style={{ marginTop: "1rem", display: "flex", gap: "0.25rem", justifyContent: "center" }}>
                {selectedPins.map((_, index) => (
                  <div
                    key={index}
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: index === currentPreviewIndex ? "white" : "rgba(255,255,255,0.3)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
