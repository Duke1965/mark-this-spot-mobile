"use client"

import { useState, useEffect } from "react"
import { MapPin, Volume2, VolumeX } from "lucide-react"

export default function LocationApp() {
  const [isClient, setIsClient] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<string>("Getting your location...")
  const [isMuted, setIsMuted] = useState(false)
  const [spots, setSpots] = useState<any[]>([])
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null)

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true)
    console.log("🚀 Mark This Spot - App Loaded!")
  }, [])

  // Generate Google Maps static image URL
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
      key: apiKey,
      style: "feature:poi|visibility:off",
    })

    const imageUrl = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`
    console.log("🗺️ Generated map image URL:", imageUrl)
    return imageUrl
  }

  // Get user location and generate map
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
            setUserLocation({ lat: latitude, lng: longitude })

            // Generate map image
            const imageUrl = generateMapImageUrl(latitude, longitude)
            if (imageUrl) {
              setMapImageUrl(imageUrl)
            }

            console.log("📍 Location obtained:", latitude, longitude)
          },
          (error) => {
            console.error("Location error:", error)
            setCurrentLocation("Location access denied")
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
    console.log("🎯 CIRCLE CLICKED! Marking spot...")
    try {
      if (!navigator.geolocation) {
        console.error("Geolocation not supported")
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
          console.log("✅ Spot marked successfully:", newSpot)

          // Smooth success feedback without popup
          setCurrentLocation(`✅ Spot saved! ${newSpot.address}`)

          // Update the map to show the new location
          const imageUrl = generateMapImageUrl(latitude, longitude)
          if (imageUrl) {
            setMapImageUrl(imageUrl)
          }
        },
        (error) => {
          console.error("Location error:", error)
          setCurrentLocation("❌ Location access denied")
        },
      )
    } catch (error) {
      console.error("Error marking spot:", error)
      setCurrentLocation("❌ Failed to mark spot")
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

          {/* Interactive Circular Map Preview */}
          {mapImageUrl ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              <div
                onClick={handleMarkSpot}
                style={{
                  width: "320px",
                  height: "320px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "4px solid rgba(255,255,255,0.3)",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                  position: "relative",
                  background: "rgba(255,255,255,0.1)",
                  backdropFilter: "blur(10px)",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  WebkitTapHighlightColor: "transparent",
                  WebkitTouchCallout: "none",
                  WebkitUserSelect: "none",
                  userSelect: "none",
                  outline: "none",
                  transform: "scale(1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)"
                  e.currentTarget.style.boxShadow = "0 15px 40px rgba(0,0,0,0.4)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)"
                  e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.3)"
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = "scale(0.98)"
                  e.currentTarget.style.boxShadow = "0 5px 15px rgba(0,0,0,0.5)"
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)"
                  e.currentTarget.style.boxShadow = "0 15px 40px rgba(0,0,0,0.4)"
                }}
              >
                <img
                  src={mapImageUrl || "/placeholder.svg"}
                  alt="Your current location - Click to mark this spot"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    pointerEvents: "none",
                  }}
                  onError={(e) => {
                    console.error("Map image failed to load")
                    e.currentTarget.style.display = "none"
                  }}
                />

                {/* White Pointing Finger Icon */}
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.5rem",
                    color: "white",
                    textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                    animation: "pointPulse 2s infinite",
                    pointerEvents: "none",
                  }}
                >
                  <div style={{ fontSize: "3rem", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))" }}>👆</div>
                  <div
                    style={{
                      fontSize: "1rem",
                      fontWeight: "bold",
                      background: "rgba(0,0,0,0.7)",
                      padding: "0.5rem 1rem",
                      borderRadius: "1rem",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    Click Here
                  </div>
                </div>

                {/* Subtle pulse ring */}
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    border: "3px solid rgba(255,255,255,0.6)",
                    animation: "ringPulse 2s infinite",
                    pointerEvents: "none",
                  }}
                />
              </div>
            </div>
          ) : userLocation ? (
            /* Loading state for map */
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  width: "320px",
                  height: "320px",
                  borderRadius: "50%",
                  border: "4px solid rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.1)",
                  backdropFilter: "blur(10px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <div
                  style={{
                    width: "2rem",
                    height: "2rem",
                    border: "3px solid rgba(255,255,255,0.3)",
                    borderTop: "3px solid white",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.75rem" }}>Loading map...</span>
              </div>
            </div>
          ) : (
            /* Fallback button when no location */
            <button
              onClick={handleMarkSpot}
              style={{
                width: "320px",
                height: "320px",
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
              <MapPin size={64} />
              <div style={{ fontSize: "1.25rem", fontWeight: "bold" }}>MARK SPOT</div>
              <div style={{ fontSize: "0.875rem", opacity: 0.8 }}>Tap to save location</div>
            </button>
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
                background: "transparent",
                cursor: "pointer",
                transition: "all 0.3s ease",
                color: "rgba(255,255,255,0.8)",
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
                background: "transparent",
                cursor: "pointer",
                transition: "all 0.3s ease",
                color: "rgba(255,255,255,0.8)",
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
                background: "transparent",
                cursor: "pointer",
                transition: "all 0.3s ease",
                color: "rgba(255,255,255,0.8)",
              }}
            >
              <div style={{ fontSize: "2rem" }}>📚</div>
              <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Libraries ({spots.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes pointPulse {
          0%, 100% { 
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          50% { 
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 0.8;
          }
        }

        @keyframes ringPulse {
          0% { 
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.6;
          }
          50% { 
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0.3;
          }
          100% { 
            transform: translate(-50%, -50%) scale(1.4);
            opacity: 0;
          }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
