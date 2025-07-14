"use client"

import { useRef, useState, useEffect } from "react"
import { Camera, X, RotateCcw, Check, Square, Circle, SwitchCamera } from "lucide-react"

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

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [capturedMedia, setCapturedMedia] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")

  // Simple, reliable camera initialization
  const startCamera = async () => {
    console.log(`🎥 Starting ${mode} camera...`)
    setIsLoading(true)
    setError(null)

    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      // Simple constraints - no complex options
      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: mode === "video",
      }

      console.log("📱 Requesting camera access...")
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        console.log("✅ Camera started successfully!")
      }

      setIsLoading(false)
    } catch (err) {
      console.error("❌ Camera failed:", err)
      setError(`Camera access failed: ${err.message}`)
      setIsLoading(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    console.log("🛑 Camera stopped")
  }

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")
    if (!context) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0)

    const photoData = canvas.toDataURL("image/jpeg", 0.8)
    setCapturedMedia(photoData)
    console.log("📸 Photo captured!")
  }

  const startRecording = () => {
    if (!streamRef.current) return

    try {
      chunksRef.current = []
      const recorder = new MediaRecorder(streamRef.current)

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" })
        const videoUrl = URL.createObjectURL(blob)
        setCapturedMedia(videoUrl)
        setIsRecording(false)
        console.log("🎥 Recording completed!")
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      setRecordingTime(0)

      // Simple timer
      const timer = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 30) {
            stopRecording()
            clearInterval(timer)
            return prev
          }
          return prev + 1
        })
      }, 1000)

      console.log("🔴 Recording started!")
    } catch (err) {
      console.error("❌ Recording failed:", err)
      setError("Recording failed")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
      console.log("⏹️ Recording stopped!")
    }
  }

  const handleCapture = () => {
    if (mode === "photo") {
      takePhoto()
    } else {
      if (isRecording) {
        stopRecording()
      } else {
        startRecording()
      }
    }
  }

  const retake = () => {
    setCapturedMedia(null)
    setRecordingTime(0)
  }

  const confirm = () => {
    if (capturedMedia) {
      onCapture(capturedMedia, mode)
      stopCamera()
    }
  }

  const switchCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"))
  }

  const handleClose = () => {
    stopCamera()
    onClose()
  }

  // Auto-start camera when component mounts
  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  // Restart camera when facing mode changes
  useEffect(() => {
    if (!isLoading && !error && !capturedMedia) {
      startCamera()
    }
  }, [facingMode])

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
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ fontSize: "1.5rem" }}>{mode === "photo" ? "📸" : "🎥"}</div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem" }}>{mode === "photo" ? "Take Photo" : "Record Video"}</h2>
          </div>
        </div>
        <button
          onClick={handleClose}
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
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📷</div>
            <h3 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Camera Error</h3>
            <p style={{ marginBottom: "1.5rem", opacity: 0.8 }}>{error}</p>
            <button
              onClick={startCamera}
              style={{
                padding: "1rem 2rem",
                borderRadius: "1rem",
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
                width: "4rem",
                height: "4rem",
                border: "4px solid rgba(255,255,255,0.3)",
                borderTop: "4px solid white",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 1.5rem auto",
              }}
            />
            <p>Starting camera...</p>
            <p style={{ fontSize: "0.875rem", opacity: 0.7 }}>Please allow camera access when prompted</p>
          </div>
        ) : capturedMedia ? (
          mode === "photo" ? (
            <img
              src={capturedMedia || "/placeholder.svg"}
              alt="Captured"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                borderRadius: "1rem",
              }}
            />
          ) : (
            <video
              src={capturedMedia}
              controls
              autoPlay
              loop
              muted
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                borderRadius: "1rem",
              }}
            />
          )
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
              borderRadius: "1rem",
            }}
          />
        )}

        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Recording indicator */}
        {isRecording && (
          <div
            style={{
              position: "absolute",
              top: "2rem",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "rgba(239, 68, 68, 0.9)",
              color: "white",
              padding: "0.75rem 1.5rem",
              borderRadius: "2rem",
              fontWeight: "bold",
            }}
          >
            <div
              style={{
                width: "0.75rem",
                height: "0.75rem",
                borderRadius: "50%",
                background: "white",
                animation: "pulse 1s infinite",
              }}
            />
            REC {recordingTime}s / 30s
          </div>
        )}
      </div>

      {/* Controls */}
      <div
        style={{
          padding: "2rem",
          background: "rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "2rem",
        }}
      >
        {capturedMedia ? (
          <>
            <button
              onClick={retake}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "1rem 2rem",
                borderRadius: "1rem",
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
              onClick={confirm}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "1rem 2rem",
                borderRadius: "1rem",
                border: "none",
                background: "#10B981",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              <Check size={20} />
              Use {mode === "photo" ? "Photo" : "Video"}
            </button>
          </>
        ) : !isLoading && !error ? (
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
              <SwitchCamera size={24} />
            </button>

            <button
              onClick={handleCapture}
              style={{
                width: "5rem",
                height: "5rem",
                borderRadius: "50%",
                border: "4px solid white",
                background: mode === "photo" ? "#EF4444" : isRecording ? "#F59E0B" : "#EF4444",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {mode === "photo" ? (
                <Camera size={32} color="white" />
              ) : isRecording ? (
                <Square size={24} color="white" fill="white" />
              ) : (
                <Circle size={32} color="white" />
              )}
            </button>

            <div style={{ width: "3rem" }} />
          </>
        ) : null}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
