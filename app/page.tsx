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
import { EnhancedLocationService } from "@/components/EnhancedLocationService"
import { PinStoryBuilder } from "@/components/PinStoryBuilder"

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
  isRecommended?: boolean
}

export default function PINITApp() {
  // Core state
  const [currentScreen, setCurrentScreen] = useState<
    "map" | "camera" | "platform-select" | "editor" | "story" | "library" | "story-builder"
  >("map")
  const [cameraMode, setCameraMode] = useState<"photo" | "video">("photo")
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [isQuickPinning, setIsQuickPinning] = useState(false)
  const [quickPinSuccess, setQuickPinSuccess] = useState(false)
  const [locationName, setLocationName] = useState<string>("Getting location...")

  const [showRecommendToggle, setShowRecommendToggle] = useState(false)
  const [showNearbyPins, setShowNearbyPins] = useState(false)
  const [discoveryMode, setDiscoveryMode] = useState(false)
  const [nearbyPins, setNearbyPins] = useState<PinData[]>([])

  const [locationDetails, setLocationDetails] = useState<any>(null)
  const [currentTheme, setCurrentTheme] = useState<any>(null)
  const [showStoryBuilder, setShowStoryBuilder] = useState(false)

  // Add this new state for user location
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)

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

  // Add location name resolution
  const getLocationName = useCallback(async (lat: number, lng: number): Promise<string> => {
    try {
      // Using a simple reverse geocoding approach
      // In production, you'd use Google Maps API or similar
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      )
      const data = await response.json()

      if (data.city && data.countryName) {
        return `${data.city}, ${data.countryName}`
      } else if (data.locality && data.countryName) {
        return `${data.locality}, ${data.countryName}`
      } else if (data.countryName) {
        return data.countryName
      }

      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    } catch (error) {
      console.error("Failed to get location name:", error)
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    }
  }, [])

  // Get current location on mount and resolve name
  useEffect(() => {
    getCurrentLocation().then(async (loc) => {
      if (loc) {
        const name = await getLocationName(loc.latitude, loc.longitude)
        setLocationName(name)
      }
    })
  }, [getCurrentLocation, getLocationName])

  // Add this useEffect right after the existing useEffect for location name
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        })
      },
      (err) => {
        console.error("Failed to get location:", err)
      },
    )
  }, [])

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

  const handleRecommendPin = useCallback(
    (pinId: string, isRecommended: boolean) => {
      const updatedPins = pins.map((pin) =>
        pin.id === pinId
          ? { ...pin, isRecommended, tags: [...(pin.tags || []), ...(isRecommended ? ["recommended"] : [])] }
          : pin,
      )
      // Update pins in storage
      localStorage.setItem("pinit-pins", JSON.stringify(updatedPins))
    },
    [pins],
  )

  const generateShareableLink = useCallback((pin: PinData) => {
    const baseUrl = window.location.origin
    const pinData = encodeURIComponent(
      JSON.stringify({
        id: pin.id,
        title: pin.title,
        lat: pin.latitude,
        lng: pin.longitude,
        locationName: pin.locationName,
      }),
    )
    return `${baseUrl}/shared-pin?data=${pinData}`
  }, [])

  const findNearbyPins = useCallback(async () => {
    if (!location) return

    // Simulate finding nearby pins (in real app, this would be an API call)
    const mockNearbyPins: PinData[] = [
      {
        id: "nearby-1",
        latitude: location.latitude + 0.001,
        longitude: location.longitude + 0.001,
        locationName: "Popular Coffee Shop",
        mediaUrl: "/placeholder.svg?height=200&width=200",
        mediaType: "photo",
        audioUrl: null,
        timestamp: new Date().toISOString(),
        title: "☕ Amazing Coffee Spot",
        description: "Great local coffee with amazing pastries",
        tags: ["food", "coffee", "recommended"],
        isRecommended: true,
      },
      {
        id: "nearby-2",
        latitude: location.latitude - 0.002,
        longitude: location.longitude + 0.001,
        locationName: "Scenic Viewpoint",
        mediaUrl: "/placeholder.svg?height=200&width=200",
        mediaType: "photo",
        audioUrl: null,
        timestamp: new Date().toISOString(),
        title: "🏔️ Perfect View",
        description: "Breathtaking sunset views",
        tags: ["nature", "views", "recommended"],
      },
    ]

    setNearbyPins(mockNearbyPins)
    setShowNearbyPins(true)
  }, [location])

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
        locationDetails={locationDetails}
        currentTheme={currentTheme}
      />
    )
  }

  if (currentScreen === "story") {
    return <PinStoryMode pins={pins} onBack={() => setCurrentScreen("map")} />
  }

  if (currentScreen === "story-builder") {
    return (
      <PinStoryBuilder
        pins={pins}
        onBack={() => setCurrentScreen("library")}
        onCreateStory={(selectedPins, storyTitle) => {
          console.log("Story created:", storyTitle, selectedPins)
          setCurrentScreen("library")
        }}
      />
    )
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
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {pins.filter((p) => p.mediaUrl).length > 0 && (
              <button
                onClick={() => setCurrentScreen("story-builder")}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: "#10B981",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                📖 Story
              </button>
            )}
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

  // Main map screen (Shazam-like interface) - FIXED VERSION
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
        color: "white",
        padding: "2rem",
      }}
    >
      {/* AI Assistant Button - Top Right */}
      <div
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          zIndex: 10,
        }}
      >
        <button
          onClick={() => setShowAIAssistant(true)}
          style={{
            padding: "0.75rem",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
            borderRadius: "12px",
            backdropFilter: "blur(10px)",
          }}
        >
          <Sparkles size={24} />
        </button>
      </div>

      {/* Enhanced Location Service - Hidden but working */}
      {location && (
        <EnhancedLocationService
          latitude={location.latitude}
          longitude={location.longitude}
          onLocationEnhanced={setLocationDetails}
        />
      )}

      {/* Discovery Mode Toggle - Next to AI Assistant */}
      <div
        style={{
          position: "absolute",
          top: "1rem",
          right: "5rem",
          zIndex: 10,
        }}
      >
        <button
          onClick={() => {
            setDiscoveryMode(!discoveryMode)
            if (!discoveryMode) {
              findNearbyPins()
            } else {
              setShowNearbyPins(false)
            }
          }}
          style={{
            padding: "0.75rem",
            border: "none",
            background: discoveryMode ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
            borderRadius: "12px",
            backdropFilter: "blur(10px)",
            border: discoveryMode ? "2px solid #10B981" : "none",
          }}
        >
          🌐
        </button>
      </div>

      {/* SHAZAM-STYLE CIRCLE - MOVED TO TOP THIRD & PULSATING */}
      <div
        style={{
          position: "absolute",
          top: "16%",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
        }}
      >
        {/* Multiple Pulsing Glow Rings - ENHANCED VISIBILITY */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "320px",
            height: "320px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 50%, transparent 70%)",
            animation: "shazamPulse 2s ease-in-out infinite",
            zIndex: 1,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "360px",
            height: "360px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.08) 50%, transparent 70%)",
            animation: "shazamPulse 2s ease-in-out infinite 0.7s",
            zIndex: 1,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 50%, transparent 70%)",
            animation: "shazamPulse 2s ease-in-out infinite 1.4s",
            zIndex: 1,
          }}
        />

        {/* Main Pin Button with LIVE GOOGLE MAPS */}
        <button
          onClick={handleQuickPin}
          disabled={isQuickPinning}
          style={{
            width: "280px",
            height: "280px",
            borderRadius: "50%",
            border: "4px solid rgba(255,255,255,0.9)",
            background: "transparent",
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
            position: "relative",
            zIndex: 2,
            overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            if (!isQuickPinning) {
              e.currentTarget.style.transform = "scale(1.05)"
              e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.4)"
            }
          }}
          onMouseLeave={(e) => {
            if (!isQuickPinning) {
              e.currentTarget.style.transform = "scale(1)"
              e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.3)"
            }
          }}
        >
          {/* LIVE GOOGLE MAPS BACKGROUND - IMPROVED VERSION */}
          {(userLocation || location) && (
            <div
              style={{
                position: "absolute",
                inset: "4px",
                borderRadius: "50%",
                overflow: "hidden",
                zIndex: 1,
                background: "linear-gradient(135deg, #22C55E 0%, #3B82F6 50%, #10B981 100%)",
              }}
            >
              <img
                src={`https://maps.googleapis.com/maps/api/staticmap?center=${
                  userLocation?.latitude || location?.latitude || -25.7479
                },${
                  userLocation?.longitude || location?.longitude || 28.2293
                }&zoom=16&size=280x280&maptype=satellite&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}`}
                alt="Live Map"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "contrast(1.1) saturate(1.2)",
                }}
                onLoad={(e) => {
                  console.log("Map loaded successfully")
                }}
                onError={(e) => {
                  console.log("Google Maps failed, trying alternative...")
                  // Try OpenStreetMap tile service as fallback
                  e.currentTarget.src = `https://tile.openstreetmap.org/16/${Math.floor(
                    (((userLocation?.longitude || location?.longitude || 28.2293) + 180) / 360) * Math.pow(2, 16),
                  )}/${Math.floor(
                    ((1 -
                      Math.log(
                        Math.tan(((userLocation?.latitude || location?.latitude || -25.7479) * Math.PI) / 180) +
                          1 / Math.cos(((userLocation?.latitude || location?.latitude || -25.7479) * Math.PI) / 180),
                      ) /
                        Math.PI) /
                      2) *
                      Math.pow(2, 16),
                  )}.png`

                  // If that also fails, show a nice gradient background
                  setTimeout(() => {
                    if (e.currentTarget.complete && e.currentTarget.naturalHeight === 0) {
                      e.currentTarget.style.display = "none"
                    }
                  }, 2000)
                }}
              />

              {/* Minimal location overlay - positioned at top */}
              <div
                style={{
                  position: "absolute",
                  top: "10%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  color: "white",
                  fontSize: "0.6rem",
                  fontWeight: "bold",
                  textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                  background: "rgba(0,0,0,0.4)",
                  padding: "0.2rem 0.4rem",
                  borderRadius: "0.2rem",
                  backdropFilter: "blur(2px)",
                  pointerEvents: "none",
                }}
              >
                📍 Live
              </div>
            </div>
          )}

          {/* Content Overlay - REDUCED SIZE to show map behind */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              textAlign: "center",
              background: "rgba(0,0,0,0.3)",
              borderRadius: "50%",
              padding: "0.8rem",
              backdropFilter: "blur(1px)",
              width: "120px",
              height: "120px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              margin: "auto",
              marginTop: "80px",
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
                <Check size={48} style={{ marginBottom: "0.5rem", color: "#10B981" }} />
                <span>Pinned!</span>
              </>
            ) : (
              <>
                <MapPin
                  size={48}
                  style={{ marginBottom: "0.5rem", color: "white", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))" }}
                />
                <span style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>Tap to PINIT!</span>
              </>
            )}
          </div>
        </button>
      </div>

      {/* PINIT Branding - Moved to center */}
      <div
        style={{
          position: "absolute",
          top: "55%",
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
          📍 {locationName}
        </p>
        <p
          style={{
            margin: "0.25rem 0 0 0",
            fontSize: "0.875rem",
            opacity: 0.7,
            color: "white",
            textShadow: "0 1px 2px rgba(0,0,0,0.5)",
          }}
        >
          {pins.length} pins created
        </p>
      </div>

      {/* Nearby Pins Discovery */}
      {showNearbyPins && (
        <div
          style={{
            position: "absolute",
            bottom: "8rem",
            left: "1rem",
            right: "1rem",
            background: "rgba(0,0,0,0.8)",
            borderRadius: "1rem",
            padding: "1rem",
            backdropFilter: "blur(10px)",
            maxHeight: "200px",
            overflowY: "auto",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "bold", color: "white" }}>🌐 Nearby Discoveries</h3>
            <button
              onClick={() => setShowNearbyPins(false)}
              style={{
                padding: "0.25rem",
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
                borderRadius: "4px",
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: "flex", gap: "1rem", overflowX: "auto" }}>
            {nearbyPins.map((pin) => (
              <div
                key={pin.id}
                style={{
                  minWidth: "150px",
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "0.5rem",
                  padding: "0.75rem",
                  color: "white",
                  cursor: "pointer",
                }}
                onClick={() => {
                  // Add to user's pins
                  addPin({ ...pin, id: Date.now().toString() })
                  setShowNearbyPins(false)
                }}
              >
                {pin.mediaUrl && (
                  <img
                    src={pin.mediaUrl || "/placeholder.svg"}
                    alt={pin.title}
                    style={{
                      width: "100%",
                      height: "80px",
                      objectFit: "cover",
                      borderRadius: "0.25rem",
                      marginBottom: "0.5rem",
                    }}
                  />
                )}
                <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "0.75rem", fontWeight: "bold" }}>{pin.title}</h4>
                <p style={{ margin: 0, fontSize: "0.625rem", opacity: 0.8 }}>{pin.description}</p>
                {pin.isRecommended && (
                  <div style={{ marginTop: "0.25rem" }}>
                    <span
                      style={{
                        fontSize: "0.625rem",
                        background: "#10B981",
                        padding: "0.125rem 0.25rem",
                        borderRadius: "0.25rem",
                      }}
                    >
                      ⭐ Recommended
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Navigation - Photo/Video/Library */}
      <div
        style={{
          position: "absolute",
          bottom: "2rem",
          left: "2rem",
          right: "2rem",
          display: "flex",
          justifyContent: "space-around",
          background: "transparent",
          borderRadius: "2rem",
          padding: "1.5rem",
          backdropFilter: "none",
        }}
      >
        <button
          onClick={() => {
            setCameraMode("photo")
            setCurrentScreen("camera")
          }}
          style={{
            padding: "0.5rem",
            border: "none",
            background: "transparent",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Camera size={28} />
        </button>

        <button
          onClick={() => {
            setCameraMode("video")
            setCurrentScreen("camera")
          }}
          style={{
            padding: "0.5rem",
            border: "none",
            background: "transparent",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Video size={28} />
        </button>

        <button
          onClick={() => setCurrentScreen("library")}
          style={{
            padding: "0.5rem",
            border: "none",
            background: "transparent",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Library size={28} />
        </button>
      </div>

      {/* AI Assistant Modal */}
      {showAIAssistant && <AIAssistant onCommand={handleAICommand} onClose={() => setShowAIAssistant(false)} />}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes shazamPulse {
          0% { 
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0.6;
          }
          50% { 
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0.3;
          }
          100% { 
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0;
          }
        }

        @keyframes mapShimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
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
