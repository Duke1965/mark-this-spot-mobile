"use client"

import { useState, useEffect, useRef } from "react"
import { Camera, Video, BookOpen, Volume2, VolumeX, ArrowLeft, Play, Palette } from "lucide-react"
import { EnhancedCamera } from "./components/enhanced-camera"
import { VoiceCommander } from "./components/voice-commander"
import { enhancedSoundCategories, playEnhancedSound } from "./utils/enhanced-audio"
import { postcardTemplates } from "./components/postcard-templates"

interface Pin {
  id: string
  latitude: number
  longitude: number
  address: string
  timestamp: string
  media?: {
    url: string
    type: "photo" | "video"
  }
}

export default function Page() {
  const [currentScreen, setCurrentScreen] = useState<"main" | "camera" | "libraries">("main")
  const [showCamera, setShowCamera] = useState(false)
  const [cameraMode, setCameraMode] = useState<"photo" | "video">("photo")
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationAddress, setLocationAddress] = useState<string | null>(null)
  const [locationLoading, setLocationLoading] = useState(true)
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [savedPins, setSavedPins] = useState<Pin[]>([])
  const [libraryTab, setLibraryTab] = useState<"pins" | "sounds" | "templates">("pins")

  const SpeechRecognition =
    typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null
  const recognition = useRef<any>(null)

  // Load saved pins from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("pinit-saved-pins")
    if (saved) {
      try {
        setSavedPins(JSON.parse(saved))
      } catch (error) {
        console.error("Failed to load saved pins:", error)
      }
    }
  }, [])

  // Save pins to localStorage whenever savedPins changes
  useEffect(() => {
    localStorage.setItem("pinit-saved-pins", JSON.stringify(savedPins))
  }, [savedPins])

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
          // Extract just the place name (city/town) instead of full address
          const placeName =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            "Current Location"
          setLocationAddress(placeName)
          setLocationLoading(false)
        })
        .catch((error) => {
          console.error("Error getting address:", error)
          setLocationAddress("Current Location")
          setLocationLoading(false)
        })

      // Generate map image URL - change to simple roadmap
      setMapImageUrl(
        `https://maps.googleapis.com/maps/api/staticmap?center=${userLocation.latitude},${userLocation.longitude}&zoom=16&size=600x600&maptype=roadmap&markers=color:red%7Clabel:C%7C${userLocation.latitude},${userLocation.longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`,
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
    if (userLocation) {
      const newPin: Pin = {
        id: Date.now().toString(),
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        address: locationAddress || "Unknown Location",
        timestamp: new Date().toISOString(),
      }

      setSavedPins((prev) => [newPin, ...prev])

      // Play success sound
      playEnhancedSound("success-chime")

      alert(`📌 Location pinned and saved to library!\n${locationAddress}`)
      console.log("📌 Pin created and saved:", newPin)
    } else {
      alert("❌ Location not available yet. Please wait a moment and try again.")
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "linear-gradient(135deg, #1e293b 0%, #1e40af 50%, #4338ca 100%)",
        color: "white",
        fontFamily: "sans-serif",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Sound toggle - top right only */}
      <div
        style={{
          position: "absolute",
          top: "2rem",
          right: "2rem",
          zIndex: 20,
        }}
      >
        <button
          onClick={() => setVoiceEnabled(!voiceEnabled)}
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
          {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          <span style={{ fontSize: "0.75rem", fontWeight: 400 }}>{voiceEnabled ? "Sound" : "Muted"}</span>
        </button>
      </div>

      {/* Voice Commander */}
      <VoiceCommander
        onCommand={(command, confidence) => {
          const cmd = command.toLowerCase()
          console.log(`🎤 Voice command: "${command}" (${confidence})`)

          if (cmd.includes("pin it") || cmd.includes("pin this")) {
            markSpot()
          } else if (cmd.includes("take photo") || cmd.includes("photo")) {
            setCameraMode("photo")
            setShowCamera(true)
          } else if (cmd.includes("record video") || cmd.includes("video")) {
            setCameraMode("video")
            setShowCamera(true)
          } else if (cmd.includes("library") || cmd.includes("show pins")) {
            setCurrentScreen("libraries")
          } else if (cmd.includes("go back") || cmd.includes("back")) {
            setCurrentScreen("main")
            setShowCamera(false)
          }
        }}
        isEnabled={voiceEnabled}
        onToggle={() => setVoiceEnabled(!voiceEnabled)}
      />

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
                padding: "4rem 2rem 1rem 2rem",
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
                    {/* Enhanced Tap or Speak Indicator */}
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        color: "white",
                        fontSize: "1.1rem",
                        fontWeight: "bold",
                        textAlign: "center",
                        zIndex: 10,
                        textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                        animation: "fadeInOut 3s infinite",
                        pointerEvents: "none",
                        background: "rgba(0,0,0,0.3)",
                        padding: "0.5rem 1rem",
                        borderRadius: "1rem",
                        backdropFilter: "blur(5px)",
                      }}
                    >
                      {voiceEnabled ? (
                        <>
                          <div style={{ fontSize: "0.9rem", opacity: 0.9 }}>TAP OR SPEAK TO</div>
                          <div style={{ fontSize: "1.3rem", fontWeight: "900" }}>PINIT</div>
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize: "0.9rem", opacity: 0.9 }}>TAP TO</div>
                          <div style={{ fontSize: "1.3rem", fontWeight: "900" }}>PINIT</div>
                        </>
                      )}
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
              <h1 style={{ fontSize: "2.5rem", fontWeight: 900, margin: "0 0 0.5rem 0" }}>PINIT</h1>
              <p style={{ fontSize: "1.125rem", color: "rgba(255,255,255,0.8)", margin: 0 }}>
                Pin It. Find It. Share It.
              </p>
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
      {showCamera && (
        <EnhancedCamera
          mode={cameraMode}
          onCapture={(mediaData, type) => {
            console.log(`📸 ${type} captured:`, mediaData)

            // Save media to current location pin
            if (userLocation) {
              const newPin: Pin = {
                id: Date.now().toString(),
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                address: locationAddress || "Unknown Location",
                timestamp: new Date().toISOString(),
                media: {
                  url: mediaData,
                  type: type,
                },
              }

              setSavedPins((prev) => [newPin, ...prev])
              playEnhancedSound("success-chime")
            }

            setShowCamera(false)
          }}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Libraries screen section */}
      {currentScreen === "libraries" && (
        <div
          style={{
            flex: 1,
            background: "linear-gradient(135deg, #1e293b 0%, #1e40af 50%, #4338ca 100%)",
            color: "white",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Library Header */}
          <div
            style={{
              padding: "2rem",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <button
                onClick={() => setCurrentScreen("main")}
                style={{
                  padding: "0.5rem",
                  borderRadius: "50%",
                  border: "none",
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                <ArrowLeft size={20} />
              </button>
              <h2 style={{ fontSize: "1.5rem", margin: 0 }}>📚 Library</h2>
            </div>
          </div>

          {/* Library Tabs */}
          <div
            style={{
              display: "flex",
              padding: "0 2rem",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {[
              { id: "pins", label: "📍 Pins", count: savedPins.length },
              { id: "sounds", label: "🎵 Sounds", count: Object.keys(enhancedSoundCategories).length },
              { id: "templates", label: "🎨 Templates", count: Object.keys(postcardTemplates).length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setLibraryTab(tab.id as any)}
                style={{
                  padding: "1rem 1.5rem",
                  border: "none",
                  background: "transparent",
                  color: libraryTab === tab.id ? "white" : "rgba(255,255,255,0.6)",
                  cursor: "pointer",
                  borderBottom: libraryTab === tab.id ? "2px solid #10B981" : "2px solid transparent",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                }}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Library Content */}
          <div style={{ flex: 1, overflow: "auto", padding: "2rem" }}>
            {libraryTab === "pins" && (
              <div>
                {savedPins.length === 0 ? (
                  <div style={{ textAlign: "center", color: "rgba(255,255,255,0.6)", padding: "2rem" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📍</div>
                    <p>No pins saved yet</p>
                    <p style={{ fontSize: "0.875rem" }}>Tap the map or use voice commands to create your first pin!</p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: "1rem" }}>
                    {savedPins.map((pin) => (
                      <div
                        key={pin.id}
                        style={{
                          background: "rgba(255,255,255,0.1)",
                          borderRadius: "1rem",
                          padding: "1rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "1rem",
                        }}
                      >
                        <div style={{ fontSize: "2rem" }}>
                          {pin.media ? (pin.media.type === "photo" ? "📸" : "🎥") : "📍"}
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "1rem" }}>{pin.address}</h4>
                          <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.7 }}>
                            {new Date(pin.timestamp).toLocaleDateString()} at{" "}
                            {new Date(pin.timestamp).toLocaleTimeString()}
                          </p>
                          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.75rem", opacity: 0.6 }}>
                            {pin.latitude.toFixed(4)}, {pin.longitude.toFixed(4)}
                          </p>
                        </div>
                        {pin.media && (
                          <button
                            onClick={() => {
                              if (pin.media?.type === "photo") {
                                window.open(pin.media.url, "_blank")
                              } else {
                                // For video, could open in modal
                                window.open(pin.media.url, "_blank")
                              }
                            }}
                            style={{
                              padding: "0.5rem",
                              borderRadius: "0.5rem",
                              border: "none",
                              background: "rgba(16, 185, 129, 0.2)",
                              color: "#10B981",
                              cursor: "pointer",
                            }}
                          >
                            <Play size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {libraryTab === "sounds" && (
              <div>
                {Object.entries(enhancedSoundCategories).map(([category, sounds]) => (
                  <div key={category} style={{ marginBottom: "2rem" }}>
                    <h3 style={{ fontSize: "1.125rem", marginBottom: "1rem", color: "rgba(255,255,255,0.9)" }}>
                      {category}
                    </h3>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: "0.75rem",
                      }}
                    >
                      {Object.entries(sounds).map(([soundId, sound]) => (
                        <button
                          key={soundId}
                          onClick={() => playEnhancedSound(soundId)}
                          style={{
                            padding: "1rem",
                            borderRadius: "0.75rem",
                            border: "none",
                            background: "rgba(255,255,255,0.1)",
                            color: "white",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.3s ease",
                          }}
                        >
                          <div
                            style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}
                          >
                            <span style={{ fontSize: "1.25rem" }}>{sound.emoji}</span>
                            <span style={{ fontWeight: "bold", fontSize: "0.875rem" }}>{sound.name}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.7 }}>{sound.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {libraryTab === "templates" && (
              <div>
                <h3 style={{ fontSize: "1.125rem", marginBottom: "1rem", color: "rgba(255,255,255,0.9)" }}>
                  🎨 Postcard Templates
                </h3>
                <div
                  style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}
                >
                  {Object.entries(postcardTemplates).map(([templateId, template]) => (
                    <div
                      key={templateId}
                      style={{
                        background: "rgba(255,255,255,0.1)",
                        borderRadius: "1rem",
                        padding: "1rem",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: "120px",
                          borderRadius: "0.5rem",
                          background: template.style.background,
                          marginBottom: "0.75rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: template.style.textColor,
                          textShadow: template.style.textShadow,
                          fontSize: "0.875rem",
                          fontWeight: "bold",
                        }}
                      >
                        {template.name}
                      </div>
                      <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "0.875rem" }}>{template.name}</h4>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Palette size={14} />
                        <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>Postcard Template</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          70% {
            transform: translate(-50%, -50%) scale(1);
            box-shadow: 0 0 0 15px rgba(16, 185, 129, 0);
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }

        @keyframes fadeInOut {
          0% { opacity: 0.7; transform: translate(-50%, -50%) scale(0.9); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0.7; transform: translate(-50%, -50%) scale(0.9); }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
