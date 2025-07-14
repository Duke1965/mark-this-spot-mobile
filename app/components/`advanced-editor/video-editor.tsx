"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, Volume2, VolumeX, RotateCcw, Scissors, Zap } from "lucide-react"

interface VideoEditorProps {
  videoUrl: string
  onVideoUpdate: (settings: VideoSettings) => void
}

interface VideoSettings {
  startTime: number
  endTime: number
  playbackSpeed: number
  volume: number
  muted: boolean
}

export function VideoEditor({ videoUrl, onVideoUpdate }: VideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(100)
  const [muted, setMuted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      setEndTime(video.duration)
    }

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(video.currentTime)
      }

      // Auto-pause at end time
      if (video.currentTime >= endTime && endTime > 0) {
        video.pause()
        setIsPlaying(false)
      }
    }

    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("timeupdate", handleTimeUpdate)

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("timeupdate", handleTimeUpdate)
    }
  }, [endTime, isDragging])

  useEffect(() => {
    // Update parent component with current settings
    onVideoUpdate({
      startTime,
      endTime,
      playbackSpeed,
      volume,
      muted,
    })
  }, [startTime, endTime, playbackSpeed, volume, muted, onVideoUpdate])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      // Start from startTime if at beginning
      if (video.currentTime < startTime || video.currentTime >= endTime) {
        video.currentTime = startTime
      }
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

    setVolume(newVolume)
    video.volume = newVolume / 100
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    setMuted(!muted)
    video.muted = !muted
  }

  const handleSpeedChange = (speed: number) => {
    const video = videoRef.current
    if (!video) return

    setPlaybackSpeed(speed)
    video.playbackRate = speed
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const resetToOriginal = () => {
    setStartTime(0)
    setEndTime(duration)
    setPlaybackSpeed(1)
    setVolume(100)
    setMuted(false)

    const video = videoRef.current
    if (video) {
      video.currentTime = 0
      video.playbackRate = 1
      video.volume = 1
      video.muted = false
    }
  }

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.9)",
        padding: "1rem",
        borderRadius: "1rem",
        maxHeight: "500px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <h3
          style={{
            color: "white",
            margin: 0,
            fontSize: "1.1rem",
            fontWeight: "600",
          }}
        >
          Video Editor
        </h3>
        <button
          onClick={resetToOriginal}
          style={{
            padding: "0.5rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "rgba(239, 68, 68, 0.2)",
            color: "rgba(239, 68, 68, 0.9)",
            cursor: "pointer",
            transition: "all 0.3s ease",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.8rem",
          }}
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      {/* Video Preview */}
      <div
        style={{
          marginBottom: "1rem",
          borderRadius: "0.75rem",
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
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      </div>

      {/* Playback Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1.5rem",
          padding: "0.75rem",
          background: "rgba(255,255,255,0.05)",
          borderRadius: "0.75rem",
        }}
      >
        <button
          onClick={togglePlay}
          style={{
            padding: "0.75rem",
            borderRadius: "50%",
            border: "none",
            background: "rgba(16, 185, 129, 0.3)",
            color: "#10B981",
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>

        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
            }}
          >
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.8rem" }}>{formatTime(currentTime)}</span>
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.8rem" }}>{formatTime(duration)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={duration}
            value={currentTime}
            onChange={(e) => handleSeek(Number.parseFloat(e.target.value))}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            style={{
              width: "100%",
              height: "4px",
              borderRadius: "2px",
              background: "rgba(255,255,255,0.2)",
              outline: "none",
              cursor: "pointer",
            }}
          />
        </div>

        <button
          onClick={toggleMute}
          style={{
            padding: "0.5rem",
            borderRadius: "0.5rem",
            border: "none",
            background: muted ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.1)",
            color: muted ? "rgba(239, 68, 68, 0.9)" : "white",
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>

      {/* Trim Controls */}
      <div
        style={{
          marginBottom: "1.5rem",
          padding: "1rem",
          background: "rgba(255,255,255,0.05)",
          borderRadius: "0.75rem",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          <Scissors size={16} style={{ color: "rgba(255,255,255,0.8)" }} />
          <h4
            style={{
              color: "white",
              margin: 0,
              fontSize: "0.9rem",
              fontWeight: "500",
            }}
          >
            Trim Video
          </h4>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
            }}
          >
            <label
              style={{
                color: "rgba(255,255,255,0.8)",
                fontSize: "0.8rem",
              }}
            >
              Start Time
            </label>
            <span
              style={{
                color: "white",
                fontSize: "0.8rem",
                fontWeight: "500",
              }}
            >
              {formatTime(startTime)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={duration}
            value={startTime}
            onChange={(e) => setStartTime(Number.parseFloat(e.target.value))}
            style={{
              width: "100%",
              height: "4px",
              borderRadius: "2px",
              background: "rgba(255,255,255,0.2)",
              outline: "none",
              cursor: "pointer",
            }}
          />
        </div>

        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
            }}
          >
            <label
              style={{
                color: "rgba(255,255,255,0.8)",
                fontSize: "0.8rem",
              }}
            >
              End Time
            </label>
            <span
              style={{
                color: "white",
                fontSize: "0.8rem",
                fontWeight: "500",
              }}
            >
              {formatTime(endTime)}
            </span>
          </div>
          <input
            type="range"
            min={startTime}
            max={duration}
            value={endTime}
            onChange={(e) => setEndTime(Number.parseFloat(e.target.value))}
            style={{
              width: "100%",
              height: "4px",
              borderRadius: "2px",
              background: "rgba(255,255,255,0.2)",
              outline: "none",
              cursor: "pointer",
            }}
          />
        </div>
      </div>

      {/* Speed & Volume Controls */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
        }}
      >
        {/* Speed Control */}
        <div
          style={{
            padding: "1rem",
            background: "rgba(255,255,255,0.05)",
            borderRadius: "0.75rem",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            <Zap size={16} style={{ color: "rgba(255,255,255,0.8)" }} />
            <h4
              style={{
                color: "white",
                margin: 0,
                fontSize: "0.9rem",
                fontWeight: "500",
              }}
            >
              Speed
            </h4>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
            }}
          >
            <span
              style={{
                color: "rgba(255,255,255,0.8)",
                fontSize: "0.8rem",
              }}
            >
              Playback Speed
            </span>
            <span
              style={{
                color: "white",
                fontSize: "0.8rem",
                fontWeight: "500",
              }}
            >
              {playbackSpeed}x
            </span>
          </div>
          <input
            type="range"
            min={0.25}
            max={3}
            step={0.25}
            value={playbackSpeed}
            onChange={(e) => handleSpeedChange(Number.parseFloat(e.target.value))}
            style={{
              width: "100%",
              height: "4px",
              borderRadius: "2px",
              background: "rgba(255,255,255,0.2)",
              outline: "none",
              cursor: "pointer",
            }}
          />
        </div>

        {/* Volume Control */}
        <div
          style={{
            padding: "1rem",
            background: "rgba(255,255,255,0.05)",
            borderRadius: "0.75rem",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            <Volume2 size={16} style={{ color: "rgba(255,255,255,0.8)" }} />
            <h4
              style={{
                color: "white",
                margin: 0,
                fontSize: "0.9rem",
                fontWeight: "500",
              }}
            >
              Volume
            </h4>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
            }}
          >
            <span
              style={{
                color: "rgba(255,255,255,0.8)",
                fontSize: "0.8rem",
              }}
            >
              Audio Level
            </span>
            <span
              style={{
                color: "white",
                fontSize: "0.8rem",
                fontWeight: "500",
              }}
            >
              {volume}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => handleVolumeChange(Number.parseInt(e.target.value))}
            style={{
              width: "100%",
              height: "4px",
              borderRadius: "2px",
              background: "rgba(255,255,255,0.2)",
              outline: "none",
              cursor: "pointer",
            }}
          />
        </div>
      </div>
    </div>
  )
}
