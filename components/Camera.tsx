"use client"

import { useState, useCallback } from "react"
import { CameraIcon, Video, RotateCcw } from "lucide-react"

interface CameraProps {
  onPhotoCapture: (photoUrl: string) => void
  onVideoCapture: (videoUrl: string) => void
}

export function Camera({ onPhotoCapture, onVideoCapture }: CameraProps) {
  const [isVideoMode, setIsVideoMode] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  // Simulate camera capture for demo
  const handleCapture = useCallback(() => {
    if (isVideoMode) {
      if (isRecording) {
        setIsRecording(false)
        onVideoCapture("/placeholder.svg?height=400&width=600&text=Video+Captured")
      } else {
        setIsRecording(true)
        // Auto-stop after 3 seconds for demo
        setTimeout(() => {
          setIsRecording(false)
          onVideoCapture("/placeholder.svg?height=400&width=600&text=Video+Captured")
        }, 3000)
      }
    } else {
      onPhotoCapture("/placeholder.svg?height=400&width=600&text=Photo+Captured")
    }
  }, [isVideoMode, isRecording, onPhotoCapture, onVideoCapture])

  return (
    <div className="flex-1 relative bg-black/20 flex items-center justify-center">
      {/* Camera Preview Placeholder */}
      <div className="w-full h-full flex items-center justify-center flex-col gap-4 text-white">
        <div className="text-6xl">📷</div>
        <h1 className="text-3xl font-bold">PINIT Enhanced</h1>
        <p className="text-center max-w-sm opacity-80">Mobile-first location-based media capture and storytelling</p>
      </div>

      {/* Camera Controls */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
        {/* Mode Toggle */}
        <button
          onClick={() => setIsVideoMode(!isVideoMode)}
          className={`p-3 rounded-full transition-colors ${isVideoMode ? "bg-red-500" : "bg-white/20"}`}
          title={isVideoMode ? "Switch to Photo" : "Switch to Video"}
        >
          {isVideoMode ? <CameraIcon size={24} /> : <Video size={24} />}
        </button>

        {/* Capture Button */}
        <button
          onClick={handleCapture}
          className={`w-20 h-20 rounded-full border-4 transition-all ${
            isRecording
              ? "bg-red-500 border-red-400 scale-90"
              : isVideoMode
                ? "bg-red-500 border-white"
                : "bg-white border-gray-300"
          }`}
          title={isVideoMode ? (isRecording ? "Stop Recording" : "Start Recording") : "Take Photo"}
        >
          {isVideoMode && isRecording && <div className="w-6 h-6 bg-white rounded-sm mx-auto" />}
        </button>

        {/* Flip Camera (placeholder) */}
        <button className="p-3 rounded-full bg-white/20" title="Flip Camera">
          <RotateCcw size={24} />
        </button>
      </div>

      {/* Recording Indicator */}
      {isRecording && (
        <div className="absolute top-8 left-4 flex items-center gap-2 bg-red-500 px-3 py-1 rounded-full">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-white text-sm font-bold">REC</span>
        </div>
      )}
    </div>
  )
}
