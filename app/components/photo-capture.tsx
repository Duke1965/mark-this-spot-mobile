"use client"

import React from "react"

import { useRef, useState, useCallback } from "react"
import { Camera, X, RotateCcw, Check } from "lucide-react"

interface PhotoCaptureProps {
  onPhotoCapture: (photoDataUrl: string) => void
  onClose: () => void
  isOpen: boolean
}

export function PhotoCapture({ onPhotoCapture, onClose, isOpen }: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")

  const startCamera = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Stop existing stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = newStream
        await videoRef.current.play()
      }

      setStream(newStream)
    } catch (err) {
      console.error("Camera access failed:", err)
      setError("Camera access denied. Please enable camera permissions.")
    } finally {
      setIsLoading(false)
    }
  }, [facingMode, stream])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
  }, [stream])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) return

    // Set canvas size to video size
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Get image data URL
    const photoDataUrl = canvas.toDataURL("image/jpeg", 0.8)
    setCapturedPhoto(photoDataUrl)
  }, [])

  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null)
  }, [])

  const confirmPhoto = useCallback(() => {
    if (capturedPhoto) {
      onPhotoCapture(capturedPhoto)
      setCapturedPhoto(null)
      stopCamera()
      onClose()
    }
  }, [capturedPhoto, onPhotoCapture, stopCamera, onClose])

  const switchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"))
  }, [])

  // Start camera when component opens
  React.useEffect(() => {
    if (isOpen && !stream && !capturedPhoto) {
      startCamera()
    }

    return () => {
      if (!isOpen) {
        stopCamera()
        setCapturedPhoto(null)
      }
    }
  }, [isOpen, startCamera, stopCamera, stream, capturedPhoto])

  // Update camera when facing mode changes
  React.useEffect(() => {
    if (isOpen && stream) {
      startCamera()
    }
  }, [facingMode, isOpen, startCamera, stream])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.95)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem",
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
        }}
      >
        <h2 style={{ color: "white", fontSize: "1.25rem", fontWeight: "bold", margin: 0 }}>📸 Capture Photo</h2>
        <button
          onClick={onClose}
          style={{
            padding: "0.5rem",
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
          }}
        >
          <X size={24} />
        </button>
      </div>

      {/* Camera View */}
      <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {error ? (
          <div style={{ textAlign: "center", color: "white", padding: "2rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📷</div>
            <h3 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Camera Error</h3>
            <p style={{ marginBottom: "1rem" }}>{error}</p>
            <button
              onClick={startCamera}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "0.75rem",
                border: "none",
                background: "#3B82F6",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Try Again
            </button>
          </div>
        ) : isLoading ? (
          <div style={{ textAlign: "center", color: "white" }}>
            <div
              style={{
                width: "3rem",
                height: "3rem",
                border: "4px solid rgba(255,255,255,0.3)",
                borderTop: "4px solid white",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 1rem auto",
              }}
            />
            <p>Starting camera...</p>
          </div>
        ) : capturedPhoto ? (
          <img
            src={capturedPhoto || "/placeholder.svg"}
            alt="Captured"
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              borderRadius: "0.5rem",
            }}
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "cover",
              borderRadius: "0.5rem",
            }}
          />
        )}

        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>

      {/* Controls */}
      <div
        style={{
          padding: "1.5rem",
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "2rem",
        }}
      >
        {capturedPhoto ? (
          <>
            <button
              onClick={retakePhoto}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "1rem 1.5rem",
                borderRadius: "0.75rem",
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              <RotateCcw size={20} />
              Retake
            </button>
            <button
              onClick={confirmPhoto}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "1rem 1.5rem",
                borderRadius: "0.75rem",
                border: "none",
                background: "#10B981",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              <Check size={20} />
              Use Photo
            </button>
          </>
        ) : (
          <>
            <button
              onClick={switchCamera}
              style={{
                padding: "1rem",
                borderRadius: "50%",
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
              }}
            >
              <RotateCcw size={24} />
            </button>
            <button
              onClick={capturePhoto}
              disabled={!stream}
              style={{
                width: "5rem",
                height: "5rem",
                borderRadius: "50%",
                border: "4px solid white",
                background: stream ? "#EF4444" : "rgba(255,255,255,0.3)",
                cursor: stream ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.3s ease",
              }}
            >
              <Camera size={32} color="white" />
            </button>
            <div style={{ width: "3rem" }} /> {/* Spacer */}
          </>
        )}
      </div>
    </div>
  )
}
