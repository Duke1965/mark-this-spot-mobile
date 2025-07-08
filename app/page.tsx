"use client"

import { useEffect, useState } from "react"
import { useLocationServices } from "./hooks/useLocationServices"
import { reverseGeocode } from "./utils/geocoding"
import { playFartSound } from "./utils/audio"
import { Volume2, VolumeX, Library, Settings } from "lucide-react"

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
  const [selectedFartSound, setSelectedFartSound] = useState("classic")
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedMarker, setSelectedMarker] = useState("pin")
  const [isClient, setIsClient] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentScreen, setCurrentScreen] = useState("main")

  useEffect(() => {
    setIsClient(true)
  }, [])

  const { getCurrentLocation, isLoading: locationLoading, error: locationError } = useLocationServices()

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

  // Global function for map info windows to play fart sounds
  useEffect(() => {
    ;(window as any).playSpotFart = async (spotId: string) => {
      if (!isMuted) {
        await playFartSound(selectedFartSound as any)
      }
      console.log(`Playing fart for spot ${spotId}! 💨`)
    }
  }, [selectedFartSound, isMuted])

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

      // Add spot immediately
      setSpots((prev) => [newSpot, ...prev])

      // Play the fart sound (if not muted)!
      if (!isMuted) {
        await playFartSound(selectedFartSound as any)
      }

      // Get real address in background
      try {
        const address = await reverseGeocode(location.latitude, location.longitude)
        setSpots((prev) => prev.map((spot) => (spot.id === newSpot.id ? { ...spot, address } : spot)))
      } catch (error) {
        console.error("Address lookup failed:", error)
        setSpots((prev) =>
          prev.map((spot) =>
            spot.id === newSpot.id
              ? { ...spot, address: `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` }
              : spot,
          ),
        )
      }

      // Show success message
      setTimeout(() => {
        const muteStatus = isMuted ? "🔇 MUTED" : "💨 EPIC FART DEPLOYED!"
        alert(`📍 LEGENDARY SPOT MARKED!

${muteStatus}

📍 Real GPS: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}
🎯 Accuracy: ±${location.accuracy?.toFixed(0)}m

${isMuted ? "🔇 Sound is muted" : "💨 LEGENDARY FART SOUND ACTIVATED!"}`)
      }, 100)
    } catch (error) {
      console.error("Error marking spot:", error)
      alert("❌ Failed to mark spot!\n\nPlease check your location permissions and try again.")
    } finally {
      setIsMarking(false)
    }
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

          {/* Big Pulsating Button */}
          <div style={{ position: "relative", marginBottom: "3rem" }}>
            {/* Main button */}
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
                color: "white",
                fontWeight: "bold",
                fontSize: "1.5rem",
                boxShadow: "0 25px 80px rgba(59, 130, 246, 0.5)",
                transition: "all 0.3s ease",
                border: "none",
                cursor: isMarking || locationLoading ? "not-allowed" : "pointer",
                background:
                  isMarking || locationLoading
                    ? "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)"
                    : "linear-gradient(135deg, #3b82f6 0%, #4f46e5 50%, #7c3aed 100%)",
                transform: isMarking || locationLoading ? "scale(0.95)" : "scale(1)",
              }}
              onMouseEnter={(e) => {
                if (!isMarking && !locationLoading) {
                  e.currentTarget.style.transform = "scale(1.05)"
                }
              }}
              onMouseLeave={(e) => {
                if (!isMarking && !locationLoading) {
                  e.currentTarget.style.transform = "scale(1)"
                }
              }}
            >
              {/* Button content */}
              {isMarking || locationLoading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div
                    style={{
                      width: "5rem",
                      height: "5rem",
                      border: "4px solid white",
                      borderTop: "4px solid transparent",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                      marginBottom: "1.5rem",
                    }}
                  ></div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 900 }}>
                    {isMarking ? "MARKING..." : "GETTING GPS..."}
                  </div>
                  <div style={{ fontSize: "0.875rem", opacity: 0.8, marginTop: "0.75rem" }}>
                    {isMuted ? "Preparing silent deployment!" : "Preparing epic fart deployment!"}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ fontSize: "5rem", marginBottom: "1.5rem" }}>📍</div>
                  <div style={{ fontSize: "2rem", fontWeight: 900, letterSpacing: "0.1em", marginBottom: "0.5rem" }}>
                    MARK SPOT
                  </div>
                  <div style={{ fontSize: "0.875rem", opacity: 0.9, textAlign: "center", marginBottom: "0.75rem" }}>
                    {isMuted ? "Silent GPS Tracking" : "Real GPS + Epic Fart!"}
                  </div>
                  <div style={{ fontSize: "1.5rem" }}>{isMuted ? "🔇" : "💨"}</div>
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

  // Libraries Screen (Placeholder)
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
              ← Back
            </button>
          </div>
        </div>

        <div style={{ flex: 1, padding: "1.5rem", textAlign: "center" }}>
          <div style={{ fontSize: "4rem", marginBottom: "1.5rem" }}>📚</div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "white", marginBottom: "1rem" }}>Coming Soon!</h2>
          <p style={{ color: "rgba(255,255,255,0.8)" }}>Fart sounds, pin icons, and postcard templates will be here.</p>
        </div>
      </div>
    )
  }

  // Settings Screen (Placeholder)
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
              ← Back
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
