"use client"

import { useState, useRef } from "react"
import { ArrowLeft, Save, Palette, Sparkles, Sticker, Video, Settings } from "lucide-react"
import { CanvasEditor } from "./canvas-editor"
import { EffectsPanel } from "./effects-panel"
import { StickersPanel } from "./stickers-panel"
import { VideoEditor } from "./video-editor"
import { ExportHub } from "./export-hub"
import { EditorWelcome } from "./editor-welcome"

interface AdvancedPostcardEditorProps {
  mediaUrl: string
  mediaType: "photo" | "video"
  locationName: string
  onSave: (postcardData: any) => void
  onClose: () => void
}

export function AdvancedPostcardEditor({
  mediaUrl,
  mediaType,
  locationName,
  onSave,
  onClose,
}: AdvancedPostcardEditorProps) {
  const [currentStep, setCurrentStep] = useState<"welcome" | "editor">("welcome")
  const [selectedPlatform, setSelectedPlatform] = useState<string>("")
  const [capturedMedia, setCapturedMedia] = useState<string>("")
  const [currentPanel, setCurrentPanel] = useState<"canvas" | "effects" | "stickers" | "video" | "export">("canvas")
  const [canvasData, setCanvasData] = useState<any>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handlePlatformSelect = (platform: string, mediaUrl: string) => {
    setSelectedPlatform(platform)
    setCapturedMedia(mediaUrl)
    setCurrentStep("editor")
  }

  const handleBackToWelcome = () => {
    setCurrentStep("welcome")
    setSelectedPlatform("")
    setCapturedMedia("")
  }

  const handleSave = () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.9)

      const postcardData = {
        id: Date.now().toString(),
        mediaUrl: capturedMedia,
        mediaType,
        locationName,
        canvasDataUrl: dataUrl,
        timestamp: new Date().toISOString(),
        ...canvasData,
      }

      // Save to localStorage
      const existingPostcards = JSON.parse(localStorage.getItem("pinit-saved-postcards") || "[]")
      const updatedPostcards = [postcardData, ...existingPostcards]
      localStorage.setItem("pinit-saved-postcards", JSON.stringify(updatedPostcards))

      onSave(postcardData)
    }
  }

  if (currentStep === "welcome") {
    return <EditorWelcome onPlatformSelect={handlePlatformSelect} />
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "linear-gradient(135deg, #1e293b 0%, #1e40af 50%, #4338ca 100%)",
        color: "white",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1rem 2rem",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            onClick={handleBackToWelcome}
            style={{
              padding: "0.5rem",
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <h2 style={{ fontSize: "1.25rem", margin: 0 }}>✨ Advanced Editor</h2>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={handleSave}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "rgba(16, 185, 129, 0.2)",
              color: "rgba(16, 185, 129, 1)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Save size={16} />
            Save
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Canvas Area */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            background: "rgba(0,0,0,0.2)",
          }}
        >
          {currentPanel === "canvas" && (
            <CanvasEditor
              ref={canvasRef}
              mediaUrl={capturedMedia}
              mediaType={mediaType}
              locationName={locationName}
              onDataChange={setCanvasData}
            />
          )}
          {currentPanel === "effects" && (
            <EffectsPanel
              mediaUrl={capturedMedia}
              onApplyEffect={(effect) => {
                console.log("Applying effect:", effect)
                setCurrentPanel("canvas")
              }}
            />
          )}
          {currentPanel === "stickers" && (
            <StickersPanel
              onSelectSticker={(sticker) => {
                console.log("Selected sticker:", sticker)
                setCurrentPanel("canvas")
              }}
            />
          )}
          {currentPanel === "video" && mediaType === "video" && (
            <VideoEditor
              videoUrl={capturedMedia}
              onVideoProcessed={(processedUrl) => {
                console.log("Video processed:", processedUrl)
                setCurrentPanel("canvas")
              }}
            />
          )}
          {currentPanel === "export" && (
            <ExportHub
              canvasRef={canvasRef}
              locationName={locationName}
              onExportComplete={() => setCurrentPanel("canvas")}
            />
          )}
        </div>

        {/* Side Panel */}
        <div
          style={{
            width: "300px",
            background: "rgba(0,0,0,0.3)",
            borderLeft: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Panel Navigation */}
          <div
            style={{
              padding: "1rem",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <button
              onClick={() => setCurrentPanel("canvas")}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                border: "none",
                background: currentPanel === "canvas" ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.875rem",
              }}
            >
              <Palette size={16} />
              Canvas
            </button>
            <button
              onClick={() => setCurrentPanel("effects")}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                border: "none",
                background: currentPanel === "effects" ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.875rem",
              }}
            >
              <Sparkles size={16} />
              Effects
            </button>
            <button
              onClick={() => setCurrentPanel("stickers")}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                border: "none",
                background: currentPanel === "stickers" ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.875rem",
              }}
            >
              <Sticker size={16} />
              Stickers
            </button>
            {mediaType === "video" && (
              <button
                onClick={() => setCurrentPanel("video")}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: currentPanel === "video" ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.1)",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.875rem",
                }}
              >
                <Video size={16} />
                Video
              </button>
            )}
            <button
              onClick={() => setCurrentPanel("export")}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                border: "none",
                background: currentPanel === "export" ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.875rem",
              }}
            >
              <Settings size={16} />
              Export
            </button>
          </div>

          {/* Panel Content */}
          <div style={{ flex: 1, padding: "1rem", overflowY: "auto" }}>
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.6)" }}>
              <p>Select a panel above to access editing tools</p>
              <div style={{ fontSize: "2rem", margin: "1rem 0" }}>🎨</div>
              <p style={{ fontSize: "0.875rem" }}>
                Current: <strong>{currentPanel.charAt(0).toUpperCase() + currentPanel.slice(1)}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
