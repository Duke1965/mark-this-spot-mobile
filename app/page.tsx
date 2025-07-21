"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Camera, Video, Mic, MicOff, MapPin, Library, Sparkles, Play } from "lucide-react"
import { useLocationServices } from "@/hooks/useLocationServices"
import { usePinStorage } from "@/hooks/usePinStorage"
import { ReliableCamera } from "@/components/reliable-camera"
import { MobilePostcardEditor } from "@/components/mobile-postcard-editor"
import { PinStoryMode } from "@/components/PinStoryMode"
import { AutoTitleGenerator } from "@/components/AutoTitleGenerator"
import { AIAssistant } from "@/components/AIAssistant"
import { EnhancedAudio } from "@/components/enhanced-audio"

export interface PinData {
  id: string
  latitude: number
  longitude: number
  locationName: string
  mediaUrl: string | null
  mediaType: "photo" | "video" | null
  audioUrl: string | null
  timestamp: string
  title: string
  description?: string
  tags?: string[]
}

export default function PINITApp() {
  // Core state
  const [currentScreen, setCurrentScreen] = useState<"map" | "camera" | "editor" | "story" | "library">("map")
  const [cameraMode, setCameraMode] = useState<"photo" | "video">("photo")
  const [isRecordingAudio, setIsRecordingAudio] = useState(false)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [activeTab, setActiveTab] = useState<"pins" | "photos" | "videos" | "postcards">("pins")

  // Media state
  const [capturedMedia, setCapturedMedia] = useState<{
    url: string
    type: "photo" | "video"
    location: string
  } | null>(null)
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null)
  const [generatedTitle, setGeneratedTitle] = useState<string>("")

  // Hooks
  const { location, getCurrentLocation, isLoading: locationLoading, error: locationError } = useLocationServices()
  const { pins, addPin } = usePinStorage()
  const audioRef = useRef<any>(null)

  // Voice recognition state
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  // Get current location on mount
  useEffect(() => {
    getCurrentLocation()
  }, [getCurrentLocation])

  // Voice recognition setup
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = "en-US"

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase()
        console.log("🎤 Voice command:", transcript)

        if (transcript.includes("pin it") || transcript.includes("pin this")) {
          handleQuickPin()
        } else if (transcript.includes("take photo") || transcript.includes("photo")) {
          setCameraMode("photo")
          setCurrentScreen("camera")
        } else if (transcript.includes("record video") || transcript.includes("video")) {
          setCameraMode("video")
          setCurrentScreen("camera")
        } else if (transcript.includes("story mode") || transcript.includes("stories")) {
          setCurrentScreen("story")
        }

        setIsListening(false)
      }

      recognitionRef.current.onerror = () => {
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }
  }, [])

  const startVoiceRecognition = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true)
      recognitionRef.current.start()
    }
  }, [isListening])

  const handleQuickPin = useCallback(async () => {
    try {
      const currentLocation = await getCurrentLocation()
      const locationName = `Location ${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`

      const newPin: PinData = {
        id: Date.now().toString(),
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        locationName,
        mediaUrl: null,
        mediaType: null,
        audioUrl: null,
        timestamp: new Date().toISOString(),
        title: `📍 Quick Pin - ${locationName}`,
        description: "Quick pin created via voice command",
        tags: ["voice", "quick-pin"],
      }

      addPin(newPin)
      console.log("📍 Quick pin created:", newPin)
    } catch (error) {
      console.error("❌ Failed to create quick pin:", error)
    }
  }, [getCurrentLocation, addPin])

  const handleCameraCapture = useCallback(
    (mediaUrl: string, type: "photo" | "video") => {
      if (!location) return

      const locationName = `Location ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`

      setCapturedMedia({
        url: mediaUrl,
        type,
        location: locationName,
      })

      // Start audio recording automatically after capture
      if (audioRef.current) {
        setIsRecordingAudio(true)
        audioRef.current.startRecording()
      }

      setCurrentScreen("editor")
    },
    [location],
  )

  const handleAudioRecorded = useCallback((audioUrl: string) => {
    setCurrentAudioUrl(audioUrl)
    setIsRecordingAudio(false)
    console.log("🎤 Audio recorded:", audioUrl)
  }, [])

  const handleSavePin = useCallback(
    (postcardData?: any) => {
      if (!capturedMedia || !location) return

      const newPin: PinData = {
        id: Date.now().toString(),
        latitude: location.latitude,
        longitude: location.longitude,
        locationName: capturedMedia.location,
        mediaUrl: capturedMedia.url,
        mediaType: capturedMedia.type,
        audioUrl: currentAudioUrl,
        timestamp: new Date().toISOString(),
        title: generatedTitle || `${capturedMedia.type === "photo" ? "📸" : "🎥"} ${capturedMedia.location}`,
        description: postcardData?.text || "",
        tags: ["captured"],
      }

      addPin(newPin)
      console.log("💾 Pin saved:", newPin)

      // Reset state
      setCapturedMedia(null)
      setCurrentAudioUrl(null)
      setGeneratedTitle("")
      setCurrentScreen("map")
    },
    [capturedMedia, location, currentAudioUrl, generatedTitle, addPin],
  )

  const handleAICommand = useCallback((command: string) => {
    const lowerCommand = command.toLowerCase()

    if (lowerCommand.includes("photo")) {
      setCameraMode("photo")
      setCurrentScreen("camera")
    } else if (lowerCommand.includes("video")) {
      setCameraMode("video")
      setCurrentScreen("camera")
    } else if (lowerCommand.includes("story")) {
      setCurrentScreen("story")
    } else if (lowerCommand.includes("library")) {
      setCurrentScreen("library")
    }

    setShowAIAssistant(false)
  }, [])

  const renderLibraryContent = () => {
    const savedPostcards = JSON.parse(localStorage.getItem("pinit-saved-postcards") || "[]")

    switch (activeTab) {
      case "pins":
        return (
          <div style={{ padding: "1rem" }}>
            <h3 style={{ margin: "0 0 1rem 0", color: "white" }}>Your Pins ({pins.length})</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "1rem" }}>
              {pins.map((pin) => (
                <div
                  key={pin.id}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: "0.5rem",
                    padding: "1rem",
                    color: "white",
                  }}
                >
                  {pin.mediaUrl && (
                    <div style={{ marginBottom: "0.5rem" }}>
                      {pin.mediaType === "photo" ? (
                        <img
                          src={pin.mediaUrl || "/placeholder.svg"}
                          alt={pin.title}
                          style={{
                            width: "100%",
                            height: "80px",
                            objectFit: "cover",
                            borderRadius: "0.25rem",
                          }}
                        />
                      ) : (
                        <video
                          src={pin.mediaUrl}
                          style={{
                            width: "100%",
                            height: "80px",
                            objectFit: "cover",
                            borderRadius: "0.25rem",
                          }}
                          muted
                        />
                      )}
                    </div>
                  )}
                  <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.875rem" }}>{pin.title}</h4>
                  <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.7 }}>
                    {new Date(pin.timestamp).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )

      case "photos":
        const photos = pins.filter((pin) => pin.mediaType === "photo")
        return (
          <div style={{ padding: "1rem" }}>
            <h3 style={{ margin: "0 0 1rem 0", color: "white" }}>Photos ({photos.length})</h3>
            <div
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "0.5rem" }}
            >
              {photos.map((pin) => (
                <img
                  key={pin.id}
                  src={pin.mediaUrl || "/placeholder.svg"}
                  alt={pin.title}
                  style={{
                    width: "100%",
                    aspectRatio: "1",
                    objectFit: "cover",
                    borderRadius: "0.25rem",
                  }}
                />
              ))}
            </div>
          </div>
        )

      case "videos":
        const videos = pins.filter((pin) => pin.mediaType === "video")
        return (
          <div style={{ padding: "1rem" }}>
            <h3 style={{ margin: "0 0 1rem 0", color: "white" }}>Videos ({videos.length})</h3>
            <div
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "0.5rem" }}
            >
              {videos.map((pin) => (
                <video
                  key={pin.id}
                  src={pin.mediaUrl || undefined}
                  style={{
                    width: "100%",
                    aspectRatio: "1",
                    objectFit: "cover",
                    borderRadius: "0.25rem",
                  }}
                  muted
                />
              ))}
            </div>
          </div>
        )

      case "postcards":
        return (
          <div style={{ padding: "1rem" }}>
            <h3 style={{ margin: "0 0 1rem 0", color: "white" }}>Postcards ({savedPostcards.length})</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "1rem" }}>
              {savedPostcards.map((postcard: any) => (
                <div
                  key={postcard.id}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: "0.5rem",
                    overflow: "hidden",
                    color: "white",
                  }}
                >
                  <img
                    src={postcard.canvasDataUrl || "/placeholder.svg"}
                    alt={postcard.text}
                    style={{
                      width: "100%",
                      height: "120px",
                      objectFit: "cover",
                    }}
                  />
                  <div style={{ padding: "0.75rem" }}>
                    <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.875rem" }}>{postcard.text}</p>
                    <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.7 }}>
                      {new Date(postcard.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // Screen rendering
  if (currentScreen === "camera") {
    return <ReliableCamera mode={cameraMode} onCapture={handleCameraCapture} onClose={() => setCurrentScreen("map")} />
  }

  if (currentScreen === "editor" && capturedMedia) {
    return (
      <>
        <MobilePostcardEditor
          mediaUrl={capturedMedia.url}
          mediaType={capturedMedia.type}
          platform="instagram-post"
          dimensions={{ width: 1080, height: 1080 }}
          locationName={capturedMedia.location}
          onSave={handleSavePin}
          onClose={() => setCurrentScreen("map")}
        />
        <AutoTitleGenerator
          mediaUrl={capturedMedia.url}
          location={capturedMedia.location}
          mediaType={capturedMedia.type}
          onTitleGenerated={setGeneratedTitle}
        />
      </>
    )
  }

  if (currentScreen === "story") {
    return <PinStoryMode pins={pins} onBack={() => setCurrentScreen("map")} />
  }

  if (currentScreen === "library") {
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
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "bold" }}>📚 Library</h1>
          <button
            onClick={() => setCurrentScreen("map")}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              cursor: "pointer",
            }}
          >
            Back
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            background: "rgba(0,0,0,0.2)",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {[
            { id: "pins", label: "Pins", icon: "📍" },
            { id: "photos", label: "Photos", icon: "📸" },
            { id: "videos", label: "Videos", icon: "🎥" },
            { id: "postcards", label: "Postcards", icon: "📮" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                flex: 1,
                padding: "1rem",
                border: "none",
                background: activeTab === tab.id ? "rgba(255,255,255,0.2)" : "transparent",
                color: "white",
                cursor: "pointer",
                fontSize: "0.875rem",
                borderBottom: activeTab === tab.id ? "2px solid #10B981" : "none",
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto" }}>{renderLibraryContent()}</div>
      </div>
    )
  }

  // Main map screen
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "linear-gradient(135deg, #87CEEB 0%, #4169E1 50%, #191970 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        padding: "2rem",
      }}
    >
      {/* AI Assistant Button - Top Right */}
      <div
        style={{
          position: "absolute",
          top: "2rem",
          right: "2rem",
        }}
      >
        <button
          onClick={() => setShowAIAssistant(true)}
          style={{
            padding: "0.75rem",
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
          }}
        >
          <Sparkles size={24} />
        </button>
      </div>

      {/* Central Map Circle - Higher Position */}
      <div
        style={{
          position: "absolute",
          top: "25%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "280px",
          height: "280px",
          borderRadius: "50%",
          border: "4px solid rgba(255,255,255,0.8)",
          overflow: "hidden",
          cursor: "pointer",
          transition: "all 0.3s ease",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}
        onClick={handleQuickPin}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateX(-50%) scale(1.05)"
          e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.4)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateX(-50%) scale(1)"
          e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.3)"
        }}
      >
        {/* Live Map Background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: location
              ? `radial-gradient(circle at center, rgba(59,130,246,0.3) 0%, rgba(59,130,246,0.1) 70%, transparent 100%), 
           conic-gradient(from 0deg at 50% 50%, #10B981 0deg, #3B82F6 120deg, #8B5CF6 240deg, #10B981 360deg)`
              : "linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)",
            opacity: 0.8,
          }}
        />

        {/* Center Content */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            background: "rgba(0,0,0,0.2)",
            backdropFilter: "blur(1px)",
          }}
        >
          <MapPin
            size={48}
            style={{ marginBottom: "0.5rem", color: "white", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}
          />
          <p
            style={{
              margin: 0,
              fontSize: "1.125rem",
              fontWeight: "bold",
              color: "white",
              textShadow: "0 2px 4px rgba(0,0,0,0.5)",
            }}
          >
            Tap to PINIT!
          </p>
          <p
            style={{
              margin: "0.25rem 0 0 0",
              fontSize: "0.875rem",
              opacity: 0.9,
              color: "white",
              textShadow: "0 1px 2px rgba(0,0,0,0.5)",
            }}
          >
            {pins.length} pins created
          </p>
        </div>

        {/* Pin indicators around circle */}
        {pins.slice(0, 8).map((pin, index) => {
          const angle = index * 45 * (Math.PI / 180)
          const radius = 150
          const x = Math.cos(angle) * radius
          const y = Math.sin(angle) * radius

          return (
            <div
              key={pin.id}
              style={{
                position: "absolute",
                left: `calc(50% + ${x}px - 8px)`,
                top: `calc(50% + ${y}px - 8px)`,
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                background: pin.mediaUrl ? "#10B981" : "#6B7280",
                border: "2px solid white",
                animation: "pulse 2s infinite",
                zIndex: 3,
              }}
            />
          )
        })}
      </div>

      {/* PINIT Branding - Under Circle */}
      <div
        style={{
          position: "absolute",
          top: "60%",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "3rem",
            fontWeight: "bold",
            color: "white",
            textShadow: "0 4px 8px rgba(0,0,0,0.3)",
          }}
        >
          PINIT
        </h1>
        <p
          style={{
            margin: "0.5rem 0 0 0",
            opacity: 0.9,
            fontSize: "1rem",
            color: "white",
            textShadow: "0 2px 4px rgba(0,0,0,0.3)",
          }}
        >
          {location ? `📍 ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : "📍 Getting location..."}
        </p>
      </div>

      {/* Voice Command Button */}
      <button
        onClick={startVoiceRecognition}
        style={{
          position: "absolute",
          bottom: "12rem",
          left: "50%",
          transform: "translateX(-50%)",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          border: "none",
          background: isListening ? "#EF4444" : "rgba(255,255,255,0.2)",
          color: "white",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.3s ease",
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        }}
      >
        {isListening ? <MicOff size={24} /> : <Mic size={24} />}
      </button>

      {/* Bottom Navigation */}
      <div
        style={{
          position: "absolute",
          bottom: "2rem",
          left: "2rem",
          right: "2rem",
          display: "flex",
          justifyContent: "space-around",
          background: "rgba(0,0,0,0.3)",
          borderRadius: "2rem",
          padding: "1rem",
          backdropFilter: "blur(10px)",
        }}
      >
        <button
          onClick={() => {
            setCameraMode("photo")
            setCurrentScreen("camera")
          }}
          style={{
            padding: "0.75rem",
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
          }}
        >
          <Camera size={24} />
        </button>

        <button
          onClick={() => {
            setCameraMode("video")
            setCurrentScreen("camera")
          }}
          style={{
            padding: "0.75rem",
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
          }}
        >
          <Video size={24} />
        </button>

        <button
          onClick={() => setCurrentScreen("story")}
          style={{
            padding: "0.75rem",
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
          }}
        >
          <Play size={24} />
        </button>

        <button
          onClick={() => setCurrentScreen("library")}
          style={{
            padding: "0.75rem",
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
          }}
        >
          <Library size={24} />
        </button>
      </div>

      {/* Enhanced Audio Component */}
      <EnhancedAudio ref={audioRef} onAudioRecorded={handleAudioRecorded} isRecording={isRecordingAudio} />

      {/* AI Assistant Modal */}
      {showAIAssistant && <AIAssistant onCommand={handleAICommand} onClose={() => setShowAIAssistant(false)} />}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
