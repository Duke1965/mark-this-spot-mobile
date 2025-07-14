"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, Volume2, VolumeX, Scissors } from "lucide-react"

interface VideoEditorProps {
  videoUrl: string
  onTrimComplete: (trimmedVideoUrl: string) => void
  platformColor: string
}

export function VideoEditor({ videoUrl, onTrimComplete, platformColor }: VideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
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

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const changePlaybackSpeed = (speed: number) => {
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

  const handleTrim = () => {
    // In a real implementation, you'd use FFmpeg or similar to actually trim the video
    // For now, we'll simulate the trimming process
    console.log(`Trimming video from ${trimStart}s to ${trimEnd}s`)

    // Simulate processing
    setTimeout(() => {
      onTrimComplete(videoUrl) // In reality, this would be the trimmed video URL
    }, 1000)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div>
        <h4 style={{ margin: "0 0 1rem 0", fontSize: "1rem", fontWeight: "bold" }}>🎥 Video Editor</h4>

        {/* Video Preview */}
        <div
          style={{
            position: "relative",
            borderRadius: "0.75rem",
            overflow: "hidden",
            background: "#000",
            marginBottom: "1rem",
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

          {/* Video Controls Overlay */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
              padding: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <button
              onClick={togglePlay}
              style={{
                padding: "0.5rem",
                borderRadius: "50%",
                border: "none",
                background: platformColor,
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>

            <div style={{ flex: 1, fontSize: "0.75rem", color: "white" }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            <button
              onClick={toggleMute}
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

      {/* Timeline */}
      <div>
        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>Timeline</label>
        <div style={{ position: "relative" }}>
          <input
            type="range"
            min="0"
            max={duration}
            step="0.1"
            value={currentTime}
            onChange={(e) => handleSeek(Number(e.target.value))}
            style={{
              width: "100%",
              height: "6px",
              borderRadius: "3px",
              background: `linear-gradient(to right, ${platformColor} 0%, ${platformColor} ${(currentTime / duration) * 100}%, rgba(255,255,255,0.3) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.3) 100%)`,
              outline: "none",
              cursor: "pointer",
            }}
          />
        </div>
      </div>

      {/* Trim Controls */}
      <div>
        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>✂️ Trim Video</label>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div>
            <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.75rem", opacity: 0.8 }}>
              Start: {formatTime(trimStart)}
            </label>
            <input
              type="range"
              min="0"
              max={duration}
              step="0.1"
              value={trimStart}
              onChange={(e) => setTrimStart(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.75rem", opacity: 0.8 }}>
              End: {formatTime(trimEnd)}
            </label>
            <input
              type="range"
              min="0"
              max={duration}
              step="0.1"
              value={trimEnd}
              onChange={(e) => setTrimEnd(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <div
          style={{
            marginTop: "0.5rem",
            padding: "0.5rem",
            borderRadius: "0.5rem",
            background: "rgba(255,255,255,0.1)",
            fontSize: "0.75rem",
            textAlign: "center",
          }}
        >
          Trimmed duration: {formatTime(trimEnd - trimStart)}
        </div>
      </div>

      {/* Playback Speed */}
      <div>
        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
          ⚡ Playback Speed: {playbackSpeed}x
        </label>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
            <button
              key={speed}
              onClick={() => changePlaybackSpeed(speed)}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "1rem",
                border: "none",
                background: playbackSpeed === speed ? platformColor : "rgba(255,255,255,0.1)",
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

      {/* Volume Control */}
      <div>
        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
          🔊 Volume: {Math.round(volume * 100)}%
        </label>
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
          style={{ width: "100%" }}
        />
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "1rem" }}>
        <button
          onClick={handleTrim}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            padding: "1rem",
            borderRadius: "0.75rem",
            border: "none",
            background: `linear-gradient(135deg, ${platformColor}, ${platformColor}CC)`,
            color: "white",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "0.875rem",
          }}
        >
          <Scissors size={16} />
          Apply Trim
        </button>
      </div>

      {/* Pro Tip */}
      <div
        style={{
          padding: "1rem",
          borderRadius: "0.75rem",
          background: "rgba(59, 130, 246, 0.1)",
          border: "1px solid rgba(59, 130, 246, 0.3)",
          fontSize: "0.75rem",
          lineHeight: 1.4,
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "0.25rem" }}>💡 Pro Tip:</div>
        Use the trim controls to create the perfect clip for your platform. Most social media platforms work best with
        shorter, engaging videos!
      </div>
    </div>
  )
}
