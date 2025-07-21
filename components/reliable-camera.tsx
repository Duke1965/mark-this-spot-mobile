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

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isVideoMode, setIsVideoMode] = useState(false)
  const [isVideoRecording, setIsVideoRecording] = useState(false)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")
  const [flashEnabled, setFlashEnabled] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isCameraInitialized, setIsCameraInitialized] = useState(false)

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null)

      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }

      // Use a mock camera if real camera fails
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode,
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
          },
          audio: isVideoMode,
        }

        const newStream = await navigator.mediaDevices.getUserMedia(constraints)
        setStream(newStream)

        if (videoRef.current) {
          videoRef.current.srcObject = newStream
          await videoRef.current.play().catch((e) => console.error("Video play error:", e))
        }

        setIsCameraInitialized(true)
        console.log(`📷 Camera started - ${facingMode} facing, ${isVideoMode ? "video" : "photo"} mode`)
      } catch (err) {
        console.error("Real camera error:", err)

        // Create a mock video stream with a colored background
        const canvas = document.createElement("canvas")
        canvas.width = 1280
        canvas.height = 720
        const ctx = canvas.getContext("2d")
        if (ctx) {
          // Create a gradient background
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
          gradient.addColorStop(0, "#667eea")
          gradient.addColorStop(1, "#764ba2")
          ctx.fillStyle = gradient
          ctx.fillRect(0, 0, canvas.width, canvas.height)

          // Add text
          ctx.fillStyle = "white"
          ctx.font = "30px Arial"
          ctx.textAlign = "center"
          ctx.fillText("Camera simulation mode", canvas.width / 2, canvas.height / 2)
        }

        const mockStream = canvas.captureStream(30) as MediaStream
        setStream(mockStream)

        if (videoRef.current) {
          videoRef.current.srcObject = mockStream
          await videoRef.current.play().catch((e) => console.error("Mock video play error:", e))
        }

        setIsCameraInitialized(true)
      }
    } catch (error) {
      console.error("❌ Camera error:", error)
      setCameraError("Failed to access camera. Please check permissions.")
    }
  }, [facingMode, isVideoMode, stream])

  useEffect(() => {
    startCamera()
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [startCamera])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isCameraInitialized) return

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

      // Create a fallback photo
      ctx.fillStyle = "#764ba2"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = "white"
      ctx.font = "30px Arial"
      ctx.textAlign = "center"
      ctx.fillText("Photo simulation", canvas.width / 2, canvas.height / 2)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const photoUrl = URL.createObjectURL(blob)
            onPhotoCapture(photoUrl)
          }
        },
        "image/jpeg",
        0.9,
      )
    }
  }, [flashEnabled, onPhotoCapture, isCameraInitialized])

  const startVideoRecording = useCallback(() => {
    if (!stream || !isCameraInitialized) {
      // Create a mock video recording
      setTimeout(() => {
        const canvas = document.createElement("canvas")
        canvas.width = 1280
        canvas.height = 720
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.fillStyle = "#764ba2"
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.fillStyle = "white"
          ctx.font = "30px Arial"
          ctx.textAlign = "center"
          ctx.fillText("Video simulation", canvas.width / 2, canvas.height / 2)
        }

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const videoUrl = URL.createObjectURL(blob)
              onVideoCapture(videoUrl)
            }
          },
          "image/jpeg",
          0.9,
        )
        setIsVideoRecording(false)
      }, 2000)

      setIsVideoRecording(true)
      return
    }

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
  }, [stream, onVideoCapture, isCameraInitialized])

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
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "1rem",
          padding: "2rem",
          color: "white",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "3rem" }}>📷</div>
        <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>Camera Access Required</h3>
        <p style={{ margin: 0, opacity: 0.8 }}>{cameraError}</p>
        <button
          onClick={startCamera}
          style={{
            padding: "0.75rem 1.5rem",
            borderRadius: "0.5rem",
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
    )
  }

  return (
    <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
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

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Camera Controls Overlay */}
      <div
        style={{
          position: "absolute",
          bottom: "1rem",
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
            padding: "0.75rem",
            borderRadius: "50%",
            border: "none",
            background: isVideoMode ? "rgba(239, 68, 68, 0.8)" : "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title={isVideoMode ? "Switch to Photo" : "Switch to Video"}
        >
          {isVideoMode ? <Camera size={20} /> : <Video size={20} />}
        </button>

        {/* Main Capture Button */}
        <button
          onClick={handleCaptureClick}
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            border: isVideoRecording ? "4px solid #EF4444" : "4px solid white",
            background: isVideoRecording ? "#EF4444" : isVideoMode ? "#EF4444" : "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: isVideoRecording ? "scale(0.9)" : "scale(1)",
            transition: "all 0.3s ease",
          }}
        >
          {isVideoMode ? (
            isVideoRecording ? (
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  background: "white",
                  borderRadius: "2px",
                }}
              />
            ) : (
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  background: "white",
                  borderRadius: "50%",
                }}
              />
            )
          ) : (
            <div
              style={{
                width: "60px",
                height: "60px",
                background: "#3B82F6",
                borderRadius: "50%",
              }}
            />
          )}
        </button>

        {/* Camera Flip */}
        <button
          onClick={toggleCamera}
          style={{
            padding: "0.75rem",
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Flip Camera"
        >
          <RotateCcw size={20} />
        </button>
      </div>

      {/* Top Controls */}
      <div
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          display: "flex",
          gap: "0.5rem",
        }}
      >
        {/* Flash Toggle (Photo mode only) */}
        {!isVideoMode && (
          <button
            onClick={() => setFlashEnabled(!flashEnabled)}
            style={{
              padding: "0.5rem",
              borderRadius: "50%",
              border: "none",
              background: flashEnabled ? "rgba(255, 255, 0, 0.8)" : "rgba(255,255,255,0.2)",
              color: flashEnabled ? "black" : "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title={flashEnabled ? "Disable Flash" : "Enable Flash"}
          >
            {flashEnabled ? <Zap size={16} /> : <ZapOff size={16} />}
          </button>
        )}
      </div>

      {/* Recording Indicator */}
      {isVideoRecording && (
        <div
          style={{
            position: "absolute",
            top: "1rem",
            left: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            background: "rgba(239, 68, 68, 0.9)",
            borderRadius: "1rem",
            color: "white",
            fontSize: "0.875rem",
            fontWeight: "bold",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "white",
              animation: "pulse 1s infinite",
            }}
          />
          REC
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
