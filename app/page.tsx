"use client"

import { useState, useCallback } from "react"
import { Camera } from "@/components/Camera"
import { LocationDisplay } from "@/components/LocationDisplay"
import { AudioRecorder } from "@/components/AudioRecorder"
import { PinManager } from "@/components/PinManager"
import { AIAssistant } from "@/components/AIAssistant"
import { StoryMode } from "@/components/StoryMode"
import { AdvancedEditor } from "@/components/AdvancedEditor"
import { useLocationServices } from "@/hooks/useLocationServices"
import { usePinStorage } from "@/hooks/usePinStorage"
import { Sparkles, BookOpen, Edit3 } from "lucide-react"

export type AppMode = "capture" | "story" | "editor"
export type MediaType = "photo" | "video"

export interface PinData {
  id: string
  title: string
  mediaUrl: string
  mediaType: MediaType
  location: string
  coordinates: { lat: number; lng: number }
  timestamp: number
  audioUrl?: string
  effects: string[]
  stickers: any[]
  canvasData: any
}

export default function PINITApp() {
  // Core state
  const [mode, setMode] = useState<AppMode>("capture")
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<MediaType>("photo")
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [currentPin, setCurrentPin] = useState<PinData | null>(null)

  // UI state
  const [showAI, setShowAI] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  // Editor state
  const [effects, setEffects] = useState<string[]>([])
  const [stickers, setStickers] = useState<any[]>([])
  const [canvasData, setCanvasData] = useState<any>({})

  // Hooks
  const { location, isLoading: locationLoading } = useLocationServices()
  const { pins, addPin, removePin, clearPins } = usePinStorage()

  // Media capture handlers
  const handlePhotoCapture = useCallback((photoUrl: string) => {
    setMediaUrl(photoUrl)
    setMediaType("photo")
    console.log("📸 Photo captured")
  }, [])

  const handleVideoCapture = useCallback((videoUrl: string) => {
    setMediaUrl(videoUrl)
    setMediaType("video")
    console.log("🎥 Video captured")
  }, [])

  const handleAudioRecorded = useCallback((audioUrl: string) => {
    setAudioUrl(audioUrl)
    console.log("🎵 Audio recorded")
  }, [])

  // Pin management
  const createPin = useCallback(async () => {
    if (!mediaUrl || !location) return null

    const newPin: PinData = {
      id: `pin-${Date.now()}`,
      title: `Pin at ${location.name}`,
      mediaUrl,
      mediaType,
      location: location.name,
      coordinates: { lat: location.latitude, lng: location.longitude },
      timestamp: Date.now(),
      audioUrl,
      effects,
      stickers,
      canvasData,
    }

    addPin(newPin)
    setCurrentPin(newPin)
    return newPin
  }, [mediaUrl, location, mediaType, audioUrl, effects, stickers, canvasData, addPin])

  const resetCapture = useCallback(() => {
    setMediaUrl(null)
    setAudioUrl(null)
    setEffects([])
    setStickers([])
    setCanvasData({})
    setCurrentPin(null)
    setMode("capture")
  }, [])

  // AI Assistant commands
  const handleAICommand = useCallback(
    (command: string) => {
      const cmd = command.toLowerCase()

      if (cmd.includes("photo") || cmd.includes("picture")) {
        // Simulate photo capture
        handlePhotoCapture("/placeholder.svg?height=400&width=600&text=Photo")
      } else if (cmd.includes("video") || cmd.includes("record")) {
        // Simulate video capture
        handleVideoCapture("/placeholder.svg?height=400&width=600&text=Video")
      } else if (cmd.includes("story")) {
        setMode("story")
      } else if (cmd.includes("edit")) {
        if (mediaUrl) setMode("editor")
      }

      setShowAI(false)
    },
    [handlePhotoCapture, handleVideoCapture, mediaUrl],
  )

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="bg-black/80 p-4 flex justify-between items-center z-10">
        <LocationDisplay location={location} isLoading={locationLoading} />

        <div className="flex gap-2">
          <button
            onClick={() => setMode("story")}
            className={`p-2 rounded-lg transition-colors ${
              mode === "story" ? "bg-green-500" : "bg-white/20 hover:bg-white/30"
            }`}
            title="Story Mode"
          >
            <BookOpen size={20} />
          </button>

          {mediaUrl && (
            <button
              onClick={() => setMode("editor")}
              className={`p-2 rounded-lg transition-colors ${
                mode === "editor" ? "bg-purple-500" : "bg-white/20 hover:bg-white/30"
              }`}
              title="Advanced Editor"
            >
              <Edit3 size={20} />
            </button>
          )}

          <button
            onClick={() => setShowAI(!showAI)}
            className={`p-2 rounded-lg transition-colors ${showAI ? "bg-green-500" : "bg-white/20 hover:bg-white/30"}`}
            title="AI Assistant"
          >
            <Sparkles size={20} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative">
        {mode === "capture" && (
          <>
            <Camera onPhotoCapture={handlePhotoCapture} onVideoCapture={handleVideoCapture} />

            <AudioRecorder
              onAudioRecorded={handleAudioRecorded}
              isRecording={isRecording}
              setIsRecording={setIsRecording}
            />

            <PinManager
              mediaUrl={mediaUrl}
              mediaType={mediaType}
              audioUrl={audioUrl}
              onCreatePin={createPin}
              onReset={resetCapture}
              pins={pins}
            />
          </>
        )}

        {mode === "story" && (
          <StoryMode pins={pins} onBackToCapture={() => setMode("capture")} onCreatePin={createPin} />
        )}

        {mode === "editor" && mediaUrl && (
          <AdvancedEditor
            mediaUrl={mediaUrl}
            mediaType={mediaType}
            location={location?.name || "Unknown Location"}
            onBack={() => setMode("capture")}
            onEffectsChange={setEffects}
            onStickersChange={setStickers}
            onCanvasChange={setCanvasData}
          />
        )}
      </div>

      {/* AI Assistant */}
      {showAI && <AIAssistant onCommand={handleAICommand} onClose={() => setShowAI(false)} />}

      {/* Stats */}
      {pins.length > 0 && (
        <div className="absolute top-20 right-4 bg-black/80 text-white px-3 py-1 rounded-full text-sm font-bold z-10">
          📌 {pins.length} Pin{pins.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  )
}
