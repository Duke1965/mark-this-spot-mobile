"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Camera, Video, ArrowLeft, RotateCcw, Zap, ZapOff } from "lucide-react"
import type { LocationData } from "@/hooks/useLocationServices"
import type { MediaType } from "@/app/page"

interface CameraCaptureProps {
  onCapture: (mediaUrl: string, mediaType: MediaType) => void
  onBack: () => void
  location: LocationData | null
}

export function CameraCapture({ onCapture, onBack, location }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isVideoMode, setIsVideoMode] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")
  const [flashEnabled, setFlashEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize camera
  useEffect(() => {
    const initCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })

        setStream(mediaStream)
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      } catch (err) {
        console.error("Camera error:", err)
        setError("Camera access denied. Please allow camera permissions.")
      }
    }

    initCamera()

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [facingMode])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Flash effect
    if (flashEnabled) {
      document.body.style.background = "white"
      setTimeout(() => {
        document.body.style.background = ""
      }, 100)
    }

    ctx.drawImage(video, 0, 0)

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const photoUrl = URL.createObjectURL(blob)
          onCapture(photoUrl, "photo")
        }
      },
      "image/jpeg",
      0.9,
    )
  }, [flashEnabled, onCapture])

  const startVideoRecording = useCallback(() => {
    if (!stream) return

    chunksRef.current = []
    mediaRecorderRef.current = new MediaRecorder(stream)

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data)
      }
    }

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" })
      const videoUrl = URL.createObjectURL(blob)
      onCapture(videoUrl, "video")
    }

    mediaRecorderRef.current.start()
    setIsRecording(true)
  }, [stream, onCapture])

  const stopVideoRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording])

  const handleCaptureClick = useCallback(() => {
    if (isVideoMode) {
      if (isRecording) {
        stopVideoRecording()
      } else {
        startVideoRecording()
      }
    } else {
      capturePhoto()
    }
  }, [isVideoMode, isRecording, capturePhoto, startVideoRecording, stopVideoRecording])

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-4 text-center p-8">
        <div className="text-6xl">📷</div>
        <h3 className="text-xl font-bold">Camera Access Required</h3>
        <p className="opacity-80">{error}</p>
        <button
          onClick={onBack}
          className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-bold transition-colors"
        >
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-black">
      {/* Header */}
      <div className="bg-black/50 p-4 flex items-center justify-between z-10">
        <button onClick={onBack} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>

        <div className="text-center">
          <div className="font-bold">📸 Capture Mode</div>
          {location && <div className="text-sm opacity-80">📍 {location.name}</div>}
        </div>

        <div className="flex gap-2">
          {!isVideoMode && (
            <button
              onClick={() => setFlashEnabled(!flashEnabled)}
              className={`p-2 rounded-full transition-colors ${
                flashEnabled ? "bg-yellow-500" : "bg-white/20 hover:bg-white/30"
              }`}
            >
              {flashEnabled ? <Zap size={16} /> : <ZapOff size={16} />}
            </button>
          )}

          <button
            onClick={() => setFacingMode(facingMode === "user" ? "environment" : "user")}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
        />

        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-4 left-4 bg-red-500 px-3 py-1 rounded-full text-white text-sm font-bold flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            REC
          </div>
        )}

        {/* Grid Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <svg className="w-full h-full opacity-30">
            <defs>
              <pattern id="grid" width="33.333%" height="33.333%" patternUnits="objectBoundingBox">
                <path
                  d="M 33.333 0 L 33.333 33.333 M 0 33.333 L 33.333 33.333"
                  fill="none"
                  stroke="white"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-black/80 p-6 flex items-center justify-center gap-8">
        {/* Mode Toggle */}
        <button
          onClick={() => setIsVideoMode(!isVideoMode)}
          className={`p-3 rounded-full transition-colors ${
            isVideoMode ? "bg-red-500" : "bg-white/20 hover:bg-white/30"
          }`}
        >
          {isVideoMode ? <Camera size={24} /> : <Video size={24} />}
        </button>

        {/* Capture Button */}
        <button
          onClick={handleCaptureClick}
          className={`w-20 h-20 rounded-full border-4 transition-all ${
            isRecording
              ? "border-red-500 bg-red-500"
              : isVideoMode
                ? "border-red-400 bg-red-400/20 hover:bg-red-400/40"
                : "border-white bg-white/20 hover:bg-white/40"
          }`}
        >
          {isVideoMode && isRecording ? (
            <div className="w-6 h-6 bg-white rounded-sm mx-auto" />
          ) : (
            <div className={`w-16 h-16 rounded-full mx-auto ${isVideoMode ? "bg-red-500" : "bg-white"}`} />
          )}
        </button>

        {/* Placeholder for symmetry */}
        <div className="w-12 h-12" />
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
