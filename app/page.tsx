"use client"

import { useEffect, useState } from "react"
import { SimpleMapTest } from "./components/simple-map-test"
import { useLocationServices } from "./hooks/useLocationServices"
import { reverseGeocode } from "./utils/geocoding"
import { MarkerSelector } from "./components/marker-icons"
import { playFartSound } from "./utils/audio"

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
  const [activeTab, setActiveTab] = useState("mark")
  const [isMarking, setIsMarking] = useState(false)
  const [selectedFartSound, setSelectedFartSound] = useState("classic")
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedMarker, setSelectedMarker] = useState("pin")
  const [isClient, setIsClient] = useState(false)
  const [showMarkerPicker, setShowMarkerPicker] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const { getCurrentLocation, isLoading: locationLoading, error: locationError } = useLocationServices()

  const fartSounds = {
    classic: {
      name: "Classic Toot",
      emoji: "💨",
      description: "Deep & rumbling",
      color: "from-amber-400 to-orange-500",
    },
    quick: { name: "Quick Pop", emoji: "🎈", description: "Short & sharp", color: "from-pink-400 to-red-500" },
    squeaky: { name: "Squeaky Door", emoji: "🚪", description: "High & silly", color: "from-green-400 to-blue-500" },
  }

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
      await playFartSound(selectedFartSound as any)
      console.log(`Playing fart for spot ${spotId}! 💨`)
    }
  }, [selectedFartSound])

  const handleFartSoundTest = async (type: string) => {
    setSelectedFartSound(type)
    await playFartSound(type as any)
  }

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

      // Play the fart sound!
      await playFartSound(selectedFartSound as any)

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
        alert(`📍 EPIC SPOT MARKED!

*${fartSounds[selectedFartSound as keyof typeof fartSounds].emoji}* FART DEPLOYED!

📍 Real GPS: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}
🎯 Accuracy: ±${location.accuracy?.toFixed(0)}m
🎨 Marker Style: ${selectedMarker.toUpperCase()}

💨 LEGENDARY FART SOUND ACTIVATED!`)
      }, 100)
    } catch (error) {
      console.error("Error marking spot:", error)
      alert("❌ Failed to mark spot!\n\nPlease check your location permissions and try again.")
    } finally {
      setIsMarking(false)
    }
  }

  // Mark Spot Tab
  if (activeTab === "mark") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 flex flex-col relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full opacity-20 animate-pulse"></div>
          <div
            className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200 rounded-full opacity-20 animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
        </div>

        {/* Header */}
        <div className="relative z-10 flex justify-between items-center p-6 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div>
            <h1 className="text-3xl font-black text-gray-800 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Mark This Spot
            </h1>
            <p className="text-sm text-gray-600 mt-1">Real GPS + Epic Fart Sounds! 💨</p>
          </div>
          <button
            onClick={() => setShowMarkerPicker(!showMarkerPicker)}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-sm font-bold transform hover:scale-105"
          >
            🎯 {selectedMarker.charAt(0).toUpperCase() + selectedMarker.slice(1)} Style
          </button>
        </div>

        {/* Location Error Display */}
        {locationError && (
          <div className="mx-6 mt-6 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center">
              <span className="text-red-500 mr-3 text-xl">⚠️</span>
              <div>
                <div className="font-bold text-red-700">Location Error</div>
                <div className="text-red-600 text-sm">{locationError}</div>
              </div>
            </div>
          </div>
        )}

        {/* Marker Picker */}
        {showMarkerPicker && isClient && (
          <div className="mx-6 mt-6 relative z-20">
            <MarkerSelector
              selectedMarker={selectedMarker}
              onMarkerSelect={(marker) => {
                setSelectedMarker(marker)
                setShowMarkerPicker(false)
              }}
            />
          </div>
        )}

        {/* Sound Picker */}
        <div className="mx-6 mt-6 bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border-2 border-gray-100 relative z-10">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-2">🔊 Choose Your Epic Fart Sound</h3>
            <p className="text-sm text-gray-600">Each spot gets its own legendary sound!</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {Object.entries(fartSounds).map(([key, sound]) => (
              <button
                key={key}
                onClick={() => handleFartSoundTest(key)}
                className={`group relative p-4 rounded-xl border-3 transition-all duration-300 text-center transform hover:scale-105 ${
                  selectedFartSound === key
                    ? `border-blue-500 bg-gradient-to-br ${sound.color} text-white shadow-xl scale-105`
                    : "border-gray-200 hover:border-gray-300 bg-white hover:shadow-lg"
                }`}
              >
                {/* Selection indicator */}
                {selectedFartSound === key && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-blue-500 text-xs font-bold">✓</span>
                  </div>
                )}

                <div className="text-3xl mb-2 group-hover:animate-bounce">{sound.emoji}</div>
                <div className={`font-bold text-sm mb-1 ${selectedFartSound === key ? "text-white" : "text-gray-800"}`}>
                  {sound.name}
                </div>
                <div className={`text-xs ${selectedFartSound === key ? "text-white/80" : "text-gray-600"}`}>
                  {sound.description}
                </div>

                {/* Hover effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-300 transform -skew-x-12"></div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Button Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
          <div className="relative">
            {/* Pulsing glow rings */}
            <div className="absolute inset-0 rounded-full bg-blue-400 opacity-20 animate-ping scale-110"></div>
            <div
              className="absolute inset-0 rounded-full bg-purple-500 opacity-30 animate-pulse scale-105"
              style={{ animationDelay: "0.5s" }}
            ></div>
            <div
              className="absolute inset-0 rounded-full bg-pink-400 opacity-20 animate-ping scale-120"
              style={{ animationDelay: "1s" }}
            ></div>

            {/* Main button */}
            <button
              onClick={markSpot}
              disabled={isMarking || locationLoading}
              className={`relative w-80 h-80 rounded-full flex flex-col items-center justify-center text-white font-bold text-2xl shadow-2xl transition-all duration-300 transform ${
                isMarking || locationLoading
                  ? "bg-gradient-to-br from-gray-400 to-gray-500 scale-95"
                  : "bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 hover:scale-105 active:scale-95 hover:shadow-3xl"
              }`}
              style={{
                boxShadow:
                  isMarking || locationLoading
                    ? "0 10px 30px rgba(0,0,0,0.2)"
                    : "0 25px 80px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(255,255,255,0.1) inset",
              }}
            >
              {/* Button content */}
              {isMarking || locationLoading ? (
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 border-4 border-white border-t-transparent rounded-full animate-spin mb-6"></div>
                  <div className="text-2xl font-black">{isMarking ? "MARKING..." : "GETTING GPS..."}</div>
                  <div className="text-sm opacity-80 mt-3">Preparing epic fart deployment!</div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="text-8xl mb-6 animate-bounce">📍</div>
                  <div className="text-3xl font-black tracking-wide mb-2">MARK SPOT</div>
                  <div className="text-sm opacity-90 text-center px-4 mb-3">Real GPS + Epic Fart!</div>
                  <div className="text-2xl">{fartSounds[selectedFartSound as keyof typeof fartSounds].emoji}</div>
                </div>
              )}

              {/* Shine effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white to-transparent opacity-0 hover:opacity-10 transition-opacity duration-500 transform -skew-x-12"></div>
            </button>
          </div>

          <div className="mt-12 text-center max-w-md">
            <p className="text-gray-700 text-lg leading-relaxed mb-4">
              <span className="font-black text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text">
                REAL GPS LOCATION TRACKING!
              </span>
            </p>
            <p className="text-gray-600">Now with Google Maps integration + legendary fart sounds! 💨</p>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="flex border-t-2 border-gray-200 bg-white/90 backdrop-blur-sm relative z-10">
          <button
            onClick={() => setActiveTab("mark")}
            className="flex-1 p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-sm border-t-4 border-blue-500"
          >
            🎯 Mark Spot
          </button>
          <button
            onClick={() => setActiveTab("map")}
            className="flex-1 p-4 bg-white text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors border-t-4 border-transparent hover:border-gray-300"
          >
            🗺️ Map View ({spots.length})
          </button>
          <button
            onClick={() => setActiveTab("spots")}
            className="flex-1 p-4 bg-white text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors border-t-4 border-transparent hover:border-gray-300"
          >
            📍 My Spots ({spots.length})
          </button>
        </div>
      </div>
    )
  }

  // Map View Tab
  if (activeTab === "map") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 flex flex-col">
        <div className="p-6 bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <h1 className="text-3xl font-black text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text mb-2">
            Live Fart Map 🗺️💨
          </h1>
          <p className="text-gray-600">
            {spots.length} real GPS locations with epic fart sounds!
            <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-semibold">
              {selectedMarker.toUpperCase()} markers
            </span>
          </p>
        </div>

        <div className="flex-1 p-6">
          <SimpleMapTest />
            spots={spots}
            center={userLocation || undefined}
            selectedMarker={selectedMarker}
            onSpotClick={(spot) => {
              console.log("Clicked spot:", spot)
              playFartSound(selectedFartSound as any)
            }}
          />

          {spots.length === 0 && (
            <div className="text-center mt-8 p-8 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border-2 border-gray-100">
              <div className="text-8xl mb-6 animate-bounce">🗺️</div>
              <h2 className="text-2xl font-bold mb-4 text-gray-800">No spots on the map yet!</h2>
              <p className="text-gray-600 text-lg">
                Go mark some spots to see them appear here with epic fart sounds! 💨
              </p>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="flex border-t-2 border-gray-200 bg-white/90 backdrop-blur-sm">
          <button
            onClick={() => setActiveTab("mark")}
            className="flex-1 p-4 bg-white text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors border-t-4 border-transparent hover:border-gray-300"
          >
            🎯 Mark Spot
          </button>
          <button
            onClick={() => setActiveTab("map")}
            className="flex-1 p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-sm border-t-4 border-blue-500"
          >
            🗺️ Map View ({spots.length})
          </button>
          <button
            onClick={() => setActiveTab("spots")}
            className="flex-1 p-4 bg-white text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors border-t-4 border-transparent hover:border-gray-300"
          >
            📍 My Spots ({spots.length})
          </button>
        </div>
      </div>
    )
  }

  // Spots List View
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 flex flex-col">
      <div className="p-6 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <h1 className="text-3xl font-black text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text mb-2">
          Your Epic Spots
        </h1>
        <p className="text-gray-600">{spots.length} real locations saved with legendary fart sounds! 💨</p>
      </div>

      <div className="flex-1 p-6">
        {spots.length === 0 ? (
          <div className="text-center p-12 text-gray-600 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border-2 border-gray-100">
            <div className="text-9xl mb-8 animate-bounce">📍</div>
            <h2 className="text-3xl font-bold mb-6 text-gray-800">No epic spots yet</h2>
            <p className="text-xl mb-4">Go back and start marking legendary places!</p>
            <p className="text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-full inline-block">
              Real GPS locations with epic fart sounds! 💨
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {spots.map((spot, index) => (
              <div
                key={spot.id}
                className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 transform hover:scale-102"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center mb-4">
                      <span className="mr-4 text-2xl">📍</span>
                      <div>
                        <strong className="text-gray-800 text-xl block">{spot.address}</strong>
                        <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                          Spot #{spots.length - index}
                        </span>
                      </div>
                    </div>

                    <div className="text-gray-600 mb-4 flex items-center bg-gray-50 p-3 rounded-lg">
                      <span className="mr-3 text-lg">🕒</span>
                      <div>
                        <div className="font-semibold">{new Date(spot.timestamp).toLocaleDateString()}</div>
                        <div className="text-sm">{new Date(spot.timestamp).toLocaleTimeString()}</div>
                      </div>
                    </div>

                    <div className="text-gray-400 text-sm font-mono bg-gray-50 px-4 py-3 rounded-lg mb-4 border-l-4 border-blue-500">
                      <div className="font-bold text-gray-600 mb-1">📍 GPS Coordinates:</div>
                      {spot.latitude.toFixed(6)}, {spot.longitude.toFixed(6)}
                    </div>

                    <button
                      onClick={() => playFartSound(selectedFartSound as any)}
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 text-sm font-bold transform hover:scale-105"
                    >
                      💨 Replay Epic Fart Sound
                    </button>
                  </div>

                  <button
                    onClick={() => setActiveTab("map")}
                    className="ml-6 p-4 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 hover:from-blue-200 hover:to-purple-200 transition-all duration-300 text-3xl transform hover:scale-110"
                  >
                    🗺️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="flex border-t-2 border-gray-200 bg-white/90 backdrop-blur-sm">
        <button
          onClick={() => setActiveTab("mark")}
          className="flex-1 p-4 bg-white text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors border-t-4 border-transparent hover:border-gray-300"
        >
          🎯 Mark Spot
        </button>
        <button
          onClick={() => setActiveTab("map")}
          className="flex-1 p-4 bg-white text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors border-t-4 border-transparent hover:border-gray-300"
        >
          🗺️ Map View ({spots.length})
        </button>
        <button
          onClick={() => setActiveTab("spots")}
          className="flex-1 p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-sm border-t-4 border-blue-500"
        >
          📍 My Spots ({spots.length})
        </button>
      </div>
    </div>
  )
}
