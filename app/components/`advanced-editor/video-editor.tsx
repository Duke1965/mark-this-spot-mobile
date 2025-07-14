"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, Volume2, VolumeX, Scissors, Zap, RotateCcw } from "lucide-react"

interface VideoEditorProps {
  videoUrl: string
  onVideoProcessed: (processedUrl: string) => void
}

export function VideoEditor({ videoUrl, onVideoProcessed }: VideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [videoFilter, setVideoFilter] = useState("none")

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      setTrimEnd(video.duration)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
    }

    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("timeupdate", handleTimeUpdate)

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("timeupdate", handleTimeUpdate)
    }
  }, [])

  const togglePlayPause = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (time: number) => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = time
    setCurrentTime(time)
  }

  const handleVolumeChange = (newVolume: number) => {
    const video = videoRef.current
    if (!video) return

    video.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    if (isMuted) {
      video.volume = volume
      setIsMuted(false)
    } else {
      video.volume = 0
      setIsMuted(true)
    }
  }

  const handleSpeedChange = (speed: number) => {
    const video = videoRef.current
    if (!video) return

    video.playbackRate = speed
    setPlaybackSpeed(speed)
  }

  const applyVideoFilter = (filter: string) => {
    setVideoFilter(filter)
  }

  const resetVideo = () => {
    setTrimStart(0)
    setTrimEnd(duration)
    setPlaybackSpeed(1)
    setVideoFilter("none")
    setVolume(1)
    setIsMuted(false)

    const video = videoRef.current
    if (video) {
      video.playbackRate = 1
      video.volume = 1
      video.currentTime = 0
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const videoEffects = [
    { name: "Original", filter: "none" },
    { name: "B&W", filter: "grayscale(1)" },
    { name: "Vintage", filter: "sepia(0.5) contrast(1.2)" },
    { name: "High Contrast", filter: "contrast(1.5)" },
    { name: "Warm", filter: "sepia(0.3) saturate(1.4)" },
    { name: "Cool", filter: "hue-rotate(180deg)" },
  ]

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.1)",
        padding: "1rem",
        borderRadius: "1rem",
        backdropFilter: "blur(10px)",
      }}
    >
      <h3 style={{ color: "white", margin: "0 0 1rem 0" }}>Video Editor</h3>

      {/* Video Preview */}
      <div
        style={{
          position: "relative",
          marginBottom: "1rem",
          borderRadius: "0.5rem",
          overflow: "hidden",
        }}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          style={{
            width: "100%",
            height: "150px",
            objectFit: "cover",
            filter: videoFilter,
          }}
          muted={isMuted}
        />

        <button
          onClick={togglePlayPause}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(0,0,0,0.7)",
            border: "none",
            borderRadius: "50%",
            width: "50px",
            height: "50px",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
      </div>

      {/* Timeline */}
      <div style={{ marginBottom: "1rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.5rem",
          }}
        >
          <span style={{ color: "white", fontSize: "0.8rem" }}>{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            onChange={(e) => handleSeek(Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ color: "white", fontSize: "0.8rem" }}>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Trim Controls */}
      <div style={{ marginBottom: "1rem" }}>
        <h4 style={{ color: "white", fontSize: "0.9rem", margin: "0 0 0.5rem 0" }}>
          <Scissors size={16} style={{ marginRight: "0.25rem" }} />
          Trim Video
        </h4>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <label style={{ color: "white", fontSize: "0.7rem", display: "block" }}>
              Start: {formatTime(trimStart)}
            </label>
            <input
              type="range"
              min="0"
              max={duration}
              value={trimStart}
              onChange={(e) => setTrimStart(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ color: "white", fontSize: "0.7rem", display: "block" }}>End: {formatTime(trimEnd)}</label>
            <input
              type="range"
              min="0"
              max={duration}
              value={trimEnd}
              onChange={(e) => setTrimEnd(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </div>

      {/* Speed Control */}
      <div style={{ marginBottom: "1rem" }}>
        <h4 style={{ color: "white", fontSize: "0.9rem", margin: "0 0 0.5rem 0" }}>
          <Zap size={16} style={{ marginRight: "0.25rem" }} />
          Speed: {playbackSpeed}x
        </h4>
        <div style={{ display: "flex", gap: "0.25rem" }}>
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
            <button
              key={speed}
              onClick={() => handleSpeedChange(speed)}
              style={{
                flex: 1,
                padding: "0.5rem",
                borderRadius: "0.25rem",
                border: "none",
                background: playbackSpeed === speed ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
                fontSize: "0.7rem",
              }}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* Volume Control */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={toggleMute}
            style={{
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
            }}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            style={{ flex: 1 }}
          />
        </div>
      </div>

      {/* Video Effects */}
      <div style={{ marginBottom: "1rem" }}>
        <h4 style={{ color: "white", fontSize: "0.9rem", margin: "0 0 0.5rem 0" }}>Effects</h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.25rem",
          }}
        >
          {videoEffects.map((effect) => (
            <button
              key={effect.name}
              onClick={() => applyVideoFilter(effect.filter)}
              style={{
                padding: "0.5rem",
                borderRadius: "0.25rem",
                border: "none",
                background: videoFilter === effect.filter ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
                fontSize: "0.7rem",
              }}
            >
              {effect.name}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={() => onVideoProcessed(videoUrl)}
          style={{
            flex: 1,
            padding: "0.75rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "rgba(16, 185, 129, 0.3)",
            color: "white",
            cursor: "pointer",
            fontSize: "0.8rem",
          }}
        >
          Apply Changes
        </button>
        <button
          onClick={resetVideo}
          style={{
            padding: "0.75rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
          }}
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  )
}
