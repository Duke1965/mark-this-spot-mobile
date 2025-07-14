"use client"

import { useState, useRef, useEffect } from "react"
import { ArrowLeft, Type, Sparkles, Sticker, Download, Video } from "lucide-react"
import { EffectsPanel } from "./effects-panel"
import { StickersPanel } from "./stickers-panel"
import { VideoEditor } from "./video-editor"
import { ExportHub } from "./export-hub"

interface CanvasEditorProps {
  platform: string
  mediaUrl: string
  onBack: () => void
}

interface TextElement {
  id: string
  text: string
  x: number
  y: number
  fontSize: number
  color: string
  fontFamily: string
}

interface StickerElement {
  id: string
  emoji: string
  x: number
  y: number
  size: number
}

export function CanvasEditor({ platform, mediaUrl, onBack }: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [activePanel, setActivePanel] = useState<"text" | "effects" | "stickers" | "video" | "export" | null>(null)
  const [textElements, setTextElements] = useState<TextElement[]>([])
  const [stickerElements, setStickerElements] = useState<StickerElement[]>([])
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [isMediaVideo, setIsMediaVideo] = useState(false)

  // Platform dimensions
  const platformDimensions = {
    "Instagram Post": { width: 1080, height: 1080 },
    "Instagram Story": { width: 1080, height: 1920 },
    TikTok: { width: 1080, height: 1920 },
    Twitter: { width: 1200, height: 675 },
    Facebook: { width: 1200, height: 630 },
    LinkedIn: { width: 1200, height: 627 },
  }

  const dimensions = platformDimensions[platform as keyof typeof platformDimensions] || { width: 1080, height: 1080 }

  useEffect(() => {
    // Check if media is video
    setIsMediaVideo(mediaUrl.includes("video") || mediaUrl.endsWith(".mp4") || mediaUrl.endsWith(".webm"))
  }, [mediaUrl])

  const addTextElement = () => {
    const newText: TextElement = {
      id: Date.now().toString(),
      text: "Add your text",
      x: dimensions.width / 2 - 100,
      y: dimensions.height / 2,
      fontSize: 48,
      color: "#FFFFFF",
      fontFamily: "Arial",
    }
    setTextElements([...textElements, newText])
    setSelectedElement(newText.id)
  }

  const updateTextElement = (id: string, updates: Partial<TextElement>) => {
    setTextElements(textElements.map((el) => (el.id === id ? { ...el, ...updates } : el)))
  }

  const addSticker = (emoji: string) => {
    const newSticker: StickerElement = {
      id: Date.now().toString(),
      emoji,
      x: dimensions.width / 2 - 25,
      y: dimensions.height / 2 - 25,
      size: 50,
    }
    setStickerElements([...stickerElements, newSticker])
    setSelectedElement(newSticker.id)
  }

  const updateStickerElement = (id: string, updates: Partial<StickerElement>) => {
    setStickerElements(stickerElements.map((el) => (el.id === id ? { ...el, ...updates } : el)))
  }

  const deleteElement = (id: string) => {
    setTextElements(textElements.filter((el) => el.id !== id))
    setStickerElements(stickerElements.filter((el) => el.id !== id))
    setSelectedElement(null)
  }

  const selectedTextElement = textElements.find((el) => el.id === selectedElement)
  const selectedStickerElement = stickerElements.find((el) => el.id === selectedElement)

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
          background: "rgba(255,255,255,0.1)",
          padding: "1rem",
          borderRadius: "1rem",
          backdropFilter: "blur(10px)",
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.75rem 1rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <h1
          style={{
            color: "white",
            margin: 0,
            fontSize: "1.5rem",
            fontWeight: "bold",
          }}
        >
          {platform} Editor
        </h1>

        <div style={{ width: "80px" }} />
      </div>

      <div style={{ display: "flex", gap: "1rem", flex: 1 }}>
        {/* Canvas Area */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div
            style={{
              position: "relative",
              width: Math.min(400, dimensions.width * 0.4),
              height: Math.min(400, dimensions.height * 0.4),
              background: "white",
              borderRadius: "1rem",
              overflow: "hidden",
              boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
            }}
          >
            {/* Media Background */}
            {isMediaVideo ? (
              <video
                src={mediaUrl}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
                muted
                loop
                autoPlay
              />
            ) : (
              <img
                src={mediaUrl || "/placeholder.svg"}
                alt="Canvas background"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            )}

            {/* Text Elements */}
            {textElements.map((textEl) => (
              <div
                key={textEl.id}
                onClick={() => setSelectedElement(textEl.id)}
                style={{
                  position: "absolute",
                  left: `${(textEl.x / dimensions.width) * 100}%`,
                  top: `${(textEl.y / dimensions.height) * 100}%`,
                  fontSize: `${(textEl.fontSize / dimensions.width) * 100}%`,
                  color: textEl.color,
                  fontFamily: textEl.fontFamily,
                  cursor: "pointer",
                  userSelect: "none",
                  textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
                  border: selectedElement === textEl.id ? "2px dashed #10B981" : "none",
                  padding: "0.25rem",
                  transform: "translate(-50%, -50%)",
                  whiteSpace: "nowrap",
                }}
              >
                {textEl.text}
              </div>
            ))}

            {/* Sticker Elements */}
            {stickerElements.map((stickerEl) => (
              <div
                key={stickerEl.id}
                onClick={() => setSelectedElement(stickerEl.id)}
                style={{
                  position: "absolute",
                  left: `${(stickerEl.x / dimensions.width) * 100}%`,
                  top: `${(stickerEl.y / dimensions.height) * 100}%`,
                  fontSize: `${(stickerEl.size / dimensions.width) * 100}%`,
                  cursor: "pointer",
                  userSelect: "none",
                  border: selectedElement === stickerEl.id ? "2px dashed #10B981" : "none",
                  padding: "0.25rem",
                  transform: "translate(-50%, -50%)",
                }}
              >
                {stickerEl.emoji}
              </div>
            ))}
          </div>
        </div>

        {/* Tools Panel */}
        <div style={{ width: "300px", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Tool Buttons */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.5rem",
              background: "rgba(255,255,255,0.1)",
              padding: "1rem",
              borderRadius: "1rem",
              backdropFilter: "blur(10px)",
            }}
          >
            <button
              onClick={() => setActivePanel(activePanel === "text" ? null : "text")}
              style={{
                padding: "1rem",
                borderRadius: "0.75rem",
                border: "none",
                background: activePanel === "text" ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.8rem",
              }}
            >
              <Type size={24} />
              Text
            </button>

            <button
              onClick={() => setActivePanel(activePanel === "effects" ? null : "effects")}
              style={{
                padding: "1rem",
                borderRadius: "0.75rem",
                border: "none",
                background: activePanel === "effects" ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.8rem",
              }}
            >
              <Sparkles size={24} />
              Effects
            </button>

            <button
              onClick={() => setActivePanel(activePanel === "stickers" ? null : "stickers")}
              style={{
                padding: "1rem",
                borderRadius: "0.75rem",
                border: "none",
                background: activePanel === "stickers" ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.8rem",
              }}
            >
              <Sticker size={24} />
              Stickers
            </button>

            {isMediaVideo && (
              <button
                onClick={() => setActivePanel(activePanel === "video" ? null : "video")}
                style={{
                  padding: "1rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background: activePanel === "video" ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.2)",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.8rem",
                }}
              >
                <Video size={24} />
                Video
              </button>
            )}

            <button
              onClick={() => setActivePanel(activePanel === "export" ? null : "export")}
              style={{
                padding: "1rem",
                borderRadius: "0.75rem",
                border: "none",
                background: activePanel === "export" ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.8rem",
              }}
            >
              <Download size={24} />
              Export
            </button>
          </div>

          {/* Active Panel */}
          {activePanel === "text" && (
            <div
              style={{
                background: "rgba(255,255,255,0.1)",
                padding: "1rem",
                borderRadius: "1rem",
                backdropFilter: "blur(10px)",
              }}
            >
              <h3 style={{ color: "white", margin: "0 0 1rem 0" }}>Text Tools</h3>

              <button
                onClick={addTextElement}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: "rgba(16, 185, 129, 0.3)",
                  color: "white",
                  cursor: "pointer",
                  marginBottom: "1rem",
                }}
              >
                Add Text
              </button>

              {selectedTextElement && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <input
                    type="text"
                    value={selectedTextElement.text}
                    onChange={(e) => updateTextElement(selectedTextElement.id, { text: e.target.value })}
                    style={{
                      padding: "0.5rem",
                      borderRadius: "0.5rem",
                      border: "none",
                      background: "rgba(255,255,255,0.2)",
                      color: "white",
                    }}
                    placeholder="Enter text"
                  />

                  <input
                    type="color"
                    value={selectedTextElement.color}
                    onChange={(e) => updateTextElement(selectedTextElement.id, { color: e.target.value })}
                    style={{ width: "100%", height: "40px", borderRadius: "0.5rem", border: "none" }}
                  />

                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={selectedTextElement.fontSize}
                    onChange={(e) => updateTextElement(selectedTextElement.id, { fontSize: Number(e.target.value) })}
                    style={{ width: "100%" }}
                  />

                  <button
                    onClick={() => deleteElement(selectedTextElement.id)}
                    style={{
                      padding: "0.5rem",
                      borderRadius: "0.5rem",
                      border: "none",
                      background: "rgba(239, 68, 68, 0.3)",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    Delete Text
                  </button>
                </div>
              )}
            </div>
          )}

          {activePanel === "effects" && (
            <EffectsPanel imageUrl={mediaUrl} onEffectApply={(effect) => console.log("Effect applied:", effect)} />
          )}

          {activePanel === "stickers" && <StickersPanel onStickerSelect={addSticker} />}

          {activePanel === "video" && isMediaVideo && (
            <VideoEditor
              videoUrl={mediaUrl}
              onVideoProcessed={(processedUrl) => console.log("Video processed:", processedUrl)}
            />
          )}

          {activePanel === "export" && (
            <ExportHub
              canvasData={{
                mediaUrl,
                textElements,
                stickerElements,
                dimensions,
                platform,
              }}
              onExport={(format, quality) => console.log("Exporting:", format, quality)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
