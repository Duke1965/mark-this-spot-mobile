"use client"

import { useState, useCallback } from "react"
import { ArrowLeft, Play, Share2, Calendar, Check } from "lucide-react"
import type { PinData } from "@/app/page"

interface PinStoryBuilderProps {
  pins: PinData[]
  onBack: () => void
  onCreateStory: (selectedPins: PinData[], storyTitle: string) => void
}

export function PinStoryBuilder({ pins, onBack, onCreateStory }: PinStoryBuilderProps) {
  const [selectedPins, setSelectedPins] = useState<string[]>([])
  const [storyTitle, setStoryTitle] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0)

  // Filter pins with media for stories
  const mediaPins = pins.filter((pin) => pin.mediaUrl)

  // Auto-generate story suggestions
  const getWeeklyPins = useCallback(() => {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    return mediaPins.filter((pin) => new Date(pin.timestamp) >= oneWeekAgo)
  }, [mediaPins])

  const getRecommendedPins = useCallback(() => {
    return mediaPins.filter((pin) => pin.isRecommended || pin.tags?.includes("recommended"))
  }, [mediaPins])

  const handlePinToggle = useCallback((pinId: string) => {
    setSelectedPins((prev) => (prev.includes(pinId) ? prev.filter((id) => id !== pinId) : [...prev, pinId]))
  }, [])

  const handleQuickSelect = useCallback((pins: PinData[], title: string) => {
    setSelectedPins(pins.map((p) => p.id))
    setStoryTitle(title)
  }, [])

  const handleCreateStory = useCallback(() => {
    const selectedPinData = mediaPins.filter((pin) => selectedPins.includes(pin.id))
    onCreateStory(selectedPinData, storyTitle || "My PINIT Story")
  }, [selectedPins, storyTitle, mediaPins, onCreateStory])

  const generateShareableStoryLink = useCallback(() => {
    const selectedPinData = mediaPins.filter((pin) => selectedPins.includes(pin.id))
    const storyData = {
      title: storyTitle || "My PINIT Story",
      pins: selectedPinData.map((pin) => ({
        id: pin.id,
        title: pin.title,
        lat: pin.latitude,
        lng: pin.longitude,
        mediaUrl: pin.mediaUrl,
        mediaType: pin.mediaType,
      })),
    }

    const baseUrl = window.location.origin
    const encodedData = encodeURIComponent(JSON.stringify(storyData))
    const shareUrl = `${baseUrl}/shared-story?data=${encodedData}`

    navigator.clipboard.writeText(shareUrl)
    alert("Story link copied to clipboard!")
  }, [selectedPins, storyTitle, mediaPins])

  if (showPreview) {
    const selectedPinData = mediaPins.filter((pin) => selectedPins.includes(pin.id))
    const currentPin = selectedPinData[currentPreviewIndex]

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "#000000",
          color: "white",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Preview Header */}
        <div
          style={{
            position: "absolute",
            top: "1rem",
            left: "1rem",
            right: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 10,
            background: "rgba(0,0,0,0.5)",
            borderRadius: "0.5rem",
            padding: "0.75rem",
          }}
        >
          <button
            onClick={() => setShowPreview(false)}
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

          <div style={{ textAlign: "center" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "bold" }}>Story Preview</h3>
            <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.7 }}>
              {currentPreviewIndex + 1} of {selectedPinData.length}
            </p>
          </div>

          <button
            onClick={handleCreateStory}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#10B981",
              color: "white",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: "bold",
            }}
          >
            Create
          </button>
        </div>

        {/* Preview Content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {currentPin && (
            <>
              {currentPin.mediaType === "photo" ? (
                <img
                  src={currentPin.mediaUrl || "/placeholder.svg"}
                  alt={currentPin.title}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <video
                  src={currentPin.mediaUrl || undefined}
                  autoPlay
                  muted
                  loop
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                  }}
                />
              )}

              {/* Pin Info Overlay */}
              <div
                style={{
                  position: "absolute",
                  bottom: "2rem",
                  left: "1rem",
                  right: "1rem",
                  background: "rgba(0,0,0,0.7)",
                  borderRadius: "0.5rem",
                  padding: "1rem",
                  backdropFilter: "blur(10px)",
                }}
              >
                <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.125rem", fontWeight: "bold" }}>{currentPin.title}</h3>
                <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.875rem", opacity: 0.8 }}>
                  📍 {currentPin.locationName}
                </p>
                {currentPin.description && <p style={{ margin: 0, fontSize: "0.875rem" }}>{currentPin.description}</p>}
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <div
          style={{
            position: "absolute",
            bottom: "1rem",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "1rem",
            background: "rgba(0,0,0,0.7)",
            borderRadius: "2rem",
            padding: "1rem",
            backdropFilter: "blur(10px)",
          }}
        >
          <button
            onClick={() => setCurrentPreviewIndex(Math.max(0, currentPreviewIndex - 1))}
            disabled={currentPreviewIndex === 0}
            style={{
              padding: "0.75rem",
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              cursor: currentPreviewIndex === 0 ? "not-allowed" : "pointer",
              opacity: currentPreviewIndex === 0 ? 0.5 : 1,
            }}
          >
            ←
          </button>

          <button
            onClick={() => setCurrentPreviewIndex(Math.min(selectedPinData.length - 1, currentPreviewIndex + 1))}
            disabled={currentPreviewIndex === selectedPinData.length - 1}
            style={{
              padding: "0.75rem",
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              cursor: currentPreviewIndex === selectedPinData.length - 1 ? "not-allowed" : "pointer",
              opacity: currentPreviewIndex === selectedPinData.length - 1 ? 0.5 : 1,
            }}
          >
            →
          </button>
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
        background: "linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #581c87 100%)",
        display: "flex",
        flexDirection: "column",
        color: "white",
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

        <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>📖 Create Story</h1>

        <div style={{ width: "40px" }} />
      </div>

      {/* Story Title Input */}
      <div style={{ padding: "1rem", background: "rgba(0,0,0,0.2)" }}>
        <input
          type="text"
          value={storyTitle}
          onChange={(e) => setStoryTitle(e.target.value)}
          placeholder="Enter story title..."
          style={{
            width: "100%",
            padding: "0.75rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(255,255,255,0.3)",
            background: "rgba(255,255,255,0.1)",
            color: "white",
            fontSize: "1rem",
            backdropFilter: "blur(10px)",
          }}
        />
      </div>

      {/* Quick Select Options */}
      <div style={{ padding: "1rem" }}>
        <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: "bold" }}>🚀 Quick Story Ideas</h3>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            onClick={() => handleQuickSelect(getWeeklyPins(), "This Week's Adventures")}
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "rgba(59, 130, 246, 0.3)",
              color: "white",
              cursor: "pointer",
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Calendar size={16} />
            This Week ({getWeeklyPins().length})
          </button>

          <button
            onClick={() => handleQuickSelect(getRecommendedPins(), "My Recommendations")}
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "rgba(16, 185, 129, 0.3)",
              color: "white",
              cursor: "pointer",
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            ⭐ Recommended ({getRecommendedPins().length})
          </button>
        </div>
      </div>

      {/* Pin Selection Grid */}
      <div style={{ flex: 1, padding: "1rem", overflowY: "auto" }}>
        <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: "bold" }}>
          📍 Select Pins ({selectedPins.length} selected)
        </h3>

        {mediaPins.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", opacity: 0.7 }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📸</div>
            <p>No media pins available for stories.</p>
            <p>Take some photos or videos first!</p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: "1rem",
            }}
          >
            {mediaPins.map((pin) => (
              <div
                key={pin.id}
                onClick={() => handlePinToggle(pin.id)}
                style={{
                  position: "relative",
                  cursor: "pointer",
                  borderRadius: "0.5rem",
                  overflow: "hidden",
                  border: selectedPins.includes(pin.id) ? "3px solid #10B981" : "3px solid transparent",
                  transition: "all 0.3s ease",
                }}
              >
                {selectedPins.includes(pin.id) && (
                  <div
                    style={{
                      position: "absolute",
                      top: "0.5rem",
                      right: "0.5rem",
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: "#10B981",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 2,
                    }}
                  >
                    <Check size={16} color="white" />
                  </div>
                )}

                {pin.mediaType === "photo" ? (
                  <img
                    src={pin.mediaUrl || "/placeholder.svg"}
                    alt={pin.title}
                    style={{
                      width: "100%",
                      height: "120px",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <video
                    src={pin.mediaUrl || undefined}
                    style={{
                      width: "100%",
                      height: "120px",
                      objectFit: "cover",
                    }}
                    muted
                  />
                )}

                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
                    padding: "0.5rem",
                    color: "white",
                  }}
                >
                  <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: "bold" }}>{pin.title}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {selectedPins.length > 0 && (
        <div
          style={{
            padding: "1rem",
            background: "rgba(0,0,0,0.3)",
            display: "flex",
            gap: "1rem",
          }}
        >
          <button
            onClick={() => setShowPreview(true)}
            style={{
              flex: 1,
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "rgba(59, 130, 246, 0.8)",
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
            <Play size={20} />
            Preview Story
          </button>

          <button
            onClick={generateShareableStoryLink}
            style={{
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "rgba(16, 185, 129, 0.8)",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Share2 size={20} />
          </button>
        </div>
      )}
    </div>
  )
}
