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

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [capturedMedia, setCapturedMedia] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")
  const [cameraReady, setCameraReady] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  const addDebug = (message: string) => {
    console.log(message)
    setDebugInfo((prev) => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`])
  }

  // Direct camera start - no permission checking
  const startCamera = async () => {
    addDebug(`🎥 Starting ${mode} camera directly...`)
    setIsLoading(true)
    setError(null)
    setCameraReady(false)

    try {
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      addDebug("📱 Checking mediaDevices support...")
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia not supported")
      }

      addDebug("📱 Calling getUserMedia...")
      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
        audio: mode === "video",
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      addDebug("✅ Stream obtained successfully")

      streamRef.current = stream

      if (videoRef.current) {
        addDebug("📹 Setting video source...")
        videoRef.current.srcObject = stream

        // Multiple event listeners to catch when video is ready
        videoRef.current.onloadedmetadata = () => {
          addDebug("📹 Video metadata loaded")
        }

        videoRef.current.oncanplay = () => {
          addDebug("📹 Video can play")
          setCameraReady(true)
          setIsLoading(false)
        }

        videoRef.current.onplaying = () => {
          addDebug("📹 Video is playing")
        }

        videoRef.current.onerror = (e) => {
          addDebug(`❌ Video error: ${e}`)
        }

        addDebug("▶️ Starting video playback...")
        await videoRef.current.play()
        addDebug("✅ Video play() completed")

        // Fallback: Set ready after a short delay if events don't fire
        setTimeout(() => {
          if (!cameraReady && videoRef.current && videoRef.current.videoWidth > 0) {
            addDebug("⏰ Fallback: Setting camera ready")
            setCameraReady(true)
            setIsLoading(false)
          }
        }, 2000)
      }
    } catch (err: any) {
      addDebug(`❌ Camera failed: ${err.name} - ${err.message}`)

      let errorMessage = "Camera access failed"
      if (err.name === "NotAllowedError") {
        errorMessage = "Camera permission denied. Please check browser settings."
      } else if (err.name === "NotFoundError") {
        errorMessage = "No camera found on this device."
      } else if (err.name === "NotSupportedError") {
        errorMessage = "Camera not supported."
      } else if (err.name === "OverconstrainedError") {
        errorMessage = "Camera constraints not supported. Trying simpler settings..."
        // Try again with simpler constraints
        setTimeout(() => startCameraSimple(), 1000)
        return
      } else {
        errorMessage = `Camera error: ${err.message}`
      }

      setError(errorMessage)
      setIsLoading(false)
    }
  }

  // Fallback with minimal constraints
  const startCameraSimple = async () => {
    addDebug("🔄 Trying simple camera constraints...")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: mode === "video",
      })

      addDebug("✅ Simple stream obtained")
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraReady(true)
        setIsLoading(false)
        addDebug("✅ Simple camera started")
      }
    } catch (err: any) {
      addDebug(`❌ Simple camera also failed: ${err.message}`)
      setError(`Camera completely failed: ${err.message}`)
      setIsLoading(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraReady(false)
    addDebug("🛑 Camera stopped")
  }

  const takePhoto = () => {
    addDebug("📸 Taking photo...")

    if (!videoRef.current || !canvasRef.current) {
      addDebug("❌ Video or canvas ref missing")
      return
    }

    if (!cameraReady) {
      addDebug("❌ Camera not ready yet")
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) {
      addDebug("❌ Canvas context missing")
      return
    }

    addDebug(`📐 Video dimensions: ${video.videoWidth}x${video.videoHeight}`)

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      addDebug("❌ Video dimensions invalid")
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const photoData = canvas.toDataURL("image/jpeg", 0.9)
    addDebug(`📸 Photo data length: ${photoData.length}`)

    if (photoData && photoData.length > 100) {
      setCapturedMedia(photoData)
      addDebug("✅ Photo captured successfully!")
    } else {
      addDebug("❌ Photo capture failed - invalid data")
      setError("Photo capture failed. Please try again.")
    }
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
        addDebug("🎥 Recording completed!")
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      setRecordingTime(0)

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
      addDebug(`❌ Recording failed: ${err.message}`)
      setError("Recording failed")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
      addDebug("⏹️ Recording stopped!")
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
    setError(null)
  }

  const confirm = () => {
    if (capturedMedia) {
      addDebug("✅ Confirming capture")
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

  // Auto-start camera on mount
  useEffect(() => {
    addDebug("🚀 Component mounted, starting camera...")
    startCamera()
    return () => stopCamera()
  }, [])

  // Restart when facing mode changes
  useEffect(() => {
    if (!isLoading && !error && !capturedMedia) {
      addDebug("🔄 Facing mode changed, restarting camera...")
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
        background: "#000000",
        zIndex: 9999,
        isolation: "isolate",
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
            {cameraReady && <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.7 }}>Camera ready</p>}
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
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>❌</div>
            <h3 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Camera Error</h3>
            <p style={{ marginBottom: "1.5rem", opacity: 0.8 }}>{error}</p>

            {/* Debug info */}
            <div
              style={{
                background: "rgba(255,255,255,0.1)",
                padding: "1rem",
                borderRadius: "0.5rem",
                marginBottom: "1rem",
                fontSize: "0.75rem",
                textAlign: "left",
              }}
            >
              <strong>Debug Log:</strong>
              {debugInfo.map((info, i) => (
                <div key={i}>{info}</div>
              ))}
            </div>

            <button
              onClick={() => {
                setError(null)
                setDebugInfo([])
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

            {/* Debug info while loading */}
            <div
              style={{
                background: "rgba(255,255,255,0.1)",
                padding: "1rem",
                borderRadius: "0.5rem",
                marginTop: "1rem",
                fontSize: "0.75rem",
                textAlign: "left",
                maxWidth: "300px",
                margin: "1rem auto 0",
              }}
            >
              <strong>Debug Log:</strong>
              {debugInfo.map((info, i) => (
                <div key={i}>{info}</div>
              ))}
            </div>
          </div>
        ) : capturedMedia ? (
          <div style={{ textAlign: "center", maxWidth: "100%", maxHeight: "100%" }}>
            {mode === "photo" ? (
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
            )}
          </div>
        ) : (
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

        {/* Debug overlay */}
        {cameraReady && videoRef.current && (
          <div
            style={{
              position: "absolute",
              bottom: "1rem",
              left: "1rem",
              background: "rgba(0,0,0,0.7)",
              color: "white",
              padding: "0.5rem",
              borderRadius: "0.5rem",
              fontSize: "0.75rem",
            }}
          >
            Video: {videoRef.current.videoWidth}x{videoRef.current.videoHeight}
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
              disabled={!cameraReady}
              style={{
                width: "5rem",
                height: "5rem",
                borderRadius: "50%",
                border: "4px solid white",
                background: cameraReady
                  ? mode === "photo"
                    ? "#EF4444"
                    : isRecording
                      ? "#F59E0B"
                      : "#EF4444"
                  : "rgba(255,255,255,0.3)",
                cursor: cameraReady ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: cameraReady ? 1 : 0.5,
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
