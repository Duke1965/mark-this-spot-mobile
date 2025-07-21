"use client"

import { useState, useCallback } from "react"
import { Play, Share, MapPin, Camera, Video } from "lucide-react"

interface PinData {
  id: string
  title: string
  mediaUrl: string
  mediaType: "photo" | "video"
  location: string
  coordinates: { lat: number; lng: number }
  timestamp: number
  audioUrl?: string
  effects: string[]
  stickers: any[]
  canvasData: any
}

interface StoryData {
  id: string
  title: string
  pins: PinData[]
  createdAt: number
  isPublic: boolean
}

interface PinStoryModeProps {
  currentStory: StoryData | null
  savedPins: PinData[]
  onAddPin: (pin: PinData) => void
  onBackToCapture: () => void
  onCreatePin: () => Promise<PinData | null>
}

export function PinStoryMode({ currentStory, savedPins, onAddPin, onBackToCapture, onCreatePin }: PinStoryModeProps) {
  const [selectedPins, setSelectedPins] = useState<string[]>([])
  const [storyTitle, setStoryTitle] = useState(currentStory?.title || "")
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentPlayIndex, setCurrentPlayIndex] = useState(0)

  const handlePinSelect = useCallback((pinId: string) => {
    setSelectedPins((prev) => (prev.includes(pinId) ? prev.filter((id) => id !== pinId) : [...prev, pinId]))
  }, [])

  const handleAddSelectedPins = useCallback(() => {
    selectedPins.forEach((pinId) => {
      const pin = savedPins.find((p) => p.id === pinId)
      if (pin) {
        onAddPin(pin)
      }
    })
    setSelectedPins([])
  }, [selectedPins, savedPins, onAddPin])

  const playStory = useCallback(() => {
    if (!currentStory || currentStory.pins.length === 0) return

    setIsPlaying(true)
    setCurrentPlayIndex(0)

    // Auto-advance through pins every 3 seconds
    const interval = setInterval(() => {
      setCurrentPlayIndex((prev) => {
        if (prev >= currentStory.pins.length - 1) {
          setIsPlaying(false)
          clearInterval(interval)
          return 0
        }
        return prev + 1
      })
    }, 3000)
  }, [currentStory])

  const shareStory = useCallback(() => {
    if (!currentStory) return

    const storyText = `Check out my Pin Story: "${currentStory.title}" with ${currentStory.pins.length} amazing moments! 📍✨`

    if (navigator.share) {
      navigator.share({
        title: currentStory.title,
        text: storyText,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(storyText)
      alert("Story description copied to clipboard!")
    }
  }, [currentStory])

  return (
    <div
      style={{
        flex: 1,
        padding: "1rem",
        color: "white",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        overflowY: "auto",
      }}
    >
      {/* Story Header */}
      <div
        style={{
          background: "rgba(255,255,255,0.1)",
          borderRadius: "1rem",
          padding: "1.5rem",
          border: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{ fontSize: "2rem" }}>📖</div>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              value={storyTitle}
              onChange={(e) => setStoryTitle(e.target.value)}
              placeholder="Story Title"
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "0.5rem",
                border: "1px solid rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                fontSize: "1.125rem",
                fontWeight: "bold",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.875rem", opacity: 0.8 }}>
          <span>{currentStory?.pins.length || 0} pins</span>
          <span>•</span>
          <span>Created {currentStory ? new Date(currentStory.createdAt).toLocaleDateString() : "today"}</span>
        </div>
      </div>

      {/* Story Controls */}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          onClick={playStory}
          disabled={!currentStory || currentStory.pins.length === 0}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            padding: "0.75rem",
            borderRadius: "0.5rem",
            border: "none",
            background: isPlaying ? "#EF4444" : "#10B981",
            color: "white",
            cursor: currentStory && currentStory.pins.length > 0 ? "pointer" : "not-allowed",
            fontWeight: "bold",
            opacity: currentStory && currentStory.pins.length > 0 ? 1 : 0.5,
          }}
        >
          <Play size={16} />
          {isPlaying ? "Playing..." : "Play Story"}
        </button>

        <button
          onClick={shareStory}
          disabled={!currentStory || currentStory.pins.length === 0}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            padding: "0.75rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "#3B82F6",
            color: "white",
            cursor: currentStory && currentStory.pins.length > 0 ? "pointer" : "not-allowed",
            fontWeight: "bold",
            opacity: currentStory && currentStory.pins.length > 0 ? 1 : 0.5,
          }}
        >
          <Share size={16} />
          Share Story
        </button>
      </div>

      {/* Story Preview/Player */}
      {isPlaying && currentStory && currentStory.pins.length > 0 && (
        <div
          style={{
            background: "rgba(0,0,0,0.8)",
            borderRadius: "1rem",
            padding: "1rem",
            textAlign: "center",
          }}
        >
          <div style={{ marginBottom: "1rem" }}>
            <span style={{ fontSize: "0.875rem", opacity: 0.8 }}>
              {currentPlayIndex + 1} of {currentStory.pins.length}
            </span>
          </div>

          {currentStory.pins[currentPlayIndex] && (
            <div>
              {currentStory.pins[currentPlayIndex].mediaType === "photo" ? (
                <img
                  src={currentStory.pins[currentPlayIndex].mediaUrl || "/placeholder.svg"}
                  alt={currentStory.pins[currentPlayIndex].title}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "300px",
                    borderRadius: "0.5rem",
                    marginBottom: "1rem",
                  }}
                />
              ) : (
                <video
                  src={currentStory.pins[currentPlayIndex].mediaUrl}
                  autoPlay
                  muted
                  style={{
                    maxWidth: "100%",
                    maxHeight: "300px",
                    borderRadius: "0.5rem",
                    marginBottom: "1rem",
                  }}
                />
              )}

              <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.125rem" }}>
                {currentStory.pins[currentPlayIndex].title}
              </h3>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  fontSize: "0.875rem",
                  opacity: 0.8,
                }}
              >
                <MapPin size={14} />
                <span>{currentStory.pins[currentPlayIndex].location}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Current Story Pins */}
      {currentStory && currentStory.pins.length > 0 && !isPlaying && (
        <div>
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: "bold" }}>
            📌 Story Pins ({currentStory.pins.length})
          </h3>

          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "0.75rem" }}
          >
            {currentStory.pins.map((pin, index) => (
              <div
                key={pin.id}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "0.75rem",
                  padding: "0.75rem",
                  border: "1px solid rgba(255,255,255,0.2)",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "0.5rem",
                    left: "0.5rem",
                    background: "rgba(0,0,0,0.7)",
                    borderRadius: "50%",
                    width: "24px",
                    height: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: "bold",
                  }}
                >
                  {index + 1}
                </div>

                {pin.mediaType === "photo" ? (
                  <img
                    src={pin.mediaUrl || "/placeholder.svg"}
                    alt={pin.title}
                    style={{
                      width: "100%",
                      height: "100px",
                      objectFit: "cover",
                      borderRadius: "0.5rem",
                      marginBottom: "0.5rem",
                    }}
                  />
                ) : (
                  <video
                    src={pin.mediaUrl}
                    style={{
                      width: "100%",
                      height: "100px",
                      objectFit: "cover",
                      borderRadius: "0.5rem",
                      marginBottom: "0.5rem",
                    }}
                    muted
                  />
                )}

                <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "0.875rem", fontWeight: "bold" }}>{pin.title}</h4>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", opacity: 0.8 }}
                >
                  <MapPin size={12} />
                  <span>{pin.location}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Pins Section */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "bold" }}>📱 Available Pins ({savedPins.length})</h3>

          {selectedPins.length > 0 && (
            <button
              onClick={handleAddSelectedPins}
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
              Add {selectedPins.length} Pin{selectedPins.length > 1 ? "s" : ""}
            </button>
          )}
        </div>

        {savedPins.length === 0 ? (
          <div
            style={{
              background: "rgba(255,255,255,0.1)",
              borderRadius: "0.75rem",
              padding: "2rem",
              textAlign: "center",
              border: "2px dashed rgba(255,255,255,0.3)",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📍</div>
            <p style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: "bold" }}>No pins yet!</p>
            <p style={{ margin: "0 0 1.5rem 0", fontSize: "0.875rem", opacity: 0.8 }}>
              Go back to capture mode and create your first pin
            </p>
            <button
              onClick={onBackToCapture}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "#3B82F6",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Start Capturing
            </button>
          </div>
        ) : (
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "0.75rem" }}
          >
            {savedPins.map((pin) => (
              <div
                key={pin.id}
                onClick={() => handlePinSelect(pin.id)}
                style={{
                  background: selectedPins.includes(pin.id) ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.1)",
                  borderRadius: "0.75rem",
                  padding: "0.75rem",
                  border: selectedPins.includes(pin.id) ? "2px solid #10B981" : "1px solid rgba(255,255,255,0.2)",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  position: "relative",
                }}
              >
                {selectedPins.includes(pin.id) && (
                  <div
                    style={{
                      position: "absolute",
                      top: "0.5rem",
                      right: "0.5rem",
                      background: "#10B981",
                      borderRadius: "50%",
                      width: "20px",
                      height: "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                    }}
                  >
                    ✓
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  {pin.mediaType === "photo" ? <Camera size={14} /> : <Video size={14} />}
                  <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>
                    {new Date(pin.timestamp).toLocaleDateString()}
                  </span>
                </div>

                {pin.mediaType === "photo" ? (
                  <img
                    src={pin.mediaUrl || "/placeholder.svg"}
                    alt={pin.title}
                    style={{
                      width: "100%",
                      height: "80px",
                      objectFit: "cover",
                      borderRadius: "0.5rem",
                      marginBottom: "0.5rem",
                    }}
                  />
                ) : (
                  <video
                    src={pin.mediaUrl}
                    style={{
                      width: "100%",
                      height: "80px",
                      objectFit: "cover",
                      borderRadius: "0.5rem",
                      marginBottom: "0.5rem",
                    }}
                    muted
                  />
                )}

                <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "0.875rem", fontWeight: "bold" }}>{pin.title}</h4>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", opacity: 0.8 }}
                >
                  <MapPin size={12} />
                  <span>{pin.location}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div
        style={{
          background: "rgba(59, 130, 246, 0.1)",
          border: "1px solid rgba(59, 130, 246, 0.3)",
          borderRadius: "0.75rem",
          padding: "1rem",
        }}
      >
        <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.875rem", fontWeight: "bold" }}>💡 Story Tips</h4>
        <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.75rem", opacity: 0.9 }}>
          <li>Select multiple pins to add them to your story</li>
          <li>Pins will play in the order they were added</li>
          <li>Use the play button to preview your story</li>
          <li>Share your completed story with friends</li>
          <li>Stories are automatically saved as you build them</li>
        </ul>
      </div>
    </div>
  )
}
