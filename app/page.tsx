"use client"

import { useEffect, useState, useRef } from "react"
import { useLocationServices } from "./hooks/useLocationServices"
import { reverseGeocode } from "./utils/geocoding"
import { playSound } from "./utils/audio"
import { Volume2, VolumeX, Library, Settings, ArrowLeft, Play, MapPin, Eye } from "lucide-react"

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

  useEffect(() => {
    setIsClient(true)
    console.log("🚀 Mark This Spot - Latest Version Loaded!")
  }, [])

  const { getCurrentLocation, isLoading: locationLoading, error: locationError } = useLocationServices()

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

  const generateMapImageUrl = (lat: number, lng: number) => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.error("❌ No Google Maps API key found!")
      return null
    }

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
    console.log("🗺️ Generated map image URL:", imageUrl)

    const testImg = new Image()
    testImg.onload = () => {
      console.log("✅ Static Map image loaded successfully!")
    }
    testImg.onerror = (error) => {
      console.error("❌ Static Map image failed to load:", error)
    }
    testImg.src = imageUrl

    return imageUrl
  }

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

          const imageUrl = generateMapImageUrl(location.latitude, location.longitude)
          if (imageUrl) {
            setMapImageUrl(imageUrl)
          }

          try {
            const address = await reverseGeocode(location.latitude, location.longitude)
            setLocationAddress(address)
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

      if (!isMuted) {
        await playSound(selectedSound)
      }

      setSpots((prev) => [newSpot, ...prev])
      setCurrentSpot(newSpot)

      setCapturedPhoto(null)
      setIsPhotoMode(false)

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

      setCurrentScreen("results")
    } catch (error) {
      console.error("Error marking spot:", error)
      alert("❌ Failed to mark spot!\n\nPlease check your location permissions and try again.")
    } finally {
      setIsMarking(false)
    }
  }

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

        <div
          style={{
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)",
            borderTop: "1px solid rgba(255,255,255,0.2)",
            padding: "1.5rem",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "white", marginBottom: "0.5rem" }}>
                📍 Location
              </h3>
              <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "1rem", margin: 0 }}>{currentSpot.address}</p>
            </div>

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
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            <span style={{ fontSize: "0.75rem", fontWeight: 400 }}>{isMuted ? "Muted" : "Sound"}</span>
          </button>
        </div>

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

          {/* CLEAN HOLE EFFECT - Simple circular cutout in wall */}
          <div style={{ position: "relative", marginBottom: "3rem" }}>
            {/* The Wall */}
            <div
              style={{
                position: "relative",
                width: "20rem",
                height: "20rem",
                borderRadius: "1rem",
                background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
                backdropFilter: "blur(20px)",
                border: "2px solid rgba(255,255,255,0.1)",
                boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* The Clean Circular Hole */}
              <div
                style={{
                  width: "16rem",
                  height: "16rem",
                  borderRadius: "50%",
                  overflow: "hidden",
                  position: "relative",
                  boxShadow: "inset 0 0 20px rgba(0,0,0,0.6)",
                }}
              >
                {/* Map visible through the hole */}
                <div
                  style={{
                    position: "absolute",
                    top: "-2rem",
                    left: "-2rem",
                    right: "-2rem",
                    bottom: "-2rem",
                    backgroundImage: mapImageUrl
                      ? `url(${mapImageUrl})`
                      : "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    transform: "scale(1.2)",
                  }}
                />

                {/* Interactive Button */}
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
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isMarking && !locationLoading) {
                      e.currentTarget.style.background = "transparent"
                    }
                  }}
                />

                {/* Loading State */}
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

                {/* Center Location Dot */}
                {mapImageUrl && !isMarking && !locationLoading && (
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      background: "rgba(239, 68, 68, 0.9)",
                      border: "2px solid white",
                      boxShadow: "0 0 0 4px rgba(239, 68, 68, 0.3)",
                      zIndex: 12,
                      animation: "pulse 2s infinite",
                    }}
                  />
                )}
              </div>
            </div>

            {/* Instruction Text */}
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
              👆 Tap through the hole to mark this spot
            </div>
          </div>

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
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", fontStyle: "italic" }}>
              📍 {locationAddress}
            </p>
          </div>
        </div>

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
          >
            <Library size={20} />
            <span style={{ fontSize: "0.75rem", fontWeight: 400 }}>Libraries</span>
          </button>
        </div>

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
          >
            <Settings size={20} />
            <span style={{ fontSize: "0.75rem", fontWeight: 400 }}>Settings</span>
          </button>
        </div>

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

              <div
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}
              >
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
                >
                  <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
                    {spotCategories[selectedCategory].emoji}
                  </div>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Category</h3>
                  <p style={{ fontSize: "0.875rem", opacity: 0.8, marginBottom: "0.5rem" }}>
                    Current: {spotCategories[selectedCategory].name}
                  </p>
                  <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>Tap to change →</div>
                </button>

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
                >
                  <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📸</div>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Photo Mode</h3>
                  <p style={{ fontSize: "0.875rem", opacity: 0.8, marginBottom: "0.5rem" }}>
                    {isPhotoMode ? "✓ Enabled" : "Disabled"}
                  </p>
                  <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>
                    {isPhotoMode ? "Photos will be captured" : "Tap to enable"}
                  </div>
                </button>

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
                >
                  <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🎯</div>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Marker Style</h3>
                  <p style={{ fontSize: "0.875rem", opacity: 0.8, marginBottom: "0.5rem" }}>
                    Current: {selectedMarker.toUpperCase()}
                  </p>
                  <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>Tap to change →</div>
                </button>
              </div>
            </div>

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

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1.5rem",
                }}
              >
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
              <div
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}
              >
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
      </div>
    )
  }

  if (currentScreen === "category-selector") {
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
            <h1 style={{ fontSize: "2rem", fontWeight: 900, color: "white", margin: 0 }}>🏷️ Choose Category</h1>
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
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>{category.emoji}</div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "bold", marginBottom: "0.5rem" }}>{category.name}</h3>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

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
              >
                <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🎯</div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                  {marker.toUpperCase()}
                </h3>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

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
                <div
                  style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}
                >
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
                    >
                      <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>{sound.emoji}</div>
                      <h3 style={{ fontSize: "1.125rem", fontWeight: "bold", marginBottom: "0.5rem" }}>{sound.name}</h3>
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

  return null
}

function LiveResultsMap({
  spot,
  onLocationUpdate,
}: {
  spot: Spot
  onLocationUpdate: (lat: number, lng: number, address: string) => void
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const streetViewRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [marker, setMarker] = useState<any>(null)
  const [streetView, setStreetView] = useState<any>(null)
  const [showStreetView, setShowStreetView] = useState(false)

  useEffect(() => {
    if ((window as any).google) {
      setIsLoaded(true)
      return
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      setLoadError("Google Maps API key not configured")
      return
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      setIsLoaded(true)
      return
    }

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initResultsMap&libraries=places&v=weekly&loading=async`
    script.async = true
    script.defer = true
    ;(window as any).initResultsMap = () => {
      console.log("🗺️ Google Maps loaded successfully")
      setIsLoaded(true)
    }

    script.onerror = () => {
      setLoadError("Failed to load Google Maps")
    }

    document.head.appendChild(script)

    return () => {
      delete (window as any).initResultsMap
    }
  }, [])

  useEffect(() => {
    if (!isLoaded || !mapRef.current || loadError || !(window as any).google) return

    try {
      const newMap = new (window as any).google.maps.Map(mapRef.current, {
        zoom: 18,
        center: { lat: spot.latitude, lng: spot.longitude },
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      })

      setTimeout(() => {
        ;(window as any).google.maps.event.trigger(newMap, "resize")
        newMap.setCenter({ lat: spot.latitude, lng: spot.longitude })
      }, 100)

      const newMarker = new (window as any).google.maps.Marker({
        position: { lat: spot.latitude, lng: spot.longitude },
        map: newMap,
        title: "Drag to refine location",
        draggable: true,
        icon: {
          path: (window as any).google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: "#10B981",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 3,
        },
      })

      newMarker.addListener("dragend", async (event: any) => {
        const position = event.latLng
        const lat = position.lat()
        const lng = position.lng()

        try {
          const geocoder = new (window as any).google.maps.Geocoder()
          geocoder.geocode({ location: { lat, lng } }, (results: any, status: string) => {
            if (status === "OK" && results[0]) {
              onLocationUpdate(lat, lng, results[0].formatted_address)
            } else {
              onLocationUpdate(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`)
            }
          })
        } catch (error) {
          onLocationUpdate(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`)
        }
      })

      if (streetViewRef.current) {
        const streetViewService = new (window as any).google.maps.StreetViewService()

        streetViewService.getPanorama(
          {
            location: { lat: spot.latitude, lng: spot.longitude },
            radius: 50,
            source: (window as any).google.maps.StreetViewSource.OUTDOOR,
          },
          (data: any, status: string) => {
            if (status === "OK") {
              const streetViewPanorama = new (window as any).google.maps.StreetViewPanorama(streetViewRef.current, {
                position: data.location.latLng,
                pov: { heading: 0, pitch: 0 },
                zoom: 1,
                visible: false,
                addressControl: true,
                linksControl: true,
                panControl: true,
                enableCloseButton: false,
              })

              setStreetView(streetViewPanorama)
            } else {
              setStreetView(null)
            }
          },
        )
      }

      setMap(newMap)
      setMarker(newMarker)
    } catch (error) {
      console.error("Map initialization failed:", error)
      setLoadError("Failed to initialize map")
    }
  }, [isLoaded, spot.latitude, spot.longitude, loadError, onLocationUpdate])

  const toggleStreetView = () => {
    if (!streetView) {
      alert("❌ Street View not available at this location.\n\nTry dragging the marker to a nearby street!")
      return
    }

    if (!showStreetView) {
      if (marker) {
        const position = marker.getPosition ? marker.getPosition() : marker.position
        streetView.setPosition(position)
      }
      streetView.setVisible(true)
      setShowStreetView(true)
    } else {
      streetView.setVisible(false)
      setShowStreetView(false)
    }
  }

  if (loadError) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(239, 68, 68, 0.1)",
          color: "white",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Map Error</h3>
          <p>{loadError}</p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255,255,255,0.1)",
          color: "white",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "3rem",
              height: "3rem",
              border: "4px solid rgba(255,255,255,0.3)",
              borderTop: "4px solid white",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              marginBottom: "1rem",
              margin: "0 auto 1rem auto",
            }}
          ></div>
          <p>Loading interactive map...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: "100%", position: "relative" }}>
      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: "100%",
          minHeight: "400px",
          backgroundColor: "#f0f0f0",
          display: showStreetView ? "none" : "block",
        }}
      />

      <div
        ref={streetViewRef}
        style={{
          width: "100%",
          height: "100%",
          minHeight: "400px",
          backgroundColor: "#f0f0f0",
          display: showStreetView ? "block" : "none",
        }}
      />

      <button
        onClick={toggleStreetView}
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.75rem 1rem",
          background: showStreetView ? "#10b981" : "rgba(255,255,255,0.9)",
          backdropFilter: "blur(10px)",
          color: showStreetView ? "white" : "#1f2937",
          borderRadius: "0.75rem",
          border: "none",
          cursor: "pointer",
          transition: "all 0.3s ease",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          fontWeight: 600,
          fontSize: "0.875rem",
          zIndex: 10,
        }}
      >
        <Eye size={18} />
        {showStreetView ? "Exit Street View" : "Street View"}
      </button>

      {!showStreetView && (
        <div
          style={{
            position: "absolute",
            bottom: "1rem",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(10px)",
            color: "white",
            padding: "0.75rem 1rem",
            borderRadius: "0.75rem",
            fontSize: "0.875rem",
            textAlign: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          🖱️ Drag the green marker to refine your location
        </div>
      )}

      {showStreetView && (
        <div
          style={{
            position: "absolute",
            bottom: "1rem",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(16, 185, 129, 0.9)",
            backdropFilter: "blur(10px)",
            color: "white",
            padding: "0.75rem 1rem",
            borderRadius: "0.75rem",
            fontSize: "0.875rem",
            textAlign: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          🏠 Street View Active - Look around with mouse/touch
        </div>
      )}
    </div>
  )
}
