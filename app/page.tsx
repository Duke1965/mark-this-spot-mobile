"use client"

import { useState, useEffect, useRef } from "react"
import { Camera, Video, BookOpen, Volume2, VolumeX, ArrowLeft, Edit3, FileImage } from "lucide-react"
import { ReliableCamera } from "./components/reliable-camera"
import { VoiceCommander } from "./components/voice-commander"
import { SocialPlatformSelector } from "./components/social-platform-selector"
import { MobilePostcardEditor } from "./components/mobile-postcard-editor"
import { SocialSharing } from "./components/social-sharing"
import { playEnhancedSound } from "./utils/enhanced-audio"
import { generateEnhancedThumbnailForPin } from "./utils/places-photos"

interface Pin {
  id: string
  latitude: number
  longitude: number
  address: string
  timestamp: string
  notes?: string
  media?: {
    url: string
    type: "photo" | "video"
  }
  thumbnail?: string
  enhancedThumbnail?: string
}

interface SavedPostcard {
  id: string
  mediaUrl: string
  mediaType: "photo" | "video"
  locationName: string
  text: string
  textColor: string
  textSize: number
  selectedTemplate: string
  platform: string
  dimensions: { width: number; height: number }
  timestamp: string
  canvasDataUrl: string
}

export default function Page() {
  const [currentScreen, setCurrentScreen] = useState<
    "main" | "camera" | "platform-selector" | "editor" | "sharing" | "libraries"
  >("main")
  const [showCamera, setShowCamera] = useState(false)
  const [cameraMode, setCameraMode] = useState<"photo" | "video">("photo")
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationAddress, setLocationAddress] = useState<string | null>(null)
  const [locationLoading, setLocationLoading] = useState(true)
  const [mapImageUrl, setMapImageUrl] = useState<string | null>(null)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [savedPins, setSavedPins] = useState<Pin[]>([])
  const [savedPostcards, setSavedPostcards] = useState<SavedPostcard[]>([])
  const [libraryTab, setLibraryTab] = useState<"pins" | "photos" | "videos" | "postcards">("pins")
  const [quickPinMode, setQuickPinMode] = useState(false)
  const [autoCloseTimer, setAutoCloseTimer] = useState<NodeJS.Timeout | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null)
  const [thumbnailCache, setThumbnailCache] = useState<Map<string, string>>(new Map())

  // New flow state
  const [capturedMedia, setCapturedMedia] = useState<{ url: string; type: "photo" | "video" } | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<{
    id: string
    dimensions: { width: number; height: number }
  } | null>(null)
  const [currentPostcard, setCurrentPostcard] = useState<SavedPostcard | null>(null)

  const SpeechRecognition =
    typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null
  const recognition = useRef<any>(null)

  // Load saved data on mount
  useEffect(() => {
    const savedPinsData = localStorage.getItem("pinit-saved-pins")
    if (savedPinsData) {
      try {
        setSavedPins(JSON.parse(savedPinsData))
      } catch (error) {
        console.error("Failed to load saved pins:", error)
      }
    }

    const savedPostcardsData = localStorage.getItem("pinit-saved-postcards")
    if (savedPostcardsData) {
      try {
        setSavedPostcards(JSON.parse(savedPostcardsData))
      } catch (error) {
        console.error("Failed to load saved postcards:", error)
      }
    }
  }, [])

  // Save pins to localStorage
  useEffect(() => {
    localStorage.setItem("pinit-saved-pins", JSON.stringify(savedPins))
  }, [savedPins])

  // Load postcards when library tab changes
  useEffect(() => {
    if (libraryTab === "postcards") {
      const savedPostcardsData = localStorage.getItem("pinit-saved-postcards")
      if (savedPostcardsData) {
        try {
          setSavedPostcards(JSON.parse(savedPostcardsData))
        } catch (error) {
          console.error("Failed to load saved postcards:", error)
        }
      }
    }
  }, [libraryTab])

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
          quickPin()
        }
      }

      recognition.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error)
      }

      recognition.current.onend = () => {
        if (voiceEnabled) {
          recognition.current.start()
        }
      }
    }

    // Detect mobile device
    const checkMobile = () => {
      const isMobileDevice =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth <= 768
      setIsMobile(isMobileDevice)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)

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

  const generateThumbnailForPin = async (pin: Pin): Promise<string> => {
    const cacheKey = pin.id

    if (thumbnailCache.has(cacheKey)) {
      return thumbnailCache.get(cacheKey)!
    }

    let thumbnailUrl: string

    if (pin.media) {
      thumbnailUrl = pin.media.url
    } else {
      try {
        thumbnailUrl = await generateEnhancedThumbnailForPin(pin)
        console.log(`🖼️ Generated enhanced thumbnail for: ${pin.address}`)
      } catch (error) {
        console.warn("⚠️ Failed to generate enhanced thumbnail, using fallback:", error)
        thumbnailUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${pin.latitude},${pin.longitude}&zoom=15&size=300x200&maptype=roadmap&markers=color:red%7Clabel:P%7C${pin.latitude},${pin.longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      }
    }

    setThumbnailCache((prev) => new Map(prev.set(cacheKey, thumbnailUrl)))
    return thumbnailUrl
  }

  const markSpot = () => {
    if (userLocation) {
      const newPin: Pin = {
        id: Date.now().toString(),
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        address: locationAddress || "Unknown Location",
        timestamp: new Date().toISOString(),
        notes: "",
        thumbnail: mapImageUrl || undefined,
      }

      setSavedPins((prev) => [newPin, ...prev])
      playEnhancedSound("success-chime")
      console.log("📌 Pin created and saved:", newPin)
    } else {
      alert("❌ Location not available yet. Please wait a moment and try again.")
    }
  }

  const quickPin = () => {
    markSpot()
    setQuickPinMode(true)

    const timer = setTimeout(() => {
      setQuickPinMode(false)
      setCurrentScreen("libraries")
      setLibraryTab("pins")
    }, 2000)

    setAutoCloseTimer(timer)
  }

  const openEditor = (pin: Pin) => {
    setSelectedPin(pin)
    setCurrentScreen("editor")
  }

  const deletePin = (pinId: string) => {
    if (confirm("Are you sure you want to delete this pin?")) {
      setSavedPins((prev) => prev.filter((pin) => pin.id !== pinId))
      console.log(`🗑️ Pin deleted: ${pinId}`)
    }
  }

  const deletePostcard = (postcardId: string) => {
    if (confirm("Are you sure you want to delete this postcard?")) {
      const updatedPostcards = savedPostcards.filter((postcard) => postcard.id !== postcardId)
      setSavedPostcards(updatedPostcards)
      localStorage.setItem("pinit-saved-postcards", JSON.stringify(updatedPostcards))
      console.log(`🗑️ Postcard deleted: ${postcardId}`)
    }
  }

  // Enhanced Pin Item Component
  const PinItem = ({ pin }: { pin: Pin }) => {
    const [thumbnailUrl, setThumbnailUrl] = useState<string>("")
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
      const loadThumbnail = async () => {
        try {
          const url = await generateThumbnailForPin(pin)
          setThumbnailUrl(url)
        } catch (error) {
          console.error("Failed to load thumbnail:", error)
          setThumbnailUrl("/placeholder.svg?height=60&width=80&text=No+Image")
        } finally {
          setIsLoading(false)
        }
      }

      loadThumbnail()
    }, [pin])

    return (
      <div
        style={{
          background: "rgba(255,255,255,0.1)",
          borderRadius: "1rem",
          padding: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          transition: "all 0.3s ease",
          border: "1px solid transparent",
        }}
      >
        <div
          onClick={() => openEditor(pin)}
          style={{
            width: "80px",
            height: "60px",
            borderRadius: "0.5rem",
            overflow: "hidden",
            flexShrink: 0,
            background: "rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          {isLoading ? (
            <div
              style={{
                width: "20px",
                height: "20px",
                border: "2px solid rgba(255,255,255,0.3)",
                borderTop: "2px solid white",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
          ) : (
            <img
              src={thumbnailUrl || "/placeholder.svg"}
              alt="Pin thumbnail"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              onError={(e) => {
                e.currentTarget.src = "/placeholder.svg?height=60&width=80&text=No+Image"
              }}
            />
          )}
        </div>

        <div
          onClick={() => openEditor(pin)}
          style={{
            flex: 1,
            cursor: "pointer",
          }}
        >
          <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "1rem" }}>{pin.address}</h4>
          <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.7 }}>
            📅 {new Date(pin.timestamp).toLocaleDateString()} at {new Date(pin.timestamp).toLocaleTimeString()}
          </p>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.75rem", opacity: 0.6 }}>
            📍 {pin.latitude.toFixed(4)}, {pin.longitude.toFixed(4)}
          </p>
          {pin.notes && <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.75rem", opacity: 0.8 }}>📝 {pin.notes}</p>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <button
            onClick={() => openEditor(pin)}
            style={{
              padding: "0.5rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "rgba(16, 185, 129, 0.2)",
              color: "rgba(16, 185, 129, 0.8)",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          >
            <Edit3 size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              deletePin(pin.id)
            }}
            style={{
              padding: "0.5rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "rgba(239, 68, 68, 0.2)",
              color: "rgba(239, 68, 68, 0.8)",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          >
            🗑️
          </button>
        </div>
      </div>
    )
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
      {/* Sound toggle */}
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
      {!isMobile && (
        <VoiceCommander
          onCommand={(command, confidence) => {
            const cmd = command.toLowerCase()
            console.log(`🎤 Voice command: "${command}" (${confidence})`)

            if (cmd.includes("pin it") || cmd.includes("pin this")) {
              quickPin()
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
      )}

      {/* MAIN SCREEN */}
      {currentScreen === "main" && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          {/* Map Circle */}
          <div
            style={{
              padding: "4rem 2rem 1rem 2rem",
              display: "flex",
              justifyContent: "center",
            }}
          >
            {mapImageUrl && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <div
                  onClick={quickPin}
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
              </div>
            )}

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

            {quickPinMode && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(16, 185, 129, 0.95)",
                  zIndex: 1000,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                }}
              >
                <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>✅</div>
                <h2 style={{ fontSize: "2rem", fontWeight: "bold", margin: "0 0 0.5rem 0" }}>PINNED!</h2>
                <p style={{ fontSize: "1.125rem", opacity: 0.9, textAlign: "center" }}>{locationAddress}</p>
                <p style={{ fontSize: "0.875rem", opacity: 0.7, marginTop: "1rem" }}>Closing automatically...</p>
              </div>
            )}
          </div>

          {/* Title */}
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

          {/* Action Buttons */}
          <div
            style={{
              padding: "2rem 2rem 4rem 2rem",
              display: "flex",
              justifyContent: "center",
              gap: "3rem",
              minHeight: "120px",
            }}
          >
            <button
              onClick={() => {
                setCameraMode("photo")
                setShowCamera(true)
                setCurrentScreen("camera")
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
                setCurrentScreen("camera")
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
      )}

      {/* CAMERA SCREEN */}
      {currentScreen === "camera" && showCamera && (
        <ReliableCamera
          mode={cameraMode}
          onCapture={(mediaData, type) => {
            console.log(`📸 ${type} captured:`, mediaData)

            // 🔧 NEW FLOW: Photo → Platform Selector
            setCapturedMedia({ url: mediaData, type })
            setShowCamera(false)
            setCurrentScreen("platform-selector")

            // Save pin in background
            if (userLocation) {
              const newPin: Pin = {
                id: Date.now().toString(),
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                address: locationAddress || "Unknown Location",
                timestamp: new Date().toISOString(),
                notes: "",
                media: {
                  url: mediaData,
                  type: type,
                },
              }

              setSavedPins((prev) => [newPin, ...prev])
              playEnhancedSound("success-chime")
              console.log("📌 Pin saved with media:", newPin)
            }
          }}
          onClose={() => {
            setShowCamera(false)
            setCurrentScreen("main")
          }}
        />
      )}

      {/* PLATFORM SELECTOR SCREEN */}
      {currentScreen === "platform-selector" && capturedMedia && (
        <SocialPlatformSelector
          mediaUrl={capturedMedia.url}
          mediaType={capturedMedia.type}
          locationName={locationAddress || "Current Location"}
          onPlatformSelect={(platformId, dimensions) => {
            console.log(`📱 Platform selected: ${platformId}`, dimensions)
            setSelectedPlatform({ id: platformId, dimensions })
            setCurrentScreen("editor")
          }}
          onClose={() => {
            setCapturedMedia(null)
            setCurrentScreen("main")
          }}
        />
      )}

      {/* MOBILE EDITOR SCREEN */}
      {currentScreen === "editor" && capturedMedia && selectedPlatform && (
        <MobilePostcardEditor
          mediaUrl={capturedMedia.url}
          mediaType={capturedMedia.type}
          platform={selectedPlatform.id}
          dimensions={selectedPlatform.dimensions}
          locationName={locationAddress || "Current Location"}
          onSave={(postcardData) => {
            console.log("📮 Postcard saved:", postcardData)
            setCurrentPostcard(postcardData)
            setCurrentScreen("sharing")
          }}
          onClose={() => {
            setCapturedMedia(null)
            setSelectedPlatform(null)
            setCurrentScreen("main")
          }}
        />
      )}

      {/* SHARING SCREEN */}
      {currentScreen === "sharing" && currentPostcard && (
        <SocialSharing
          postcardDataUrl={currentPostcard.canvasDataUrl}
          locationName={currentPostcard.locationName}
          onComplete={() => {
            setCapturedMedia(null)
            setSelectedPlatform(null)
            setCurrentPostcard(null)
            setCurrentScreen("main")
          }}
        />
      )}

      {/* LIBRARIES SCREEN */}
      {currentScreen === "libraries" && (
        <div
          style={{
            flex: 1,
            background: "linear-gradient(135deg, #1e293b 0%, #1e40af 50%, #4338ca 100%)",
            color: "white",
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "2rem",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
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

          {/* Tabs */}
          <div
            style={{
              display: "flex",
              padding: "0 2rem",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              flexShrink: 0,
              overflowX: "auto",
            }}
          >
            {[
              { id: "pins", label: "📍 Pins", count: savedPins.filter((pin) => !pin.media).length },
              {
                id: "photos",
                label: "📸 Photos",
                count: savedPins.filter((pin) => pin.media?.type === "photo").length,
              },
              {
                id: "videos",
                label: "🎥 Videos",
                count: savedPins.filter((pin) => pin.media?.type === "video").length,
              },
              {
                id: "postcards",
                label: "📮 Postcards",
                count: savedPostcards.length,
              },
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
                  whiteSpace: "nowrap",
                }}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Content */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "2rem",
              minHeight: 0,
            }}
          >
            {libraryTab === "pins" && (
              <div>
                {savedPins.filter((pin) => !pin.media).length === 0 ? (
                  <div style={{ textAlign: "center", color: "rgba(255,255,255,0.6)", padding: "2rem" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📍</div>
                    <p>No location pins saved yet</p>
                    <p style={{ fontSize: "0.875rem" }}>Tap the map or use voice commands to create your first pin!</p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: "1rem" }}>
                    {savedPins
                      .filter((pin) => !pin.media)
                      .map((pin) => (
                        <PinItem key={pin.id} pin={pin} />
                      ))}
                  </div>
                )}
              </div>
            )}

            {libraryTab === "photos" && (
              <div>
                {savedPins.filter((pin) => pin.media?.type === "photo").length === 0 ? (
                  <div style={{ textAlign: "center", color: "rgba(255,255,255,0.6)", padding: "2rem" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📸</div>
                    <p>No photos saved yet</p>
                    <p style={{ fontSize: "0.875rem" }}>Use the camera to capture photos at your favorite locations!</p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: "1rem" }}>
                    {savedPins
                      .filter((pin) => pin.media?.type === "photo")
                      .map((pin) => (
                        <PinItem key={pin.id} pin={pin} />
                      ))}
                  </div>
                )}
              </div>
            )}

            {libraryTab === "videos" && (
              <div>
                {savedPins.filter((pin) => pin.media?.type === "video").length === 0 ? (
                  <div style={{ textAlign: "center", color: "rgba(255,255,255,0.6)", padding: "2rem" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎥</div>
                    <p>No videos saved yet</p>
                    <p style={{ fontSize: "0.875rem" }}>Use the camera to record videos at your favorite locations!</p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: "1rem" }}>
                    {savedPins
                      .filter((pin) => pin.media?.type === "video")
                      .map((pin) => (
                        <div
                          key={pin.id}
                          style={{
                            background: "rgba(255,255,255,0.1)",
                            borderRadius: "1rem",
                            padding: "1rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "1rem",
                            transition: "all 0.3s ease",
                            border: "1px solid transparent",
                          }}
                        >
                          <div
                            onClick={() => openEditor(pin)}
                            style={{
                              width: "80px",
                              height: "60px",
                              borderRadius: "0.5rem",
                              overflow: "hidden",
                              flexShrink: 0,
                              position: "relative",
                              cursor: "pointer",
                            }}
                          >
                            <video
                              src={pin.media?.url}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                              muted
                            />
                            <div
                              style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                transform: "translate(-50%, -50%)",
                                background: "rgba(0,0,0,0.7)",
                                borderRadius: "50%",
                                width: "24px",
                                height: "24px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "white",
                                fontSize: "0.75rem",
                              }}
                            >
                              ▶
                            </div>
                          </div>

                          <div
                            onClick={() => openEditor(pin)}
                            style={{
                              flex: 1,
                              cursor: "pointer",
                            }}
                          >
                            <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "1rem" }}>{pin.address}</h4>
                            <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.7 }}>
                              📅 {new Date(pin.timestamp).toLocaleDateString()} at{" "}
                              {new Date(pin.timestamp).toLocaleTimeString()}
                            </p>
                            <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.75rem", opacity: 0.6 }}>
                              📍 {pin.latitude.toFixed(4)}, {pin.longitude.toFixed(4)}
                            </p>
                            {pin.notes && (
                              <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.75rem", opacity: 0.8 }}>
                                📝 {pin.notes}
                              </p>
                            )}
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            <button
                              onClick={() => openEditor(pin)}
                              style={{
                                padding: "0.5rem",
                                borderRadius: "0.5rem",
                                border: "none",
                                background: "rgba(16, 185, 129, 0.2)",
                                color: "rgba(16, 185, 129, 0.8)",
                                cursor: "pointer",
                                transition: "all 0.3s ease",
                              }}
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deletePin(pin.id)
                              }}
                              style={{
                                padding: "0.5rem",
                                borderRadius: "0.5rem",
                                border: "none",
                                background: "rgba(239, 68, 68, 0.2)",
                                color: "rgba(239, 68, 68, 0.8)",
                                cursor: "pointer",
                                transition: "all 0.3s ease",
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {libraryTab === "postcards" && (
              <div>
                {savedPostcards.length === 0 ? (
                  <div style={{ textAlign: "center", color: "rgba(255,255,255,0.6)", padding: "2rem" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📮</div>
                    <p>No postcards saved yet</p>
                    <p style={{ fontSize: "0.875rem" }}>
                      Create postcards from your photos and videos to save memories!
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: "1rem" }}>
                    {savedPostcards.map((postcard) => (
                      <div
                        key={postcard.id}
                        style={{
                          background: "rgba(255,255,255,0.1)",
                          borderRadius: "1rem",
                          padding: "1rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "1rem",
                          transition: "all 0.3s ease",
                          border: "1px solid transparent",
                        }}
                      >
                        <div
                          style={{
                            width: "80px",
                            height: "60px",
                            borderRadius: "0.5rem",
                            overflow: "hidden",
                            flexShrink: 0,
                            background: "rgba(255,255,255,0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                          }}
                        >
                          <img
                            src={postcard.canvasDataUrl || "/placeholder.svg"}
                            alt="Postcard thumbnail"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.svg?height=60&width=80&text=Postcard"
                            }}
                          />
                        </div>

                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "1rem" }}>{postcard.locationName}</h4>
                          <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.7 }}>
                            📅 {new Date(postcard.timestamp).toLocaleDateString()} at{" "}
                            {new Date(postcard.timestamp).toLocaleTimeString()}
                          </p>
                          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.75rem", opacity: 0.8 }}>
                            💬 "{postcard.text.substring(0, 50)}
                            {postcard.text.length > 50 ? "..." : ""}"
                          </p>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          <button
                            onClick={() => {
                              const link = document.createElement("a")
                              link.download = `postcard-${postcard.locationName.replace(/[^a-zA-Z0-9]/g, "-")}-${Date.now()}.jpg`
                              link.href = postcard.canvasDataUrl
                              document.body.appendChild(link)
                              link.click()
                              document.body.removeChild(link)
                            }}
                            style={{
                              padding: "0.5rem",
                              borderRadius: "0.5rem",
                              border: "none",
                              background: "rgba(16, 185, 129, 0.2)",
                              color: "rgba(16, 185, 129, 0.8)",
                              cursor: "pointer",
                              transition: "all 0.3s ease",
                            }}
                          >
                            <FileImage size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deletePostcard(postcard.id)
                            }}
                            style={{
                              padding: "0.5rem",
                              borderRadius: "0.5rem",
                              border: "none",
                              background: "rgba(239, 68, 68, 0.2)",
                              color: "rgba(239, 68, 68, 0.8)",
                              cursor: "pointer",
                              transition: "all 0.3s ease",
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
