"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { Camera, X, RotateCcw, Check, Square, Circle } from "lucide-react"

interface EnhancedCameraProps {
  mode: "photo" | "video"
  onCapture: (mediaData: string, type: "photo" | "video") => void
  onClose: () => void
}

export function EnhancedCamera({ mode, onCapture, onClose }: EnhancedCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedMedia, setCapturedMedia] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordingTimer, setRecordingTimer] = useState<NodeJS.Timeout | null>(null)

  const startCamera = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }

      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: mode === "video" ? true : false, // Only request audio for video mode
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints)

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
  }, [facingMode, stream, mode])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
    if (recordingTimer) {
      clearInterval(recordingTimer)
      setRecordingTimer(null)
    }
  }, [stream, recordingTimer])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const photoDataUrl = canvas.toDataURL("image/jpeg", 0.8)
    setCapturedMedia(photoDataUrl)
  }, [])

  const startVideoRecording = useCallback(() => {
    if (!stream) return

    try {
      chunksRef.current = []
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9", // High quality codec
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" })
        const videoUrl = URL.createObjectURL(blob)
        setCapturedMedia(videoUrl)
      }

      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)
      setRecordingTime(0)

      // Start recording timer
      const timer = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 15) {
            // 15 second limit
            stopVideoRecording()
            return prev
          }
          return prev + 1
        })
      }, 1000)
      setRecordingTimer(timer)
    } catch (error) {
      console.error("Failed to start recording:", error)
      setError("Failed to start video recording")
    }
  }, [stream])

  const stopVideoRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
      setIsRecording(false)

      if (recordingTimer) {
        clearInterval(recordingTimer)
        setRecordingTimer(null)
      }
    }
  }, [isRecording, recordingTimer])

  const retakeMedia = useCallback(() => {
    setCapturedMedia(null)
    setRecordingTime(0)
  }, [])

  const confirmMedia = useCallback(() => {
    if (capturedMedia) {
      onCapture(capturedMedia, mode)
      setCapturedMedia(null)
      stopCamera()
    }
  }, [capturedMedia, mode, onCapture, stopCamera])

  const switchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"))
  }, [])

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

  // Start camera when component mounts
  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [startCamera, stopCamera])

  // Update camera when facing mode changes
  useEffect(() => {
    if (stream) {
      startCamera()
    }
  }, [facingMode, startCamera, stream])

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.98)",
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
          padding: "1rem 1.5rem",
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ fontSize: "1.5rem" }}>{mode === "photo" ? "📸" : "🎥"}</div>
          <div>
            <h2 style={{ color: "white", fontSize: "1.25rem", fontWeight: "bold", margin: 0 }}>
              {mode === "photo" ? "Photo Postcard" : "Video Postcard"}
            </h2>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem", margin: 0 }}>
              {mode === "photo" ? "Capture the perfect moment" : `Record up to 15 seconds`}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            padding: "0.75rem",
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
            transition: "all 0.3s ease",
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
                fontSize: "1rem",
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
            <p style={{ fontSize: "1.125rem" }}>Starting camera...</p>
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
              backdropFilter: "blur(10px)",
              color: "white",
              padding: "0.75rem 1.5rem",
              borderRadius: "2rem",
              fontWeight: "bold",
              animation: "pulse 1s infinite",
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
            REC {recordingTime}s / 15s
          </div>
        )}
      </div>

      {/* Controls */}
      <div
        style={{
          padding: "2rem",
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "2rem",
        }}
      >
        {capturedMedia ? (
          <>
            <button
              onClick={retakeMedia}
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
                fontSize: "1rem",
                transition: "all 0.3s ease",
              }}
            >
              <RotateCcw size={20} />
              Retake
            </button>
            <button
              onClick={confirmMedia}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "1rem 2rem",
                borderRadius: "1rem",
                border: "none",
                background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "1rem",
                transition: "all 0.3s ease",
                boxShadow: "0 10px 25px rgba(16, 185, 129, 0.4)",
              }}
            >
              <Check size={20} />
              Use {mode === "photo" ? "Photo" : "Video"}
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
                transition: "all 0.3s ease",
              }}
            >
              <RotateCcw size={24} />
            </button>

            <button
              onClick={handleCapture}
              disabled={!stream}
              style={{
                width: "5rem",
                height: "5rem",
                borderRadius: "50%",
                border: "4px solid white",
                background: stream
                  ? mode === "photo"
                    ? "#EF4444"
                    : isRecording
                      ? "#F59E0B"
                      : "#EF4444"
                  : "rgba(255,255,255,0.3)",
                cursor: stream ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.3s ease",
                transform: isRecording ? "scale(1.1)" : "scale(1)",
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
        )}
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
