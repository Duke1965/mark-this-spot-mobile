"use client"

import { useEffect, useState } from "react"
import { GoogleMap } from "./components/google-map"
import { useLocationServices } from "./hooks/useLocationServices"
import { reverseGeocode } from "./utils/geocoding"
import { MarkerSelector } from "./components/marker-icons"

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
  const [showSoundPicker, setShowSoundPicker] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedMarker, setSelectedMarker] = useState("pin")
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const [showMarkerPicker, setShowMarkerPicker] = useState(false)

  const { getCurrentLocation, isLoading: locationLoading, error: locationError } = useLocationServices()

  const fartSounds = {
    classic: { name: "Classic Toot", emoji: "💨", description: "The timeless classic" },
    quick: { name: "Quick Pop", emoji: "🎈", description: "Short and sweet" },
    squeaky: { name: "Squeaky Door", emoji: "🚪", description: "High-pitched and silly" },
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
    ;(window as any).playSpotFart = (spotId: string) => {
      playFartSound()
      console.log(`Playing fart for spot ${spotId}! 💨`)
    }
  }, [selectedFartSound])

  const playFartSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      const generateFartSound = (type: string) => {
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        switch (type) {
          case "classic":
            oscillator.frequency.setValueAtTime(80, audioContext.currentTime)
            oscillator.frequency.exponentialRampToValueAtTime(40, audioContext.currentTime + 0.3)
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
            oscillator.start(audioContext.currentTime)
            oscillator.stop(audioContext.currentTime + 0.3)
            break
          case "quick":
            oscillator.frequency.setValueAtTime(120, audioContext.currentTime)
            oscillator.frequency.exponentialRampToValueAtTime(60, audioContext.currentTime + 0.1)
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
            oscillator.start(audioContext.currentTime)
            oscillator.stop(audioContext.currentTime + 0.1)
            break
          case "squeaky":
            oscillator.frequency.setValueAtTime(200, audioContext.currentTime)
            oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.2)
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
            oscillator.start(audioContext.currentTime)
            oscillator.stop(audioContext.currentTime + 0.2)
            break
        }
      }

      generateFartSound(selectedFartSound)
    } catch (error) {
      console.log("Audio context not available, but fart sound would play! 💨")
    }
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
      playFartSound()

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
        alert(`📍 SPOT MARKED!

*${fartSounds[selectedFartSound as keyof typeof fartSounds].emoji}* 

Real GPS Location: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}
Accuracy: ±${location.accuracy?.toFixed(0)}m

FART SOUND DEPLOYED! 💨`)
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6">
          <h1 className="text-3xl font-bold text-gray-800">Mark This Spot</h1>
          <button
            onClick={() => setShowMarkerPicker(!showMarkerPicker)}
            className="px-4 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm font-medium text-gray-700 hover:text-blue-600"
          >
            🎯 {selectedMarker.charAt(0).toUpperCase() + selectedMarker.slice(1)} Style
          </button>
        </div>

        {/* Location Error Display */}
        {locationError && (
          <div className="mx-6 mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center">
              <span className="text-red-500 mr-2">⚠️</span>
              <span className="text-red-700 text-sm">{locationError}</span>
            </div>
          </div>
        )}

        {/* Marker Picker */}
        {showMarkerPicker && isClient && (
          <div className="mx-6 mb-6">
            <MarkerSelector
              selectedMarker={selectedMarker}
              onMarkerSelect={(marker) => {
                setSelectedMarker(marker)
                setShowMarkerPicker(false)
              }}
            />
          </div>
        )}

        {/* Sound Picker - Always Visible */}
        <div className="mx-6 mb-6 bg-white rounded-xl shadow-lg p-4 border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-3">Choose Your Fart Sound:</h3>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(fartSounds).map(([key, sound]) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedFartSound(key)
                  playFartSound()
                }}
                className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                  selectedFartSound === key
                    ? "border-blue-500 bg-blue-50 text-blue-800"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{sound.emoji}</span>
                  <span className="font-medium text-sm">{sound.name}</span>
                </div>
                <div className="text-xs text-gray-600">{sound.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Button Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="relative">
            {/* Pulsing glow rings */}
            <div className="absolute inset-0 rounded-full bg-blue-400 opacity-20 animate-ping scale-110"></div>
            <div className="absolute inset-0 rounded-full bg-blue-500 opacity-30 animate-pulse scale-105"></div>

            {/* Main button */}
            <button
              onClick={markSpot}
              disabled={isMarking || locationLoading}
              className={`relative w-72 h-72 rounded-full flex flex-col items-center justify-center text-white font-bold text-2xl shadow-2xl transition-all duration-300 transform ${
                isMarking || locationLoading
                  ? "bg-gradient-to-br from-gray-400 to-gray-500 scale-95"
                  : "bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 hover:scale-105 active:scale-95 hover:shadow-3xl"
              }`}
              style={{
                boxShadow:
                  isMarking || locationLoading
                    ? "0 10px 30px rgba(0,0,0,0.2)"
                    : "0 20px 60px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(255,255,255,0.1) inset",
                background:
                  isMarking || locationLoading
                    ? undefined
                    : "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #1e40af 100%)",
              }}
            >
              {/* Button content */}
              {isMarking || locationLoading ? (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
                  <div className="text-xl">{isMarking ? "Marking..." : "Getting GPS..."}</div>
                  <div className="text-sm opacity-80 mt-2">Preparing fart deployment!</div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="text-7xl mb-4 animate-bounce">📍</div>
                  <div className="text-2xl font-black tracking-wide">MARK SPOT</div>
                  <div className="text-sm opacity-90 mt-3 text-center px-4">Real GPS + Epic Fart!</div>
                  <div className="text-lg mt-2">{fartSounds[selectedFartSound as keyof typeof fartSounds].emoji}</div>
                </div>
              )}

              {/* Shine effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white to-transparent opacity-0 hover:opacity-10 transition-opacity duration-500 transform -skew-x-12"></div>
            </button>
          </div>

          <p className="text-gray-700 text-center mt-12 max-w-md text-lg leading-relaxed">
            <span className="font-semibold text-blue-600">REAL GPS LOCATION TRACKING!</span>
            <br />
            Now with Google Maps integration + fart sounds! 💨
          </p>
        </div>

        {/* Bottom Navigation */}
        <div className="flex border-t border-gray-200 bg-white/80 backdrop-blur-sm">
          <button
            onClick={() => setActiveTab("mark")}
            className="flex-1 p-4 bg-blue-100 text-blue-800 font-semibold text-sm border-t-2 border-blue-500"
          >
            🎯 Mark Spot
          </button>
          <button
            onClick={() => setActiveTab("map")}
            className="flex-1 p-4 bg-white text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
          >
            🗺️ Map View ({spots.length})
          </button>
          <button
            onClick={() => setActiveTab("spots")}
            className="flex-1 p-4 bg-white text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
        <div className="p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Live Fart Map 🗺️💨</h1>
          <p className="text-gray-600">{spots.length} real GPS locations with epic fart sounds!</p>
        </div>

        <div className="flex-1 p-6">
          <GoogleMap
            spots={spots}
            center={userLocation || undefined}
            selectedMarker={selectedMarker}
            onSpotClick={(spot) => {
              console.log("Clicked spot:", spot)
              playFartSound()
            }}
          />

          {spots.length === 0 && (
            <div className="text-center mt-8 p-8 bg-white rounded-xl shadow-sm">
              <div className="text-6xl mb-4">🗺️</div>
              <h2 className="text-xl font-semibold mb-2">No spots on the map yet!</h2>
              <p className="text-gray-600">Go mark some spots to see them appear here with fart sounds! 💨</p>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="flex border-t border-gray-200 bg-white/80 backdrop-blur-sm">
          <button
            onClick={() => setActiveTab("mark")}
            className="flex-1 p-4 bg-white text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
          >
            🎯 Mark Spot
          </button>
          <button
            onClick={() => setActiveTab("map")}
            className="flex-1 p-4 bg-blue-100 text-blue-800 font-semibold text-sm border-t-2 border-blue-500"
          >
            🗺️ Map View ({spots.length})
          </button>
          <button
            onClick={() => setActiveTab("spots")}
            className="flex-1 p-4 bg-white text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
          >
            📍 My Spots ({spots.length})
          </button>
        </div>
      </div>
    )
  }

  // Spots List View
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Your Spots</h1>
        <p className="text-gray-600">{spots.length} real locations saved (with fart sounds! 💨)</p>
      </div>

      <div className="flex-1 p-6">
        {spots.length === 0 ? (
          <div className="text-center p-12 text-gray-600 bg-white rounded-xl shadow-sm">
            <div className="text-8xl mb-6">📍</div>
            <h2 className="text-2xl font-semibold mb-4">No spots marked yet</h2>
            <p className="text-lg">Go back and start marking places!</p>
            <p className="text-sm text-blue-600 mt-2">Real GPS locations with fart sounds! 💨</p>
          </div>
        ) : (
          <div className="space-y-4">
            {spots.map((spot) => (
              <div
                key={spot.id}
                className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow border border-gray-100"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <span className="mr-3 text-xl">📍</span>
                      <strong className="text-gray-800 text-lg">{spot.address}</strong>
                    </div>
                    <div className="text-gray-600 mb-3 flex items-center">
                      <span className="mr-2">🕒</span>
                      {new Date(spot.timestamp).toLocaleString()}
                    </div>
                    <div className="text-gray-400 text-sm font-mono bg-gray-50 px-3 py-1 rounded mb-3">
                      📍 {spot.latitude.toFixed(6)}, {spot.longitude.toFixed(6)}
                    </div>
                    <button
                      onClick={playFartSound}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                    >
                      💨 Replay Fart Sound
                    </button>
                  </div>
                  <button
                    onClick={() => setActiveTab("map")}
                    className="p-3 rounded-xl bg-blue-100 hover:bg-blue-200 transition-colors text-2xl"
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
      <div className="flex border-t border-gray-200 bg-white/80 backdrop-blur-sm">
        <button
          onClick={() => setActiveTab("mark")}
          className="flex-1 p-4 bg-white text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
        >
          🎯 Mark Spot
        </button>
        <button
          onClick={() => setActiveTab("map")}
          className="flex-1 p-4 bg-white text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
        >
          🗺️ Map View ({spots.length})
        </button>
        <button
          onClick={() => setActiveTab("spots")}
          className="flex-1 p-4 bg-blue-100 text-blue-800 font-semibold text-sm border-t-2 border-blue-500"
        >
          📍 My Spots ({spots.length})
        </button>
      </div>
    </div>
  )
}
