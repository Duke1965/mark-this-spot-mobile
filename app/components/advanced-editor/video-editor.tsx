"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Play, Pause, SkipBack, SkipForward, Scissors, Download, RotateCcw } from "lucide-react"

interface VideoEditorProps {
  videoUrl: string
  onFrameCapture: (frameUrl: string) => void
}

export function VideoEditor({ videoUrl, onFrameCapture }: VideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [capturedFrames, setCapturedFrames] = useState<string[]>([])
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null)

  // Update current time
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateTime = () => {
      setCurrentTime(video.currentTime)
    }

    const updateDuration = () => {
      setDuration(video.duration)
    }

    video.addEventListener("timeupdate", updateTime)
    video.addEventListener("loadedmetadata", updateDuration)
    video.addEventListener("ended", () => setIsPlaying(false))

    return () => {
      video.removeEventListener("timeupdate", updateTime)
      video.removeEventListener("loadedmetadata", updateDuration)
      video.removeEventListener("ended", () => setIsPlaying(false))
    }
  }, [])

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = time
    setCurrentTime(time)
  }, [])

  const skipBackward = useCallback(() => {
    seekTo(Math.max(0, currentTime - 5))
  }, [currentTime, seekTo])

  const skipForward = useCallback(() => {
    seekTo(Math.min(duration, currentTime + 5))
  }, [currentTime, duration, seekTo])

  const captureCurrentFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw current frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert to data URL
    const frameUrl = canvas.toDataURL("image/jpeg", 0.9)
    setCapturedFrames((prev) => [...prev, frameUrl])
    setSelectedFrame(frameUrl)

    console.log("🎬 Frame captured at", formatTime(currentTime))
  }, [currentTime])

  const useSelectedFrame = useCallback(() => {
    if (selectedFrame) {
      onFrameCapture(selectedFrame)
      console.log("✅ Frame selected for postcard")
    }
  }, [selectedFrame, onFrameCapture])

  const downloadFrame = useCallback((frameUrl: string, index: number) => {
    const link = document.createElement("a")
    link.download = `video-frame-${index + 1}.jpg`
    link.href = frameUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const clearFrames = () => {
    setCapturedFrames([])
    setSelectedFrame(null)
  }

  return (
    <div
      style={{
        flex: 1,
        padding: "1.5rem",
        color: "white",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        overflowY: "auto",
      }}
    >
      <div>
        <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.125rem", fontWeight: "bold" }}>🎬 Video Editor</h3>
        <p style={{ margin: 0, fontSize: "0.875rem", opacity: 0.8 }}>
          Play your video and capture the perfect frame for your postcard
        </p>
      </div>

      {/* Video Player */}
      <div
        style={{
          background: "rgba(0,0,0,0.8)",
          borderRadius: "1rem",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          style={{
            width: "100%",
            maxHeight: "300px",
            borderRadius: "0.5rem",
            objectFit: "contain",
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Video Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Progress Bar */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.875rem", minWidth: "40px" }}>{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={(e) => seekTo(Number(e.target.value))}
              style={{
                flex: 1,
                cursor: "pointer",
              }}
            />
            <span style={{ fontSize: "0.875rem", minWidth: "40px" }}>{formatTime(duration)}</span>
          </div>

          {/* Control Buttons */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
            <button
              onClick={skipBackward}
              style={{
                padding: "0.75rem",
                borderRadius: "50%",
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SkipBack size={20} />
            </button>

            <button
              onClick={togglePlayPause}
              style={{
                padding: "1rem",
                borderRadius: "50%",
                border: "none",
                background: "#3B82F6",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>

            <button
              onClick={skipForward}
              style={{
                padding: "0.75rem",
                borderRadius: "50%",
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SkipForward size={20} />
            </button>

            <button
              onClick={captureCurrentFrame}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1rem",
                borderRadius: "1rem",
                border: "none",
                background: "#10B981",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "0.875rem",
              }}
            >
              <Scissors size={16} />
              Capture Frame
            </button>
          </div>

          {/* Playback Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.875rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>Volume:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => {
                  const newVolume = Number(e.target.value)
                  setVolume(newVolume)
                  if (videoRef.current) {
                    videoRef.current.volume = newVolume
                  }
                }}
                style={{ width: "80px", cursor: "pointer" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>Speed:</span>
              <select
                value={playbackRate}
                onChange={(e) => {
                  const newRate = Number(e.target.value)
                  setPlaybackRate(newRate)
                  if (videoRef.current) {
                    videoRef.current.playbackRate = newRate
                  }
                }}
                style={{
                  padding: "0.25rem",
                  borderRadius: "0.25rem",
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                  fontSize: "0.875rem",
                }}
              >
                <option value="0.5" style={{ background: "#333", color: "white" }}>
                  0.5x
                </option>
                <option value="1" style={{ background: "#333", color: "white" }}>
                  1x
                </option>
                <option value="1.25" style={{ background: "#333", color: "white" }}>
                  1.25x
                </option>
                <option value="1.5" style={{ background: "#333", color: "white" }}>
                  1.5x
                </option>
                <option value="2" style={{ background: "#333", color: "white" }}>
                  2x
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Captured Frames */}
      {capturedFrames.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: "bold" }}>
              📸 Captured Frames ({capturedFrames.length})
            </h4>
            <button
              onClick={clearFrames}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.5rem 0.75rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "rgba(239, 68, 68, 0.2)",
                color: "rgba(239, 68, 68, 0.8)",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              <RotateCcw size={14} />
              Clear All
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: "1rem",
              maxHeight: "300px",
              overflowY: "auto",
            }}
          >
            {capturedFrames.map((frameUrl, index) => (
              <div
                key={index}
                style={{
                  position: "relative",
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "0.5rem",
                  overflow: "hidden",
                  border: selectedFrame === frameUrl ? "2px solid #10B981" : "1px solid rgba(255,255,255,0.2)",
                  cursor: "pointer",
                }}
                onClick={() => setSelectedFrame(frameUrl)}
              >
                <img
                  src={frameUrl || "/placeholder.svg"}
                  alt={`Frame ${index + 1}`}
                  style={{
                    width: "100%",
                    height: "100px",
                    objectFit: "cover",
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "rgba(0,0,0,0.8)",
                    padding: "0.5rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "0.75rem" }}>Frame {index + 1}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      downloadFrame(frameUrl, index)
                    }}
                    style={{
                      padding: "0.25rem",
                      borderRadius: "0.25rem",
                      border: "none",
                      background: "rgba(255,255,255,0.2)",
                      color: "white",
                      cursor: "pointer",
                    }}
                  >
                    <Download size={12} />
                  </button>
                </div>

                {selectedFrame === frameUrl && (
                  <div
                    style={{
                      position: "absolute",
                      top: "0.5rem",
                      right: "0.5rem",
                      background: "#10B981",
                      borderRadius: "50%",
                      width: "20px",
                      height: "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                    }}
                  >
                    ✓
                  </div>
                )}
              </div>
            ))}
          </div>

          {selectedFrame && (
            <div style={{ marginTop: "1rem", textAlign: "center" }}>
              <button
                onClick={useSelectedFrame}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "1rem 2rem",
                  borderRadius: "1rem",
                  border: "none",
                  background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "1rem",
                  margin: "0 auto",
                  boxShadow: "0 8px 20px rgba(16, 185, 129, 0.4)",
                }}
              >
                ✨ Use Selected Frame for Postcard
              </button>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div
        style={{
          background: "rgba(59, 130, 246, 0.1)",
          border: "1px solid rgba(59, 130, 246, 0.3)",
          borderRadius: "0.75rem",
          padding: "1rem",
          fontSize: "0.875rem",
          opacity: 0.9,
        }}
      >
        <h5 style={{ margin: "0 0 0.5rem 0", fontWeight: "bold" }}>💡 How to use:</h5>
        <ul style={{ margin: 0, paddingLeft: "1rem", fontSize: "0.75rem" }}>
          <li>Play your video and pause at the perfect moment</li>
          <li>Click "Capture Frame" to save that moment</li>
          <li>Capture multiple frames to compare</li>
          <li>Select your favorite frame and use it for your postcard</li>
          <li>Use playback controls to find the exact moment you want</li>
        </ul>
      </div>

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  )
}
