"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Camera, Video, BookOpen, Volume2, VolumeX } from "lucide-react"

export default function Page() {
  const [currentScreen, setCurrentScreen] = useState<"main" | "camera" | "libraries">("main")
  const [showCamera, setShowCamera] = useState(false)
  const [cameraMode, setCameraMode] = useState<"photo" | "video">("photo")
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationAddress, setLocationAddress] = useState<string | null>(null)
  const [locationLoading, setLocationLoading] = useState(true)
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null)
  const [voiceEnabled, setVoiceEnabled] = useState(true)

  const router = useRouter()

  // Speech recognition setup
  const SpeechRecognition =
    typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null
  const recognition = useRef<any>(null)

  useEffect(() => {
    if (SpeechRecognition) {
      recognition.current = new SpeechRecognition()
      recognition.current.continuous = true
      recognition.current.lang = "en-US"

      recognition.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join("")

        if (transcript.toLowerCase().includes("pin it")) {
          markSpot()
        }
      }

      recognition.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error)
      }

      recognition.current.onend = () => {
        if (voiceEnabled) {
          recognition.current.start() // Restart if voice is enabled
        }
      }
    }

    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
        (error) => {
          console.error("Error getting location:", error)
          setLocationLoading(false)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      )
    } else {
      console.error("Geolocation is not supported by this browser.")
      setLocationLoading(false)
    }

    return () => {
      stopRecognition()
    }
  }, [])

  useEffect(() => {
    if (userLocation) {
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${userLocation.latitude}&lon=${userLocation.longitude}`,
      )
        .then((response) => response.json())
        .then((data) => {
          setLocationAddress(data.display_name || "Location not found")
          setLocationLoading(false)
        })
        .catch((error) => {
          console.error("Error getting address:", error)
          setLocationAddress("Address not found")
          setLocationLoading(false)
        })

      // Generate map image URL
      setMapImageUrl(
        `https://maps.googleapis.com/maps/api/staticmap?center=${userLocation.latitude},${userLocation.longitude}&zoom=16&size=600x600&maptype=satellite&markers=color:red%7Clabel:C%7C${userLocation.latitude},${userLocation.longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`,
      )
    }
  }, [userLocation])

  useEffect(() => {
    if (voiceEnabled && SpeechRecognition) {
      startRecognition()
    } else {
      stopRecognition()
    }

    return () => {
      stopRecognition()
    }
  }, [voiceEnabled])

  const startRecognition = () => {
    if (recognition.current) {
      recognition.current.start()
    }
  }

  const stopRecognition = () => {
    if (recognition.current) {
      recognition.current.stop()
    }
  }

  const markSpot = () => {
    router.push(`/new?lat=${userLocation?.latitude}&lon=${userLocation?.longitude}`)
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "#111827",
        color: "white",
        fontFamily: "sans-serif",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "1rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>📍 PINIT</h1>

        <button
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          style={{
            padding: "0.5rem",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </header>

      {/* Main screen section */}
      {currentScreen === "main" && (
        <>
          {/* Main content area */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              position: "relative",
            }}
          >
            {/* Top Section - Map Circle */}
            <div
              style={{
                padding: "2rem 2rem 1rem 2rem",
                display: "flex",
                justifyContent: "center",
              }}
            >
              {/* Enhanced Circular Map Preview */}
              {mapImageUrl && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <div
                    onClick={markSpot}
                    style={{
                      width: "280px",
                      height: "280px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: "4px solid rgba(255,255,255,0.3)",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                      position: "relative",
                      background: "rgba(255,255,255,0.1)",
                      backdropFilter: "blur(10px)",
                      cursor: "pointer",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease",
                      touchAction: "manipulation",
                      userSelect: "none",
                      WebkitTapHighlightColor: "transparent",
                    }}
                    onTouchStart={(e) => {
                      if (navigator.vibrate) {
                        navigator.vibrate(50)
                      }
                      e.currentTarget.style.transform = "scale(0.98)"
                      e.currentTarget.style.boxShadow = "0 5px 15px rgba(0,0,0,0.5)"
                    }}
                    onTouchEnd={(e) => {
                      e.currentTarget.style.transform = "scale(1)"
                      e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.3)"
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = "scale(0.98)"
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = "scale(1)"
                    }}
                  >
                    <img
                      src={mapImageUrl || "/placeholder.svg"}
                      alt="Your current location"
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
                    {/* Enhanced pulse animation */}
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: "#10B981",
                        boxShadow: "0 0 0 0 rgba(16, 185, 129, 0.7)",
                        animation: "pulse 2s infinite",
                        pointerEvents: "none",
                      }}
                    />
                    {/* Enhanced Tap Here Indicator */}
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        color: "white",
                        fontSize: "1.25rem",
                        fontWeight: "bold",
                        textAlign: "center",
                        zIndex: 10,
                        textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                        animation: "fadeInOut 3s infinite",
                        pointerEvents: "none",
                        background: "rgba(0,0,0,0.6)",
                        padding: "0.5rem 1rem",
                        borderRadius: "1rem",
                        backdropFilter: "blur(5px)",
                      }}
                    >
                      📌 TAP TO PIN
                    </div>
                  </div>

                  {/* Invisible Extended Touch Area */}
                  <div
                    onClick={markSpot}
                    style={{
                      position: "absolute",
                      width: "350px",
                      height: "350px",
                      borderRadius: "50%",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      zIndex: 5,
                      background: "transparent",
                      cursor: "pointer",
                      touchAction: "manipulation",
                    }}
                    onTouchStart={() => {
                      if (navigator.vibrate) {
                        navigator.vibrate(100)
                      }
                    }}
                  />
                </div>
              )}

              {/* Loading state for map */}
              {!mapImageUrl && userLocation && (
                <div
                  style={{
                    width: "280px",
                    height: "280px",
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
              )}
            </div>

            {/* Middle Section - Text Content */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "1rem 2rem",
                textAlign: "center",
                color: "white",
              }}
            >
              <h1 style={{ fontSize: "2.5rem", fontWeight: 900, margin: "0 0 0.5rem 0" }}>📌 PINIT</h1>
              <p style={{ fontSize: "1.125rem", color: "rgba(255,255,255,0.8)", margin: "0 0 0.5rem 0" }}>
                Pin It. Find It. Share It.
              </p>
              <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.7)", margin: 0 }}>
                {locationLoading ? "Getting your location..." : locationAddress}
              </p>
              {voiceEnabled && (
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "rgba(16, 185, 129, 0.9)",
                    margin: "0.5rem 0 0 0",
                  }}
                >
                  🎤 Voice commands active - Try saying "Pin it!"
                </p>
              )}
            </div>

            {/* Bottom Section - Action Buttons */}
            <div
              style={{
                padding: "2rem",
                display: "flex",
                justifyContent: "center",
                gap: "3rem",
              }}
            >
              <button
                onClick={() => {
                  setCameraMode("photo")
                  setShowCamera(true)
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
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                <Camera size={24} />
                <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>Photo</span>
              </button>

              <button
                onClick={() => {
                  setCameraMode("video")
                  setShowCamera(true)
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
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                <Video size={24} />
                <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>Video</span>
              </button>

              <button
                onClick={() => setCurrentScreen("libraries")}
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
                  color: "rgba(255,255,255,0.6)",
                }}
              >
                <BookOpen size={24} />
                <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>Pin Library</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Camera screen section */}
      {currentScreen === "camera" && <div>Camera Screen</div>}

      {/* Libraries screen section */}
      {currentScreen === "libraries" && <div>Libraries Screen</div>}
    </div>
  )
}
