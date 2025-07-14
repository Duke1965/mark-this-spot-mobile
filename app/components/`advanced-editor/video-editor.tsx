"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, RotateCw, Volume2, VolumeX, Scissors, Download, Settings } from "lucide-react"

interface VideoEditorProps {
  videoUrl: string
  onVideoUpdate?: (settings: any) => void
  onVideoProcessed?: (processedUrl: string) => void
}

export function VideoEditor({ videoUrl, onVideoUpdate, onVideoProcessed }: VideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(100)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(0)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      setEndTime(video.duration)
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

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.volume = volume / 100
    video.muted = isMuted
    video.playbackRate = playbackSpeed

    const filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
    video.style.filter = filter

    // Update parent component
    onVideoUpdate?.({
      startTime,
      endTime,
      playbackSpeed,
      volume,
      muted: isMuted,
      brightness,
      contrast,
      saturation,
    })
  }, [volume, isMuted, playbackSpeed, startTime, endTime, brightness, contrast, saturation, onVideoUpdate])

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

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const handleTrimStart = () => {
    setStartTime(currentTime)
  }

  const handleTrimEnd = () => {
    setEndTime(currentTime)
  }

  const resetSettings = () => {
    setBrightness(100)
    setContrast(100)
    setSaturation(100)
    setPlaybackSpeed(1)
    setVolume(100)
    setIsMuted(false)
    setStartTime(0)
    setEndTime(duration)
  }

  const exportVideo = () => {
    // In a real implementation, this would process the video with the applied settings
    console.log("Exporting video with settings:", {
      startTime,
      endTime,
      playbackSpeed,
      volume,
      muted: isMuted,
      brightness,
      contrast,
      saturation,
    })
    onVideoProcessed?.(videoUrl) // For now, just return the original URL
  }

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.9)",
        padding: "1rem",
        borderRadius: "1rem",
        color: "white",
        maxHeight: "600px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <RotateCw size={20} />
        <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "600" }}>Video Editor</h3>
      </div>

      {/* Video Preview */}
      <div
        style={{
          position: "relative",
          marginBottom: "1.5rem",
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
            objectFit: "cover",
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Video Controls Overlay */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
            padding: "1rem",
          }}
        >
          {/* Progress Bar */}
          <div style={{ marginBottom: "0.5rem" }}>
            <input
              type="range"
              min={0}
              max={duration}
              value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              style={{
                width: "100%",
                height: "4px",
                borderRadius: "2px",
                background: "rgba(255,255,255,0.3)",
                outline: "none",
                cursor: "pointer",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.8rem",
                color: "rgba(255,255,255,0.8)",
                marginTop: "0.25rem",
              }}
            >
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "1rem",
            }}
          >
            <button
              onClick={togglePlayPause}
              style={{
                padding: "0.5rem",
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
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              style={{
                padding: "0.5rem",
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
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Trim Controls */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h4
          style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: "0.9rem",
            margin: "0 0 1rem 0",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Scissors size={16} />
          Trim Video
        </h4>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <button
            onClick={handleTrimStart}
            style={{
              flex: 1,
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.1)",
              color: "white",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            Set Start ({formatTime(currentTime)})
          </button>
          <button
            onClick={handleTrimEnd}
            style={{
              flex: 1,
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.1)",
              color: "white",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            Set End ({formatTime(currentTime)})
          </button>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.8rem",
            color: "rgba(255,255,255,0.7)",
          }}
        >
          <span>Start: {formatTime(startTime)}</span>
          <span>End: {formatTime(endTime)}</span>
          <span>Duration: {formatTime(endTime - startTime)}</span>
        </div>
      </div>

      {/* Playback Speed */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.5rem",
          }}
        >
          <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.8)" }}>Playback Speed</label>
          <span style={{ fontSize: "0.8rem", color: "white" }}>{playbackSpeed}x</span>
        </div>
        <input
          type="range"
          min={0.25}
          max={2}
          step={0.25}
          value={playbackSpeed}
          onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
          style={{
            width: "100%",
            height: "4px",
            borderRadius: "2px",
            background: "rgba(255,255,255,0.2)",
            outline: "none",
            cursor: "pointer",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.7rem",
            color: "rgba(255,255,255,0.5)",
            marginTop: "0.25rem",
          }}
        >
          <span>0.25x</span>
          <span>1x</span>
          <span>2x</span>
        </div>
      </div>

      {/* Volume Control */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.5rem",
          }}
        >
          <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.8)" }}>Volume</label>
          <span style={{ fontSize: "0.8rem", color: "white" }}>{volume}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
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

      {/* Video Effects */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h4
          style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: "0.9rem",
            margin: "0 0 1rem 0",
            fontWeight: "500",
          }}
        >
          Video Effects
        </h4>

        {/* Brightness */}
        <div style={{ marginBottom: "1rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
            }}
          >
            <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.8)" }}>Brightness</label>
            <span style={{ fontSize: "0.8rem", color: "white" }}>{brightness}%</span>
          </div>
          <input
            type="range"
            min={50}
            max={150}
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
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

        {/* Contrast */}
        <div style={{ marginBottom: "1rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
            }}
          >
            <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.8)" }}>Contrast</label>
            <span style={{ fontSize: "0.8rem", color: "white" }}>{contrast}%</span>
          </div>
          <input
            type="range"
            min={50}
            max={150}
            value={contrast}
            onChange={(e) => setContrast(Number(e.target.value))}
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

        {/* Saturation */}
        <div style={{ marginBottom: "1rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
            }}
          >
            <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.8)" }}>Saturation</label>
            <span style={{ fontSize: "0.8rem", color: "white" }}>{saturation}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={200}
            value={saturation}
            onChange={(e) => setSaturation(Number(e.target.value))}
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

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={resetSettings}
          style={{
            flex: 1,
            padding: "0.75rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.1)",
            color: "white",
            cursor: "pointer",
            fontSize: "0.8rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          <Settings size={16} />
          Reset
        </button>
        <button
          onClick={exportVideo}
          style={{
            flex: 1,
            padding: "0.75rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
            color: "white",
            cursor: "pointer",
            fontSize: "0.8rem",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          <Download size={16} />
          Apply
        </button>
      </div>
    </div>
  )
}
