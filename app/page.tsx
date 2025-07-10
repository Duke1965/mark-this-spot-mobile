"use client"

import { useState, useEffect } from "react"
import { MapPin, Volume2, VolumeX } from "lucide-react"

export default function LocationApp() {
  const [isClient, setIsClient] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<string>("Getting your location...")
  const [isMuted, setIsMuted] = useState(false)
  const [spots, setSpots] = useState<any[]>([])

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true)
    console.log("🚀 Mark This Spot - App Loaded!")
  }, [])

  // Get user location
  useEffect(() => {
    if (!isClient) return

    const getUserLocation = async () => {
      try {
        if (!navigator.geolocation) {
          setCurrentLocation("Geolocation not supported")
          return
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords
            setCurrentLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
            console.log("📍 Location obtained:", latitude, longitude)
          },
          (error) => {
            console.error("Location error:", error)
            setCurrentLocation("Location access denied")
          },
          (positionOptions) => {
            console.log("positionOptions", positionOptions)
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          },
        )
      } catch (error) {
        console.error("Geolocation error:", error)
        setCurrentLocation("Location unavailable")
      }
    }

    getUserLocation()
  }, [isClient])

  const handleMarkSpot = async () => {
    try {
      console.log("🎯 Marking spot...")

      if (!navigator.geolocation) {
        alert("Geolocation not supported")
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          const newSpot = {
            id: Date.now().toString(),
            latitude,
            longitude,
            timestamp: new Date().toISOString(),
            address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          }

          setSpots((prev) => [newSpot, ...prev])
          console.log("✅ Spot marked:", newSpot)
          alert(`📍 Spot marked!\nLocation: ${newSpot.address}`)
        },
        (error) => {
          console.error("Location error:", error)
          alert("❌ Could not get location. Please enable location permissions.")
        },
      )
    } catch (error) {
      console.error("Error marking spot:", error)
      alert("❌ Failed to mark spot")
    }
  }

  // Don't render anything until we're on the client
  if (!isClient) {
    return null
  }

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
      {/* Sound toggle - top right */}
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

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          position: "relative",
        }}
      >
        <div
          style={{
            maxWidth: "600px",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "2rem",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          {/* App Title */}
          <div style={{ color: "white" }}>
            <h1 style={{ fontSize: "2.5rem", fontWeight: 900, margin: 0 }}>Mark This Spot</h1>
            <p style={{ fontSize: "1.125rem", color: "rgba(255,255,255,0.8)", margin: "0.5rem 0" }}>
              Remember the exact location of your favorite places.
            </p>
            <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.7)", margin: 0 }}>📍 {currentLocation}</p>
          </div>

          {/* Main Action Button */}
          <button
            onClick={handleMarkSpot}
            style={{
              width: "200px",
              height: "200px",
              borderRadius: "50%",
              border: "4px solid rgba(255,255,255,0.3)",
              background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
              color: "white",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 10px 30px rgba(59, 130, 246, 0.3)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.05)"
              e.currentTarget.style.boxShadow = "0 15px 40px rgba(59, 130, 246, 0.4)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)"
              e.currentTarget.style.boxShadow = "0 10px 30px rgba(59, 130, 246, 0.3)"
            }}
          >
            <MapPin size={48} />
            <div style={{ fontSize: "1.25rem", fontWeight: "bold" }}>MARK SPOT</div>
            <div style={{ fontSize: "0.875rem", opacity: 0.8 }}>Tap to save location</div>
          </button>

          {/* Spots Counter */}
          {spots.length > 0 && (
            <div
              style={{
                background: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
                borderRadius: "1rem",
                padding: "1rem 2rem",
                color: "white",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <div style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                📍 {spots.length} {spots.length === 1 ? "Spot" : "Spots"} Marked
              </div>
              <div style={{ fontSize: "0.875rem", opacity: 0.8 }}>Latest: {spots[0]?.address}</div>
            </div>
          )}

          {/* Simple Action Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "2rem",
              marginTop: "2rem",
            }}
          >
            <button
              onClick={() => alert("📸 Camera feature coming soon!")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                padding: "1rem",
                border: "none",
                background: "rgba(255,255,255,0.1)",
                borderRadius: "1rem",
                cursor: "pointer",
                transition: "all 0.3s ease",
                color: "white",
                backdropFilter: "blur(10px)",
              }}
            >
              <div style={{ fontSize: "2rem" }}>📸</div>
              <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Photo</span>
            </button>

            <button
              onClick={() => alert("🎥 Video feature coming soon!")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                padding: "1rem",
                border: "none",
                background: "rgba(255,255,255,0.1)",
                borderRadius: "1rem",
                cursor: "pointer",
                transition: "all 0.3s ease",
                color: "white",
                backdropFilter: "blur(10px)",
              }}
            >
              <div style={{ fontSize: "2rem" }}>🎥</div>
              <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Video</span>
            </button>

            <button
              onClick={() => {
                if (spots.length === 0) {
                  alert("📚 No spots saved yet! Mark some locations first.")
                } else {
                  alert(
                    `📚 You have ${spots.length} saved spots:\n\n${spots.map((spot, i) => `${i + 1}. ${spot.address}`).join("\n")}`,
                  )
                }
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                padding: "1rem",
                border: "none",
                background: "rgba(255,255,255,0.1)",
                borderRadius: "1rem",
                cursor: "pointer",
                transition: "all 0.3s ease",
                color: "white",
                backdropFilter: "blur(10px)",
              }}
            >
              <div style={{ fontSize: "2rem" }}>📚</div>
              <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Libraries ({spots.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
