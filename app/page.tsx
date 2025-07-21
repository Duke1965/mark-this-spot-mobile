"use client"

import { useState } from "react"
import { MapPin, Camera, VolumeX, Volume2, Navigation } from "lucide-react"

export default function Home() {
  const [isMuted, setIsMuted] = useState(false)

  return (
    <main className="flex flex-col h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 text-white overflow-hidden">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm p-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-red-500 to-pink-500 p-2 rounded-lg">
            <MapPin size={24} />
          </div>
          <h1 className="text-2xl font-bold">PINIT</h1>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        {/* Circular Map Container */}
        <div className="relative w-[85vw] max-w-[400px] h-[85vw] max-h-[400px]">
          <div className="absolute inset-0 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl bg-gradient-to-br from-blue-500 to-purple-600">
            <div className="w-full h-full flex items-center justify-center text-white">
              <div className="text-center">
                <div className="text-4xl mb-2">🗺️</div>
                <div className="text-sm">Loading Maps...</div>
              </div>
            </div>
          </div>

          {/* Pulse Animation Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-blue-400/50 animate-ping" />

          {/* Location Crosshair */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="w-8 h-8 relative">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 transform -translate-y-1/2" />
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-red-500 transform -translate-x-1/2" />
              <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-red-500 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        {/* Location Name */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-white">
            <MapPin size={16} className="text-red-500" />
            <span className="text-lg font-semibold">Getting location...</span>
          </div>
          <div className="text-sm text-white/70 mt-1">Enable location services for full experience</div>
        </div>

        {/* Main PIN IT Button */}
        <button
          onClick={() => alert("📍 Location pinned! (Demo mode)")}
          className="mt-8 px-8 py-4 rounded-2xl font-bold text-lg bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 transform"
        >
          📍 PIN THIS SPOT!
        </button>

        {/* Secondary Actions */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => alert("📷 Camera coming soon!")}
            className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            title="Take Photo/Video"
          >
            <Camera size={24} className="text-white" />
          </button>

          <button
            onClick={() => alert("📚 Library coming soon!")}
            className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors relative"
            title="View Saved Pins"
          >
            <Navigation size={24} className="text-white" />
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              0
            </div>
          </button>
        </div>

        {/* Quick Stats */}
        <div className="mt-4 text-center text-white/60 text-sm">Ready to start discovering amazing places!</div>
      </div>

      {/* Development Info */}
      <div className="fixed bottom-4 left-4 bg-black/50 text-white p-2 rounded text-xs">
        PINIT Demo Mode | Next.js 15 | Ready to explore! 🚀
      </div>
    </main>
  )
}
