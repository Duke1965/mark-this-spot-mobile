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

  const [isLoading, setIsLoading] = useState(false) // Start as false
  const [error, setError] = useState<string | null>(null)
  const [capturedMedia, setCapturedMedia] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(isRecording)
  const [recordingTime, setRecordingTime] = useState(0)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")
  const [cameraReady, setCameraReady] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  const addDebug = (message: string) => {
    try {
      console.log(message)
      setDebugInfo((prev) => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`])
    } catch (err) {
      console.error("Debug logging failed:", err)
    }
  }

  // Safe camera start with comprehensive error handling
  const startCamera = async () => {
    try {
      addDebug(`🎥 Starting ${mode} camera...`)
      setIsLoading(true)
      setError(null)
      setCameraReady(false)

      // Stop any existing stream first
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((track) => track.stop())
        } catch (err) {
          addDebug("⚠️ Error stopping existing stream")
        }
        streamRef.current = null
      }

      // Check for getUserMedia support
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Camera not supported on this device")
      }

      addDebug("📱 Requesting camera access...")
      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: mode === "video",
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      addDebug("✅ Camera stream obtained")

      streamRef.current = stream

      if (videoRef.current) {
        addDebug("📹 Setting up video element...")

        // Clear existing source
        videoRef.current.srcObject = null

        // Set new stream
        videoRef.current.srcObject = stream

        // Set up event listeners before playing
        const video = videoRef.current

        const onLoadedMetadata = () => {
          addDebug("📹 Video metadata loaded")
          setCameraReady(true)
          setIsLoading(false)
        }

        const onCanPlay = () => {
          addDebug("📹 Video can play")
          setCameraReady(true)
          setIsLoading(false)
        }

        const onError = (e: any) => {
          addDebug(`❌ Video error: ${e.type}`)
        }

        video.addEventListener("loadedmetadata", onLoadedMetadata)
        video.addEventListener("canplay", onCanPlay)
        video.addEventListener("error", onError)

        try {
          await video.play()
          addDebug("✅ Video playing")
        } catch (playError) {
          addDebug(`⚠️ Video play failed: ${playError}`)
          // Continue anyway - sometimes it still works
        }

        // Cleanup function for event listeners
        const cleanup = () => {
          video.removeEventListener("loadedmetadata", onLoadedMetadata)
          video.removeEventListener("canplay", onCanPlay)
          video.removeEventListener("error", onError)
        }

        // Force ready state after timeout
        setTimeout(() => {
          if (streamRef.current && !cameraReady) {
            addDebug("⏰ Force enabling camera after timeout")
            setCameraReady(true)
            setIsLoading(false)
          }
          cleanup()
        }, 3000)
      }
    } catch (err: any) {
      addDebug(`❌ Camera failed: ${err.message}`)
      setError(`Camera error: ${err.message || "Unknown error"}`)
      setIsLoading(false)
      setCameraReady(false)
    }
  }

  const stopCamera = () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop()
          } catch (err) {
            console.warn("Error stopping track:", err)
          }
        })
        streamRef.current = null
      }
      setCameraReady(false)
      addDebug("🛑 Camera stopped")
    } catch (err) {
      console.error("Error stopping camera:", err)
    }
  }

  const takePhoto = () => {
    try {
      addDebug("📸 Taking photo...")

      if (!streamRef.current) {
        setError("Camera not ready. Please wait and try again.")
        return
      }

      if (!videoRef.current || !canvasRef.current) {
        setError("Camera components not ready.")
        return
      }

      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext("2d")

      if (!context) {
        setError("Canvas not supported.")
        return
      }

      // Get video dimensions
      const width = video.videoWidth || 1280
      const height = video.videoHeight || 720

      addDebug(`📐 Photo dimensions: ${width}x${height}`)

      if (width === 0 || height === 0) {
        setError("Video not ready. Please wait a moment and try again.")
        return
      }

      canvas.width = width
      canvas.height = height

      // Draw the video frame to canvas
      context.drawImage(video, 0, 0, width, height)

      // Convert to data URL
      const photoData = canvas.toDataURL("image/jpeg", 0.9)

      if (photoData && photoData.length > 1000) {
        setCapturedMedia(photoData)
        addDebug("✅ Photo captured successfully!")
      } else {
        setError("Photo capture failed. Please try again.")
      }
    } catch (err: any) {
      addDebug(`❌ Photo capture error: ${err.message}`)
      setError("Photo capture failed. Please try again.")
    }
  }

  const startRecording = () => {
    try {
      if (!streamRef.current) return

      chunksRef.current = []
      const recorder = new MediaRecorder(streamRef.current)

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        try {
          const blob = new Blob(chunksRef.current, { type: "video/webm" })
          const videoUrl = URL.createObjectURL(blob)
          setCapturedMedia(videoUrl)
          setIsRecording(false)
          addDebug("🎥 Recording completed!")
        } catch (err) {
          addDebug(`❌ Recording processing failed: ${err}`)
          setError("Recording failed to process.")
        }
      }

      recorder.onerror = (event: any) => {
        addDebug(`❌ Recording error: ${event.error}`)
        setError("Recording failed.")
        setIsRecording(false)
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      setRecordingTime(0)

      // Recording timer
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

      addDebug("🔴 Recording started!")
    } catch (err: any) {
      addDebug(`❌ Recording start failed: ${err.message}`)
      setError("Recording failed to start.")
    }
  }

  const stopRecording = () => {
    try {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop()
        mediaRecorderRef.current = null
        addDebug("⏹️ Recording stopped!")
      }
    } catch (err) {
      addDebug(`❌ Stop recording error: ${err}`)
    }
  }

  const handleCapture = () => {
    try {
      if (mode === "photo") {
        takePhoto()
      } else {
        if (isRecording) {
          stopRecording()
        } else {
          startRecording()
        }
      }
    } catch (err: any) {
      addDebug(`❌ Capture handler error: ${err.message}`)
      setError("Capture failed. Please try again.")
    }
  }

  const retake = () => {
    try {
      setCapturedMedia(null)
      setRecordingTime(0)
      setError(null)
    } catch (err) {
      console.error("Retake error:", err)
    }
  }

  const confirm = () => {
    try {
      if (capturedMedia) {
        addDebug("✅ Confirming capture")
        onCapture(capturedMedia, mode)
        stopCamera()
      }
    } catch (err: any) {
      addDebug(`❌ Confirm error: ${err.message}`)
      setError("Failed to save capture.")
    }
  }

  const switchCamera = () => {
    try {
      setFacingMode((prev) => (prev === "user" ? "environment" : "user"))
    } catch (err) {
      console.error("Switch camera error:", err)
    }
  }

  const handleClose = () => {
    try {
      stopCamera()
      onClose()
    } catch (err) {
      console.error("Close error:", err)
      onClose() // Still try to close
    }
  }

  // Safe useEffect with error handling
  useEffect(() => {
    try {
      addDebug("🚀 Component mounted")
      startCamera()
      return () => {
        try {
          stopCamera()
        } catch (err) {
          console.error("Cleanup error:", err)
        }
      }
    } catch (err) {
      console.error("Mount effect error:", err)
      setError("Failed to initialize camera.")
    }
  }, [])

  // Safe facing mode effect
  useEffect(() => {
    try {
      if (!isLoading && !error && !capturedMedia && facingMode) {
        addDebug("🔄 Restarting for facing mode change")
        startCamera()
      }
    } catch (err) {
      console.error("Facing mode effect error:", err)
    }
  }, [facingMode])

  // Error boundary fallback
  if (error && error.includes("not supported")) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "#000000",
          color: "white",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "4rem", marginBottom: "2rem" }}>📱</div>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Camera Not Available</h2>
        <p style={{ marginBottom: "2rem", opacity: 0.8 }}>Camera is not supported on this device or browser.</p>
        <button
          onClick={handleClose}
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
          Go Back
        </button>
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
        background: "#000000",
        zIndex: 9999,
      }}
    >
      {/* Header - Fixed at top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "80px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem",
          background: "rgba(0,0,0,0.7)",
          color: "white",
          zIndex: 10,
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

      {/* Camera View - Full screen */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "#333",
        }}
      >
        {error ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "white",
              padding: "2rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>❌</div>
            <h3 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Camera Error</h3>
            <p style={{ marginBottom: "2rem", opacity: 0.8 }}>{error}</p>
            <button
              onClick={() => {
                setError(null)
                startCamera()
              }}
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
        ) : capturedMedia ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            {mode === "photo" ? (
              <img
                src={capturedMedia || "/placeholder.svg"}
                alt="Captured"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
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
                }}
              />
            )}
          </div>
        ) : (
          <>
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
            />

            {isLoading && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0,0,0,0.8)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  zIndex: 5,
                }}
              >
                <div
                  style={{
                    width: "3rem",
                    height: "3rem",
                    border: "3px solid rgba(255,255,255,0.3)",
                    borderTop: "3px solid white",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    marginBottom: "1rem",
                  }}
                />
                <p>Starting camera...</p>
              </div>
            )}
          </>
        )}

        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Recording indicator */}
        {isRecording && (
          <div
            style={{
              position: "absolute",
              top: "100px",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "rgba(239, 68, 68, 0.9)",
              color: "white",
              padding: "0.5rem 1rem",
              borderRadius: "1rem",
              fontSize: "0.875rem",
              fontWeight: "bold",
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: "0.5rem",
                height: "0.5rem",
                borderRadius: "50%",
                background: "white",
                animation: "pulse 1s infinite",
              }}
            />
            REC {recordingTime}s
          </div>
        )}
      </div>

      {/* Controls - ALWAYS FIXED AT BOTTOM */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "120px",
          background: "rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "2rem",
          padding: "1rem",
          zIndex: 10,
        }}
      >
        {capturedMedia ? (
          <>
            <button
              onClick={retake}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.5rem",
                borderRadius: "1rem",
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              <RotateCcw size={18} />
              Retake
            </button>
            <button
              onClick={confirm}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.5rem",
                borderRadius: "1rem",
                border: "none",
                background: "#10B981",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              <Check size={18} />
              Use {mode === "photo" ? "Photo" : "Video"}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={switchCamera}
              style={{
                padding: "0.75rem",
                borderRadius: "50%",
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
              }}
            >
              <SwitchCamera size={20} />
            </button>

            <button
              onClick={handleCapture}
              style={{
                width: "4rem",
                height: "4rem",
                borderRadius: "50%",
                border: "3px solid white",
                background: mode === "photo" ? "#EF4444" : isRecording ? "#F59E0B" : "#EF4444",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "transform 0.1s ease",
              }}
              onTouchStart={(e) => {
                e.currentTarget.style.transform = "scale(0.95)"
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.transform = "scale(1)"
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = "scale(0.95)"
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "scale(1)"
              }}
            >
              {mode === "photo" ? (
                <Camera size={24} color="white" />
              ) : isRecording ? (
                <Square size={20} color="white" fill="white" />
              ) : (
                <Circle size={24} color="white" />
              )}
            </button>

            <div style={{ width: "2.5rem" }} />
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
