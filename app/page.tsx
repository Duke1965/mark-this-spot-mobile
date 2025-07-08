"use client"

import { useEffect, useState } from "react"
import { useLocationServices } from "./hooks/useLocationServices"
import { reverseGeocode } from "./utils/geocoding"
import { playFartSound } from "./utils/audio"
import { Volume2, VolumeX, Library, Settings } from "lucide-react"

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
  const [isMarking, setIsMarking] = useState(false)
  const [selectedFartSound, setSelectedFartSound] = useState("classic")
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedMarker, setSelectedMarker] = useState("pin")
  const [isClient, setIsClient] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentScreen, setCurrentScreen] = useState("main") // main, libraries, settings, map, spots

  useEffect(() => {
    setIsClient(true)
  }, [])

  const { getCurrentLocation, isLoading: locationLoading, error: locationError } = useLocationServices()

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
      if (!isMuted) {
        await playFartSound(selectedFartSound as any)
      }
      console.log(`Playing fart for spot ${spotId}! 💨`)
    }
  }, [selectedFartSound, isMuted])

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

      // Play the fart sound (if not muted)!
      if (!isMuted) {
        await playFartSound(selectedFartSound as any)
      }

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
        const muteStatus = isMuted ? "🔇 MUTED" : "💨 EPIC FART DEPLOYED!"
        alert(`📍 LEGENDARY SPOT MARKED!

${muteStatus}

📍 Real GPS: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}
🎯 Accuracy: ±${location.accuracy?.toFixed(0)}m
🎨 Marker Style: ${selectedMarker.toUpperCase()}

${isMuted ? "🔇 Sound is muted" : "💨 LEGENDARY FART SOUND ACTIVATED!"}`)
      }, 100)
    } catch (error) {
      console.error("Error marking spot:", error)
      alert("❌ Failed to mark spot!\n\nPlease check your location permissions and try again.")
    } finally {
      setIsMarking(false)
    }
  }

  // Main Screen - Minimalist Shazam Style
  if (currentScreen === "main") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex flex-col relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-32 h-32 bg-blue-400 rounded-full opacity-10 animate-pulse"></div>
          <div
            className="absolute bottom-40 right-20 w-48 h-48 bg-indigo-400 rounded-full opacity-10 animate-pulse"
            style={{ animationDelay: "2s" }}
          ></div>
          <div
            className="absolute top-1/2 left-10 w-24 h-24 bg-purple-400 rounded-full opacity-10 animate-pulse"
            style={{ animationDelay: "4s" }}
          ></div>
        </div>

        {/* Top Right - Mute Button */}
        <div className="absolute top-8 right-8 z-20">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 ${
              isMuted
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white"
            }`}
          >
            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
          </button>
        </div>

        {/* Main Content - Big Button */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
          {/* Location Error Display */}
          {locationError && (
            <div className="mb-8 bg-red-500/20 backdrop-blur-sm border-2 border-red-400/50 rounded-2xl p-4 shadow-xl max-w-md">
              <div className="flex items-center text-white">
                <span className="mr-3 text-xl">⚠️</span>
                <div>
                  <div className="font-bold">Location Error</div>
                  <div className="text-sm opacity-90">{locationError}</div>
                </div>
              </div>
            </div>
          )}

          {/* Big Pulsating Button */}
          <div className="relative mb-12">
            {/* Pulsing glow rings */}
            <div className="absolute inset-0 rounded-full bg-blue-400 opacity-30 animate-ping scale-110"></div>
            <div
              className="absolute inset-0 rounded-full bg-blue-500 opacity-40 animate-pulse scale-105"
              style={{ animationDelay: "0.5s" }}
            ></div>
            <div
              className="absolute inset-0 rounded-full bg-indigo-400 opacity-20 animate-ping scale-120"
              style={{ animationDelay: "1s" }}
            ></div>

            {/* Main button */}
            <button
              onClick={markSpot}
              disabled={isMarking || locationLoading}
              className={`relative w-80 h-80 rounded-full flex flex-col items-center justify-center text-white font-bold text-2xl shadow-2xl transition-all duration-300 transform ${
                isMarking || locationLoading
                  ? "bg-gradient-to-br from-gray-600 to-gray-700 scale-95"
                  : "bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 hover:scale-105 active:scale-95 hover:shadow-3xl"
              }`}
              style={{
                boxShadow:
                  isMarking || locationLoading
                    ? "0 10px 30px rgba(0,0,0,0.3)"
                    : "0 25px 80px rgba(59, 130, 246, 0.5), 0 0 0 1px rgba(255,255,255,0.1) inset",
              }}
            >
              {/* Button content */}
              {isMarking || locationLoading ? (
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 border-4 border-white border-t-transparent rounded-full animate-spin mb-6"></div>
                  <div className="text-2xl font-black">{isMarking ? "MARKING..." : "GETTING GPS..."}</div>
                  <div className="text-sm opacity-80 mt-3">
                    {isMuted ? "Preparing silent deployment!" : "Preparing epic fart deployment!"}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="text-8xl mb-6 animate-bounce">📍</div>
                  <div className="text-3xl font-black tracking-wide mb-2">MARK SPOT</div>
                  <div className="text-sm opacity-90 text-center px-4 mb-3">
                    {isMuted ? "Silent GPS Tracking" : "Real GPS + Epic Fart!"}
                  </div>
                  <div className="text-2xl">{isMuted ? "🔇" : "💨"}</div>
                </div>
              )}

              {/* Shine effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white to-transparent opacity-0 hover:opacity-10 transition-opacity duration-500 transform -skew-x-12"></div>
            </button>
          </div>

          {/* App Title */}
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-black text-white mb-4 bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
              Mark This Spot
            </h1>
            <p className="text-white/80 text-lg leading-relaxed mb-2">
              <span className="font-bold">Like Shazam, but for places!</span>
            </p>
            <p className="text-white/60 text-sm">
              {spots.length} {spots.length === 1 ? "spot" : "spots"} marked • Real GPS tracking
            </p>
          </div>
        </div>

        {/* Bottom Left - Libraries Button */}
        <div className="absolute bottom-8 left-8 z-20">
          <button
            onClick={() => setCurrentScreen("libraries")}
            className="flex items-center gap-3 px-6 py-4 bg-white/20 backdrop-blur-sm rounded-2xl shadow-2xl text-white hover:bg-white/30 transition-all duration-300 transform hover:scale-105"
          >
            <Library size={24} />
            <span className="font-semibold">Libraries</span>
          </button>
        </div>

        {/* Bottom Right - Settings Button */}
        <div className="absolute bottom-8 right-8 z-20">
          <button
            onClick={() => setCurrentScreen("settings")}
            className="flex items-center gap-3 px-6 py-4 bg-white/20 backdrop-blur-sm rounded-2xl shadow-2xl text-white hover:bg-white/30 transition-all duration-300 transform hover:scale-105"
          >
            <Settings size={24} />
            <span className="font-semibold">Settings</span>
          </button>
        </div>

        {/* Mute Status Indicator */}
        {isMuted && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-20">
            <div className="bg-red-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-bold shadow-xl">
              🔇 Sound Muted
            </div>
          </div>
        )}
      </div>
    )
  }

  // Libraries Screen (Placeholder)
  if (currentScreen === "libraries") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 flex flex-col">
        <div className="p-6 bg-white/10 backdrop-blur-sm border-b border-white/20">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-black text-white">Libraries</h1>
            <button
              onClick={() => setCurrentScreen("main")}
              className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-300"
            >
              ← Back
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 text-center">
          <div className="text-6xl mb-6">📚</div>
          <h2 className="text-2xl font-bold text-white mb-4">Coming Soon!</h2>
          <p className="text-white/80">Fart sounds, pin icons, and postcard templates will be here.</p>
        </div>
      </div>
    )
  }

  // Settings Screen (Placeholder)
  if (currentScreen === "settings") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 flex flex-col">
        <div className="p-6 bg-white/10 backdrop-blur-sm border-b border-white/20">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-black text-white">Settings</h1>
            <button
              onClick={() => setCurrentScreen("main")}
              className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all duration-300"
            >
              ← Back
            </button>
          </div>
        </div>

        <div className="flex-1 p-6">
          <div className="space-y-6">
            {/* Mute Setting */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Sound</h3>
                  <p className="text-white/70">Enable or disable all app sounds</p>
                </div>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-3 rounded-full transition-all duration-300 ${
                    isMuted ? "bg-red-500 text-white" : "bg-green-500 text-white"
                  }`}
                >
                  {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                </button>
              </div>
            </div>

            {/* Placeholder for other settings */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">More Settings Coming Soon!</h3>
              <p className="text-white/70">Background colors, volume control, brightness, and more.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Fallback
  return null
}
