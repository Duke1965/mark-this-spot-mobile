// Add a comment at the top to force update
// Updated: 2024 - Latest version with hole effect and clean settings

"use client"

import { useEffect, useState } from "react"
import { useLocationServices } from "./hooks/useLocationServices"
import { reverseGeocode } from "./utils/geocoding"
import { playSound } from "./utils/audio"
import { Volume2, VolumeX, Library, Settings, ArrowLeft, Play, MapPin } from "lucide-react"

interface Spot {
  id: string
  latitude: number
  longitude: number
  timestamp: string
  address: string
  notes: string
  photos?: string[]
  category?: string
  photo?: string
}

export default function LocationApp() {
  const [spots, setSpots] = useState<Spot[]>([])
  const [isMarking, setIsMarking] = useState(false)
  const [selectedSound, setSelectedSound] = useState("success-chime")
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedMarker, setSelectedMarker] = useState("pin")
  const [isClient, setIsClient] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentScreen, setCurrentScreen] = useState("main")
  const [currentSpot, setCurrentSpot] = useState<Spot | null>(null)
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null)
  const [locationAddress, setLocationAddress] = useState<string>("Getting your location...")
  const [selectedCategory, setSelectedCategory] = useState("general")
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [isPhotoMode, setIsPhotoMode] = useState(false)

  // Also, let me add a console log to verify the version
  useEffect(() => {
    setIsClient(true)
    console.log("🚀 Mark This Spot - Latest Version Loaded!")
  }, [])

  const { getCurrentLocation, isLoading: locationLoading, error: locationError } = useLocationServices()

  // Sound categories and options
  const soundCategories = {
    "Achievement Sounds": {
      "success-chime": { name: "Success Chime", emoji: "🔔", description: "Satisfying ding!" },
      fanfare: { name: "Fanfare", emoji: "🎺", description: "Triumphant trumpet" },
      "magic-sparkle": { name: "Magic Sparkle", emoji: "✨", description: "Whimsical chime" },
    },
    "Retro Game Sounds": {
      "coin-collect": { name: "Coin Collect", emoji: "🪙", description: "Classic arcade" },
      "power-up": { name: "Power-Up", emoji: "⭐", description: "Level complete" },
      victory: { name: "Victory", emoji: "🎊", description: "Celebration sound" },
    },
    "Nature Sounds": {
      "bird-chirp": { name: "Bird Chirp", emoji: "🐦", description: "Pleasant & universal" },
      "water-drop": { name: "Water Drop", emoji: "💧", description: "Zen-like" },
      "wind-chime": { name: "Wind Chime", emoji: "🎐", description: "Peaceful" },
    },
  }

  const spotCategories = {
    general: { name: "General", emoji: "📍", color: "#3B82F6" },
    food: { name: "Food & Drink", emoji: "🍽️", color: "#EF4444" },
    views: { name: "Great Views", emoji: "🌅", color: "#F59E0B" },
    hidden: { name: "Hidden Gems", emoji: "💎", color: "#8B5CF6" },
    nature: { name: "Nature", emoji: "🌿", color: "#10B981" },
    culture: { name: "Culture", emoji: "🏛️", color: "#6B7280" },
    shopping: { name: "Shopping", emoji: "🛍️", color: "#EC4899" },
    transport: { name: "Transport", emoji: "🚇", color: "#0EA5E9" },
  }

  // Generate Google Maps Static API URL
  const generateMapImageUrl = (lat: number, lng: number) => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.error("❌ No Google Maps API key found!")
      return null
    }

    // Google Maps Static API parameters
    const params = new URLSearchParams({
      center: `${lat},${lng}`,
      zoom: "16",
      size: "400x400",
      maptype: "roadmap",
      markers: `color:red|size:mid|${lat},${lng}`,
      key: apiKey,
      style: "feature:poi|visibility:off",
    })

    const imageUrl = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`

    // ENHANCED DEBUG LOGGING
    console.log("🗺️ STATIC MAP DEBUG:")
    console.log("📍 Location:", lat, lng)
    console.log("🔑 API Key (first 10 chars):", apiKey.substring(0, 10) + "...")
    console.log("🌐 Full Static API URL:", imageUrl)

    // TEST IF IMAGE LOADS
    const testImg = new Image()
    testImg.onload = () => {
      console.log("✅ Static Map image loaded successfully!")
    }
    testImg.onerror = (error) => {
      console.error("❌ Static Map image failed to load:", error)
      console.error("🔍 Check if Static Maps API is enabled in Google Cloud Console")
    }
    testImg.src = imageUrl

    return imageUrl
  }

  // Get user's current location and generate map image
  useEffect(() => {
    const getLocationAndMap = async () => {
      try {
        const location = await getCurrentLocation()
        if (location) {
          console.log("📍 Got user location:", location.latitude, location.longitude)

          setUserLocation({
            lat: location.latitude,
            lng: location.longitude,
          })

          // Generate map image URL
          const imageUrl = generateMapImageUrl(location.latitude, location.longitude)
          if (imageUrl) {
            setMapImageUrl(imageUrl)
            console.log("🗺️ Generated map image URL:", imageUrl)
          }

          // Get address for display
          try {
            const address = await reverseGeocode(location.latitude, location.longitude)
            setLocationAddress(address)
            console.log("🏠 Got address:", address)
          } catch (error) {
            setLocationAddress(`${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`)
          }
        }
      } catch (error) {
        console.error("Failed to get location:", error)
        setLocationAddress("Location unavailable")
      }
    }

    getLocationAndMap()
  }, [getCurrentLocation])

  // Global function for map info windows to play sounds
  useEffect(() => {
    ;(window as any).playSpotSound = async (spotId: string) => {
      if (!isMuted) {
        await playSound(selectedSound)
      }
      console.log(`Playing sound for spot ${spotId}! 🎵`)
    }
  }, [selectedSound, isMuted])

  const markSpot = async () => {
    setIsMarking(true)

    try {
      const location = await getCurrentLocation()

      if (!location) {
        alert(
          "❌ Could not get your location!\n\n" +
            (locationError || "Please enable location permissions and try again."),
        )
        setIsMarking(false)
        return
      }

      // Create new spot with real coordinates, category, and photo
      const newSpot: Spot = {
        id: Date.now().toString(),
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: new Date().toISOString(),
        address: "Getting address...",
        notes: "",
        category: selectedCategory,
        photo: capturedPhoto,
      }

      // Play the selected sound immediately (if not muted)!
      if (!isMuted) {
        await playSound(selectedSound)
      }

      // Add spot to storage
      setSpots((prev) => [newSpot, ...prev])
      setCurrentSpot(newSpot)

      // Reset photo after marking
      setCapturedPhoto(null)
      setIsPhotoMode(false)

      // Get real address in background
      try {
        const address = await reverseGeocode(location.latitude, location.longitude)
        const updatedSpot = { ...newSpot, address }
        setSpots((prev) => prev.map((spot) => (spot.id === newSpot.id ? updatedSpot : spot)))
        setCurrentSpot(updatedSpot)
      } catch (error) {
        console.error("Address lookup failed:", error)
        const fallbackAddress = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
        const updatedSpot = { ...newSpot, address: fallbackAddress }
        setSpots((prev) => prev.map((spot) => (spot.id === newSpot.id ? updatedSpot : spot)))
        setCurrentSpot(updatedSpot)
      }

      // Navigate to results page
      setCurrentScreen("results")
    } catch (error) {
      console.error("Error marking spot:", error)
      alert("❌ Failed to mark spot!\n\nPlease check your location permissions and try again.")
    } finally {
      setIsMarking(false)
    }
  }

  // Results Screen - Shazam Style with Live Google Maps
  if (currentScreen === "results" && currentSpot) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #1e293b 0%, #1e40af 50%, #4338ca 100%)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1rem 1.5rem",
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div
                style={{
                  width: "3rem",
                  height: "3rem",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 10px 25px rgba(16, 185, 129, 0.3)",
                }}
              >
                <MapPin size={20} color="white" />
              </div>
              <div>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "white", margin: 0 }}>Spot Marked!</h1>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.875rem", margin: 0 }}>
                  Refine your location below
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setCurrentScreen("main")
                setCurrentSpot(null)
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1rem",
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(10px)",
                color: "white",
                borderRadius: "0.75rem",
                border: "none",
                cursor: "pointer",
                transition: "all 0.3s ease",
                fontWeight: 600,
              }}
            >
              Done
            </button>
          </div>
        </div>

        {/* Live Google Maps - Top Half */}
        <div style={{ flex: 1, position: "relative" }}>
          <LiveResultsMap
            spot={currentSpot}
            onLocationUpdate={(lat, lng, address) => {
              const updatedSpot = { ...currentSpot, latitude: lat, longitude: lng, address }
              setCurrentSpot(updatedSpot)
              setSpots((prev) => prev.map((spot) => (spot.id === currentSpot.id ? updatedSpot : spot)))
            }}
          />
        </div>

        {/* Location Details - Bottom Section */}
        <div
          style={{
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)",
            borderTop: "1px solid rgba(255,255,255,0.2)",
            padding: "1.5rem",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Address */}
            <div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "white", marginBottom: "0.5rem" }}>
                📍 Location
              </h3>
              <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "1rem", margin: 0 }}>{currentSpot.address}</p>
            </div>

            {/* Coordinates & Time */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <h4 style={{ fontSize: "0.875rem", fontWeight: "bold", color: "rgba(255,255,255,0.7)", margin: 0 }}>
                  COORDINATES
                </h4>
                <p
                  style={{
                    color: "white",
                    fontSize: "0.875rem",
                    fontFamily: "monospace",
                    margin: "0.25rem 0 0 0",
                  }}
                >
                  {currentSpot.latitude.toFixed(6)}, {currentSpot.longitude.toFixed(6)}
                </p>
              </div>
              <div>
                <h4 style={{ fontSize: "0.875rem", fontWeight: "bold", color: "rgba(255,255,255,0.7)", margin: 0 }}>
                  MARKED AT
                </h4>
                <p style={{ color: "white", fontSize: "0.875rem", margin: "0.25rem 0 0 0" }}>
                  {new Date(currentSpot.timestamp).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Instructions */}
            <div
              style={{
                background: "rgba(59, 130, 246, 0.2)",
                borderRadius: "0.75rem",
                padding: "1rem",
                border: "1px solid rgba(59, 130, 246, 0.3)",
              }}
            >
              <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.875rem", margin: 0, textAlign: "center" }}>
                💡 <strong>Tip:</strong> Drag the marker on the map above to refine your exact location. Use Street View
                to explore the area!
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main Screen - Minimalist Shazam Style
  if (currentScreen === "main") {
    return (
      <div
        style={{
          minHeight: "100vh",
          width: "100%",
          background: "linear-gradient(135deg, #1e293b 0%, #1e40af 50%, #4338ca 100%)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top Right - Mute Button - Pure Shazam Style */}
        <div
          style={{
            position: "absolute",
            top: "2rem",
            right: "2rem",
            zIndex: 20,
          }}
        >
          <button
            onClick={() => setIsMuted(!isMuted)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.5rem",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              transition: "all 0.3s ease",
              color: "rgba(255,255,255,0.6)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.9)"
              e.currentTarget.style.transform = "translateY(-1px)"
              e.currentTarget.style.filter = "drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.6)"
              e.currentTarget.style.transform = "translateY(0)"
              e.currentTarget.style.filter = "none"
            }}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            <span style={{ fontSize: "0.75rem", fontWeight: 400 }}>{isMuted ? "Muted" : "Sound"}</span>
          </button>
        </div>

        {/* Main Content - Big Button */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            position: "relative",
            zIndex: 10,
          }}
        >
          {/* Location Error Display */}
          {locationError && (
            <div
              style={{
                marginBottom: "2rem",
                background: "rgba(239, 68, 68, 0.2)",
                backdropFilter: "blur(10px)",
                border: "2px solid rgba(239, 68, 68, 0.5)",
                borderRadius: "1rem",
                padding: "1rem",
                boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
                maxWidth: "24rem",
                color: "white",
              }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ marginRight: "0.75rem", fontSize: "1.25rem" }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: "bold" }}>Location Error</div>
                  <div style={{ fontSize: "0.875rem", opacity: 0.9 }}>{locationError}</div>
                </div>
              </div>
            </div>
          )}

          {/* HOLE EFFECT - Looking through wall to map behind */}
          <div style={{ position: "relative", marginBottom: "3rem" }}>
            {/* Background Map Layer - Behind the wall */}
            <div
              style={{
                position: "absolute",
                top: "-2rem",
                left: "-2rem",
                right: "-2rem",
                bottom: "-2rem",
                backgroundImage: mapImageUrl ? `url(${mapImageUrl})` : "linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                borderRadius: "2rem",
                filter: "blur(1px) brightness(0.8)",
                zIndex: 1,
              }}
            />

            {/* Wall Surface with Circular Hole */}
            <div
              style={{
                position: "relative",
                width: "24rem",
                height: "24rem",
                borderRadius: "2rem",
                background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
                backdropFilter: "blur(20px)",
                border: "2px solid rgba(255,255,255,0.1)",
                boxShadow: `
                  0 25px 50px rgba(0,0,0,0.4),
                  inset 0 1px 0 rgba(255,255,255,0.1)
                `,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 2,
              }}
            >
              {/* The Hole - Circular cutout revealing map behind */}
              <div
                style={{
                  width: "18rem",
                  height: "18rem",
                  borderRadius: "50%",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: `
                    inset 0 0 0 6px rgba(0,0,0,0.4),
                    inset 0 8px 20px rgba(0,0,0,0.6),
                    inset 0 0 60px rgba(0,0,0,0.3)
                  `,
                  border: "4px solid #0f172a",
                }}
              >
                {/* Map visible through the hole */}
                <div
                  style={{
                    position: "absolute",
                    top: "-3rem",
                    left: "-3rem",
                    right: "-3rem",
                    bottom: "-3rem",
                    backgroundImage: mapImageUrl ? `url(${mapImageUrl})` : "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    transform: "scale(1.2)",
                  }}
                />

                {/* Interactive Button - Invisible overlay */}
                <button
                  onClick={markSpot}
                  disabled={isMarking || locationLoading}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "transparent",
                    border: "none",
                    borderRadius: "50%",
                    cursor: isMarking || locationLoading ? "not-allowed" : "pointer",
                    zIndex: 10,
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isMarking && !locationLoading) {
                      e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)"
                      e.currentTarget.style.boxShadow = "inset 0 0 0 2px rgba(59, 130, 246, 0.3)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isMarking && !locationLoading) {
                      e.currentTarget.style.background = "transparent"
                      e.currentTarget.style.boxShadow = "none"
                    }
                  }}
                  onMouseDown={(e) => {
                    if (!isMarking && !locationLoading) {
                      e.currentTarget.style.transform = "scale(0.98)"
                    }
                  }}
                  onMouseUp={(e) => {
                    if (!isMarking && !locationLoading) {
                      e.currentTarget.style.transform = "scale(1)"
                    }
                  }}
                />

                {/* Loading State Overlay */}
                {(isMarking || locationLoading || !mapImageUrl) && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: "rgba(0,0,0,0.8)",
                      borderRadius: "50%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 15,
                      color: "white",
                    }}
                  >
                    <div
                      style={{
                        width: "3rem",
                        height: "3rem",
                        border: "4px solid rgba(255,255,255,0.3)",
                        borderTop: "4px solid white",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                        marginBottom: "1rem",
                      }}
                    />
                    <div style={{ fontSize: "1rem", fontWeight: 900, textAlign: "center" }}>
                      {isMarking ? "MARKING..." : locationLoading ? "GETTING GPS..." : "LOADING MAP..."}
                    </div>
                  </div>
                )}

                {/* Pulsing Center Dot (when map is loaded) */}
                {mapImageUrl && !isMarking && !locationLoading && (
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      background: "rgba(239, 68, 68, 0.9)",
                      border: "2px solid white",
                      boxShadow: "0 0 0 4px rgba(239, 68, 68, 0.3)",
                      zIndex: 12,
                      animation: "pulse 2s infinite",
                    }}
                  />
                )}

                {/* Hole rim highlight */}
                <div
                  style={{
                    position: "absolute",
                    top: "4px",
                    left: "4px",
                    right: "4px",
                    bottom: "4px",
                    borderRadius: "50%",
                    border: "1px solid rgba(255,255,255,0.1)",
                    pointerEvents: "none",
                  }}
                />
              </div>

              {/* Wall texture/pattern overlay */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: "2rem",
                  background: `
                    radial-gradient(circle at 20% 30%, rgba(255,255,255,0.05) 1px, transparent 1px),
                    radial-gradient(circle at 80% 70%, rgba(255,255,255,0.03) 1px, transparent 1px)
                  `,
                  backgroundSize: "40px 40px, 60px 60px",
                  pointerEvents: "none",
                  zIndex: 3,
                }}
              />
            </div>

            {/* Instruction text below */}
            <div
              style={{
                position: "absolute",
                bottom: "-3rem",
                left: "50%",
                transform: "translateX(-50%)",
                color: "rgba(255,255,255,0.7)",
                fontSize: "0.875rem",
                textAlign: "center",
                background: "rgba(0,0,0,0.3)",
                backdropFilter: "blur(10px)",
                padding: "0.5rem 1rem",
                borderRadius: "1rem",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              👆 Tap the map to mark this spot
            </div>
          </div>

          {/* App Title */}
          <div style={{ textAlign: "center", maxWidth: "28rem" }}>
            <h1
              style={{
                fontSize: "2.5rem",
                fontWeight: 900,
                color: "white",
                marginBottom: "1rem",
                background: "linear-gradient(135deg, #bfdbfe 0%, #c4b5fd 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Mark This Spot
            </h1>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "1.125rem", marginBottom: "0.5rem" }}>
              <span style={{ fontWeight: "bold" }}>Like Shazam, but for places!</span>
            </p>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
              {spots.length} {spots.length === 1 ? "spot" : "spots"} marked • Real GPS tracking
            </p>
            {/* Current Location Display */}
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", fontStyle: "italic" }}>
              📍 {locationAddress}
            </p>
          </div>
        </div>

        {/* Bottom Left - Libraries Button - Pure Shazam Style */}
        <div
          style={{
            position: "absolute",
            bottom: "2rem",
            left: "2rem",
            zIndex: 20,
          }}
        >
          <button
            onClick={() => setCurrentScreen("libraries")}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.5rem",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              transition: "all 0.3s ease",
              color: "rgba(255,255,255,0.6)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.9)"
              e.currentTarget.style.transform = "translateY(-1px)"
              e.currentTarget.style.filter = "drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.6)"
              e.currentTarget.style.transform = "translateY(0)"
              e.currentTarget.style.filter = "none"
            }}
          >
            <Library size={20} />
            <span style={{ fontSize: "0.75rem", fontWeight: 400 }}>Libraries</span>
          </button>
        </div>

        {/* Bottom Right - Settings Button - Pure Shazam Style */}
        <div
          style={{
            position: "absolute",
            bottom: "2rem",
            right: "2rem",
            zIndex: 20,
          }}
        >
          <button
            onClick={() => setCurrentScreen("settings")}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.5rem",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              transition: "all 0.3s ease",
              color: "rgba(255,255,255,0.6)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.9)"
              e.currentTarget.style.transform = "translateY(-1px)"
              e.currentTarget.style.filter = "drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.6)"
              e.currentTarget.style.transform = "translateY(0)"
              e.currentTarget.style.filter = "none"
            }}
          >
            <Settings size={20} />
            <span style={{ fontSize: "0.75rem", fontWeight: 400 }}>Settings</span>
          </button>
        </div>

        {/* Mute Status Indicator */}
        {isMuted && (
          <div
            style={{
              position: "absolute",
              top: "5rem",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 20,
              background: "rgba(239, 68, 68, 0.9)",
              backdropFilter: "blur(10px)",
              color: "white",
              padding: "0.5rem 1rem",
              borderRadius: "9999px",
              fontSize: "0.875rem",
              fontWeight: "bold",
              boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
            }}
          >
            🔇 Sound Muted
          </div>
        )}

        {/* CSS Animations */}
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.7; }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    )
  }

  // Settings Screen
  if (currentScreen === "settings") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #1e293b 0%, #4f46e5 50%, #7c3aed 100%)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "1.5rem",
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h1 style={{ fontSize: "2rem", fontWeight: 900, color: "white" }}>Settings</h1>
            <button
              onClick={() => setCurrentScreen("main")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(10px)",
                color: "white",
                borderRadius: "0.75rem",
                border: "none",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
            >
              <ArrowLeft size={20} />
              Back
            </button>
          </div>
        </div>

        <div style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Spot Customization Section */}
          <div
            style={{
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(10px)",
              borderRadius: "1rem",
              padding: "1.5rem",
            }}
          >
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "white", marginBottom: "1rem" }}>
              🎯 Spot Customization
            </h2>
            <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: "1.5rem" }}>
              Customize how you mark and categorize your spots
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              
              {/* Category Selector */}
              <button
                onClick={() => setCurrentScreen("category-selector")}
                style={{
                  padding: "1.5rem",
                  borderRadius: "1rem",
                  border: "2px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.1)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  textAlign: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.15)"
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"
                  e.currentTarget.style.transform = "translateY(-2px)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)"
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"
                  e.currentTarget.style.transform = "translateY(0)"
                }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
                  {spotCategories[selectedCategory].emoji}
                </div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                  Category
                </h3>
                <p style={{ fontSize: "0.875rem", opacity: 0.8, marginBottom: "0.5rem" }}>
                  Current: {spotCategories[selectedCategory].name}
                </p>
                <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>
                  Tap to change →
                </div>
              </button>

              {/* Photo Capture */}
              <button
                onClick={() => setIsPhotoMode(!isPhotoMode)}
                style={{
                  padding: "1.5rem",
                  borderRadius: "1rem",
                  border: isPhotoMode ? "2px solid rgba(16, 185, 129, 0.5)" : "2px solid rgba(255,255,255,0.2)",
                  background: isPhotoMode ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.1)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  textAlign: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isPhotoMode ? "rgba(16, 185, 129, 0.25)" : "rgba(255,255,255,0.15)"
                  e.currentTarget.style.transform = "translateY(-2px)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isPhotoMode ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.1)"
                  e.currentTarget.style.transform = "translateY(0)"
                }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📸</div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                  Photo Mode
                </h3>
                <p style={{ fontSize: "0.875rem", opacity: 0.8, marginBottom: "0.5rem" }}>
                  {isPhotoMode ? "✓ Enabled" : "Disabled"}
                </p>
                <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>
                  {isPhotoMode ? "Photos will be captured" : "Tap to enable"}
                </div>
              </button>

              {/* Marker Style */}
              <button
                onClick={() => setCurrentScreen("marker-selector")}
                style={{
                  padding: "1.5rem",
                  borderRadius: "1rem",
                  border: "2px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.1)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  textAlign: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.15)"
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"
                  e.currentTarget.style.transform = "translateY(-2px)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)"
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"
                  e.currentTarget.style.transform = "translateY(0)"
                }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🎯</div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                  Marker Style
                </h3>
                <p style={{ fontSize: "0.875rem", opacity: 0.8, marginBottom: "0.5rem" }}>
                  Current: {selectedMarker.toUpperCase()}
                </p>
                <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>
                  Tap to change →
                </div>
              </button>
            </div>
          </div>

          {/* Sound Settings */}
          <div
            style={{
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(10px)",
              borderRadius: "1rem",
              padding: "1.5rem",
            }}
          >
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "white", marginBottom: "1rem" }}>
              🔊 Sound Settings
            </h2>
            
            {/* Mute Toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "white", marginBottom: "0.5rem" }}>
                  Sound Effects
                </h3>
                <p style={{ color: "rgba(255,255,255,0.7)" }}>Enable or disable all app sounds</p>
              </div>
              <button
                onClick={() => setIsMuted(!isMuted)}
                style={{
                  padding: "0.75rem",
                  borderRadius: "50%",
                  transition: "all 0.3s ease",
                  background: isMuted ? "#ef4444" : "#10b981",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>
            </div>

            {/* Current Sound */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ fontSize: "2rem" }}>
                {Object.values(soundCategories)
                  .flatMap((category) => Object.entries(category))
                  .find(([key]) => key === selectedSound)?.[1]?.emoji || "🎵"}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ color: "white", fontWeight: "bold" }}>
                  {Object.values(soundCategories)
                    .flatMap((category) => Object.entries(category))
                    .find(([key]) => key === selectedSound)?.[1]?.name || "Unknown"}
                </div>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem" }}>
                  {Object.values(soundCategories)
                    .flatMap((category) => Object.entries(category))
                    .find(([key]) => key === selectedSound)?.[1]?.description || ""}
                </div>
              </div>
              <button
                onClick={() => !isMuted && playSound(selectedSound)}
                disabled={isMuted}
                style={{
                  padding: "0.5rem",
                  borderRadius: "50%",
                  border: "none",
                  background: isMuted ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.2)",
                  color: isMuted ? "rgba(255,255,255,0.5)" : "white",
                  cursor: isMuted ? "not-allowed" : "pointer",
                }}
              >
                <Play size={20} />
              </button>
              <button
                onClick={() => setCurrentScreen("libraries")}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.5rem",
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                Change Sound
              </button>
            </div>
          </div>

          {/* App Info */}
          <div
            style={{
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(10px)",
              borderRadius: "1rem",
              padding: "1.5rem",
            }}
          >
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "white", marginBottom: "1rem" }}>
              📱 App Info
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.8)" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📍</div>
                <div style={{ fontSize: "0.875rem", fontWeight: "bold" }}>{spots.length}</div>
                <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>Spots Marked</div>
              </div>
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.8)" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🎵</div>
                <div style={{ fontSize: "0.875rem", fontWeight: "bold" }}>v1.0</div>
                <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>App Version</div>
              </div>
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.8)" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🗺️</div>
                <div style={{ fontSize: "0.875rem", fontWeight: "bold" }}>GPS</div>
                <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>Location Mode</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Category Selector Screen
  if (currentScreen === "category-selector") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: \"linear-gradient(135deg, #1e293b 0%, #7c3aed 50%, #4f46e5 100%)",
          display: "flex",\
          flexDirection: "column",
        }}
      >
        <div\
          style={{\
            padding: "1.5rem",\
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)",\
            borderBottom: \"1px solid rgba(255,255,255,0.2)",
          }}
        >
          <div style={{ display: "flex\", alignItems: \"center", justifyContent: \"space-between" }}>
            <h1 style={{ fontSize: "2rem", fontWeight: 900, color: "white\", margin: 0 }}>🏷️ Choose Category</h1>
            <button
              onClick={() => setCurrentScreen(\"settings")}
              style={{
                display: "flex",\
                alignItems: \"center",
                gap: "0.5rem",\
                padding: \"0.5rem 1rem",\
                background: \"rgba(255,255,255,0.2)",
                backdropFilter: \"blur(10px)",\
                color: "white",\
                borderRadius: \"0.75rem",
                border: \"none\",\
                cursor: \"pointer",\
                transition: \"all 0.3s ease\",\
              }}
            >
              <ArrowLeft size={20} />
              Back
            </button>
          </div>
        </div>

        <div style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
            {Object.entries(spotCategories).map(([key, category]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                style={{
                  padding: "1.5rem",
                  borderRadius: "1rem",
                  border: "2px solid rgba(255,255,255,0.2)",
                  background: selectedCategory === key ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  textAlign: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.25)"
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"
                  e.currentTarget.style.transform = "translateY(-2px)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    selectedCategory === key ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)"
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"
                  e.currentTarget.style.transform = "translateY(0)"
                }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>{category.emoji}</div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                  {category.name}
                </h3>
                <p style={{ fontSize: "0.875rem", opacity: 0.8 }}>{category.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Marker Selector Screen
  if (currentScreen === "marker-selector") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #1e293b 0%, #7c3aed 50%, #4f46e5 100%)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "1.5rem",
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h1 style={{ fontSize: "2rem", fontWeight: 900, color: "white", margin: 0 }}>🎯 Choose Marker</h1>
            <button
              onClick={() => setCurrentScreen("settings")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(10px)",
                color: "white",
                borderRadius: "0.75rem",
                border: "none",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
            >
              <ArrowLeft size={20} />
              Back
            </button>
          </div>
        </div>

        <div style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
            {["pin", "flag", "star", "heart"].map((marker) => (
              <button
                key={marker}
                onClick={() => setSelectedMarker(marker)}
                style={{
                  padding: "1.5rem",
                  borderRadius: "1rem",
                  border: "2px solid rgba(255,255,255,0.2)",
                  background: selectedMarker === marker ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  textAlign: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.25)"
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"
                  e.currentTarget.style.transform = "translateY(-2px)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    selectedMarker === marker ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)"
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"
                  e.currentTarget.style.transform = "translateY(0)"
                }}
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🎯</div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                  {marker.toUpperCase()}
                </h3>
                <p style={{ fontSize: "0.875rem", opacity: 0.8 }}>Select this marker style</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Libraries Screen - Sound Selection
  if (currentScreen === "libraries") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #1e293b 0%, #4f46e5 50%, #7c3aed 100%)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "1.5rem",
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h1 style={{ fontSize: "2rem", fontWeight: 900, color: "white" }}>🎵 Sound Library</h1>
            <button
              onClick={() => setCurrentScreen("settings")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(10px)",
                color: "white",
                borderRadius: "0.75rem",
                border: "none",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
            >
              <ArrowLeft size={20} />
              Back
            </button>
          </div>
        </div>

        <div style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {Object.entries(soundCategories).map(([categoryName, sounds]) => (
              <div
                key={categoryName}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  backdropFilter: "blur(10px)",
                  borderRadius: "1rem",
                  padding: "1.5rem",
                }}
              >
                <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "white", marginBottom: "1rem" }}>
                  {categoryName}
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                  {Object.entries(sounds).map(([soundKey, sound]) => (
                    <button
                      key={soundKey}
                      onClick={() => setSelectedSound(soundKey)}
                      style={{
                        padding: "1.5rem",
                        borderRadius: "1rem",
                        border: "2px solid rgba(255,255,255,0.2)",
                        background: selectedSound === soundKey ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
                        backdropFilter: "blur(10px)",
                        color: "white",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        textAlign: "center",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(255,255,255,0.25)"
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"
                        e.currentTarget.style.transform = "translateY(-2px)"
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          selectedSound === soundKey ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)"
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"
                        e.currentTarget.style.transform = "translateY(0)"
                      }}
                    >
                      <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>{sound.emoji}</div>
                      <h3 style={{ fontSize: "1.125rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                        {sound.name}
                      </h3>
                      <p style={{ fontSize: "0.875rem", opacity: 0.8 }}>{sound.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
