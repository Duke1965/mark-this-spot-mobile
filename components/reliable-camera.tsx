"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Camera, Video, RotateCcw, X, Zap, ZapOff, ZoomIn, ZoomOut, Focus } from "lucide-react"

interface ReliableCameraProps {
  mode: "photo" | "video"
  onCapture: (mediaData: string, type: "photo" | "video") => void
  onClose: () => void
}

export function ReliableCamera({ mode, onCapture, onClose }: ReliableCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")
  const [flashEnabled, setFlashEnabled] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [maxZoom, setMaxZoom] = useState(3)
  const [capabilities, setCapabilities] = useState<any>(null)

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      setCameraReady(false)

      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      // Optimize camera constraints for mobile performance
      const isMobile = typeof window !== "undefined" && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: isMobile ? 1280 : 1920 }, // Lower resolution on mobile
          height: { ideal: isMobile ? 720 : 1080 }, // Lower resolution on mobile
          frameRate: { ideal: isMobile ? 24 : 30 }, // Lower frame rate on mobile to save battery
        },
        audio: mode === "video",
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraReady(true)

        // Get camera capabilities for zoom
        const videoTrack = stream.getVideoTracks()[0]
        if (videoTrack) {
          const trackCapabilities = videoTrack.getCapabilities()
          setCapabilities(trackCapabilities)

          if (trackCapabilities.zoom) {
            setMaxZoom(trackCapabilities.zoom.max || 3)
          }
        }
      }

      console.log(`📹 Camera started in ${mode} mode, facing: ${facingMode}`)
    } catch (err) {
      console.error("❌ Camera access failed:", err)
      setError("Camera access denied or not available")
    }
  }, [facingMode, mode])

  useEffect(() => {
    startCamera()

    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [startCamera])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRecording])

  const switchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"))
    setZoom(1) // Reset zoom when switching cameras
  }, [])

  const toggleFlash = useCallback(async () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0]
      if (videoTrack && "applyConstraints" in videoTrack) {
        try {
          await videoTrack.applyConstraints({
            advanced: [{ torch: !flashEnabled } as any],
          })
          setFlashEnabled(!flashEnabled)
        } catch (err) {
          console.warn("Flash not supported:", err)
        }
      }
    }
  }, [flashEnabled])

  const handleZoom = useCallback(
    async (newZoom: number) => {
      if (!streamRef.current) return

      const videoTrack = streamRef.current.getVideoTracks()[0]
      if (videoTrack && capabilities?.zoom) {
        try {
          await videoTrack.applyConstraints({
            advanced: [{ zoom: newZoom } as any],
          })
          setZoom(newZoom)
        } catch (err) {
          console.warn("Zoom not supported:", err)
        }
      }
    },
    [capabilities],
  )

  const handleFocus = useCallback(
    async (event: React.TouchEvent | React.MouseEvent) => {
      if (!videoRef.current || !streamRef.current) return

      const rect = videoRef.current.getBoundingClientRect()
      const x = ("touches" in event ? event.touches[0].clientX : event.clientX) - rect.left
      const y = ("touches" in event ? event.touches[0].clientY : event.clientY) - rect.top

      // Convert to relative coordinates (0-1)
      const relativeX = x / rect.width
      const relativeY = y / rect.height

      const videoTrack = streamRef.current.getVideoTracks()[0]
      if (videoTrack && capabilities?.focusMode) {
        try {
          await videoTrack.applyConstraints({
            advanced: [
              {
                focusMode: "single-shot",
                pointsOfInterest: [{ x: relativeX, y: relativeY }],
              } as any,
            ],
          })

          // Show focus indicator
          showFocusIndicator(x, y)
        } catch (err) {
          console.warn("Focus not supported:", err)
        }
      }
    },
    [capabilities],
  )

  const showFocusIndicator = (x: number, y: number) => {
    const indicator = document.createElement("div")
    indicator.style.cssText = `
      position: absolute;
      left: ${x - 25}px;
      top: ${y - 25}px;
      width: 50px;
      height: 50px;
      border: 2px solid #10B981;
      border-radius: 50%;
      pointer-events: none;
      z-index: 1000;
      animation: focusPulse 0.6s ease-out;
    `

    const style = document.createElement("style")
    style.textContent = `
      @keyframes focusPulse {
        0% { transform: scale(1.5); opacity: 0; }
        50% { transform: scale(1); opacity: 1; }
        100% { transform: scale(0.8); opacity: 0; }
      }
    `
    document.head.appendChild(style)

    videoRef.current?.parentElement?.appendChild(indicator)

    setTimeout(() => {
      indicator.remove()
      style.remove()
    }, 600)
  }

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert to data URL
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9)

    console.log("📸 Photo captured successfully")
    onCapture(dataUrl, "photo")
  }, [onCapture])

  const startVideoRecording = useCallback(() => {
    if (!streamRef.current) return

    try {
      chunksRef.current = []
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: "video/webm;codecs=vp9",
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" })
        const videoUrl = URL.createObjectURL(blob)
        console.log("🎥 Video recording completed")
        onCapture(videoUrl, "video")
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      console.log("🎥 Video recording started")
    } catch (err) {
      console.error("❌ Video recording failed:", err)
      setError("Video recording not supported")
    }
  }, [onCapture])

  const stopVideoRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      console.log("🎥 Video recording stopped")
    }
  }, [isRecording])

  const handleCapture = useCallback(() => {
    if (mode === "photo") {
      capturePhoto()
    } else {
      if (isRecording) {
        stopVideoRecording()
      } else {
        startVideoRecording()
      }
    }
  }, [mode, isRecording, capturePhoto, startVideoRecording, stopVideoRecording])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
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
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        color: "white",
      }}
    >
      {/* Camera View */}
      <div
        style={{
          flex: 1,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
          onTouchStart={handleFocus}
          onClick={handleFocus}
        />

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Top Controls */}
        <div
          style={{
            position: "absolute",
            top: "1rem",
            left: "1rem",
            right: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 10,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "0.75rem",
              borderRadius: "50%",
              border: "none",
              background: "rgba(0,0,0,0.6)",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={24} />
          </button>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={toggleFlash}
              style={{
                padding: "0.75rem",
                borderRadius: "50%",
                border: "none",
                background: flashEnabled ? "rgba(255, 193, 7, 0.8)" : "rgba(0,0,0,0.6)",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {flashEnabled ? <Zap size={20} /> : <ZapOff size={20} />}
            </button>

            <button
              onClick={switchCamera}
              style={{
                padding: "0.75rem",
                borderRadius: "50%",
                border: "none",
                background: "rgba(0,0,0,0.6)",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <RotateCcw size={20} />
            </button>
          </div>
        </div>

        {/* Zoom Controls */}
        {capabilities?.zoom && (
          <div
            style={{
              position: "absolute",
              right: "1rem",
              top: "50%",
              transform: "translateY(-50%)",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              zIndex: 10,
            }}
          >
            <button
              onClick={() => handleZoom(Math.min(zoom + 0.5, maxZoom))}
              disabled={zoom >= maxZoom}
              style={{
                padding: "0.75rem",
                borderRadius: "50%",
                border: "none",
                background: zoom >= maxZoom ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.6)",
                color: "white",
                cursor: zoom >= maxZoom ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ZoomIn size={20} />
            </button>

            <div
              style={{
                padding: "0.5rem",
                background: "rgba(0,0,0,0.6)",
                borderRadius: "1rem",
                fontSize: "0.75rem",
                textAlign: "center",
                minWidth: "40px",
              }}
            >
              {zoom.toFixed(1)}x
            </div>

            <button
              onClick={() => handleZoom(Math.max(zoom - 0.5, 1))}
              disabled={zoom <= 1}
              style={{
                padding: "0.75rem",
                borderRadius: "50%",
                border: "none",
                background: zoom <= 1 ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.6)",
                color: "white",
                cursor: zoom <= 1 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ZoomOut size={20} />
            </button>
          </div>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div
            style={{
              position: "absolute",
              top: "5rem",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(239, 68, 68, 0.9)",
              padding: "0.5rem 1rem",
              borderRadius: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "1rem",
              fontWeight: "bold",
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "white",
                animation: "pulse 1s infinite",
              }}
            />
            REC {formatTime(recordingTime)}
          </div>
        )}

        {/* Focus hint */}
        <div
          style={{
            position: "absolute",
            bottom: "8rem",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.6)",
            padding: "0.5rem 1rem",
            borderRadius: "1rem",
            fontSize: "0.875rem",
            opacity: 0.7,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Focus size={16} />
          Tap to focus
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "rgba(239, 68, 68, 0.9)",
              padding: "1rem",
              borderRadius: "1rem",
              textAlign: "center",
              maxWidth: "80%",
              zIndex: 10,
            }}
          >
            <p style={{ margin: 0, fontSize: "1rem" }}>{error}</p>
          </div>
        )}

        {/* Loading indicator */}
        {!cameraReady && !error && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "rgba(0,0,0,0.8)",
              padding: "2rem",
              borderRadius: "1rem",
              textAlign: "center",
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: "3rem",
                height: "3rem",
                border: "4px solid rgba(255,255,255,0.3)",
                borderTop: "4px solid white",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 1rem",
              }}
            />
            <p style={{ margin: 0, fontSize: "1rem" }}>Starting camera...</p>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div
        style={{
          padding: "2rem",
          background: "rgba(30, 58, 138, 0.95)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          backdropFilter: "blur(15px)",
          borderTop: "1px solid rgba(255,255,255,0.2)",
        }}
      >
        {/* Capture Button */}
        <button
          onClick={handleCapture}
          disabled={!cameraReady}
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            border: "4px solid white",
            background: isRecording ? "#EF4444" : cameraReady ? "white" : "rgba(255,255,255,0.5)",
            cursor: cameraReady ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.3s ease",
            position: "relative",
          }}
        >
          {mode === "photo" ? (
            <Camera size={32} color={cameraReady ? "#000" : "#666"} />
          ) : (
            <Video size={32} color={isRecording ? "white" : cameraReady ? "#000" : "#666"} />
          )}

          {isRecording && (
            <div
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                border: "4px solid #EF4444",
                animation: "pulse 1s infinite",
              }}
            />
          )}
        </button>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
