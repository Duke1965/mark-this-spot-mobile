"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Camera, Video, RotateCcw, Zap, ZapOff } from "lucide-react"

interface ReliableCameraProps {
  onPhotoCapture: (photoUrl: string) => void
  onVideoCapture: (videoUrl: string) => void
  isRecording: boolean
}

export function ReliableCamera({ onPhotoCapture, onVideoCapture, isRecording }: ReliableCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const videoChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const initializationAttemptedRef = useRef(false)

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isVideoMode, setIsVideoMode] = useState(false)
  const [isVideoRecording, setIsVideoRecording] = useState(false)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")
  const [flashEnabled, setFlashEnabled] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isCameraReady, setIsCameraReady] = useState(false)

  const startCamera = useCallback(async () => {
    // Prevent multiple initialization attempts
    if (initializationAttemptedRef.current) return
    initializationAttemptedRef.current = true

    try {
      setCameraError(null)
      setIsCameraReady(false)

      // Clean up existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
        audio: false, // Don't request audio for camera stream
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = newStream
      setStream(newStream)

      if (videoRef.current) {
        videoRef.current.srcObject = newStream

        // Handle video loading properly
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current
              .play()
              .then(() => {
                setIsCameraReady(true)
                console.log(`📷 Camera ready - ${facingMode} facing, ${isVideoMode ? "video" : "photo"} mode`)
              })
              .catch((error) => {
                console.error("Video play error:", error)
                // Don't restart camera on play error, just mark as ready
                setIsCameraReady(true)
              })
          }
        }

        videoRef.current.onerror = (error) => {
          console.error("Video element error:", error)
          setIsCameraReady(true) // Still mark as ready to prevent infinite loops
        }
      }
    } catch (error) {
      console.error("❌ Camera access error:", error)
      setCameraError("Camera access denied. Please allow camera permissions.")
      setIsCameraReady(true) // Mark as ready even on error to prevent loops
    }
  }, [facingMode, isVideoMode])

  // Initialize camera only once on mount
  useEffect(() => {
    startCamera()

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, []) // Empty dependency array - only run once

  // Handle facing mode changes
  useEffect(() => {
    if (initializationAttemptedRef.current && isCameraReady) {
      initializationAttemptedRef.current = false
      startCamera()
    }
  }, [facingMode, startCamera])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) return

    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720

    // Apply flash effect
    if (flashEnabled) {
      document.body.style.background = "white"
      setTimeout(() => {
        document.body.style.background = ""
      }, 100)
    }

    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

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
    } catch (err) {
      console.error("Error capturing photo:", err)
    }
  }, [flashEnabled, onPhotoCapture])

  const startVideoRecording = useCallback(() => {
    if (!stream) return

    try {
      videoChunksRef.current = []

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "video/mp4",
      })

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const videoBlob = new Blob(videoChunksRef.current, {
          type: mediaRecorderRef.current?.mimeType || "video/webm",
        })
        const videoUrl = URL.createObjectURL(videoBlob)
        onVideoCapture(videoUrl)
        console.log("🎥 Video recorded successfully")
      }

      mediaRecorderRef.current.start()
      setIsVideoRecording(true)
      console.log("🎥 Video recording started")
    } catch (error) {
      console.error("❌ Video recording error:", error)
    }
  }, [stream, onVideoCapture])

  const stopVideoRecording = useCallback(() => {
    if (mediaRecorderRef.current && isVideoRecording) {
      mediaRecorderRef.current.stop()
      setIsVideoRecording(false)
      console.log("🎥 Video recording stopped")
    }
  }, [isVideoRecording])

  const toggleCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"))
  }, [])

  const handleCaptureClick = useCallback(() => {
    if (isVideoMode) {
      if (isVideoRecording) {
        stopVideoRecording()
      } else {
        startVideoRecording()
      }
    } else {
      capturePhoto()
    }
  }, [isVideoMode, isVideoRecording, capturePhoto, startVideoRecording, stopVideoRecording])

  if (cameraError) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-4 text-center p-8">
        <div className="text-6xl">📷</div>
        <h3 className="text-xl font-bold">Camera Access Required</h3>
        <p className="opacity-80">{cameraError}</p>
        <button
          onClick={() => {
            initializationAttemptedRef.current = false
            setCameraError(null)
            startCamera()
          }}
          className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-bold transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 relative overflow-hidden bg-black">
      {/* Camera Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
      />

      {/* Circular Viewfinder Overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Dark overlay with circular hole */}
        <div
          className="absolute inset-0 bg-black"
          style={{
            maskImage: "radial-gradient(circle at center, transparent 120px, black 140px)",
            WebkitMaskImage: "radial-gradient(circle at center, transparent 120px, black 140px)",
          }}
        />

        {/* Circular border with drop shadow */}
        <div
          className="w-60 h-60 rounded-full border-4 border-white/30"
          style={{
            boxShadow: "inset 0 0 20px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.3)",
          }}
        />

        {/* Center crosshair */}
        <div className="absolute w-8 h-8 flex items-center justify-center">
          <div className="w-full h-0.5 bg-white/50 absolute" />
          <div className="h-full w-0.5 bg-white/50 absolute" />
        </div>
      </div>

      {/* Camera Controls */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
        {/* Mode Toggle */}
        <button
          onClick={() => setIsVideoMode(!isVideoMode)}
          className={`p-3 rounded-full transition-all ${
            isVideoMode ? "bg-red-500/80" : "bg-white/20"
          } backdrop-blur-sm`}
          title={isVideoMode ? "Switch to Photo" : "Switch to Video"}
        >
          {isVideoMode ? <Camera size={20} /> : <Video size={20} />}
        </button>

        {/* Main Capture Button */}
        <button
          onClick={handleCaptureClick}
          disabled={!isCameraReady}
          className={`w-20 h-20 rounded-full border-4 transition-all ${
            isVideoRecording
              ? "border-red-500 bg-red-500 scale-90"
              : isVideoMode
                ? "border-red-500 bg-red-500/20"
                : "border-white bg-white/20"
          } backdrop-blur-sm disabled:opacity-50`}
        >
          {isVideoMode ? (
            isVideoRecording ? (
              <div className="w-6 h-6 bg-white rounded-sm mx-auto" />
            ) : (
              <div className="w-8 h-8 bg-white rounded-full mx-auto" />
            )
          ) : (
            <div className="w-16 h-16 bg-blue-500 rounded-full mx-auto" />
          )}
        </button>

        {/* Camera Flip */}
        <button
          onClick={toggleCamera}
          className="p-3 rounded-full bg-white/20 backdrop-blur-sm transition-colors hover:bg-white/30"
          title="Flip Camera"
        >
          <RotateCcw size={20} />
        </button>
      </div>

      {/* Top Controls */}
      <div className="absolute top-6 right-6 flex gap-2">
        {/* Flash Toggle (Photo mode only) */}
        {!isVideoMode && (
          <button
            onClick={() => setFlashEnabled(!flashEnabled)}
            className={`p-2 rounded-full transition-all ${
              flashEnabled ? "bg-yellow-500/80" : "bg-white/20"
            } backdrop-blur-sm`}
            title={flashEnabled ? "Disable Flash" : "Enable Flash"}
          >
            {flashEnabled ? <Zap size={16} /> : <ZapOff size={16} />}
          </button>
        )}
      </div>

      {/* Recording Indicator */}
      {isVideoRecording && (
        <div className="absolute top-6 left-6 flex items-center gap-2 bg-red-500/90 px-3 py-2 rounded-full backdrop-blur-sm">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-sm font-bold">REC</span>
        </div>
      )}

      {/* Loading Indicator */}
      {!isCameraReady && !cameraError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="text-white/80">Starting camera...</span>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
