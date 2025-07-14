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
  const [permissionState, setPermissionState] = useState<"pending" | "granted" | "denied">("pending")

  // Check camera permissions first
  const checkPermissions = async () => {
    try {
      if (navigator.permissions) {
        const cameraPermission = await navigator.permissions.query({ name: "camera" as PermissionName })
        const micPermission =
          mode === "video" ? await navigator.permissions.query({ name: "microphone" as PermissionName }) : null

        console.log("📹 Camera permission:", cameraPermission.state)
        if (micPermission) console.log("🎤 Microphone permission:", micPermission.state)

        if (cameraPermission.state === "granted" && (!micPermission || micPermission.state === "granted")) {
          setPermissionState("granted")
          return true
        } else if (cameraPermission.state === "denied" || (micPermission && micPermission.state === "denied")) {
          setPermissionState("denied")
          return false
        }
      }

      setPermissionState("pending")
      return false
    } catch (error) {
      console.log("⚠️ Permission API not available, will request directly")
      setPermissionState("pending")
      return false
    }
  }

  // Request camera access with user interaction
  const requestCameraAccess = async () => {
    console.log(`🎥 Requesting ${mode} camera access...`)
    setIsLoading(true)
    setError(null)
    setCameraReady(false)

    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: mode === "video",
      }

      console.log("📱 Calling getUserMedia...")
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      setPermissionState("granted")

      if (videoRef.current) {
        videoRef.current.srcObject = stream

        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          console.log("📹 Video metadata loaded")
          setCameraReady(true)
          setIsLoading(false)
        }

        await videoRef.current.play()
        console.log("✅ Camera started successfully!")
      }
    } catch (err) {
      console.error("❌ Camera access failed:", err)
      setPermissionState("denied")

      let errorMessage = "Camera access failed"
      if (err.name === "NotAllowedError") {
        errorMessage = "Camera access denied. Please allow camera permissions and try again."
      } else if (err.name === "NotFoundError") {
        errorMessage = "No camera found on this device."
      } else if (err.name === "NotSupportedError") {
        errorMessage = "Camera not supported on this device."
      } else {
        errorMessage = `Camera error: ${err.message}`
      }

      setError(errorMessage)
      setIsLoading(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraReady(false)
    console.log("🛑 Camera stopped")
  }

  const takePhoto = () => {
    console.log("📸 Taking photo...")

    if (!videoRef.current || !canvasRef.current) {
      console.error("❌ Video or canvas ref missing")
      return
    }

    if (!cameraReady) {
      console.error("❌ Camera not ready yet")
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) {
      console.error("❌ Canvas context missing")
      return
    }

    // Check if video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.error("❌ Video dimensions invalid:", video.videoWidth, video.videoHeight)
      return
    }

    console.log("📐 Video dimensions:", video.videoWidth, "x", video.videoHeight)

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert to data URL
    const photoData = canvas.toDataURL("image/jpeg", 0.9)

    console.log("📸 Photo data length:", photoData.length)

    if (photoData && photoData.length > 100) {
      setCapturedMedia(photoData)
      console.log("✅ Photo captured successfully!")
    } else {
      console.error("❌ Photo capture failed - invalid data")
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
        console.log("🎥 Recording completed!")
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
    setError(null)
  }

  const confirm = () => {
    if (capturedMedia) {
      console.log("✅ Confirming capture")
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

  // Check permissions on mount
  useEffect(() => {
    checkPermissions().then((hasPermission) => {
      if (hasPermission) {
        requestCameraAccess()
      }
    })

    return () => stopCamera()
  }, [])

  // Restart camera when facing mode changes
  useEffect(() => {
    if (permissionState === "granted" && !isLoading && !error && !capturedMedia) {
      requestCameraAccess()
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
        {permissionState === "pending" ? (
          <div style={{ textAlign: "center", color: "white", padding: "2rem" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📷</div>
            <h3 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Camera Access Needed</h3>
            <p style={{ marginBottom: "1.5rem", opacity: 0.8, lineHeight: 1.5 }}>
              PINIT needs camera access to take photos and videos.
              <br />
              Click the button below to grant permission.
            </p>
            <button
              onClick={requestCameraAccess}
              style={{
                padding: "1rem 2rem",
                borderRadius: "1rem",
                border: "none",
                background: "#10B981",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "1rem",
              }}
            >
              📷 Allow Camera Access
            </button>

            {/* Permission Help */}
            <div
              style={{
                marginTop: "2rem",
                background: "rgba(59, 130, 246, 0.1)",
                padding: "1rem",
                borderRadius: "0.75rem",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                fontSize: "0.875rem",
                lineHeight: 1.4,
              }}
            >
              <strong>💡 If no prompt appears:</strong>
              <br />
              1. Look for camera icon in address bar
              <br />
              2. Click it and select "Allow"
              <br />
              3. Refresh page if needed
              <br />
              4. Check browser settings → Privacy → Camera
            </div>
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", color: "white", padding: "2rem" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>❌</div>
            <h3 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Camera Error</h3>
            <p style={{ marginBottom: "1.5rem", opacity: 0.8 }}>{error}</p>
            <button
              onClick={() => {
                setError(null)
                setPermissionState("pending")
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
        ) : permissionState === "granted" && !isLoading && !error ? (
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
