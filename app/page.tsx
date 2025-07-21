"use client"

import { useState, useCallback, useRef } from "react"
import { Camera, BookOpen, Sparkles, ArrowLeft, FileImage, MapPin } from "lucide-react"
import { ReliableCamera } from "@/components/reliable-camera"
import { PinStoryMode } from "@/components/PinStoryMode"
import { AutoTitleGenerator } from "@/components/AutoTitleGenerator"
import { MobilePostcardEditor } from "@/components/mobile-postcard-editor"
import { AIAssistant } from "@/components/AIAssistant"
import { EnhancedAudio } from "@/components/enhanced-audio"
import { LocationDisplay } from "@/components/LocationDisplay"
import { useLocationServices } from "@/hooks/useLocationServices"
import { usePinStorage } from "@/hooks/usePinStorage"

export type MediaType = "photo" | "video"

export interface PinData {
  id: string
  title: string
  mediaUrl: string
  mediaType: MediaType
  location: string
  coordinates: { lat: number; lng: number }
  timestamp: number
  audioUrl?: string
  effects: string[]
  stickers: any[]
  canvasData: any
  description?: string
  tags?: string[]
}

export interface StoryData {
  id: string
  title: string
  pins: PinData[]
  createdAt: number
  isPublic: boolean
}

export default function Home() {
  const { location, isLoading: locationLoading, error: locationError } = useLocationServices()
  const { pins, addPin, removePin, updatePin } = usePinStorage()

  const [currentScreen, setCurrentScreen] = useState<"main" | "capture" | "editor" | "story" | "library">("main")
  const [capturedMedia, setCapturedMedia] = useState<{ url: string; type: MediaType } | null>(null)
  const [selectedPin, setSelectedPin] = useState<PinData | null>(null)
  const [currentStory, setCurrentStory] = useState<StoryData | null>(null)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [isRecordingAudio, setIsRecordingAudio] = useState(false)
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null)
  const [currentTitle, setCurrentTitle] = useState("")

  const audioRecorderRef = useRef<any>(null)

  const handleMediaCapture = useCallback((mediaUrl: string, mediaType: MediaType) => {
    setCapturedMedia({ url: mediaUrl, type: mediaType })
    setCurrentScreen("editor")
  }, [])

  const handleCreatePin = useCallback(async (): Promise<PinData | null> => {
    if (!capturedMedia || !location) return null

    const newPin: PinData = {
      id: Date.now().toString(),
      title: currentTitle || `${capturedMedia.type === "photo" ? "📸" : "🎥"} ${location.name}`,
      mediaUrl: capturedMedia.url,
      mediaType: capturedMedia.type,
      location: location.name,
      coordinates: { lat: location.latitude, lng: location.longitude },
      timestamp: Date.now(),
      audioUrl: currentAudioUrl || undefined,
      effects: [],
      stickers: [],
      canvasData: null,
    }

    addPin(newPin)

    // Reset capture state
    setCapturedMedia(null)
    setCurrentAudioUrl(null)
    setCurrentTitle("")

    return newPin
  }, [capturedMedia, location, currentTitle, currentAudioUrl, addPin])

  const handleAICommand = useCallback((command: string) => {
    const lowerCommand = command.toLowerCase()

    if (lowerCommand.includes("photo") || lowerCommand.includes("picture")) {
      setCurrentScreen("capture")
    } else if (lowerCommand.includes("story")) {
      setCurrentScreen("story")
    } else if (lowerCommand.includes("library") || lowerCommand.includes("pins")) {
      setCurrentScreen("library")
    } else if (lowerCommand.includes("back") || lowerCommand.includes("home")) {
      setCurrentScreen("main")
    }

    setShowAIAssistant(false)
  }, [])

  const handleStartAudioRecording = useCallback(() => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.startRecording()
      setIsRecordingAudio(true)
    }
  }, [])

  const handleStopAudioRecording = useCallback(() => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stopRecording()
      setIsRecordingAudio(false)
    }
  }, [])

  const handleAudioRecorded = useCallback((audioUrl: string) => {
    setCurrentAudioUrl(audioUrl)
    console.log("🎵 Audio recorded:", audioUrl)
  }, [])

  const handleTitleGenerated = useCallback((title: string) => {
    setCurrentTitle(title)
  }, [])

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "linear-gradient(135deg, #1e293b 0%, #1e40af 50%, #4338ca 100%)",
        color: "white",
        fontFamily: "system-ui, -apple-system, sans-serif",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Main Screen */}
      {currentScreen === "main" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <div style={{ padding: "2rem 2rem 1rem 2rem", textAlign: "center" }}>
            <LocationDisplay location={location} isLoading={locationLoading} />
          </div>

          {/* Central PINIT Interface */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
            <div
              style={{
                width: "280px",
                height: "280px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
                border: "2px solid rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.3s ease",
                position: "relative",
              }}
              onClick={() => setCurrentScreen("capture")}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📍</div>
                <div style={{ fontSize: "0.875rem", opacity: 0.8, marginBottom: "0.5rem" }}>TAP TO</div>
                <div style={{ fontSize: "2rem", fontWeight: "bold" }}>PINIT</div>
              </div>

              {/* Pulse animation */}
              <div
                style={{
                  position: "absolute",
                  inset: "-10px",
                  borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.3)",
                  animation: "pulse 2s infinite",
                }}
              />
            </div>
          </div>

          {/* Branding */}
          <div style={{ textAlign: "center", padding: "1rem 2rem" }}>
            <h1 style={{ fontSize: "2.5rem", fontWeight: "900", margin: "0 0 0.5rem 0" }}>PINIT</h1>
            <p style={{ fontSize: "1.125rem", opacity: 0.8, margin: 0 }}>Pin It. Find It. Share It.</p>
          </div>

          {/* Navigation */}
          <div style={{ padding: "2rem", display: "flex", justifyContent: "center", gap: "3rem" }}>
            <button
              onClick={() => setCurrentScreen("capture")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                padding: "1rem",
                border: "none",
                background: "transparent",
                color: "rgba(255,255,255,0.7)",
                cursor: "pointer",
                transition: "color 0.3s ease",
              }}
            >
              <Camera size={24} />
              <span style={{ fontSize: "0.875rem" }}>Capture</span>
            </button>

            <button
              onClick={() => setCurrentScreen("story")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                padding: "1rem",
                border: "none",
                background: "transparent",
                color: "rgba(255,255,255,0.7)",
                cursor: "pointer",
                transition: "color 0.3s ease",
              }}
            >
              <BookOpen size={24} />
              <span style={{ fontSize: "0.875rem" }}>Stories</span>
            </button>

            <button
              onClick={() => setCurrentScreen("library")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                padding: "1rem",
                border: "none",
                background: "transparent",
                color: "rgba(255,255,255,0.7)",
                cursor: "pointer",
                transition: "color 0.3s ease",
              }}
            >
              <FileImage size={24} />
              <span style={{ fontSize: "0.875rem" }}>Library</span>
            </button>
          </div>
        </div>
      )}

      {/* Capture Screen */}
      {currentScreen === "capture" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <ReliableCamera
            onPhotoCapture={(photoUrl) => handleMediaCapture(photoUrl, "photo")}
            onVideoCapture={(videoUrl) => handleMediaCapture(videoUrl, "video")}
            isRecording={isRecordingAudio}
          />

          {/* Back Button */}
          <button
            onClick={() => setCurrentScreen("main")}
            style={{
              position: "absolute",
              top: "2rem",
              left: "2rem",
              padding: "0.75rem",
              borderRadius: "50%",
              border: "none",
              background: "rgba(0,0,0,0.5)",
              color: "white",
              cursor: "pointer",
              zIndex: 10,
            }}
          >
            <ArrowLeft size={20} />
          </button>
        </div>
      )}

      {/* Editor Screen */}
      {currentScreen === "editor" && capturedMedia && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <AutoTitleGenerator
            mediaUrl={capturedMedia.url}
            location={location?.name}
            mediaType={capturedMedia.type}
            onTitleGenerated={handleTitleGenerated}
          />

          <MobilePostcardEditor
            mediaUrl={capturedMedia.url}
            mediaType={capturedMedia.type}
            location={location?.name || "Unknown Location"}
            onBack={() => setCurrentScreen("capture")}
            onAdvancedEdit={() => {
              // Switch to advanced editor
            }}
            onEffectsChange={(effects) => {
              console.log("Effects changed:", effects)
            }}
            onStickersChange={(stickers) => {
              console.log("Stickers changed:", stickers)
            }}
          />
        </div>
      )}

      {/* Story Screen */}
      {currentScreen === "story" && (
        <PinStoryMode
          currentStory={currentStory}
          savedPins={pins}
          onAddPin={(pin) => {
            if (currentStory) {
              setCurrentStory({
                ...currentStory,
                pins: [...currentStory.pins, pin],
              })
            } else {
              setCurrentStory({
                id: Date.now().toString(),
                title: "My Story",
                pins: [pin],
                createdAt: Date.now(),
                isPublic: false,
              })
            }
          }}
          onBackToCapture={() => setCurrentScreen("capture")}
          onCreatePin={handleCreatePin}
        />
      )}

      {/* Library Screen */}
      {currentScreen === "library" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
            <button
              onClick={() => setCurrentScreen("main")}
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
            <h2 style={{ fontSize: "1.5rem", margin: 0 }}>📚 Pin Library</h2>
          </div>

          {pins.length === 0 ? (
            <div
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}
            >
              <div>
                <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📍</div>
                <h3 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>No pins yet!</h3>
                <p style={{ opacity: 0.8, marginBottom: "2rem" }}>Start capturing moments to build your collection</p>
                <button
                  onClick={() => setCurrentScreen("capture")}
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
                  Start Capturing
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "1rem", overflowY: "auto" }}>
              {pins.map((pin) => (
                <div
                  key={pin.id}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: "1rem",
                    padding: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <div
                    style={{
                      width: "80px",
                      height: "60px",
                      borderRadius: "0.5rem",
                      overflow: "hidden",
                      background: "rgba(255,255,255,0.1)",
                    }}
                  >
                    {pin.mediaType === "photo" ? (
                      <img
                        src={pin.mediaUrl || "/placeholder.svg"}
                        alt={pin.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <video src={pin.mediaUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "1rem" }}>{pin.title}</h4>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.875rem",
                        opacity: 0.8,
                      }}
                    >
                      <MapPin size={14} />
                      <span>{pin.location}</span>
                    </div>
                    <div style={{ fontSize: "0.75rem", opacity: 0.6, marginTop: "0.25rem" }}>
                      {new Date(pin.timestamp).toLocaleDateString()}
                    </div>
                  </div>

                  <button
                    onClick={() => removePin(pin.id)}
                    style={{
                      padding: "0.5rem",
                      borderRadius: "0.5rem",
                      border: "none",
                      background: "rgba(239, 68, 68, 0.2)",
                      color: "#EF4444",
                      cursor: "pointer",
                    }}
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Assistant */}
      {showAIAssistant && <AIAssistant onCommand={handleAICommand} onClose={() => setShowAIAssistant(false)} />}

      {/* Enhanced Audio Recorder */}
      <EnhancedAudio ref={audioRecorderRef} onAudioRecorded={handleAudioRecorded} isRecording={isRecordingAudio} />

      {/* AI Assistant Trigger */}
      <button
        onClick={() => setShowAIAssistant(true)}
        style={{
          position: "fixed",
          bottom: "2rem",
          right: "2rem",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          border: "none",
          background: "linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)",
          color: "white",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          zIndex: 100,
        }}
      >
        <Sparkles size={24} />
      </button>

      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
