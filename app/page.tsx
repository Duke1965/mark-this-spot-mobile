"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Mic, MicOff, MapPin, Sparkles } from "lucide-react"
import { useLocationServices } from "../src/hooks/useLocationServices"
import { EnhancedAudio, type EnhancedAudioRef } from "../components/enhanced-audio"

type AppMode = "capture" | "editor" | "advanced" | "story"
type MediaType = "photo" | "video"

interface PinData {
  id: string
  title: string
  mediaUrl: string
  mediaType: MediaType
  location: string
  coordinates: { lat: number; lng: number }
  timestamp: number
  audioUrl: string | null
  effects: string[]
  stickers: any[]
  canvasData: any
}

export default function PINITApp() {
  // Core state
  const [mode, setMode] = useState<AppMode>("capture")
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<MediaType>("photo")
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)

  // Enhanced PINIT features
  const [currentPin, setCurrentPin] = useState<PinData | null>(null)
  const [savedPins, setSavedPins] = useState<PinData[]>([])
  const [aiAssistantActive, setAiAssistantActive] = useState(false)

  // Editor state
  const [effects, setEffects] = useState<string[]>([])
  const [stickers, setStickers] = useState<any[]>([])
  const [canvasData, setCanvasData] = useState<any>({})

  // Location services
  const { location, isLoading: locationLoading } = useLocationServices()

  // Audio recording ref
  const audioRecorderRef = useRef<EnhancedAudioRef>(null)

  // Auto-save pins to localStorage
  useEffect(() => {
    const saved = localStorage.getItem("pinit-pins")
    if (saved) {
      try {
        setSavedPins(JSON.parse(saved))
      } catch (error) {
        console.error("Failed to parse saved pins:", error)
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("pinit-pins", JSON.stringify(savedPins))
  }, [savedPins])

  // Media capture handlers
  const handlePhotoCapture = useCallback((photoUrl: string) => {
    setMediaUrl(photoUrl)
    setMediaType("photo")
    console.log("📸 Photo captured:", photoUrl)
  }, [])

  const handleVideoCapture = useCallback((videoUrl: string) => {
    setMediaUrl(videoUrl)
    setMediaType("video")
    console.log("🎥 Video captured:", videoUrl)
  }, [])

  // Audio recording handlers
  const startRecording = useCallback(() => {
    setIsRecording(true)
    audioRecorderRef.current?.startRecording()
    console.log("🎤 Started recording audio")
  }, [])

  const stopRecording = useCallback(() => {
    setIsRecording(false)
    audioRecorderRef.current?.stopRecording()
    console.log("🎤 Stopped recording audio")
  }, [])

  const handleAudioRecorded = useCallback((audioUrl: string) => {
    setAudioUrl(audioUrl)
    console.log("🎵 Audio recorded:", audioUrl)
  }, [])

  // Create new pin
  const createPin = useCallback(async () => {
    if (!mediaUrl || !location) return null

    const newPin: PinData = {
      id: `pin-${Date.now()}`,
      title: `Pin at ${location.name}`,
      mediaUrl,
      mediaType,
      location: location.name,
      coordinates: { lat: location.latitude, lng: location.longitude },
      timestamp: Date.now(),
      audioUrl,
      effects,
      stickers,
      canvasData,
    }

    setCurrentPin(newPin)
    setSavedPins((prev) => [newPin, ...prev])
    return newPin
  }, [mediaUrl, location, mediaType, audioUrl, effects, stickers, canvasData])

  // Reset to capture mode
  const resetToCapture = useCallback(() => {
    setMode("capture")
    setMediaUrl(null)
    setAudioUrl(null)
    setEffects([])
    setStickers([])
    setCanvasData({})
    setCurrentPin(null)
  }, [])

  return (
    <div
      style={{
        height: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Enhanced Audio Component */}
      <EnhancedAudio ref={audioRecorderRef} onAudioRecorded={handleAudioRecorded} isRecording={isRecording} />

      {/* Main Content - Capture Mode */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header with location */}
        <div
          style={{
            padding: "1rem",
            background: "rgba(0,0,0,0.8)",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <MapPin size={16} />
            <span style={{ fontSize: "0.875rem" }}>
              {locationLoading ? "Getting location..." : location?.name || "Location unavailable"}
            </span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => setAiAssistantActive(!aiAssistantActive)}
              style={{
                padding: "0.5rem",
                borderRadius: "0.5rem",
                border: "none",
                background: aiAssistantActive ? "rgba(16, 185, 129, 0.8)" : "rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
              }}
              title="AI Assistant"
            >
              <Sparkles size={16} />
            </button>
          </div>
        </div>

        {/* Camera Placeholder */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: "2rem",
            color: "white",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "4rem" }}>📷</div>
          <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: "bold" }}>PINIT Enhanced</h1>
          <p style={{ margin: 0, opacity: 0.8, maxWidth: "300px" }}>
            Your mobile-first location-based media capture and storytelling app
          </p>

          {/* Mock Capture Buttons */}
          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              onClick={() => handlePhotoCapture("/placeholder.svg?height=400&width=600")}
              style={{
                padding: "1rem 2rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "#3B82F6",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              📸 Take Photo
            </button>
            <button
              onClick={() => handleVideoCapture("/placeholder.svg?height=400&width=600")}
              style={{
                padding: "1rem 2rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "#EF4444",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              🎥 Record Video
            </button>
          </div>
        </div>

        {/* Audio Controls */}
        <div
          style={{
            padding: "1rem",
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            justifyContent: "center",
            gap: "1rem",
          }}
        >
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            style={{
              padding: "1rem",
              borderRadius: "50%",
              border: "none",
              background: isRecording ? "#EF4444" : "rgba(255,255,255,0.2)",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
        </div>

        {/* Media Preview & Actions */}
        {mediaUrl && (
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: "rgba(0,0,0,0.9)",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div style={{ textAlign: "center" }}>
              {mediaType === "photo" ? (
                <img
                  src={mediaUrl || "/placeholder.svg"}
                  alt="Captured"
                  style={{ maxWidth: "100px", maxHeight: "100px", borderRadius: "0.5rem" }}
                />
              ) : (
                <video src={mediaUrl} style={{ maxWidth: "100px", maxHeight: "100px", borderRadius: "0.5rem" }} muted />
              )}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={createPin}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: "#10B981",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Save Pin
              </button>
              <button
                onClick={resetToCapture}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Saved Pins Count */}
      {savedPins.length > 0 && (
        <div
          style={{
            position: "fixed",
            top: "1rem",
            right: "1rem",
            background: "rgba(0,0,0,0.8)",
            color: "white",
            padding: "0.5rem 1rem",
            borderRadius: "1rem",
            fontSize: "0.875rem",
            fontWeight: "bold",
          }}
        >
          📌 {savedPins.length} Pins Saved
        </div>
      )}
    </div>
  )
}
