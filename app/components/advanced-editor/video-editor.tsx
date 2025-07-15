"use client"

import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react"
import { useState, useRef, useEffect } from "react"

interface VideoEditorProps {
  videoUrl: string
  settings: {
    currentTime: number
    duration: number
    isPlaying: boolean
  }
  onUpdate: (settings: any) => void
}

export function VideoEditor({ videoUrl, settings, onUpdate }: VideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isMuted, setIsMuted] = useState(true)
  const [volume, setVolume] = useState(50)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      onUpdate({
        ...settings,
        duration: video.duration,
        currentTime: 0,
      })
    }

    const handleTimeUpdate = () => {
      onUpdate({
        ...settings,
        currentTime: video.currentTime,
      })
    }

    const handlePlay = () => {
      onUpdate({
        ...settings,
        isPlaying: true,
      })
    }

    const handlePause = () => {
      onUpdate({
        ...settings,
        isPlaying: false,
      })
    }

    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
    }
  }, [settings, onUpdate])

  const togglePlayPause = () => {
    const video = videoRef.current
    if (!video) return

    if (settings.isPlaying) {
      video.pause()
    } else {
      video.play()
    }
  }

  const seekTo = (time: number) => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = time
    onUpdate({
      ...settings,
      currentTime: time,
    })
  }

  const skipBackward = () => {
    const newTime = Math.max(0, settings.currentTime - 5)
    seekTo(newTime)
  }

  const skipForward = () => {
    const newTime = Math.min(settings.duration, settings.currentTime + 5)
    seekTo(newTime)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleVolumeChange = (newVolume: number) => {
    const video = videoRef.current
    if (!video) return

    video.volume = newVolume / 100
    setVolume(newVolume)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div
      style={{
        flex: 1,
        padding: "1.5rem",
        color: "white",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      <div>
        <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.125rem", fontWeight: "bold" }}>🎥 Video Editor</h3>
      </div>

      {/* Video Preview */}
      <div
        style={{
          background: "rgba(0,0,0,0.5)",
          borderRadius: "0.75rem",
          padding: "1rem",
          textAlign: "center",
        }}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          style={{
            width: "100%",
            maxHeight: "200px",
            borderRadius: "0.5rem",
            objectFit: "contain",
          }}
          muted={isMuted}
          onLoadedData={() => {
            const video = videoRef.current
            if (video) {
              video.volume = volume / 100
            }
          }}
        />
      </div>

      {/* Playback Controls */}
      <div>
        <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: "bold" }}>⏯️ PLAYBACK CONTROLS</h4>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "1rem",
            background: "rgba(255,255,255,0.1)",
            borderRadius: "0.5rem",
          }}
        >
          <button
            onClick={skipBackward}
            style={{
              padding: "0.75rem",
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              cursor: "pointer",
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
            {settings.isPlaying ? <Pause size={24} /> : <Play size={24} />}
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
            }}
          >
            <SkipForward size={20} />
          </button>
        </div>
      </div>

      {/* Timeline Scrubber */}
      <div>
        <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: "bold" }}>⏱️ TIMELINE</h4>

        <div style={{ marginBottom: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", opacity: 0.8 }}>
            <span>{formatTime(settings.currentTime)}</span>
            <span>{formatTime(settings.duration)}</span>
          </div>

          <input
            type="range"
            min="0"
            max={settings.duration || 100}
            value={settings.currentTime}
            onChange={(e) => seekTo(Number(e.target.value))}
            style={{
              width: "100%",
              cursor: "pointer",
              marginTop: "0.5rem",
            }}
          />
        </div>
      </div>

      {/* Audio Controls */}
      <div>
        <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: "bold" }}>🔊 AUDIO CONTROLS</h4>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            onClick={toggleMute}
            style={{
              padding: "0.5rem",
              borderRadius: "0.25rem",
              border: "none",
              background: isMuted ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)",
              color: isMuted ? "rgba(239, 68, 68, 0.8)" : "rgba(16, 185, 129, 0.8)",
              cursor: "pointer",
            }}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.75rem", opacity: 0.8, marginBottom: "0.25rem" }}>Volume: {volume}%</div>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              disabled={isMuted}
              style={{
                width: "100%",
                cursor: "pointer",
                opacity: isMuted ? 0.5 : 1,
              }}
            />
          </div>
        </div>
      </div>

      {/* Frame Selection */}
      <div>
        <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: "bold" }}>🖼️ FRAME SELECTION</h4>

        <div
          style={{
            background: "rgba(59, 130, 246, 0.1)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            borderRadius: "0.5rem",
            padding: "1rem",
            fontSize: "0.75rem",
            opacity: 0.9,
          }}
        >
          <p style={{ margin: "0 0 0.5rem 0" }}>
            <strong>Current frame:</strong> {formatTime(settings.currentTime)}
          </p>
          <p style={{ margin: 0 }}>
            This frame will be used as the thumbnail for your postcard when you export. Use the timeline above to select
            the perfect moment!
          </p>
        </div>
      </div>

      {/* Video Info */}
      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          borderRadius: "0.5rem",
          padding: "1rem",
          fontSize: "0.75rem",
        }}
      >
        <h5 style={{ margin: "0 0 0.5rem 0", fontWeight: "bold" }}>📊 Video Information</h5>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", opacity: 0.8 }}>
          <div>Duration: {formatTime(settings.duration)}</div>
          <div>Status: {settings.isPlaying ? "Playing" : "Paused"}</div>
          <div>Audio: {isMuted ? "Muted" : `${volume}%`}</div>
          <div>Frame: {formatTime(settings.currentTime)}</div>
        </div>
      </div>
    </div>
  )
}

