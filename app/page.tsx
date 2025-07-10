"use client"

import { useEffect, useState } from "react"
import React from "react"
import { useLocationServices } from "./hooks/useLocationServices"
import { reverseGeocode } from "./utils/geocoding"
import { playSound } from "./utils/audio"
import { Volume2, VolumeX, MapPin } from "lucide-react"
import LiveResultsMap from "./components/live-results-map" // Import LiveResultsMap

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
  postcard?: any
}

interface SpotCardProps {
  spot: Spot
  index: number
  onView: () => void
  onDelete: () => void
  category: { name: string; emoji: string; color: string }
}

const SpotCardComponent = ({ spot, index, onView, onDelete, category }: SpotCardProps) => {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.1)",
        backdropFilter: "blur(10px)",
        borderRadius: "1rem",
        border: "1px solid rgba(255,255,255,0.2)",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.3s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Category Tag */}
      <div
        style={{
          position: "absolute",
          top: "0.75rem",
          left: "0.75rem",
          background: `${category.color}90`,
          color: "white",
          padding: "0.25rem 0.5rem",
          borderRadius: "0.5rem",
          fontSize: "0.75rem",
          fontWeight: "bold",
          zIndex: 1,
        }}
      >
        {category.emoji} {category.name}
      </div>

      {/* Postcard/Photo Preview */}
      {(spot.postcard || spot.photo) && (
        <div style={{ marginBottom: "1rem", borderRadius: "0.75rem", overflow: "hidden" }}>
          {spot.postcard ? (
            spot.postcard.mediaType === "photo" ? (
              <img
                src={spot.postcard.mediaUrl || "/placeholder.svg?height=200&width=300&text=Postcard"}
                alt="Postcard"
                style={{ width: "100%", height: "150px", objectFit: "cover" }}
              />
            ) : (
              <video src={spot.postcard.mediaUrl} style={{ width: "100%", height: "150px", objectFit: "cover" }} />
            )
          ) : spot.photo ? (
            <img
              src={spot.photo || "/placeholder.svg?height=200&width=300&text=Photo"}
              alt="Spot photo"
              style={{ width: "100%", height: "150px", objectFit: "cover" }}
            />
          ) : null}
        </div>
      )}

      {/* Location Info */}
      <h3 style={{ fontSize: "1rem", fontWeight: "bold", color: "white", marginBottom: "0.5rem" }}>{spot.address}</h3>
      <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem", marginBottom: "0.75rem" }}>
        {new Date(spot.timestamp).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </p>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto" }}>
        <button
          onClick={onView}
          style={{
            flex: 1,
            padding: "0.5rem",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            fontSize: "0.875rem",
            transition: "all 0.3s ease",
          }}
        >
          View
        </button>
        <button
          onClick={onDelete}
          style={{
            flex: 1,
            padding: "0.5rem",
            background: "rgba(220, 38, 38, 0.3)",
            color: "white",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            fontSize: "0.875rem",
            transition: "all 0.3s ease",
          }}
        >
          Delete
        </button>
      </div>
    </div>
  )
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
  const [isPhotoMode, setIsPhotoMode] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [cameraMode, setCameraMode] = useState<"photo" | "video">("photo")
  const [showPostcardEditor, setShowPostcardEditor] = useState(false)
  const [capturedMediaUrl, setCapturedMediaUrl] = useState<string | null>(null)
  const [capturedMediaType, setCapturedMediaType] = useState<"photo" | "video">("photo")
  const [postcardData, setPostcardData] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [sortBy, setSortBy] = useState("newest")
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null)

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

  // Filter and sort spots based on user preferences
  const filteredAndSortedSpots = React.useMemo(() => {
    let filtered = spots

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (spot) =>
          spot.address.toLowerCase().includes(query) ||
          spot.notes.toLowerCase().includes(query) ||
          spotCategories[spot.category || "general"].name.toLowerCase().includes(query),
      )
    }

    // Apply category filter
    if (filterCategory !== "all") {
      filtered = filtered.filter((spot) => (spot.category || "general") === filterCategory)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        case "alphabetical":
          return a.address.localeCompare(b.address)
        case "newest":
        default:
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      }
    })

    return filtered
  }, [spots, searchQuery, filterCategory, sortBy])

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
        postcard: postcardData,
      }

      if (!isMuted) {
        await playSound(selectedSound)
      }

      setSpots((prev) => [newSpot, ...prev])
      setCurrentSpot(newSpot)

      setPostcardData(null)
      setCapturedMediaUrl(null)

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
          {/* Placeholder for main content */}
          <h2 style={{ color: "white", fontSize: "2rem" }}>Main Screen Content</h2>
        </div>
      </div>
    )
  }

  return null
}
