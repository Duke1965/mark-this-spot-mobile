"use client"

import { useState, useRef, useCallback, useMemo } from "react"
import { Camera, Sparkles, Book, Mic, MicOff, X } from "lucide-react"
import { useLocationServices } from "@/hooks/useLocationServices"
import { usePinStorage } from "@/hooks/usePinStorage"
import { LocationDisplay } from "@/components/LocationDisplay"
import { ReliableCamera } from "@/components/reliable-camera"
import { EnhancedAudio, type EnhancedAudioRef } from "@/components/enhanced-audio"
import { AutoTitleGenerator } from "@/components/AutoTitleGenerator"
import { PinStoryMode } from "@/components/PinStoryMode"
import { CanvasEditor } from "@/components/advanced-editor/canvas-editor"
import { EffectsPanel } from "@/components/advanced-editor/effects-panel"
import { StickersPanel } from "@/components/advanced-editor/stickers-panel"
import { VideoEditor } from "@/components/advanced-editor/video-editor"
import { ExportHub } from "@/components/advanced-editor/export-hub"
import { EditorWelcome } from "@/components/advanced-editor/editor-welcome"

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

export default function Home() {
  // State
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<MediaType>("photo")
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [mode, setMode] = useState<"capture" | "story" | "edit">("capture")
  const [currentTitle, setCurrentTitle] = useState<string>("")
  const [effects, setEffects] = useState<string[]>([])
  const [stickers, setStickers] = useState<any[]>([])
  const [canvasData, setCanvasData] = useState<any>(null)
  const [currentStory, setCurrentStory] = useState<any>(null)
  const [advancedEditTool, setAdvancedEditTool] = useState<
    "welcome" | "canvas" | "effects" | "stickers" | "video" | "export"
  >("welcome")

  // Refs
  const audioRef = useRef<EnhancedAudioRef>(null)

  // Custom hooks
  const { location, isLoading } = useLocationServices()
  const { pins, addPin } = usePinStorage()

  // Memoized handlers to prevent unnecessary re-renders
  const handlePhotoCapture = useCallback((photoUrl: string) => {
    setMediaUrl(photoUrl)
    setMediaType("photo")
  }, [])

  const handleVideoCapture = useCallback((videoUrl: string) => {
    setMediaUrl(videoUrl)
    setMediaType("video")
  }, [])

  const handleAudioRecorded = useCallback((url: string) => {
    setAudioUrl(url)
  }, [])

  const resetCapture = useCallback(() => {
    setMediaUrl(null)
    setAudioUrl(null)
    setCurrentTitle("")
    setEffects([])
    setStickers([])
    setCanvasData(null)
  }, [])

  const createPin = useCallback(async (): Promise<PinData | null> => {
    if (!mediaUrl || !location) return null

    const newPin: PinData = {
      id: `pin-${Date.now()}`,
      title: currentTitle || `${mediaType === "photo" ? "Photo" : "Video"} from ${location.name}`,
      mediaUrl,
      mediaType,
      location: location.name,
      coordinates: { lat: location.latitude, lng: location.longitude },
      timestamp: Date.now(),
      audioUrl: audioUrl || undefined,
      effects,
      stickers,
      canvasData,
    }

    addPin(newPin)
    resetCapture()
    return newPin
  }, [mediaUrl, location, currentTitle, mediaType, audioUrl, effects, stickers, canvasData, addPin, resetCapture])

  const toggleAudioRecording = useCallback(() => {
    if (isRecording) {
      audioRef.current?.stopRecording()
    } else {
      audioRef.current?.startRecording()
    }
    setIsRecording(!isRecording)
  }, [isRecording])

  const switchToStoryMode = useCallback(() => {
    setMode("story")
    resetCapture()
  }, [resetCapture])

  const switchToCaptureMode = useCallback(() => {
    setMode("capture")
    resetCapture()
  }, [resetCapture])

  const switchToEditMode = useCallback(() => {
    setMode("edit")
  }, [])

  const handleToolSelect = useCallback((tool: "canvas" | "effects" | "stickers" | "video" | "export") => {
    setAdvancedEditTool(tool)
  }, [])

  const generatePostcard = useCallback(async () => {
    if (!mediaUrl) return null
    return mediaUrl
  }, [mediaUrl])

  const handleAddPinToStory = useCallback((pin: PinData) => {
    setCurrentStory((prev: any) => {
      if (!prev) {
        return {
          id: `story-${Date.now()}`,
          title: "My Story",
          pins: [pin],
          createdAt: Date.now(),
          isPublic: false,
        }
      }

      return {
        ...prev,
        pins: [...prev.pins, pin],
      }
    })
  }, [])

  // Memoized components to prevent unnecessary re-renders
  const cameraComponent = useMemo(
    () => (
      <ReliableCamera
        onPhotoCapture={handlePhotoCapture}
        onVideoCapture={handleVideoCapture}
        isRecording={isRecording}
      />
    ),
    [handlePhotoCapture, handleVideoCapture, isRecording],
  )

  return (
    <main className="flex flex-col h-screen bg-black text-white overflow-hidden">
      {/* App Header */}
      <header className="bg-black/80 p-4 pb-6 flex justify-between items-center z-10 min-h-[80px]">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-r from-purple-600 to-blue-500 p-2 rounded-lg">
            <Camera size={24} />
          </div>
          <h1 className="text-xl font-bold">PINIT</h1>
        </div>

        <div className="flex items-center gap-4">
          {mode === "capture" && <LocationDisplay location={location} isLoading={isLoading} />}

          {mode === "capture" && (
            <button
              onClick={switchToStoryMode}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title="Story Mode"
            >
              <Book size={20} />
            </button>
          )}

          {mode === "story" && (
            <button
              onClick={switchToCaptureMode}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title="Capture Mode"
            >
              <Camera size={20} />
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      {mode === "capture" && (
        <div className="flex-1 relative">
          {/* Camera View */}
          {!mediaUrl && cameraComponent}

          {/* Audio Recording */}
          <EnhancedAudio ref={audioRef} onAudioRecorded={handleAudioRecorded} isRecording={isRecording} />

          {/* Audio Control Button */}
          {!mediaUrl && (
            <button
              onMouseDown={toggleAudioRecording}
              onMouseUp={toggleAudioRecording}
              onTouchStart={toggleAudioRecording}
              onTouchEnd={toggleAudioRecording}
              className={`absolute bottom-32 right-4 p-4 rounded-full transition-all z-10 ${
                isRecording ? "bg-red-500 scale-110" : "bg-white/20 hover:bg-white/30"
              }`}
              title="Hold to record audio"
            >
              {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
          )}

          {/* Title Generator */}
          {mediaUrl && (
            <AutoTitleGenerator
              mediaUrl={mediaUrl}
              location={location?.name}
              mediaType={mediaType}
              onTitleGenerated={setCurrentTitle}
            />
          )}

          {/* Media Preview & Pin Creation */}
          {mediaUrl && (
            <div className="absolute inset-0 flex flex-col">
              {/* Preview */}
              <div className="flex-1 flex items-center justify-center bg-black">
                {mediaType === "photo" ? (
                  <img
                    src={mediaUrl || "/placeholder.svg"}
                    alt="Captured"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <video src={mediaUrl} className="max-w-full max-h-full object-contain" controls autoPlay muted />
                )}
              </div>

              {/* Actions */}
              <div className="bg-black/90 p-4 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-800">
                    {mediaType === "photo" ? (
                      <img src={mediaUrl || "/placeholder.svg"} alt="Captured" className="w-full h-full object-cover" />
                    ) : (
                      <video src={mediaUrl} className="w-full h-full object-cover" muted />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="font-bold">{mediaType === "photo" ? "📸 Photo" : "🎥 Video"} Captured</div>
                    {audioUrl && (
                      <div className="text-sm opacity-80 flex items-center gap-1">
                        🎵 Audio recorded
                        <audio src={audioUrl} controls className="h-6 w-24" />
                      </div>
                    )}
                    <div className="text-xs opacity-60">
                      {location ? `📍 ${location.name}` : "Location unavailable"}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={createPin}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    Save Pin
                  </button>

                  <button
                    onClick={switchToEditMode}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Sparkles size={20} />
                    Edit
                  </button>

                  <button
                    onClick={resetCapture}
                    className="bg-white/20 hover:bg-white/30 text-white py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Story Mode */}
      {mode === "story" && (
        <PinStoryMode
          currentStory={currentStory}
          savedPins={pins}
          onAddPin={handleAddPinToStory}
          onBackToCapture={switchToCaptureMode}
          onCreatePin={createPin}
        />
      )}

      {/* Edit Mode */}
      {mode === "edit" && mediaUrl && (
        <>
          {advancedEditTool === "welcome" && (
            <EditorWelcome
              onToolSelect={handleToolSelect}
              mediaType={mediaType}
              locationName={location?.name || "Unknown Location"}
            />
          )}

          {advancedEditTool === "canvas" && (
            <CanvasEditor
              mediaUrl={mediaUrl}
              mediaType={mediaType}
              onCanvasChange={setCanvasData}
              onBack={() => setAdvancedEditTool("welcome")}
            />
          )}

          {advancedEditTool === "effects" && (
            <EffectsPanel
              mediaUrl={mediaUrl}
              mediaType={mediaType}
              currentEffects={effects}
              onEffectsChange={setEffects}
              onBack={() => setAdvancedEditTool("welcome")}
            />
          )}

          {advancedEditTool === "stickers" && (
            <StickersPanel
              onStickersChange={setStickers}
              currentStickers={stickers}
              onBack={() => setAdvancedEditTool("welcome")}
            />
          )}

          {advancedEditTool === "video" && mediaType === "video" && (
            <VideoEditor
              videoUrl={mediaUrl}
              onVideoChange={setMediaUrl}
              onBack={() => setAdvancedEditTool("welcome")}
            />
          )}

          {advancedEditTool === "export" && (
            <ExportHub
              generatePostcard={generatePostcard}
              postcardData={{
                mediaUrl,
                mediaType,
                location: location?.name,
                effects,
                stickers,
                canvasData,
              }}
            />
          )}
        </>
      )}
    </main>
  )
}
