"use client"

import { useRef, useEffect, useState, useCallback } from "react"

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
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Circular Map Interface */}
      <div
        style={{
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          overflow: "hidden",
          position: "relative",
          border: "5px solid white",
          boxShadow: "0 0 10px rgba(0, 0, 0, 0.3)",
        }}
      >
        {/* Replace with your live map component here */}
        <div
          style={{
            width: "100%",
            height: "100%",
            backgroundColor: "#ddd", // Placeholder for the map
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.2rem",
            color: "#666",
          }}
        >
          Live Map Here
        </div>
      </div>

      {/* Camera Button */}
      <button
        onClick={capturePhoto}
        style={{
          marginTop: "2rem",
          padding: "1rem 2rem",
          fontSize: "1rem",
          fontWeight: "bold",
          backgroundColor: "#3B82F6",
          color: "white",
          border: "none",
          borderRadius: "0.5rem",
          cursor: "pointer",
          boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
        }}
      >
        Capture Photo
      </button>

      <canvas ref={canvasRef} style={{ display: "none" }} />
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          display: "none",
        }}
      />
    </div>
  )
}
