"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Scissors, Zap } from "lucide-react"

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
  const [trimEnd, setTrimEnd] = useState(100)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)

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

  const togglePlay = () => {
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

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const processVideo = () => {
    // In a real implementation, this would process the video with the applied settings
    // For now, we'll just return the original URL
    onVideoProcessed(videoUrl)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%" }}>
      {/* Video Player */}
      <div
        style={{
          background: "rgba(255,255,255,0.1)",
          borderRadius: "1rem",
          padding: "1.5rem",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          style={{
            maxWidth: "100%",
            maxHeight: "400px",
            borderRadius: "0.5rem",
            border: "2px solid rgba(255,255,255,0.2)",
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      </div>

      {/* Video Controls */}
      <div
        style={{
          background: "rgba(255,255,255,0.1)",
          borderRadius: "1rem",
          padding: "1.5rem",
        }}
      >
        {/* Playback Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
          <button
            onClick={() => handleSeek(Math.max(0, currentTime - 10))}
            style={{
              padding: "0.5rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              cursor: "pointer",
            }}
          >
            <SkipBack size={20} />
          </button>

          <button
            onClick={togglePlay}
            style={{
              padding: "0.75rem",
              borderRadius: "50%",
              border: "none",
              background: "rgba(16, 185, 129, 0.3)",
              color: "white",
              cursor: "pointer",
            }}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>

          <button
            onClick={() => handleSeek(Math.min(duration, currentTime + 10))}
            style={{
              padding: "0.5rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              cursor: "pointer",
            }}
          >
            <SkipForward size={20} />
          </button>

          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.875rem", minWidth: "40px" }}>{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={(e) => handleSeek(Number.parseFloat(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: "0.875rem", minWidth: "40px" }}>{formatTime(duration)}</span>
          </div>

          <button
            onClick={toggleMute}
            style={{
              padding: "0.5rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              cursor: "pointer",
            }}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(Number.parseFloat(e.target.value))}
            style={{ width: "80px" }}
          />
        </div>

        {/* Trim Controls */}
        <div style={{ marginBottom: "1rem" }}>
          <h4 style={{ margin: "0 0 0.5rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Scissors size={16} />
            Trim Video
          </h4>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.875rem", minWidth: "40px" }}>Start:</span>
            <input
              type="range"
              min="0"
              max={duration}
              value={trimStart}
              onChange={(e) => setTrimStart(Number.parseFloat(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: "0.875rem", minWidth: "60px" }}>{formatTime(trimStart)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
            <span style={{ fontSize: "0.875rem", minWidth: "40px" }}>End:</span>
            <input
              type="range"
              min="0"
              max={duration}
              value={trimEnd}
              onChange={(e) => setTrimEnd(Number.parseFloat(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: "0.875rem", minWidth: "60px" }}>{formatTime(trimEnd)}</span>
          </div>
        </div>

        {/* Speed Controls */}
        <div style={{ marginBottom: "1rem" }}>
          <h4 style={{ margin: "0 0 0.5rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Zap size={16} />
            Playback Speed: {playbackSpeed}x
          </h4>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: playbackSpeed === speed ? "rgba(16, 185, 129, 0.3)" : "rgba(255,255,255,0.2)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Process Button */}
      <button
        onClick={processVideo}
        style={{
          padding: "1rem 2rem",
          borderRadius: "0.5rem",
          border: "none",
          background: "linear-gradient(45deg, #10B981, #059669)",
          color: "white",
          cursor: "pointer",
          fontSize: "1rem",
          fontWeight: "bold",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
        }}
      >
        <Zap size={20} />
        Apply Video Settings
      </button>
    </div>
  )
}
