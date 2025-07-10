"use client"

import { useEffect, useState, useRef } from "react"
import React from "react"
import { useLocationServices } from "./hooks/useLocationServices"
import { reverseGeocode } from "./utils/geocoding"
import { playSound } from "./utils/audio"
import { Volume2, VolumeX, MapPin } from "lucide-react"
import { Search, ArrowLeft } from "lucide-react"

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
          />
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
        👁️ {showStreetView ? "Exit Street View" : "Street View"}
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
          <div
            style={{
              maxWidth: "600px",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "2rem",
              alignItems: "stretch",
            }}
          >
            {/* Location Info */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                textAlign: "center",
                color: "white",
              }}
            >
              <h1 style={{ fontSize: "2.5rem", fontWeight: 900, margin: 0 }}>Mark This Spot</h1>
              <p style={{ fontSize: "1.125rem", color: "rgba(255,255,255,0.8)", margin: 0 }}>
                Remember the exact location of your favorite places.
              </p>
              <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.7)", margin: 0 }}>
                {locationLoading ? "Getting your location..." : locationAddress}
              </p>
            </div>

            {/* Circular Map Preview */}
            {mapImageUrl && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: "1rem",
                }}
              >
                <div
                  style={{
                    width: "320px", // Increased from 200px
                    height: "320px", // Increased from 200px
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "4px solid rgba(255,255,255,0.3)",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                    position: "relative",
                    background: "rgba(255,255,255,0.1)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <img
                    src={mapImageUrl || "/placeholder.svg"}
                    alt="Your current location"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    onError={(e) => {
                      console.error("Map image failed to load")
                      e.currentTarget.style.display = "none"
                    }}
                  />

                  {/* Pulse animation overlay */}
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
                      boxShadow: "0 0 0 0 rgba(16, 185, 129, 0.7)",
                      animation: "pulse 2s infinite",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Loading state for map */}
            {!mapImageUrl && userLocation && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: "1rem",
                }}
              >
                <div
                  style={{
                    width: "320px", // Increased from 200px
                    height: "320px", // Increased from 200px
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
            )}

            {/* Action Buttons - Minimalistic */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "3rem",
                marginTop: "2rem",
              }}
            >
              <button
                onClick={markSpot}
                disabled={isMarking || locationLoading}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  color: isMarking || locationLoading ? "rgba(255,255,255,0.3)" : "white",
                  opacity: isMarking || locationLoading ? 0.5 : 1,
                  pointerEvents: isMarking || locationLoading ? "none" : "auto",
                }}
              >
                <div style={{ fontSize: "2rem" }}>{isMarking ? "⏳" : "📍"}</div>
                <span style={{ fontSize: "0.875rem", fontWeight: 600, textAlign: "center" }}>
                  {isMarking ? "Marking..." : "Mark Spot"}
                </span>
              </button>

              <button
                onClick={() => setCurrentScreen("libraries")}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  color: "rgba(255,255,255,0.8)",
                }}
              >
                <div style={{ fontSize: "2rem" }}>📚</div>
                <span style={{ fontSize: "0.875rem", fontWeight: 600, textAlign: "center" }}>Libraries</span>
              </button>
            </div>
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
          width: "100%",
          background: "linear-gradient(135deg, #1e293b 0%, #1e40af 50%, #4338ca 100%)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
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
              <button
                onClick={() => setCurrentScreen("main")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0.5rem",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "white",
                  transition: "all 0.3s ease",
                }}
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "white", margin: 0 }}>My Libraries</h1>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.875rem", margin: 0 }}>
                  Explore your saved spots
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div
          style={{
            padding: "1rem 1.5rem",
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(5px)",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div style={{ flex: 1, position: "relative" }}>
            <input
              type="text"
              placeholder="Search locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "0.625rem 2.5rem 0.625rem 1rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                fontSize: "0.875rem",
                outline: "none",
                transition: "all 0.3s ease",
              }}
            />
            <Search
              size={16}
              style={{
                position: "absolute",
                top: "50%",
                right: "0.75rem",
                transform: "translateY(-50%)",
                color: "rgba(255,255,255,0.5)",
              }}
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{
              padding: "0.625rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "rgba(255,255,255,0.1)",
              color: "white",
              fontSize: "0.875rem",
              outline: "none",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          >
            <option value="all">All Categories</option>
            {Object.entries(spotCategories).map(([key, category]) => (
              <option key={key} value={key}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: "0.625rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "rgba(255,255,255,0.1)",
              color: "white",
              fontSize: "0.875rem",
              outline: "none",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="alphabetical">Alphabetical</option>
          </select>
        </div>

        {/* Spot List */}
        <div style={{ flex: 1, padding: "1.5rem", overflowY: "auto" }}>
          {filteredAndSortedSpots.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "rgba(255,255,255,0.6)",
                textAlign: "center",
              }}
            >
              <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "0.5rem" }}>No spots found</h3>
              <p style={{ fontSize: "0.875rem" }}>Try adjusting your search or filter settings.</p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "1.5rem",
              }}
            >
              {filteredAndSortedSpots.map((spot, index) => (
                <SpotCardComponent
                  key={spot.id}
                  spot={spot}
                  index={index}
                  category={spotCategories[spot.category || "general"]}
                  onView={() => {
                    setSelectedSpot(spot)
                    alert("View spot details")
                  }}
                  onDelete={() => {
                    setSpots((prev) => prev.filter((s) => s.id !== spot.id))
                    alert("Delete spot")
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
;<style jsx>{`
  @keyframes pulse {
    0% {
      transform: translate(-50%, -50%) scale(1);
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
    }
    70% {
      transform: translate(-50%, -50%) scale(1);
      box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
    }
    100% {
      transform: translate(-50%, -50%) scale(1);
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
    }
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`}</style>
