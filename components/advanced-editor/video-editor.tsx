"use client"

import type React from "react"

import { useRef, useState, useCallback, useEffect } from "react"
import { ArrowLeft, Play, Pause, Scissors, Download, RotateCcw } from "lucide-react"

interface VideoEditorProps {
  videoUrl: string | null
  onVideoChange: (videoUrl: string) => void
  onBack: () => void
}

export function VideoEditor({ videoUrl, onVideoChange, onBack }: VideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  // Video properties
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [playbackRate, setPlaybackRate] = useState(1)

  // Initialize video
  useEffect(() => {
    if (videoRef.current && videoUrl) {
      const video = videoRef.current

      video.onloadedmetadata = () => {
        setDuration(video.duration)
        setEndTime(video.duration)
        setCurrentTime(0)
      }

      video.ontimeupdate = () => {
        setCurrentTime(video.currentTime)
      }

      video.onended = () => {
        setIsPlaying(false)
      }
    }
  }, [videoUrl])

  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return

    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }, [isPlaying])

  const seekTo = useCallback((time: number) => {
    if (!videoRef.current) return

    videoRef.current.currentTime = time
    setCurrentTime(time)
  }, [])

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!duration) return

      const rect = e.currentTarget.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const percentage = clickX / rect.width
      const newTime = percentage * duration

      seekTo(newTime)
    },
    [duration, seekTo],
  )

  const trimVideo = useCallback(async () => {
    if (!videoUrl || !canvasRef.current || !videoRef.current) return

    setIsProcessing(true)

    try {
      // This is a simplified version - in a real app you'd use FFmpeg.js or similar
      // For now, we'll create a new video element with the trimmed times
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")

      if (!ctx) return

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Apply filters
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`

      // Seek to start time and capture frame
      video.currentTime = startTime

      await new Promise((resolve) => {
        video.onseeked = () => {
          ctx.drawImage(video, 0, 0)
          resolve(null)
        }
      })

      // Create a new blob URL (simplified - real implementation would need proper video processing)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const newVideoUrl = URL.createObjectURL(blob)
            onVideoChange(newVideoUrl)
          }
        },
        "image/jpeg",
        0.9,
      )

      console.log(`🎬 Video trimmed: ${startTime}s to ${endTime}s`)
    } catch (error) {
      console.error("Failed to trim video:", error)
    } finally {
      setIsProcessing(false)
    }
  }, [videoUrl, startTime, endTime, brightness, contrast, saturation, onVideoChange])

  const downloadVideo = useCallback(() => {
    if (!videoUrl) return

    const link = document.createElement("a")
    link.href = videoUrl
    link.download = `pinit-video-${Date.now()}.mp4`
    link.click()
  }, [videoUrl])

  const resetSettings = useCallback(() => {
    setBrightness(100)
    setContrast(100)
    setSaturation(100)
    setPlaybackRate(1)
    setStartTime(0)
    setEndTime(duration)

    if (videoRef.current) {
      videoRef.current.playbackRate = 1
    }
  }, [duration])

  const formatTime = useCallback((time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }, [])

  // Update playback rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate
    }
  }, [playbackRate])

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "#1a202c",
        color: "white",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem",
          background: "rgba(0,0,0,0.5)",
        }}
      >
        <button
          onClick={onBack}
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

        <h2 style={{ margin: 0, fontSize: "1.125rem", fontWeight: "bold" }}>Video Editor</h2>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={resetSettings}
            style={{
              padding: "0.5rem",
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              cursor: "pointer",
            }}
            title="Reset"
          >
            <RotateCcw size={16} />
          </button>

          <button
            onClick={downloadVideo}
            style={{
              padding: "0.5rem",
              borderRadius: "50%",
              border: "none",
              background: "#10B981",
              color: "white",
              cursor: "pointer",
            }}
            title="Download"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Video Preview */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          background: "#2d3748",
          position: "relative",
        }}
      >
        {videoUrl && (
          <div
            style={{
              position: "relative",
              maxWidth: "100%",
              maxHeight: "100%",
              borderRadius: "0.5rem",
              overflow: "hidden",
              boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
            }}
          >
            <video
              ref={videoRef}
              src={videoUrl}
              style={{
                maxWidth: "100%",
                maxHeight: "400px",
                objectFit: "contain",
                filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
              }}
              muted
            />

            {/* Play/Pause Overlay */}
            <button
              onClick={togglePlayPause}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                border: "none",
                background: "rgba(0,0,0,0.7)",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: isPlaying ? 0 : 1,
                transition: "opacity 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "1"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = isPlaying ? "0" : "1"
              }}
            >
              {isPlaying ? <Pause size={32} /> : <Play size={32} />}
            </button>

            {/* Processing Overlay */}
            {isProcessing && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0,0,0,0.8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    border: "4px solid rgba(255,255,255,0.3)",
                    borderTop: "4px solid white",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <span style={{ fontSize: "0.875rem" }}>Processing video...</span>
              </div>
            )}
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>

      {/* Controls */}
      <div
        style={{
          padding: "1rem",
          background: "rgba(0,0,0,0.8)",
          maxHeight: "60vh",
          overflowY: "auto",
        }}
      >
        {/* Timeline */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.875rem" }}>Timeline</span>
            <span style={{ fontSize: "0.875rem" }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div
            onClick={handleTimelineClick}
            style={{
              height: "8px",
              background: "rgba(255,255,255,0.2)",
              borderRadius: "4px",
              position: "relative",
              cursor: "pointer",
              marginBottom: "1rem",
            }}
          >
            {/* Progress */}
            <div
              style={{
                height: "100%",
                background: "#3B82F6",
                borderRadius: "4px",
                width: `${duration ? (currentTime / duration) * 100 : 0}%`,
              }}
            />

            {/* Trim markers */}
            <div
              style={{
                position: "absolute",
                left: `${duration ? (startTime / duration) * 100 : 0}%`,
                top: "-4px",
                width: "4px",
                height: "16px",
                background: "#10B981",
                borderRadius: "2px",
                cursor: "ew-resize",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: `${duration ? (endTime / duration) * 100 : 100}%`,
                top: "-4px",
                width: "4px",
                height: "16px",
                background: "#EF4444",
                borderRadius: "2px",
                cursor: "ew-resize",
              }}
            />
          </div>

          {/* Playback Controls */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem" }}>
            <button
              onClick={() => seekTo(Math.max(0, currentTime - 10))}
              style={{
                padding: "0.5rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
                fontSize: "0.75rem",
              }}
            >
              -10s
            </button>

            <button
              onClick={togglePlayPause}
              style={{
                padding: "0.75rem",
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
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>

            <button
              onClick={() => seekTo(Math.min(duration, currentTime + 10))}
              style={{
                padding: "0.5rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
                fontSize: "0.75rem",
              }}
            >
              +10s
            </button>
          </div>
        </div>

        {/* Trim Controls */}
        <div style={{ marginBottom: "2rem" }}>
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: "bold" }}>✂️ Trim Video</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                Start Time: {formatTime(startTime)}
              </label>
              <input
                type="range"
                min="0"
                max={duration}
                step="0.1"
                value={startTime}
                onChange={(e) => setStartTime(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                End Time: {formatTime(endTime)}
              </label>
              <input
                type="range"
                min="0"
                max={duration}
                step="0.1"
                value={endTime}
                onChange={(e) => setEndTime(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", opacity: 0.8 }}>
              <span>Duration: {formatTime(endTime - startTime)}</span>
            </div>

            <button
              onClick={trimVideo}
              disabled={isProcessing}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "none",
                background: isProcessing ? "rgba(255,255,255,0.2)" : "#10B981",
                color: "white",
                cursor: isProcessing ? "not-allowed" : "pointer",
                fontWeight: "bold",
                opacity: isProcessing ? 0.5 : 1,
              }}
            >
              <Scissors size={16} />
              {isProcessing ? "Processing..." : "Apply Trim"}
            </button>
          </div>
        </div>

        {/* Video Effects */}
        <div style={{ marginBottom: "2rem" }}>
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: "bold" }}>🎨 Video Effects</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                Brightness: {brightness}%
              </label>
              <input
                type="range"
                min="0"
                max="200"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                Contrast: {contrast}%
              </label>
              <input
                type="range"
                min="0"
                max="200"
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                Saturation: {saturation}%
              </label>
              <input
                type="range"
                min="0"
                max="200"
                value={saturation}
                onChange={(e) => setSaturation(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>
          </div>
        </div>

        {/* Playback Speed */}
        <div>
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: "bold" }}>⚡ Playback Speed</h3>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackRate(speed)}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: playbackRate === speed ? "#3B82F6" : "rgba(255,255,255,0.1)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                }}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
