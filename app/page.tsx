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

  useEffect(() => {
    setIsClient(true)
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

  // Get user's current location for map centering
  useEffect(() => {
    const getInitialLocation = async () => {
      const location = await getCurrentLocation()
      if (location) {
        setUserLocation({
          lat: location.latitude,
          lng: location.longitude,
        })
      }
    }

    getInitialLocation()
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

      // Create new spot with real coordinates
      const newSpot: Spot = {
        id: Date.now().toString(),
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: new Date().toISOString(),
        address: "Getting address...",
        notes: "",
      }

      // Play the selected sound immediately (if not muted)!
      if (!isMuted) {
        await playSound(selectedSound)
      }

      // Add spot to storage
      setSpots((prev) => [newSpot, ...prev])
      setCurrentSpot(newSpot)

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
        {/* Top Right - Mute Button */}
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
              padding: "1rem",
              borderRadius: "50%",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
              transition: "all 0.3s ease",
              background: isMuted ? "#ef4444" : "rgba(255,255,255,0.2)",
              color: "white",
              backdropFilter: "blur(10px)",
            }}
          >
            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
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

          {/* Enhanced 3D Pavement-Embedded Button */}
          <div style={{ position: "relative", marginBottom: "3rem" }}>
            {/* Pavement Base */}
            <div
              style={{
                position: "absolute",
                width: "24rem",
                height: "24rem",
                borderRadius: "50%",
                background: `
        radial-gradient(circle at 30% 30%, #8B8B8B 0%, #6B6B6B 50%, #4A4A4A 100%),
        linear-gradient(45deg, #7A7A7A 25%, transparent 25%),
        linear-gradient(-45deg, #7A7A7A 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #7A7A7A 75%),
        linear-gradient(-45deg, transparent 75%, #7A7A7A 75%)
      `,
                backgroundSize: "100% 100%, 8px 8px, 8px 8px, 8px 8px, 8px 8px",
                backgroundPosition: "0 0, 0 0, 0 4px, 4px -4px, -4px 0px",
                boxShadow: `
        inset 0 0 0 8px #5A5A5A,
        inset 0 0 0 12px #6B6B6B,
        inset 0 0 0 16px #4A4A4A,
        0 8px 16px rgba(0,0,0,0.4),
        0 4px 8px rgba(0,0,0,0.3)
      `,
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: 1,
              }}
            >
              {/* Expansion Joint Lines */}
              <div
                style={{
                  position: "absolute",
                  top: "10%",
                  left: "20%",
                  right: "20%",
                  height: "2px",
                  background: "linear-gradient(90deg, transparent 0%, #3A3A3A 50%, transparent 100%)",
                  transform: "rotate(15deg)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: "15%",
                  left: "15%",
                  right: "25%",
                  height: "2px",
                  background: "linear-gradient(90deg, transparent 0%, #3A3A3A 50%, transparent 100%)",
                  transform: "rotate(-20deg)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "30%",
                  bottom: "30%",
                  left: "15%",
                  width: "2px",
                  background: "linear-gradient(0deg, transparent 0%, #3A3A3A 50%, transparent 100%)",
                  transform: "rotate(10deg)",
                }}
              />
            </div>

            {/* Main Button with Street Map Background */}
            <button
              onClick={markSpot}
              disabled={isMarking || locationLoading}
              style={{
                position: "relative",
                width: "20rem",
                height: "20rem",
                borderRadius: "50%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.3s ease",
                border: "none",
                cursor: isMarking || locationLoading ? "not-allowed" : "pointer",
                transform: isMarking || locationLoading ? "scale(0.95)" : "scale(1)",
                zIndex: 2,
                overflow: "hidden",
                background:
                  isMarking || locationLoading ? "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)" : "#F8F9FA",
                boxShadow: `
        inset 0 0 0 4px rgba(255,255,255,0.3),
        inset 0 0 0 8px rgba(0,0,0,0.1),
        0 4px 8px rgba(0,0,0,0.2),
        0 8px 16px rgba(59, 130, 246, 0.3)
      `,
              }}
              onMouseEnter={(e) => {
                if (!isMarking && !locationLoading) {
                  e.currentTarget.style.transform = "scale(1.02)"
                  e.currentTarget.style.boxShadow = `
          inset 0 0 0 4px rgba(255,255,255,0.4),
          inset 0 0 0 8px rgba(0,0,0,0.1),
          0 6px 12px rgba(0,0,0,0.3),
          0 12px 24px rgba(59, 130, 246, 0.4)
        `
                }
              }}
              onMouseLeave={(e) => {
                if (!isMarking && !locationLoading) {
                  e.currentTarget.style.transform = "scale(1)"
                  e.currentTarget.style.boxShadow = `
          inset 0 0 0 4px rgba(255,255,255,0.3),
          inset 0 0 0 8px rgba(0,0,0,0.1),
          0 4px 8px rgba(0,0,0,0.2),
          0 8px 16px rgba(59, 130, 246, 0.3)
        `
                }
              }}
              onMouseDown={(e) => {
                if (!isMarking && !locationLoading) {
                  e.currentTarget.style.transform = "scale(0.98)"
                }
              }}
              onMouseUp={(e) => {
                if (!isMarking && !locationLoading) {
                  e.currentTarget.style.transform = "scale(1.02)"
                }
              }}
            >
              {/* Street Map Background */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  borderRadius: "50%",
                  background: `
          linear-gradient(135deg, rgba(248, 249, 250, 0.95) 0%, rgba(241, 245, 249, 0.95) 100%),
          repeating-linear-gradient(0deg, #E5E7EB 0px, #E5E7EB 1px, transparent 1px, transparent 40px),
          repeating-linear-gradient(90deg, #E5E7EB 0px, #E5E7EB 1px, transparent 1px, transparent 40px)
        `,
                  backgroundSize: "100% 100%, 40px 40px, 40px 40px",
                  zIndex: 1,
                }}
              >
                {/* Streets */}
                <div
                  style={{
                    position: "absolute",
                    top: "30%",
                    left: 0,
                    right: 0,
                    height: "8%",
                    background: "#D1D5DB",
                    zIndex: 2,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "65%",
                    left: 0,
                    right: 0,
                    height: "8%",
                    background: "#D1D5DB",
                    zIndex: 2,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: "30%",
                    width: "8%",
                    background: "#D1D5DB",
                    zIndex: 2,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: "65%",
                    width: "8%",
                    background: "#D1D5DB",
                    zIndex: 2,
                  }}
                />

                {/* Street Names */}
                <div
                  style={{
                    position: "absolute",
                    top: "32%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: "8px",
                    fontWeight: "bold",
                    color: "#374151",
                    zIndex: 3,
                  }}
                >
                  Maple Ave
                </div>
                <div
                  style={{
                    position: "absolute",
                    top: "67%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: "8px",
                    fontWeight: "bold",
                    color: "#374151",
                    zIndex: 3,
                  }}
                >
                  Garden St
                </div>
                <div
                  style={{
                    position: "absolute",
                    top: "15%",
                    left: "32%",
                    transform: "rotate(-90deg)",
                    fontSize: "8px",
                    fontWeight: "bold",
                    color: "#374151",
                    zIndex: 3,
                  }}
                >
                  Central Dr
                </div>
                <div
                  style={{
                    position: "absolute",
                    top: "15%",
                    left: "67%",
                    transform: "rotate(-90deg)",
                    fontSize: "8px",
                    fontWeight: "bold",
                    color: "#374151",
                    zIndex: 3,
                  }}
                >
                  Park Ln
                </div>

                {/* Houses */}
                <div
                  style={{
                    position: "absolute",
                    top: "8%",
                    left: "8%",
                    width: "20%",
                    height: "20%",
                    background: "#FEF3C7",
                    border: "2px solid #D97706",
                    borderRadius: "4px",
                    zIndex: 2,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "8%",
                    left: "40%",
                    width: "20%",
                    height: "20%",
                    background: "#DBEAFE",
                    border: "2px solid #2563EB",
                    borderRadius: "4px",
                    zIndex: 2,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "8%",
                    left: "72%",
                    width: "20%",
                    height: "20%",
                    background: "#DCFCE7",
                    border: "2px solid #059669",
                    borderRadius: "4px",
                    zIndex: 2,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "40%",
                    left: "8%",
                    width: "20%",
                    height: "20%",
                    background: "#FDE2E8",
                    border: "2px solid #DC2626",
                    borderRadius: "4px",
                    zIndex: 2,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "40%",
                    left: "40%",
                    width: "20%",
                    height: "20%",
                    background: "#F3E8FF",
                    border: "2px solid #7C3AED",
                    borderRadius: "4px",
                    zIndex: 2,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "40%",
                    left: "72%",
                    width: "20%",
                    height: "20%",
                    background: "#FEF3C7",
                    border: "2px solid #D97706",
                    borderRadius: "4px",
                    zIndex: 2,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "72%",
                    left: "8%",
                    width: "20%",
                    height: "20%",
                    background: "#DCFCE7",
                    border: "2px solid #059669",
                    borderRadius: "4px",
                    zIndex: 2,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "72%",
                    left: "40%",
                    width: "20%",
                    height: "20%",
                    background: "#DBEAFE",
                    border: "2px solid #2563EB",
                    borderRadius: "4px",
                    zIndex: 2,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "72%",
                    left: "72%",
                    width: "20%",
                    height: "20%",
                    background: "#FDE2E8",
                    border: "2px solid #DC2626",
                    borderRadius: "4px",
                    zIndex: 2,
                  }}
                />
              </div>

              {/* 3D Marker Pin on Property */}
              <div
                style={{
                  position: "absolute",
                  top: "45%",
                  right: "25%",
                  width: "32px",
                  height: "40px",
                  zIndex: 4,
                }}
              >
                <svg width="32" height="40" viewBox="0 0 32 40">
                  {/* Pin Shadow */}
                  <ellipse cx="17" cy="38" rx="4" ry="2" fill="rgba(0,0,0,0.3)" />

                  {/* Pin Body */}
                  <path
                    d="M16 6C12.1 6 9 9.1 9 13c0 6 7 19 7 19s7-13 7-19c0-3.9-3.1-7-7-7z"
                    fill="url(#pinGradient)"
                    stroke="rgba(0,0,0,0.2)"
                    strokeWidth="1"
                  />

                  {/* Pin Center */}
                  <circle cx="16" cy="13" r="4" fill="rgba(255,255,255,0.9)" />
                  <circle cx="16" cy="13" r="3" fill="#10B981" />

                  <defs>
                    <linearGradient id="pinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10B981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Loading State Overlay */}
              {(isMarking || locationLoading) && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0,0,0,0.7)",
                    borderRadius: "50%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 5,
                    color: "white",
                  }}
                >
                  <div
                    style={{
                      width: "3rem",
                      height: "3rem",
                      border: "4px solid white",
                      borderTop: "4px solid transparent",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                      marginBottom: "1rem",
                    }}
                  />
                  <div style={{ fontSize: "1rem", fontWeight: 900, textAlign: "center" }}>
                    {isMarking ? "MARKING..." : "GETTING GPS..."}
                  </div>
                </div>
              )}
            </button>
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
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.875rem" }}>
              {spots.length} {spots.length === 1 ? "spot" : "spots"} marked • Real GPS tracking
            </p>
          </div>
        </div>

        {/* Bottom Left - Libraries Button */}
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
              alignItems: "center",
              gap: "0.75rem",
              padding: "1rem 1.5rem",
              background: "rgba(255,255,255,0.2)",
              backdropFilter: "blur(10px)",
              borderRadius: "1rem",
              boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
              color: "white",
              border: "none",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.3)"
              e.currentTarget.style.transform = "scale(1.05)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.2)"
              e.currentTarget.style.transform = "scale(1)"
            }}
          >
            <Library size={24} />
            <span style={{ fontWeight: 600 }}>Libraries</span>
          </button>
        </div>

        {/* Bottom Right - Settings Button */}
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
              alignItems: "center",
              gap: "0.75rem",
              padding: "1rem 1.5rem",
              background: "rgba(255,255,255,0.2)",
              backdropFilter: "blur(10px)",
              borderRadius: "1rem",
              boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
              color: "white",
              border: "none",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.3)"
              e.currentTarget.style.transform = "scale(1.05)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.2)"
              e.currentTarget.style.transform = "scale(1)"
            }}
          >
            <Settings size={24} />
            <span style={{ fontWeight: 600 }}>Settings</span>
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

        {/* CSS Animation */}
        <style jsx>{`
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    )
  }

  // Libraries Screen - Enhanced with Sound Library
  if (currentScreen === "libraries") {
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
            <h1 style={{ fontSize: "2rem", fontWeight: 900, color: "white" }}>Libraries</h1>
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
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {/* Sound Library */}
            <div
              style={{
                background: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
                borderRadius: "1rem",
                padding: "1.5rem",
              }}
            >
              <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "white", marginBottom: "1rem" }}>
                🎵 Sound Library
              </h2>
              <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: "1.5rem" }}>
                Choose your epic sound for marking spots!
              </p>

              {Object.entries(soundCategories).map(([categoryName, sounds]) => (
                <div key={categoryName} style={{ marginBottom: "2rem" }}>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "white", marginBottom: "1rem" }}>
                    {categoryName}
                  </h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "1rem",
                    }}
                  >
                    {Object.entries(sounds).map(([soundKey, sound]) => (
                      <button
                        key={soundKey}
                        onClick={() => setSelectedSound(soundKey)}
                        style={{
                          padding: "1rem",
                          borderRadius: "0.75rem",
                          border: selectedSound === soundKey ? "2px solid #3b82f6" : "2px solid transparent",
                          background: selectedSound === soundKey ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.1)",
                          backdropFilter: "blur(10px)",
                          color: "white",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          textAlign: "left",
                        }}
                        onMouseEnter={(e) => {
                          if (selectedSound !== soundKey) {
                            e.currentTarget.style.background = "rgba(255,255,255,0.15)"
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedSound !== soundKey) {
                            e.currentTarget.style.background = "rgba(255,255,255,0.1)"
                          }
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "1.5rem" }}>{sound.emoji}</span>
                            <span style={{ fontWeight: "bold" }}>{sound.name}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!isMuted) playSound(soundKey)
                            }}
                            style={{
                              padding: "0.25rem",
                              borderRadius: "50%",
                              border: "none",
                              background: "rgba(255,255,255,0.2)",
                              color: "white",
                              cursor: "pointer",
                            }}
                          >
                            <Play size={16} />
                          </button>
                        </div>
                        <div style={{ fontSize: "0.875rem", opacity: 0.8 }}>{sound.description}</div>
                        {selectedSound === soundKey && (
                          <div
                            style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#3b82f6", fontWeight: "bold" }}
                          >
                            ✓ Selected
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Maps & Spots - Coming Soon */}
            <div
              style={{
                background: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
                borderRadius: "1rem",
                padding: "1.5rem",
              }}
            >
              <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "white", marginBottom: "1rem" }}>
                🗺️ Maps & Spots
              </h2>
              <p style={{ color: "rgba(255,255,255,0.7)", marginBottom: "1rem" }}>Coming in Phase 2!</p>
              <div
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}
              >
                <div
                  style={{
                    padding: "1rem",
                    borderRadius: "0.75rem",
                    background: "rgba(255,255,255,0.05)",
                    textAlign: "center",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🗺️</div>
                  <div style={{ fontSize: "0.875rem" }}>Maps View</div>
                </div>
                <div
                  style={{
                    padding: "1rem",
                    borderRadius: "0.75rem",
                    background: "rgba(255,255,255,0.05)",
                    textAlign: "center",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📍</div>
                  <div style={{ fontSize: "0.875rem" }}>My Spots</div>
                </div>
                <div
                  style={{
                    padding: "1rem",
                    borderRadius: "0.75rem",
                    background: "rgba(255,255,255,0.05)",
                    textAlign: "center",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎯</div>
                  <div style={{ fontSize: "0.875rem" }}>Pin Icons</div>
                </div>
                <div
                  style={{
                    padding: "1rem",
                    borderRadius: "0.75rem",
                    background: "rgba(255,255,255,0.05)",
                    textAlign: "center",
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📮</div>
                  <div style={{ fontSize: "0.875rem" }}>Postcards</div>
                </div>
              </div>
            </div>
          </div>
        </div>
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

        <div style={{ flex: 1, padding: "1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Mute Setting */}
            <div
              style={{
                background: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
                borderRadius: "1rem",
                padding: "1.5rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "white", marginBottom: "0.5rem" }}>
                    Sound
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
            </div>

            {/* Current Sound Setting */}
            <div
              style={{
                background: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
                borderRadius: "1rem",
                padding: "1.5rem",
              }}
            >
              <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "white", marginBottom: "1rem" }}>
                Current Sound
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <span style={{ fontSize: "2rem" }}>
                  {Object.values(soundCategories)
                    .flatMap((category) => Object.entries(category))
                    .find(([key]) => key === selectedSound)?.[1]?.emoji || "🎵"}
                </span>
                <div>
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
              </div>
            </div>

            {/* Placeholder for other settings */}
            <div
              style={{
                background: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
                borderRadius: "1rem",
                padding: "1.5rem",
              }}
            >
              <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "white", marginBottom: "1rem" }}>
                More Settings Coming Soon!
              </h3>
              <p style={{ color: "rgba(255,255,255,0.7)" }}>Background colors, volume control, brightness, and more.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Fallback
  return null
}

// Live Results Map Component - FIXED STREET VIEW
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

  // Load Google Maps API - FORCE LATEST VERSION
  useEffect(() => {
    if (window.google) {
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
    // FORCE LATEST VERSION + ADD MARKER LIBRARY
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initResultsMap&libraries=places,marker&v=beta&loading=async`
    script.async = true
    script.defer = true

    window.initResultsMap = () => {
      console.log("🗺️ LATEST Google Maps loaded successfully")
      setIsLoaded(true)
    }

    script.onerror = () => {
      setLoadError("Failed to load Google Maps")
    }

    document.head.appendChild(script)

    return () => {
      delete window.initResultsMap
    }
  }, [])

  // Initialize map - ENHANCED WITH STREET VIEW CHECKING
  useEffect(() => {
    if (!isLoaded || !mapRef.current || loadError || !window.google) return

    try {
      const newMap = new window.google.maps.Map(mapRef.current, {
        zoom: 18, // HIGHER ZOOM FOR BETTER DETAIL
        center: { lat: spot.latitude, lng: spot.longitude },
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        mapId: "DEMO_MAP_ID", // ENABLE LATEST FEATURES
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      })

      // Force map to resize and center
      setTimeout(() => {
        window.google.maps.event.trigger(newMap, "resize")
        newMap.setCenter({ lat: spot.latitude, lng: spot.longitude })
        console.log("🗺️ Map forced resize and center")
      }, 100)

      // CREATE ADVANCED MARKER (NEW API)
      let newMarker
      if (window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement) {
        console.log("🎯 Using NEW AdvancedMarkerElement")
        newMarker = new window.google.maps.marker.AdvancedMarkerElement({
          position: { lat: spot.latitude, lng: spot.longitude },
          map: newMap,
          title: "Drag to refine location",
          gmpDraggable: true,
        })
      } else {
        console.log("🎯 Fallback to classic Marker")
        newMarker = new window.google.maps.Marker({
          position: { lat: spot.latitude, lng: spot.longitude },
          map: newMap,
          title: "Drag to refine location",
          draggable: true,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: "#10B981",
            fillOpacity: 1,
            strokeColor: "#FFFFFF",
            strokeWeight: 3,
          },
        })
      }

      // Handle marker drag
      newMarker.addListener("dragend", async (event) => {
        const position = event.latLng
        const lat = position.lat()
        const lng = position.lng()

        try {
          const geocoder = new window.google.maps.Geocoder()
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
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

      // ENHANCED STREET VIEW WITH AVAILABILITY CHECK
      if (streetViewRef.current) {
        const streetViewService = new window.google.maps.StreetViewService()

        // CHECK IF STREET VIEW IS AVAILABLE
        streetViewService.getPanorama(
          {
            location: { lat: spot.latitude, lng: spot.longitude },
            radius: 50,
            source: window.google.maps.StreetViewSource.OUTDOOR,
          },
          (data, status) => {
            if (status === "OK") {
              console.log("🏠 Street View available at this location")

              const streetViewPanorama = new window.google.maps.StreetViewPanorama(streetViewRef.current, {
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
              console.log("❌ No Street View available at this location")
              setStreetView(null)
            }
          },
        )
      }

      setMap(newMap)
      setMarker(newMarker)

      console.log("🗺️ Enhanced Results map initialized successfully")
    } catch (error) {
      console.error("Results map initialization failed:", error)
      setLoadError("Failed to initialize map")
    }
  }, [isLoaded, spot.latitude, spot.longitude, loadError, onLocationUpdate])

  // ENHANCED Street View Toggle with Error Handling
  const toggleStreetView = () => {
    if (!streetView) {
      alert("❌ Street View not available at this location.\n\nTry dragging the marker to a nearby street!")
      return
    }

    if (!showStreetView) {
      // Show Street View
      if (marker) {
        const position = marker.getPosition ? marker.getPosition() : marker.position
        streetView.setPosition(position)
      }
      streetView.setVisible(true)
      setShowStreetView(true)
      console.log("🏠 Street View activated with availability check")
    } else {
      // Hide Street View
      streetView.setVisible(false)
      setShowStreetView(false)
      console.log("🗺️ Street View deactivated")
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
      {/* Map Container */}
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

      {/* Street View Container */}
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

      {/* Street View Toggle Button */}
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

      {/* Drag Instructions */}
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

      {/* Street View Instructions */}
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
