"use client"

import { useRef } from "react"

import { useEffect, useState } from "react"
import { useLocationServices } from "./hooks/useLocationServices"
import { reverseGeocode } from "./utils/geocoding"
import { playSound } from "./utils/audio"
import { Volume2, VolumeX, Library, Settings, ArrowLeft, Play, MapPin, Eye } from "lucide-react"
import { EnhancedCamera } from "./components/enhanced-camera"
import { PostcardEditor } from "./components/postcard-editor"

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
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-blue-800 to-indigo-900 flex flex-col">
        <div className="p-4 bg-white/10 backdrop-blur-md border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <MapPin size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">Spot Marked!</h1>
                <p className="text-white/80 text-sm">Refine your location below</p>
              </div>
            </div>
            <button
              onClick={() => {
                setCurrentScreen("main")
                setCurrentSpot(null)
              }}
              className="flex items-center gap-2 px-4 py-3 bg-white/20 backdrop-blur-md text-white rounded-xl border-none cursor-pointer transition-all hover:bg-white/30 font-semibold"
            >
              Done
            </button>
          </div>
        </div>

        <div className="flex-1 relative">
          <LiveResultsMap
            spot={currentSpot}
            onLocationUpdate={(lat, lng, address) => {
              const updatedSpot = { ...currentSpot, latitude: lat, longitude: lng, address }
              setCurrentSpot(updatedSpot)
              setSpots((prev) => prev.map((spot) => (spot.id === currentSpot.id ? updatedSpot : spot)))
            }}
          />
        </div>

        <div className="bg-white/10 backdrop-blur-md border-t border-white/20 p-6">
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">📍 Location</h3>
              <p className="text-white/90 text-base">{currentSpot.address}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-bold text-white/70 uppercase tracking-wide">Coordinates</h4>
                <p className="text-white text-sm font-mono mt-1">
                  {currentSpot.latitude.toFixed(6)}, {currentSpot.longitude.toFixed(6)}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-bold text-white/70 uppercase tracking-wide">Marked At</h4>
                <p className="text-white text-sm mt-1">{new Date(currentSpot.timestamp).toLocaleString()}</p>
              </div>
            </div>

            <div className="bg-blue-500/20 rounded-xl p-4 border border-blue-500/30">
              <p className="text-white/90 text-sm text-center">
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
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-800 via-blue-800 to-indigo-900 flex flex-col relative overflow-hidden">
        {/* Sound toggle - top right */}
        <div className="absolute top-8 right-8 z-20">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="flex flex-col items-center gap-1 p-2 border-none bg-transparent cursor-pointer transition-all text-white/60 hover:text-white/80"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            <span className="text-xs font-normal">{isMuted ? "Muted" : "Sound"}</span>
          </button>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
          {locationError && (
            <div className="mb-8 bg-red-500/20 backdrop-blur-md border-2 border-red-500/50 rounded-2xl p-4 shadow-2xl max-w-96 text-white">
              <div className="flex items-center">
                <span className="mr-3 text-xl">⚠️</span>
                <div>
                  <div className="font-bold">Location Error</div>
                  <div className="text-sm opacity-90">{locationError}</div>
                </div>
              </div>
            </div>
          )}

          {/* THE HOLE - Clean circular hole with thick border */}
          <div className="relative mb-8">
            <div className="relative w-64 h-64 flex items-center justify-center">
              <div className="w-64 h-64 rounded-full overflow-hidden relative border-6 border-slate-800/80">
                {/* Map visible through the hole */}
                <div
                  className="absolute -top-8 -left-8 -right-8 -bottom-8 bg-cover bg-center transform scale-120"
                  style={{
                    backgroundImage: mapImageUrl
                      ? `url(${mapImageUrl})`
                      : "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
                  }}
                />

                {/* Interactive Button */}
                <button
                  onClick={markSpot}
                  disabled={isMarking || locationLoading}
                  className="absolute inset-0 bg-transparent border-none rounded-full cursor-pointer z-10 transition-all hover:bg-blue-500/10 disabled:cursor-not-allowed"
                />

                {/* Loading State */}
                {(isMarking || locationLoading || !mapImageUrl) && (
                  <div className="absolute inset-0 bg-black/80 rounded-full flex flex-col items-center justify-center z-15 text-white">
                    <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4" />
                    <div className="text-base font-black text-center">
                      {isMarking ? "MARKING..." : locationLoading ? "GETTING GPS..." : "LOADING MAP..."}
                    </div>
                  </div>
                )}

                {/* Center Location Dot */}
                {mapImageUrl && !isMarking && !locationLoading && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-500/90 border-2 border-white shadow-lg shadow-red-500/30 z-12 animate-pulse" />
                )}
              </div>
            </div>
          </div>

          {/* CAMERA SECTION */}
          <div className="mb-8">
            {/* Photo/Video Mode Toggle */}
            <div className="flex items-center justify-center mb-6 bg-white/10 backdrop-blur-md rounded-full p-1 border border-white/20">
              <button
                onClick={() => setCameraMode("photo")}
                className={`flex items-center gap-2 px-6 py-3 rounded-full border-none cursor-pointer transition-all text-sm font-normal ${
                  cameraMode === "photo"
                    ? "bg-white/20 text-white font-bold"
                    : "bg-transparent text-white hover:bg-white/10"
                }`}
              >
                📸 Photo
              </button>
              <button
                onClick={() => setCameraMode("video")}
                className={`flex items-center gap-2 px-6 py-3 rounded-full border-none cursor-pointer transition-all text-sm font-normal ${
                  cameraMode === "video"
                    ? "bg-white/20 text-white font-bold"
                    : "bg-transparent text-white hover:bg-white/10"
                }`}
              >
                🎥 Video
              </button>
            </div>

            {/* App Title and Description */}
            <div className="text-center max-w-md">
              <h1 className="text-4xl font-black text-white mb-4 bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
                Mark This Spot
              </h1>
              <p className="text-white/80 text-lg mb-2">
                <span className="font-bold">Like Shazam, but for places!</span>
              </p>
              <p className="text-white/60 text-sm mb-2">
                {spots.length} {spots.length === 1 ? "spot" : "spots"} marked • Real GPS tracking
              </p>
              <p className="text-white/50 text-xs italic">📍 {locationAddress}</p>
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="absolute bottom-8 left-8 z-20">
            <button
              onClick={() => setCurrentScreen("libraries")}
              className="flex flex-col items-center gap-1 p-2 bg-transparent border-none cursor-pointer transition-all text-white/60 hover:text-white/80"
            >
              <Library size={20} />
              <span className="text-xs font-normal">Libraries</span>
            </button>
          </div>

          <div className="absolute bottom-8 right-8 z-20">
            <button
              onClick={() => setCurrentScreen("settings")}
              className="flex flex-col items-center gap-1 p-2 bg-transparent border-none cursor-pointer transition-all text-white/60 hover:text-white/80"
            >
              <Settings size={20} />
              <span className="text-xs font-normal">Settings</span>
            </button>
          </div>

          {/* Muted indicator */}
          {isMuted && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-20 bg-red-500/90 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-bold shadow-2xl">
              🔇 Sound Muted
            </div>
          )}

          {/* Enhanced Camera Modal */}
          {showCamera && (
            <EnhancedCamera
              mode={cameraMode}
              onCapture={(mediaData, type) => {
                console.log(`📸 ${type.toUpperCase()} CAPTURED!`, mediaData.substring(0, 50) + "...")
                setCapturedMediaUrl(mediaData)
                setCapturedMediaType(type)
                setShowCamera(false)
                setShowPostcardEditor(true)
              }}
              onClose={() => setShowCamera(false)}
            />
          )}

          {/* Postcard Editor Modal */}
          {showPostcardEditor && capturedMediaUrl && (
            <PostcardEditor
              mediaUrl={capturedMediaUrl}
              mediaType={capturedMediaType}
              locationName={locationAddress}
              onSave={(postcardData) => {
                console.log("🎨 POSTCARD CREATED!", postcardData)
                setPostcardData(postcardData)
                setShowPostcardEditor(false)
                markSpot()
              }}
              onClose={() => {
                setShowPostcardEditor(false)
                setCapturedMediaUrl(null)
                setPostcardData(null)
              }}
            />
          )}
        </div>
      </div>
    )
  }

  if (currentScreen === "settings") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-indigo-600 to-purple-700 flex flex-col">
        <div className="p-6 bg-white/10 backdrop-blur-md border-b border-white/20">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black text-white">Settings</h1>
            <button
              onClick={() => setCurrentScreen("main")}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md text-white rounded-xl border-none cursor-pointer transition-all hover:bg-white/30"
            >
              <ArrowLeft size={20} />
              Back
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex flex-col gap-6">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">🎯 Spot Customization</h2>
              <p className="text-white/70 mb-6">Customize how you mark and categorize your spots</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setCurrentScreen("category-selector")}
                  className="p-6 rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur-md text-white cursor-pointer transition-all hover:bg-white/20 text-center"
                >
                  <div className="text-4xl mb-2">{spotCategories[selectedCategory].emoji}</div>
                  <h3 className="text-lg font-bold mb-2">Category</h3>
                  <p className="text-sm opacity-80 mb-2">Current: {spotCategories[selectedCategory].name}</p>
                  <div className="text-xs opacity-60">Tap to change →</div>
                </button>

                <button
                  onClick={() => setShowCamera(true)}
                  className={`p-6 rounded-2xl border-2 text-white cursor-pointer transition-all text-center ${
                    isPhotoMode
                      ? "border-emerald-500/50 bg-emerald-500/20"
                      : "border-white/20 bg-white/10 hover:bg-white/20"
                  }`}
                >
                  <div className="text-4xl mb-2">📸</div>
                  <h3 className="text-lg font-bold mb-2">Photo Mode</h3>
                  <p className="text-sm opacity-80 mb-2">{isPhotoMode ? "✓ Enabled" : "Disabled"}</p>
                  <div className="text-xs opacity-60">{isPhotoMode ? "Photos will be captured" : "Tap to enable"}</div>
                </button>

                <button
                  onClick={() => setCurrentScreen("marker-selector")}
                  className="p-6 rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur-md text-white cursor-pointer transition-all hover:bg-white/20 text-center"
                >
                  <div className="text-4xl mb-2">🎯</div>
                  <h3 className="text-lg font-bold mb-2">Marker Style</h3>
                  <p className="text-sm opacity-80 mb-2">Current: {selectedMarker.toUpperCase()}</p>
                  <div className="text-xs opacity-60">Tap to change →</div>
                </button>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">🔊 Sound Settings</h2>

              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Sound Effects</h3>
                  <p className="text-white/70">Enable or disable all app sounds</p>
                </div>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-3 rounded-full transition-all border-none cursor-pointer ${
                    isMuted ? "bg-red-500 text-white" : "bg-emerald-500 text-white"
                  }`}
                >
                  {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                </button>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-2xl">
                  {Object.values(soundCategories)
                    .flatMap((category) => Object.entries(category))
                    .find(([key]) => key === selectedSound)?.[1]?.emoji || "🎵"}
                </span>
                <div className="flex-1">
                  <div className="text-white font-bold">
                    {Object.values(soundCategories)
                      .flatMap((category) => Object.entries(category))
                      .find(([key]) => key === selectedSound)?.[1]?.name || "Unknown"}
                  </div>
                  <div className="text-white/70 text-sm">
                    {Object.values(soundCategories)
                      .flatMap((category) => Object.entries(category))
                      .find(([key]) => key === selectedSound)?.[1]?.description || ""}
                  </div>
                </div>
                <button
                  onClick={() => !isMuted && playSound(selectedSound)}
                  disabled={isMuted}
                  className={`p-2 rounded-full border-none cursor-pointer ${
                    isMuted
                      ? "bg-white/10 text-white/50 cursor-not-allowed"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  <Play size={20} />
                </button>
                <button
                  onClick={() => setCurrentScreen("libraries")}
                  className="px-4 py-2 rounded-lg border border-white/30 bg-white/10 text-white cursor-pointer text-sm hover:bg-white/20"
                >
                  Change Sound
                </button>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">📱 App Info</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center text-white/80">
                  <div className="text-2xl mb-2">📍</div>
                  <div className="text-sm font-bold">{spots.length}</div>
                  <div className="text-xs opacity-70">Spots Marked</div>
                </div>
                <div className="text-center text-white/80">
                  <div className="text-2xl mb-2">🎵</div>
                  <div className="text-sm font-bold">v1.0</div>
                  <div className="text-xs opacity-70">App Version</div>
                </div>
                <div className="text-center text-white/80">
                  <div className="text-2xl mb-2">🗺️</div>
                  <div className="text-sm font-bold">GPS</div>
                  <div className="text-xs opacity-70">Location Mode</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentScreen === "category-selector") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-purple-700 to-indigo-600 flex flex-col">
        <div className="p-6 bg-white/10 backdrop-blur-md border-b border-white/20">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black text-white">🏷️ Choose Category</h1>
            <button
              onClick={() => setCurrentScreen("settings")}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md text-white rounded-xl border-none cursor-pointer transition-all hover:bg-white/30"
            >
              <ArrowLeft size={20} />
              Back
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(spotCategories).map(([key, category]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`p-6 rounded-2xl border-2 backdrop-blur-md text-white cursor-pointer transition-all text-center ${
                  selectedCategory === key
                    ? "border-white/40 bg-white/20"
                    : "border-white/20 bg-white/10 hover:bg-white/20"
                }`}
              >
                <div className="text-4xl mb-2">{category.emoji}</div>
                <h3 className="text-lg font-bold mb-2">{category.name}</h3>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (currentScreen === "marker-selector") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-purple-700 to-indigo-600 flex flex-col">
        <div className="p-6 bg-white/10 backdrop-blur-md border-b border-white/20">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black text-white">🎯 Choose Marker</h1>
            <button
              onClick={() => setCurrentScreen("settings")}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md text-white rounded-xl border-none cursor-pointer transition-all hover:bg-white/30"
            >
              <ArrowLeft size={20} />
              Back
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {["pin", "flag", "star", "heart"].map((marker) => (
              <button
                key={marker}
                onClick={() => setSelectedMarker(marker)}
                className={`p-6 rounded-2xl border-2 backdrop-blur-md text-white cursor-pointer transition-all text-center ${
                  selectedMarker === marker
                    ? "border-white/40 bg-white/20"
                    : "border-white/20 bg-white/10 hover:bg-white/20"
                }`}
              >
                <div className="text-4xl mb-2">🎯</div>
                <h3 className="text-lg font-bold mb-2">{marker.toUpperCase()}</h3>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (currentScreen === "libraries") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-indigo-600 to-purple-700 flex flex-col">
        <div className="p-6 bg-white/10 backdrop-blur-md border-b border-white/20">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black text-white">🎵 Sound Library</h1>
            <button
              onClick={() => setCurrentScreen("settings")}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md text-white rounded-xl border-none cursor-pointer transition-all hover:bg-white/30"
            >
              <ArrowLeft size={20} />
              Back
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex flex-col gap-6">
            {Object.entries(soundCategories).map(([categoryName, sounds]) => (
              <div key={categoryName} className="bg-white/10 backdrop-blur-md rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">{categoryName}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(sounds).map(([soundKey, sound]) => (
                    <button
                      key={soundKey}
                      onClick={() => setSelectedSound(soundKey)}
                      className={`p-6 rounded-2xl border-2 backdrop-blur-md text-white cursor-pointer transition-all text-center ${
                        selectedSound === soundKey
                          ? "border-white/40 bg-white/20"
                          : "border-white/20 bg-white/10 hover:bg-white/20"
                      }`}
                    >
                      <div className="text-4xl mb-2">{sound.emoji}</div>
                      <h3 className="text-lg font-bold mb-2">{sound.name}</h3>
                      <p className="text-sm opacity-80">{sound.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return null
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
      <div className="h-full flex items-center justify-center bg-red-500/10 text-white">
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold mb-2">Map Error</h3>
          <p>{loadError}</p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center bg-white/10 text-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4 mx-auto" />
          <p>Loading interactive map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full relative">
      <div ref={mapRef} className={`w-full h-full min-h-96 bg-gray-200 ${showStreetView ? "hidden" : "block"}`} />

      <div
        ref={streetViewRef}
        className={`w-full h-full min-h-96 bg-gray-200 ${showStreetView ? "block" : "hidden"}`}
      />

      <button
        onClick={toggleStreetView}
        className={`absolute top-4 right-4 flex items-center gap-2 px-4 py-3 rounded-xl border-none cursor-pointer transition-all font-semibold text-sm z-10 shadow-lg ${
          showStreetView ? "bg-emerald-500 text-white" : "bg-white/90 backdrop-blur-md text-gray-800 hover:bg-white"
        }`}
      >
        <Eye size={18} />
        {showStreetView ? "Exit Street View" : "Street View"}
      </button>

      {!showStreetView && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-md text-white px-4 py-3 rounded-xl text-sm text-center shadow-lg">
          🖱️ Drag the green marker to refine your location
        </div>
      )}

      {showStreetView && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-emerald-500/90 backdrop-blur-md text-white px-4 py-3 rounded-xl text-sm text-center shadow-lg">
          🏠 Street View Active - Look around with mouse/touch
        </div>
      )}
    </div>
  )
}
