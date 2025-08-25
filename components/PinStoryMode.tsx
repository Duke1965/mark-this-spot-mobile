"use client"

import { useState, useCallback, useEffect } from "react"
import { ArrowLeft, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Settings } from "lucide-react"
import type { PinData } from "@/app/page"

interface PinStoryModeProps {
  pins: PinData[]
  onBack: () => void
}

export function PinStoryMode({ pins, onBack }: PinStoryModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(3000) // 3 seconds per slide
  const [showSettings, setShowSettings] = useState(false)

  // Filter pins that have media
  const mediaPins = pins.filter((pin) => pin.mediaUrl)
  const currentPin = mediaPins[currentIndex]

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying && mediaPins.length > 0) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % mediaPins.length)
      }, playbackSpeed)
    }
    return () => clearInterval(interval)
  }, [isPlaying, mediaPins.length, playbackSpeed])

  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % mediaPins.length)
  }, [mediaPins.length])

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + mediaPins.length) % mediaPins.length)
  }, [mediaPins.length])

  const handleMute = useCallback(() => {
    setIsMuted(!isMuted)
  }, [isMuted])

  if (mediaPins.length === 0) {
    return (
              <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
            color: "white",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
          }}
        >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📖</div>
          <h2 style={{ margin: "0 0 1rem 0", fontSize: "1.5rem" }}>No Stories Yet</h2>
          <p style={{ margin: "0 0 2rem 0", opacity: 0.7 }}>
            Create some pins with photos or videos to build your story collection!
          </p>
          <button
            onClick={onBack}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.15)",
              color: "white",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: "bold",
              transition: "all 0.2s ease",
              backdropFilter: "blur(10px)",
            }}
          >
            Back to Map
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
        color: "white",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
              <div
          style={{
            position: "absolute",
            top: "1rem",
            left: "1rem",
            right: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 10,
            background: "rgba(30, 58, 138, 0.95)",
            borderRadius: "0.75rem",
            padding: "0.75rem",
            backdropFilter: "blur(15px)",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
        <button
          onClick={onBack}
          style={{
            padding: "0.75rem",
            borderRadius: "0.75rem",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.15)",
            color: "white",
            cursor: "pointer",
            transition: "all 0.2s ease",
            backdropFilter: "blur(10px)",
          }}
        >
          <ArrowLeft size={20} />
        </button>

        <div style={{ textAlign: "center" }}>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: "bold" }}>Story Mode</h2>
          <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.7 }}>
            {currentIndex + 1} of {mediaPins.length}
          </p>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{
            padding: "0.75rem",
            borderRadius: "0.75rem",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.15)",
            color: "white",
            cursor: "pointer",
            transition: "all 0.2s ease",
            backdropFilter: "blur(10px)",
          }}
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div
          style={{
            position: "absolute",
            top: "5rem",
            right: "1rem",
            background: "rgba(30, 58, 138, 0.95)",
            borderRadius: "0.75rem",
            padding: "1rem",
            zIndex: 20,
            minWidth: "200px",
            backdropFilter: "blur(15px)",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <h3 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: "bold" }}>Playback Settings</h3>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.75rem", marginBottom: "0.5rem", opacity: 0.8 }}>
              Speed: {playbackSpeed / 1000}s per slide
            </label>
            <input
              type="range"
              min="1000"
              max="10000"
              step="500"
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <button
            onClick={() => setShowSettings(false)}
            style={{
              width: "100%",
              padding: "0.5rem",
              borderRadius: "0.25rem",
              border: "none",
              background: "#3B82F6",
              color: "white",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Done
          </button>
        </div>
      )}

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {currentPin && (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {currentPin.mediaType === "photo" ? (
              <img
                src={currentPin.mediaUrl || "/placeholder.svg"}
                alt={currentPin.title}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
              />
            ) : (
              <video
                src={currentPin.mediaUrl || undefined}
                autoPlay
                muted={isMuted}
                loop
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                }}
              />
            )}

            {/* Pin Info Overlay */}
            <div
              style={{
                position: "absolute",
                bottom: "6rem",
                left: "1rem",
                right: "1rem",
                background: "rgba(0,0,0,0.7)",
                borderRadius: "0.5rem",
                padding: "1rem",
                backdropFilter: "blur(10px)",
              }}
            >
              <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.125rem", fontWeight: "bold" }}>{currentPin.title}</h3>
              <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.875rem", opacity: 0.8 }}>📍 {currentPin.locationName}</p>
              {currentPin.description && (
                <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.875rem" }}>{currentPin.description}</p>
              )}
              <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.6 }}>
                {new Date(currentPin.timestamp).toLocaleDateString()} at{" "}
                {new Date(currentPin.timestamp).toLocaleTimeString()}
              </p>

              {/* Audio Player */}
              {currentPin.audioUrl && (
                <div style={{ marginTop: "0.75rem" }}>
                  <audio
                    src={currentPin.audioUrl}
                    controls
                    style={{
                      width: "100%",
                      height: "32px",
                      background: "rgba(255,255,255,0.1)",
                      borderRadius: "0.25rem",
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div
        style={{
          position: "absolute",
          bottom: "4.5rem",
          left: "1rem",
          right: "1rem",
          height: "4px",
          background: "rgba(255,255,255,0.3)",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${((currentIndex + 1) / mediaPins.length) * 100}%`,
            height: "100%",
            background: "#10B981",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* Controls */}
      <div
        style={{
          position: "absolute",
          bottom: "1rem",
          left: "1rem",
          right: "1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          background: "rgba(0,0,0,0.7)",
          borderRadius: "2rem",
          padding: "1rem",
          backdropFilter: "blur(10px)",
        }}
      >
        <button
          onClick={handlePrevious}
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
          onClick={handlePlayPause}
          style={{
            padding: "1rem",
            borderRadius: "50%",
            border: "none",
            background: isPlaying ? "#EF4444" : "#10B981",
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
          onClick={handleNext}
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

        {currentPin?.mediaType === "video" && (
          <button
            onClick={handleMute}
            style={{
              padding: "0.75rem",
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              cursor: "pointer",
            }}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        )}
      </div>
    </div>
  )
}
