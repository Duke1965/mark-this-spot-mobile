"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, Volume2, VolumeX, Scissors } from "lucide-react"

interface VideoEditorProps {
  videoUrl: string
  onVideoUpdate: (updatedVideoData: any) => void
}

export function VideoEditor({ videoUrl, onVideoUpdate }: VideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(100)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)

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

    video.volume = newVolume / 100
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    if (isMuted) {
      video.volume = volume / 100
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

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const applyChanges = () => {
    const videoData = {
      url: videoUrl,
      trimStart,
      trimEnd,
      volume: isMuted ? 0 : volume,
      playbackSpeed,
      duration: trimEnd - trimStart,
    }
    onVideoUpdate(videoData)
  }

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.9)",
        padding: "1rem",
        borderRadius: "1rem",
        color: "white",
        maxHeight: "500px",
        overflowY: "auto",
      }}
    >
      <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem" }}>Video Editor</h3>

      {/* Video Preview */}
      <div
        style={{
          position: "relative",
          marginBottom: "1rem",
          borderRadius: "0.5rem",
          overflow: "hidden",
          background: "black",
        }}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          style={{
            width: "100%",
            height: "200px",
            objectFit: "contain",
          }}
          onEnded={() => setIsPlaying(false)}
        />

        {/* Play/Pause Overlay */}
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
            width: "60px",
            height: "60px",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>
      </div>

      {/* Timeline */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.5rem" }}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <input
          type="range"
          min="0"
          max={duration}
          value={currentTime}
          onChange={(e) => handleSeek(Number(e.target.value))}
          style={{
            width: "100%",
            height: "6px",
            borderRadius: "3px",
            background: "rgba(255,255,255,0.2)",
            outline: "none",
          }}
        />
      </div>

      {/* Trim Controls */}
      <div style={{ marginBottom: "1rem" }}>
        <h4 style={{ fontSize: "0.9rem", marginBottom: "0.5rem", opacity: 0.8 }}>Trim Video</h4>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "0.8rem", opacity: 0.9, marginBottom: "0.25rem", display: "block" }}>
              Start: {formatTime(trimStart)}
            </label>
            <input
              type="range"
              min="0"
              max={duration}
              value={trimStart}
              onChange={(e) => setTrimStart(Number(e.target.value))}
              style={{
                width: "100%",
                height: "4px",
                borderRadius: "2px",
                background: "rgba(255,255,255,0.2)",
                outline: "none",
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "0.8rem", opacity: 0.9, marginBottom: "0.25rem", display: "block" }}>
              End: {formatTime(trimEnd)}
            </label>
            <input
              type="range"
              min="0"
              max={duration}
              value={trimEnd}
              onChange={(e) => setTrimEnd(Number(e.target.value))}
              style={{
                width: "100%",
                height: "4px",
                borderRadius: "2px",
                background: "rgba(255,255,255,0.2)",
                outline: "none",
              }}
            />
          </div>
        </div>
      </div>

      {/* Volume Control */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <button
            onClick={toggleMute}
            style={{
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
              padding: "0.25rem",
            }}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <span style={{ fontSize: "0.8rem", opacity: 0.9 }}>Volume: {isMuted ? 0 : volume}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={isMuted ? 0 : volume}
          onChange={(e) => handleVolumeChange(Number(e.target.value))}
          style={{
            width: "100%",
            height: "4px",
            borderRadius: "2px",
            background: "rgba(255,255,255,0.2)",
            outline: "none",
          }}
        />
      </div>

      {/* Speed Control */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ fontSize: "0.8rem", opacity: 0.9, marginBottom: "0.5rem", display: "block" }}>
          Playback Speed: {playbackSpeed}x
        </label>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
            <button
              key={speed}
              onClick={() => handleSpeedChange(speed)}
              style={{
                padding: "0.25rem 0.5rem",
                borderRadius: "0.25rem",
                border: "1px solid rgba(255,255,255,0.2)",
                background: playbackSpeed === speed ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                fontSize: "0.75rem",
              }}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* Apply Changes Button */}
      <button
        onClick={applyChanges}
        style={{
          width: "100%",
          padding: "0.75rem",
          borderRadius: "0.5rem",
          border: "none",
          background: "rgba(16, 185, 129, 0.3)",
          color: "white",
          cursor: "pointer",
          fontSize: "0.9rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
        }}
      >
        <Scissors size={16} />
        Apply Video Changes
      </button>
    </div>
  )
}
