"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { MapPin, ArrowLeft, Check } from "lucide-react"

interface SavedSpot {
  id: string
  latitude: number
  longitude: number
  name: string
  note: string
  timestamp: string
  address: string
}

export default function LocationApp() {
  const [isClient, setIsClient] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<string>("Getting your location...")
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null)
  const [savedSpots, setSavedSpots] = useState<SavedSpot[]>([])
  const [currentScreen, setCurrentScreen] = useState<"main" | "mark" | "library">("main")

  // Mark screen state
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [spotName, setSpotName] = useState("")
  const [spotNote, setSpotNote] = useState("")

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true)
    console.log("🚀 Mark This Spot - Like Shazam only for traveling!")

    // Load saved spots from localStorage
    const saved = localStorage.getItem("markThisSpot_savedSpots")
    if (saved) {
      setSavedSpots(JSON.parse(saved))
    }
  }, [])

  // Generate Google Maps static image URL
  const generateMapImageUrl = (
    lat: number,
    lng: number,
    showMarker = false,
    markerLat?: number,
    markerLng?: number,
  ) => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.log("📍 Using placeholder map (no API key)")
      return `/placeholder.svg?height=400&width=400&text=Map+${lat.toFixed(2)},${lng.toFixed(2)}`
    }

    const params = new URLSearchParams({
      center: `${lat},${lng}`,
      zoom: "16",
      size: "400x400",
      maptype: "roadmap",
      key: apiKey,
      style: "feature:poi|visibility:off",
    })

    // Add marker if specified
    if (showMarker && markerLat && markerLng) {
      params.append("markers", `color:green|${markerLat},${markerLng}`)
    }

    const imageUrl = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`
    console.log("🗺️ Generated map image URL")
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

  const handleMapClick = () => {
    if (!userLocation) return

    console.log("🎯 Map clicked - Going to mark screen")
    setMarkerPosition(userLocation) // Start with current location
    setCurrentScreen("mark")
  }

  const handleMarkerDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!userLocation) return

    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // Convert pixel coordinates to approximate lat/lng offset
    const latOffset = ((y - 200) / 200) * 0.01 // Rough conversion
    const lngOffset = ((x - 200) / 200) * 0.01

    setMarkerPosition({
      lat: userLocation.lat - latOffset,
      lng: userLocation.lng + lngOffset,
    })
  }

  const handleSaveSpot = () => {
    if (!markerPosition || !spotName.trim()) return

    const newSpot: SavedSpot = {
      id: Date.now().toString(),
      latitude: markerPosition.lat,
      longitude: markerPosition.lng,
      name: spotName.trim(),
      note: spotNote.trim(),
      timestamp: new Date().toISOString(),
      address: `${markerPosition.lat.toFixed(6)}, ${markerPosition.lng.toFixed(6)}`,
    }

    const updatedSpots = [newSpot, ...savedSpots]
    setSavedSpots(updatedSpots)
    localStorage.setItem("markThisSpot_savedSpots", JSON.stringify(updatedSpots))

    console.log("✅ Spot saved:", newSpot)

    // Reset form and return to main screen
    setSpotName("")
    setSpotNote("")
    setMarkerPosition(null)
    setCurrentScreen("main")
  }

  const handleShowLibrary = () => {
    setCurrentScreen("library")
  }

  const handleBackToMain = () => {
    setCurrentScreen("main")
    setSpotName("")
    setSpotNote("")
    setMarkerPosition(null)
  }

  // Don't render anything until we're on the client
  if (!isClient) {
    return null
  }

  // MARK SCREEN
  if (currentScreen === "mark") {
    return (
      <div
        style={{
          minHeight: "100vh",
          width: "100%",
          background: "linear-gradient(135deg, #1e293b 0%, #1e40af 50%, #4338ca 100%)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 2rem",
            color: "white",
          }}
        >
          <button
            onClick={handleBackToMain}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              borderRadius: "1rem",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>Mark This Spot</h1>
          <div style={{ width: "80px" }} />
        </div>

        {/* Map with draggable marker */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "1rem",
            gap: "1rem",
          }}
        >
          <div
            onClick={handleMarkerDrag}
            style={{
              width: "400px",
              height: "400px",
              borderRadius: "1rem",
              overflow: "hidden",
              border: "4px solid rgba(255,255,255,0.3)",
              position: "relative",
              cursor: "crosshair",
              background: "rgba(255,255,255,0.1)",
            }}
          >
            <img
              src={
                userLocation
                  ? generateMapImageUrl(
                      userLocation.lat,
                      userLocation.lng,
                      true,
                      markerPosition?.lat,
                      markerPosition?.lng,
                    )
                  : "/placeholder.svg"
              }
              alt="Map for marking location"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />

            {/* Green draggable marker */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                background: "#10B981",
                border: "3px solid white",
                boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
                cursor: "grab",
                zIndex: 10,
              }}
            />
          </div>

          <p style={{ color: "rgba(255,255,255,0.8)", textAlign: "center", margin: 0 }}>
            🎯 Move the green dot to mark the exact location
          </p>

          {/* Form */}
          <div
            style={{
              width: "100%",
              maxWidth: "400px",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <input
              type="text"
              placeholder="Name this place..."
              value={spotName}
              onChange={(e) => setSpotName(e.target.value)}
              style={{
                padding: "1rem",
                borderRadius: "1rem",
                border: "none",
                fontSize: "1rem",
                background: "rgba(255,255,255,0.9)",
                outline: "none",
              }}
            />

            <textarea
              placeholder="Add a note (optional)..."
              value={spotNote}
              onChange={(e) => setSpotNote(e.target.value)}
              rows={3}
              style={{
                padding: "1rem",
                borderRadius: "1rem",
                border: "none",
                fontSize: "1rem",
                background: "rgba(255,255,255,0.9)",
                outline: "none",
                resize: "none",
              }}
            />

            <button
              onClick={handleSaveSpot}
              disabled={!spotName.trim()}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.75rem",
                padding: "1rem 2rem",
                borderRadius: "1rem",
                border: "none",
                background: spotName.trim() ? "#10B981" : "rgba(255,255,255,0.3)",
                color: "white",
                cursor: spotName.trim() ? "pointer" : "not-allowed",
                fontWeight: "bold",
                fontSize: "1rem",
                transition: "all 0.3s ease",
              }}
            >
              <Check size={20} />
              Save This Spot
            </button>
          </div>
        </div>
      </div>
    )
  }

  // LIBRARY SCREEN
  if (currentScreen === "library") {
    return (
      <div
        style={{
          minHeight: "100vh",
          width: "100%",
          background: "linear-gradient(135deg, #1e293b 0%, #1e40af 50%, #4338ca 100%)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 2rem",
            color: "white",
          }}
        >
          <button
            onClick={handleBackToMain}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              borderRadius: "1rem",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", margin: 0 }}>My Library</h1>
          <div style={{ width: "80px" }} />
        </div>

        {/* Spots list */}
        <div style={{ flex: 1, padding: "1rem 2rem", overflow: "auto" }}>
          {savedSpots.length === 0 ? (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.8)", padding: "4rem 2rem" }}>
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📚</div>
              <h3 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>No spots saved yet</h3>
              <p>Start marking locations to build your library!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {savedSpots.map((spot) => (
                <div
                  key={spot.id}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    backdropFilter: "blur(10px)",
                    borderRadius: "1rem",
                    padding: "1.5rem",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", margin: "0 0 0.5rem 0" }}>📍 {spot.name}</h3>
                  {spot.note && <p style={{ margin: "0 0 1rem 0", opacity: 0.8 }}>{spot.note}</p>}
                  <div style={{ fontSize: "0.875rem", opacity: 0.7 }}>
                    <p style={{ margin: "0.25rem 0" }}>📍 {spot.address}</p>
                    <p style={{ margin: "0.25rem 0" }}>🕒 {new Date(spot.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // MAIN SCREEN
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
              Like Shazam only for traveling
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
                onClick={handleMapClick}
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
                    Tap Here
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
              onClick={handleMapClick}
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

          {/* Library Button */}
          <button
            onClick={handleShowLibrary}
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
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.1)"
              e.currentTarget.style.color = "white"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)"
              e.currentTarget.style.color = "rgba(255,255,255,0.8)"
            }}
          >
            <div style={{ fontSize: "2rem" }}>📚</div>
            <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Library ({savedSpots.length})</span>
          </button>
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
