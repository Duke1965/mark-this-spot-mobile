"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Camera, Video, RotateCcw } from "lucide-react"

interface SimpleCameraProps {
  onPhotoCapture: (photoUrl: string) => void
  onVideoCapture: (videoUrl: string) => void
  isRecording: boolean
}

export function SimpleCamera({ onPhotoCapture, onVideoCapture, isRecording }: SimpleCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isVideoMode, setIsVideoMode] = useState(false)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")

  const startCamera = useCallback(async () => {
    try {
      console.log("🎥 Starting camera...")
      setError(null)

      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }

      // Request camera access
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      console.log("✅ Camera stream obtained")
      setStream(newStream)

      // Set video source
      if (videoRef.current) {
        videoRef.current.srcObject = newStream
        console.log("📹 Video element connected to stream")
      }
    } catch (err) {
      console.error("❌ Camera error:", err)
      setError("Camera access denied. Please allow camera permissions and refresh the page.")
    }
  }, [facingMode, stream])

  // Initialize camera on mount
  useEffect(() => {
    startCamera()
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  // Restart camera when facing mode changes
  useEffect(() => {
    if (stream) {
      startCamera()
    }
  }, [facingMode])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      console.error("❌ Video or canvas ref not available")
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) {
      console.error("❌ Canvas context not available")
      return
    }

    // Set canvas size to video size
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0)

    // Convert to blob and create URL
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const photoUrl = URL.createObjectURL(blob)
          onPhotoCapture(photoUrl)
          console.log("📸 Photo captured successfully")
        }
      },
      "image/jpeg",
      0.9,
    )
  }, [onPhotoCapture])

  const toggleCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"))
  }, [])

  if (error) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
          gap: "1rem",
        }}
      >
        <div style={{ fontSize: "4rem" }}>📷</div>
        <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", margin: 0 }}>Camera Access Required</h3>
        <p style={{ opacity: 0.8, margin: 0 }}>{error}</p>
        <button
          onClick={startCamera}
          style={{
            background: "#3B82F6",
            color: "white",
            padding: "0.75rem 1.5rem",
            borderRadius: "0.5rem",
            border: "none",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        flex: 1,
        position: "relative",
        background: "#000",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          flex: 1,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: facingMode === "user" ? "scaleX(-1)" : "none",
        }}
        onLoadedMetadata={() => {
          console.log("📹 Video metadata loaded, starting playback")
          if (videoRef.current) {
            videoRef.current.play().catch(console.error)
          }
        }}
      />

      {/* Simple Overlay */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "200px",
          height: "200px",
          border: "2px solid rgba(255,255,255,0.5)",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />

      {/* Controls */}
      <div
        style={{
          position: "absolute",
          bottom: "2rem",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        {/* Mode Toggle */}
        <button
          onClick={() => setIsVideoMode(!isVideoMode)}
          style={{
            width: "50px",
            height: "50px",
            borderRadius: "50%",
            border: "none",
            background: isVideoMode ? "#EF4444" : "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isVideoMode ? <Camera size={20} /> : <Video size={20} />}
        </button>

        {/* Capture Button */}
        <button
          onClick={capturePhoto}
          style={{
            width: "70px",
            height: "70px",
            borderRadius: "50%",
            border: "3px solid white",
            background: isVideoMode ? "rgba(239, 68, 68, 0.3)" : "rgba(59, 130, 246, 0.3)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "50%",
              background: isVideoMode ? "#EF4444" : "#3B82F6",
            }}
          />
        </button>

        {/* Flip Camera */}
        <button
          onClick={toggleCamera}
          style={{
            width: "50px",
            height: "50px",
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
          <RotateCcw size={20} />
        </button>
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  )
}
