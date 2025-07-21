"use client"

import { useState, useCallback, useEffect } from "react"
import { Camera, Video, Library, Sparkles, MapPin, Check } from "lucide-react"
import { useLocationServices } from "@/hooks/useLocationServices"
import { usePinStorage } from "@/hooks/usePinStorage"
import { ReliableCamera } from "@/components/reliable-camera"
import { SocialPlatformSelector } from "@/components/social-platform-selector"
import { MobilePostcardEditor } from "@/components/mobile-postcard-editor"
import { PinStoryMode } from "@/components/PinStoryMode"
import { AIAssistant } from "@/components/AIAssistant"

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
  const [currentScreen, setCurrentScreen] = useState<
    "map" | "camera" | "platform-select" | "editor" | "story" | "library"
  >("map")
  const [cameraMode, setCameraMode] = useState<"photo" | "video">("photo")
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [isQuickPinning, setIsQuickPinning] = useState(false)
  const [quickPinSuccess, setQuickPinSuccess] = useState(false)

  // Media state
  const [capturedMedia, setCapturedMedia] = useState<{
    url: string
    type: "photo" | "video"
    location: string
  } | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<string>("")

  // Hooks
  const { location, getCurrentLocation, isLoading: locationLoading } = useLocationServices()
  const { pins, addPin } = usePinStorage()

  // Get current location on mount
  useEffect(() => {
    getCurrentLocation()
  }, [getCurrentLocation])

  // Quick Pin Function (Shazam-like)
  const handleQuickPin = useCallback(async () => {
    if (isQuickPinning) return

    setIsQuickPinning(true)

    try {
      const currentLocation = await getCurrentLocation()

      // Generate AI location name (simplified for demo)
      const locationNames = [
        "Beautiful Scenic Spot",
        "Hidden Gem Location",
        "Amazing Discovery",
        "Perfect Photo Spot",
        "Memorable Place",
        "Stunning Viewpoint",
      ]
      const aiLocationName = locationNames[Math.floor(Math.random() * locationNames.length)]

      const newPin: PinData = {
        id: Date.now().toString(),
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        locationName: `${aiLocationName} (${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)})`,
        mediaUrl: null,
        mediaType: null,
        audioUrl: null,
        timestamp: new Date().toISOString(),
        title: `📍 ${aiLocationName}`,
        description: `Quick pin created at ${new Date().toLocaleTimeString()}`,
        tags: ["quick-pin", "ai-generated"],
      }

      addPin(newPin)

      // Show success feedback
      setQuickPinSuccess(true)

      // Auto-hide success after 2 seconds
      setTimeout(() => {
        setQuickPinSuccess(false)
      }, 2000)

      console.log("📍 Quick pin created:", newPin)
    } catch (error) {
      console.error("❌ Failed to create quick pin:", error)
    } finally {
      setIsQuickPinning(false)
    }
  }, [getCurrentLocation, addPin, isQuickPinning])

  const handleCameraCapture = useCallback(
    (mediaUrl: string, type: "photo" | "video") => {
      if (!location) return

      const locationName = `Location ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`

      setCapturedMedia({
        url: mediaUrl,
        type,
        location: locationName,
      })

      // Go to platform selection
      setCurrentScreen("platform-select")
    },
    [location],
  )

  const handlePlatformSelect = useCallback((platform: string) => {
    setSelectedPlatform(platform)
    setCurrentScreen("editor")
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
        audioUrl: null,
        timestamp: new Date().toISOString(),
        title: `${capturedMedia.type === "photo" ? "📸" : "🎥"} ${selectedPlatform} Post`,
        description: postcardData?.text || "",
        tags: ["social-media", selectedPlatform],
      }

      addPin(newPin)
      console.log("💾 Pin saved:", newPin)

      // Reset state and go back to map
      setCapturedMedia(null)
      setSelectedPlatform("")
      setCurrentScreen("map")
    },
    [capturedMedia, location, selectedPlatform, addPin],
  )

  const handleAICommand = useCallback(
    (command: string) => {
      const lowerCommand = command.toLowerCase()

      if (lowerCommand.includes("pin") || lowerCommand.includes("mark")) {
        handleQuickPin()
      } else if (lowerCommand.includes("photo")) {
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
    },
    [handleQuickPin],
  )

  // Screen rendering
  if (currentScreen === "camera") {
    return <ReliableCamera mode={cameraMode} onCapture={handleCameraCapture} onClose={() => setCurrentScreen("map")} />
  }

  if (currentScreen === "platform-select" && capturedMedia) {
    return (
      <SocialPlatformSelector
        mediaUrl={capturedMedia.url}
        mediaType={capturedMedia.type}
        onPlatformSelect={handlePlatformSelect}
        onBack={() => setCurrentScreen("map")}
      />
    )
  }

  if (currentScreen === "editor" && capturedMedia && selectedPlatform) {
    return (
      <MobilePostcardEditor
        mediaUrl={capturedMedia.url}
        mediaType={capturedMedia.type}
        platform={selectedPlatform}
        dimensions={getPlatformDimensions(selectedPlatform)}
        locationName={capturedMedia.location}
        onSave={handleSavePin}
        onClose={() => setCurrentScreen("map")}
      />
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
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "bold" }}>📚 Pin Library</h1>
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

        {/* Pins List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
          {pins.length === 0 ? (
            <div style={{ textAlign: "center", color: "white", padding: "2rem" }}>
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📍</div>
              <h2>No Pins Yet</h2>
              <p>Start pinning locations to build your collection!</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
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
                  <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", fontWeight: "bold" }}>{pin.title}</h3>
                  <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.875rem", opacity: 0.8 }}>📍 {pin.locationName}</p>
                  <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.6 }}>
                    {new Date(pin.timestamp).toLocaleDateString()} at {new Date(pin.timestamp).toLocaleTimeString()}
                  </p>
                  {pin.tags && (
                    <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {pin.tags.map((tag, index) => (
                        <span
                          key={index}
                          style={{
                            padding: "0.25rem 0.5rem",
                            background: "rgba(255,255,255,0.2)",
                            borderRadius: "0.25rem",
                            fontSize: "0.75rem",
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Main map screen (Shazam-like interface)
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

      {/* Central PINIT Button - Shazam Style */}
      <div
        style={{
          position: "absolute",
          top: "25%",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
        }}
      >
        {/* Main Pin Button */}
        <button
          onClick={handleQuickPin}
          disabled={isQuickPinning}
          style={{
            width: "280px",
            height: "280px",
            borderRadius: "50%",
            border: "4px solid rgba(255,255,255,0.8)",
            background: isQuickPinning
              ? "radial-gradient(circle, rgba(16,185,129,0.8) 0%, rgba(16,185,129,0.4) 70%, transparent 100%)"
              : quickPinSuccess
                ? "radial-gradient(circle, rgba(34,197,94,0.8) 0%, rgba(34,197,94,0.4) 70%, transparent 100%)"
                : location
                  ? `radial-gradient(circle at center, rgba(59,130,246,0.3) 0%, rgba(59,130,246,0.1) 70%, transparent 100%), 
           conic-gradient(from 0deg at 50% 50%, #10B981 0deg, #3B82F6 120deg, #8B5CF6 240deg, #10B981 360deg)`
                  : "linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)",
            cursor: isQuickPinning ? "not-allowed" : "pointer",
            transition: "all 0.3s ease",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            color: "white",
            fontSize: "1.125rem",
            fontWeight: "bold",
            opacity: isQuickPinning ? 0.7 : 1,
            transform: quickPinSuccess ? "translateX(-50%) scale(1.1)" : "translateX(-50%) scale(1)",
          }}
          onMouseEnter={(e) => {
            if (!isQuickPinning) {
              e.currentTarget.style.transform = "translateX(-50%) scale(1.05)"
              e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.4)"
            }
          }}
          onMouseLeave={(e) => {
            if (!isQuickPinning) {
              e.currentTarget.style.transform = "translateX(-50%) scale(1)"
              e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.3)"
            }
          }}
        >
          {isQuickPinning ? (
            <>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  border: "4px solid rgba(255,255,255,0.3)",
                  borderTop: "4px solid white",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  marginBottom: "0.5rem",
                }}
              />
              <span>Pinning...</span>
            </>
          ) : quickPinSuccess ? (
            <>
              <Check size={48} style={{ marginBottom: "0.5rem", color: "white" }} />
              <span>Pinned!</span>
            </>
          ) : (
            <>
              <MapPin
                size={48}
                style={{ marginBottom: "0.5rem", color: "white", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}
              />
              <span>Tap to PINIT!</span>
            </>
          )}
        </button>

        {/* Pin Count */}
        <p
          style={{
            margin: "1rem 0 0 0",
            fontSize: "0.875rem",
            opacity: 0.9,
            color: "white",
            textShadow: "0 1px 2px rgba(0,0,0,0.5)",
          }}
        >
          {pins.length} pins created
        </p>
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

      {/* Bottom Navigation - Photo/Video/Library */}
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
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
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
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Video size={24} />
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
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Library size={24} />
        </button>
      </div>

      {/* AI Assistant Modal */}
      {showAIAssistant && <AIAssistant onCommand={handleAICommand} onClose={() => setShowAIAssistant(false)} />}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// Helper function for platform dimensions
function getPlatformDimensions(platform: string) {
  const dimensions = {
    "instagram-story": { width: 1080, height: 1920 },
    "instagram-post": { width: 1080, height: 1080 },
    "facebook-post": { width: 1200, height: 630 },
    "twitter-post": { width: 1200, height: 675 },
    "linkedin-post": { width: 1200, height: 627 },
    tiktok: { width: 1080, height: 1920 },
    snapchat: { width: 1080, height: 1920 },
    whatsapp: { width: 1080, height: 1080 },
  }

  return dimensions[platform as keyof typeof dimensions] || { width: 1080, height: 1080 }
}
