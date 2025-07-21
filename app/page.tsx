"use client"

import { useState, useCallback } from "react"
import { Camera, Video, Grid3X3 } from "lucide-react"

export default function Home() {
  const [activeMode, setActiveMode] = useState<"photo" | "video" | "library">("photo")

  const handlePinItTap = useCallback(() => {
    console.log("📍 PINIT tapped!")
    // This would trigger the pin creation flow
    alert("📍 Location pinned! (Demo mode)")
  }, [])

  const handleModeChange = useCallback((mode: "photo" | "video" | "library") => {
    setActiveMode(mode)
    console.log(`Switched to ${mode} mode`)
  }, [])

  return (
    <main className="flex flex-col h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative px-8">
        {/* Central PINIT Circle */}
        <div className="relative mb-16">
          {/* Outer Ring */}
          <div className="w-80 h-80 rounded-full border-2 border-white/30 flex items-center justify-center relative">
            {/* Inner Clickable Area */}
            <button
              onClick={handlePinItTap}
              className="w-64 h-64 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex flex-col items-center justify-center hover:bg-white/20 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <div className="text-sm font-medium text-white/80 mb-2">TAP TO</div>
              <div className="text-2xl font-bold text-white">PINIT</div>
            </button>

            {/* Pulse Animation */}
            <div className="absolute inset-0 rounded-full border border-white/20 animate-ping" />
          </div>
        </div>

        {/* Main Branding */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">PINIT</h1>
          <p className="text-lg text-white/80 font-medium">Pin It. Find It. Share It.</p>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-black/20 backdrop-blur-sm p-6">
        <div className="flex justify-center items-center gap-12">
          {/* Photo Button */}
          <button
            onClick={() => handleModeChange("photo")}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-300 ${
              activeMode === "photo"
                ? "bg-white/20 text-white scale-110"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            <Camera size={28} />
            <span className="text-sm font-medium">Photo</span>
          </button>

          {/* Video Button */}
          <button
            onClick={() => handleModeChange("video")}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-300 ${
              activeMode === "video"
                ? "bg-white/20 text-white scale-110"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            <Video size={28} />
            <span className="text-sm font-medium">Video</span>
          </button>

          {/* Pin Library Button */}
          <button
            onClick={() => handleModeChange("library")}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-300 ${
              activeMode === "library"
                ? "bg-white/20 text-white scale-110"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            <Grid3X3 size={28} />
            <span className="text-sm font-medium">Pin Library</span>
          </button>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="absolute top-4 left-4 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-white/80">
        {activeMode.charAt(0).toUpperCase() + activeMode.slice(1)} Mode
      </div>
    </main>
  )
}
