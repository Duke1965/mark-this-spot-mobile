"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Mic, MicOff, MapPin, Sparkles, BookOpen } from 'lucide-react'
import { useLocationServices } from "@/hooks/useLocationServices"
import { EnhancedAudio } from "@/utils/enhanced-audio"
import { ReliableCamera } from "@/components/reliable-camera"
import { EditorWelcome } from "@/components/advanced-editor/editor-welcome"
import { CanvasEditor } from "@/components/advanced-editor/canvas-editor"
import { EffectsPanel } from "@/components/advanced-editor/effects-panel"
import { StickersPanel } from "@/components/advanced-editor/stickers-panel"
import { VideoEditor } from "@/components/advanced-editor/video-editor"
import { ExportHub } from "@/components/advanced-editor/export-hub"
import { PinStoryMode } from "@/components/PinStoryMode"
import { AIAssistant } from "@/components/AIAssistant"
import { AutoTitleGenerator } from "@/components/AutoTitleGenerator"

type AppMode = "capture" | "editor" | "advanced" | "story"
type EditorTool = "welcome" | "canvas" | "effects" | "stickers" | "video" | "export"
type MediaType = "photo" | "video"

interface PinData {
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

interface StoryData {
  id: string
  title: string
  pins: PinData[]
  createdAt: number
  isPublic: boolean
}

export default function PINITApp() {
  // Core state
  const [mode, setMode] = useState<AppMode>("capture")
  const [currentTool, setCurrentTool] = useState<EditorTool>("welcome")
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<MediaType>("photo")
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)

  // Enhanced PINIT features
  const [currentPin, setCurrentPin] = useState<PinData | null>(null)
  const [currentStory, setCurrentStory] = useState<StoryData | null>(null)
  const [savedPins, setSavedPins] = useState<PinData[]>([])
  const [savedStories, setSavedStories] = useState<StoryData[]>([])
  const [aiAssistantActive, setAiAssistantActive] = useState(false)
  const [autoTitleEnabled, setAutoTitleEnabled] = useState(true)

  // Editor state
  const [effects, setEffects] = useState<string[]>([])
  const [stickers, setStickers] = useState<any[]>([])
  const [canvasData, setCanvasData] = useState<any>({})

  // Location services
  const { location, isLoading: locationLoading, error: locationError, getCurrentLocation } = useLocationServices()

  // Audio recording ref
  const audioRecorderRef = useRef<any>(null)

  // Auto-save pins to localStorage
  useEffect(() => {
    const saved = localStorage.getItem("pinit-pins")
    if (saved) {
      setSavedPins(JSON.parse(saved))
    }
    const savedStoriesData = localStorage.getItem("pinit-stories")
    if (savedStoriesData) {
      setSavedStories(JSON.parse(savedStoriesData))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("pinit-pins", JSON.stringify(savedPins))
  }, [savedPins])

  useEffect(() => {
    localStorage.setItem("pinit-stories", JSON.stringify(savedStories))
  }, [savedStories])

  // Generate auto-title for pins
  const generateAutoTitle = useCallback(
    async (mediaUrl: string, location: string, mediaType: MediaType) => {
      if (!autoTitleEnabled) return `Pin at ${location}`

      try {
        // Simulate AI title generation
        const timeOfDay = new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 18 ? "Afternoon" : "Evening"
        const mediaEmoji = mediaType === "photo" ? "📸" : "🎥"
        const suggestions = [
          `${mediaEmoji} ${timeOfDay} at ${location}`,
          `Beautiful ${location} ${mediaType}`,
          `Memories from ${location}`,
          `${location} Adventure`,
          `Exploring ${location}`,
        ]
        return suggestions[Math.floor(Math.random() * suggestions.length)]
      } catch (error) {
        return `Pin at ${location}`
      }
    },
    [autoTitleEnabled],
  )

  // Create new pin
  const createPin = useCallback(async () => {
    if (!mediaUrl || !location) return null

    const autoTitle = await generateAutoTitle(mediaUrl, location.name, mediaType)

    const newPin: PinData = {
      id: `pin-${Date.now()}`,
      title: autoTitle,
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

    setCurrentPin(newPin)
    setSavedPins((prev) => [newPin, ...prev])
    return newPin
  }, [mediaUrl, location, mediaType, audioUrl, effects, stickers, canvasData, generateAutoTitle])

  // Story mode functions
  const startNewStory = useCallback(() => {
    const newStory: StoryData = {
      id: `story-${Date.now()}`,
      title: `Story ${new Date().toLocaleDateString()}`,
      pins: [],
      createdAt: Date.now(),
      isPublic: false,
    }
    setCurrentStory(newStory)
    setMode("story")
  }, [])

  const addPinToStory = useCallback(
    (pin: PinData) => {
      if (!currentStory) return

      const updatedStory = {
        ...currentStory,
        pins: [...currentStory.pins, pin],
      }
      setCurrentStory(updatedStory)
      setSavedStories((prev) => {
        const existing = prev.find((s) => s.id === updatedStory.id)
        if (existing) {
          return prev.map((s) => (s.id === updatedStory.id ? updatedStory : s))
        }
        return [updatedStory, ...prev]
      })
    },
    [currentStory],
  )

  // Media capture handlers
  const handlePhotoCapture = useCallback((photoUrl: string) => {
    setMediaUrl(photoUrl)
    setMediaType("photo")
    console.log("📸 Photo captured:", photoUrl)
  }, [])

  const handleVideoCapture = useCallback((videoUrl: string) => {
    setMediaUrl(videoUrl)
    setMediaType("video")
    console.log("🎥 Video captured:", videoUrl)
  }, [])

  // Audio recording handlers
  const startRecording = useCallback(() => {
    setIsRecording(true)
    audioRecorderRef.current?.startRecording()
    console.log("🎤 Started recording audio")
  }, [])

  const stopRecording = useCallback(() => {
    setIsRecording(false)
    audioRecorderRef.current?.stopRecording()
    console.log("🎤 Stopped recording audio")
  }, [])

  const handleAudioRecorded = useCallback((audioUrl: string) => {
    setAudioUrl(audioUrl)
    console.log("🎵 Audio recorded:", audioUrl)
  }, [])

  // Editor navigation
  const handleEditMedia = useCallback(() => {
    setMode("editor")
    setCurrentTool("welcome")
  }, [])

  const handleAdvancedEdit = useCallback(() => {
    setMode("advanced")
    setCurrentTool("welcome")
  }, [])

  const handleToolSelect = useCallback((tool: EditorTool) => {
    setCurrentTool(tool)
  }, [])

  // Generate postcard
  const generatePostcard = useCallback(async (): Promise<string | null> => {
    if (!mediaUrl) return null

    try {
      // Create canvas for postcard generation
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) return null

      canvas.width = 800
      canvas.height = 600

      // Load and draw media
      const img = new Image()
      img.crossOrigin = "anonymous"

      return new Promise((resolve) => {
        img.onload = () => {
          // Draw background
          ctx.fillStyle = "#f0f0f0"
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          // Draw media
          ctx.drawImage(img, 50, 50, canvas.width - 100, canvas.height - 200)

          // Add location text
          if (location) {
            ctx.fillStyle = "#333"
            ctx.font = "bold 24px Arial"
            ctx.textAlign = "center"
            ctx.fillText(location.name, canvas.width / 2, canvas.height - 100)
          }

          // Add timestamp
          ctx.font = "16px Arial"
          ctx.fillText(new Date().toLocaleDateString(), canvas.width / 2, canvas.height - 60)

          resolve(canvas.toDataURL("image/jpeg", 0.9))
        }
        img.src = mediaUrl
      })
    } catch (error) {
      console.error("Failed to generate postcard:", error)
      return null
    }
  }, [mediaUrl, location])

  // Reset to capture mode
  const resetToCapture = useCallback(() => {
    setMode("capture")
    setCurrentTool("welcome")
    setMediaUrl(null)
    setAudioUrl(null)
    setEffects([])
    setStickers([])
    setCanvasData({})
    setCurrentPin(null)
  }, [])

  // AI Assistant commands
  const handleAICommand = useCallback(
    (command: string) => {
      const lowerCommand = command.toLowerCase()

      if (lowerCommand.includes("take photo")) {
        // Trigger photo capture
        console.log("🤖 AI: Taking photo...")
      } else if (lowerCommand.includes("record video")) {
        // Trigger video capture
        console.log("🤖 AI: Recording video...")
      } else if (lowerCommand.includes("add effects")) {
        setMode("advanced")
        setCurrentTool("effects")
      } else if (lowerCommand.includes("export") || lowerCommand.includes("share")) {
        setMode("advanced")
        setCurrentTool("export")
      } else if (lowerCommand.includes("story mode")) {
        startNewStory()
      }
    },
    [startNewStory],
  )

  // Render current mode
  const renderCurrentMode = () => {
    switch (mode) {
      case "story":
        return (
          <PinStoryMode
            currentStory={currentStory}
            savedPins={savedPins}
            onAddPin={addPinToStory}
            onBackToCapture={resetToCapture}
            onCreatePin={createPin}
          />
        )

      case "editor":
        return (
          <MobilePostcardEditor
            mediaUrl={mediaUrl}
            mediaType={mediaType}
            location={location?.name || "Unknown Location"}
            onBack={resetToCapture}
            onAdvancedEdit={handleAdvancedEdit}
            onEffectsChange={setEffects}
            onStickersChange={setStickers}
          />
        )

      case "advanced":
        switch (currentTool) {
          case "welcome":
            return (
              <EditorWelcome
                onToolSelect={handleToolSelect}
                mediaType={mediaType}
                locationName={location?.name || "Unknown Location"}
              />
            )
          case "canvas":
            return (
              <CanvasEditor
                mediaUrl={mediaUrl}
                mediaType={mediaType}
                onCanvasChange={setCanvasData}
                onBack={() => setCurrentTool("welcome")}
              />
            )
          case "effects":
            return (
              <EffectsPanel
                mediaUrl={mediaUrl}
                mediaType={mediaType}
                currentEffects={effects}
                onEffectsChange={setEffects}
                onBack={() => setCurrentTool("welcome")}
              />
            )
          case "stickers":
            return (
              <StickersPanel
                onStickersChange={setStickers}
                currentStickers={stickers}
                onBack={() => setCurrentTool("welcome")}
              />
            )
          case "video":
            return mediaType === "video" ? (
              <VideoEditor videoUrl={mediaUrl} onVideoChange={setMediaUrl} onBack={() => setCurrentTool("welcome")} />
            ) : null
          case "export":
            return (
              <ExportHub
                generatePostcard={generatePostcard}
                postcardData={{
                  mediaUrl: mediaUrl || "",
                  mediaType,
                  location: location?.name,
                  effects,
                  stickers,
                  canvasData,
                }}
              />
            )
          default:
            return null
        }

      default: // capture mode
        return (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {/* Header with location and story mode */}
            <div
              style={{
                padding: "1rem",
                background: "rgba(0,0,0,0.8)",
                color: "white",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <MapPin size={16} />
                <span style={{ fontSize: "0.875rem" }}>
                  {locationLoading ? "Getting location..." : location?.name || "Location unavailable"}
                </span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={startNewStory}
                  style={{
                    padding: "0.5rem",
                    borderRadius: "0.5rem",
                    border: "none",
                    background: "rgba(139, 92, 246, 0.8)",
                    color: "white",
                    cursor: "pointer",
                  }}
                  title="Start Pin Story"
                >
                  <BookOpen size={16} />
                </button>
                <button
                  onClick={() => setAiAssistantActive(!aiAssistantActive)}
                  style={{
                    padding: "0.5rem",
                    borderRadius: "0.5rem",
                    border: "none",
                    background: aiAssistantActive ? "rgba(16, 185, 129, 0.8)" : "rgba(255,255,255,0.2)",
                    color: "white",
                    cursor: "pointer",
                  }}
                  title="AI Assistant"
                >
                  <Sparkles size={16} />
                </button>
              </div>
            </div>

            {/* Camera */}
            <ReliableCamera
              onPhotoCapture={handlePhotoCapture}
              onVideoCapture={handleVideoCapture}
              isRecording={isRecording}
            />

            {/* Audio Controls */}
            <div
              style={{
                padding: "1rem",
                background: "rgba(0,0,0,0.8)",
                display: "flex",
                justifyContent: "center",
                gap: "1rem",
              }}
            >
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                style={{
                  padding: "1rem",
                  borderRadius: "50%",
                  border: "none",
                  background: isRecording ? "#EF4444" : "rgba(255,255,255,0.2)",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
            </div>

            {/* Media Preview & Actions */}
            {mediaUrl && (
              <div
                style={{
                  position: "fixed",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: "rgba(0,0,0,0.9)",
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  {mediaType === "photo" ? (
                    <img
                      src={mediaUrl || "/placeholder.svg"}
                      alt="Captured"
                      style={{ maxWidth: "100px", maxHeight: "100px", borderRadius: "0.5rem" }}
                    />
                  ) : (
                    <video
                      src={mediaUrl}
                      style={{ maxWidth: "100px", maxHeight: "100px", borderRadius: "0.5rem" }}
                      muted
                    />
                  )}
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={handleEditMedia}
                    style={{
                      flex: 1,
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      border: "none",
                      background: "#3B82F6",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    Quick Edit
                  </button>
                  <button
                    onClick={handleAdvancedEdit}
                    style={{
                      flex: 1,
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      border: "none",
                      background: "#8B5CF6",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    Advanced Edit
                  </button>
                  <button
                    onClick={createPin}
                    style={{
                      flex: 1,
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      border: "none",
                      background: "#10B981",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    Save Pin
                  </button>
                </div>
              </div>
            )}
          </div>
        )
    }
  }

  return (
    <div
      style={{
        height: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Enhanced Audio Component */}
      <EnhancedAudio ref={audioRecorderRef} onAudioRecorded={handleAudioRecorded} isRecording={isRecording} />

      {/* AI Assistant */}
      {aiAssistantActive && <AIAssistant onCommand={handleAICommand} onClose={() => setAiAssistantActive(false)} />}

      {/* Auto Title Generator */}
      {autoTitleEnabled && (
        <AutoTitleGenerator
          mediaUrl={mediaUrl}
          location={location?.name}
          mediaType={mediaType}
          onTitleGenerated={(title) => console.log("Generated title:", title)}
        />
      )}

      {/* Main Content */}
      {renderCurrentMode()}

      {/* Back button for advanced modes */}
      {(mode === "editor" || mode === "advanced" || mode === "story") && (
        <button
          onClick={resetToCapture}
          style={{
            position: "fixed",
            top: "1rem",
            left: "1rem",
            padding: "0.75rem",
            borderRadius: "50%",
            border: "none",
            background: "rgba(0,0,0,0.7)",
            color: "white",
            cursor: "pointer",
            zIndex: 1000,
          }}
        >
          ←
        </button>
      )}
    </div>
  )
}
