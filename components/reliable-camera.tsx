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
        audio: false,
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
                console.warn("Video play warning:", error)
                // Still mark as ready since camera stream is available
                setIsCameraReady(true)
              })
          }
        }

        videoRef.current.onerror = (error) => {
          console.error("Video element error:", error)
          setIsCameraReady(true)
        }
      }
    } catch (error) {
      console.error("❌ Camera access error:", error)
      setCameraError("Camera access denied. Please allow camera permissions.")
      setIsCameraReady(true)
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
  }, [])

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
    <div className="flex-1 relative overflow-hidden">
      {/* Camera Feed - Full Background */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: facingMode === "user" ? "scaleX(-1)" : "none",
          zIndex: 1,
        }}
      />

      {/* Circular Viewfinder Overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 2,
          pointerEvents: "none",
        }}
      >
        {/* Dark overlay with hole cut out */}
        <svg
          width="100%"
          height="100%"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          <defs>
            <mask id="hole">
              <rect width="100%" height="100%" fill="white" />
              <circle cx="50%" cy="50%" r="150" fill="black" />
            </mask>
            <filter id="shadow">
              <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="black" floodOpacity="0.5" />
            </filter>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#hole)" />
          <circle
            cx="50%"
            cy="50%"
            r="150"
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="3"
            filter="url(#shadow)"
          />
        </svg>

        {/* Center crosshair */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "30px",
            height: "30px",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "0",
              right: "0",
              height: "1px",
              background: "rgba(255,255,255,0.6)",
              transform: "translateY(-50%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "0",
              bottom: "0",
              width: "1px",
              background: "rgba(255,255,255,0.6)",
              transform: "translateX(-50%)",
            }}
          />
        </div>

        {/* Corner guides */}
        <div
          style={{
            position: "absolute",
            top: "calc(50% - 120px)",
            left: "calc(50% - 120px)",
            width: "20px",
            height: "20px",
            borderTop: "2px solid rgba(255,255,255,0.4)",
            borderLeft: "2px solid rgba(255,255,255,0.4)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "calc(50% - 120px)",
            right: "calc(50% - 120px)",
            width: "20px",
            height: "20px",
            borderTop: "2px solid rgba(255,255,255,0.4)",
            borderRight: "2px solid rgba(255,255,255,0.4)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "calc(50% - 120px)",
            left: "calc(50% - 120px)",
            width: "20px",
            height: "20px",
            borderBottom: "2px solid rgba(255,255,255,0.4)",
            borderLeft: "2px solid rgba(255,255,255,0.4)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "calc(50% - 120px)",
            right: "calc(50% - 120px)",
            width: "20px",
            height: "20px",
            borderBottom: "2px solid rgba(255,255,255,0.4)",
            borderRight: "2px solid rgba(255,255,255,0.4)",
          }}
        />
      </div>

      {/* Camera Controls */}
      <div
        style={{
          position: "absolute",
          bottom: "1.5rem",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          zIndex: 10,
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
            backdropFilter: "blur(10px)",
          }}
          title={isVideoMode ? "Switch to Photo" : "Switch to Video"}
        >
          {isVideoMode ? <Camera size={20} /> : <Video size={20} />}
        </button>

        {/* Main Capture Button */}
        <button
          onClick={handleCaptureClick}
          disabled={!isCameraReady}
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            border: isVideoRecording ? "4px solid #EF4444" : "4px solid white",
            background: isVideoRecording ? "#EF4444" : isVideoMode ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.2)",
            cursor: isCameraReady ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: isVideoRecording ? "scale(0.9)" : "scale(1)",
            transition: "all 0.3s ease",
            backdropFilter: "blur(10px)",
            opacity: isCameraReady ? 1 : 0.5,
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
            backdropFilter: "blur(10px)",
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
          top: "1.5rem",
          right: "1.5rem",
          display: "flex",
          gap: "0.5rem",
          zIndex: 10,
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
              backdropFilter: "blur(10px)",
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
            top: "1.5rem",
            left: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "rgba(239, 68, 68, 0.9)",
            padding: "0.5rem 1rem",
            borderRadius: "1rem",
            color: "white",
            fontSize: "0.875rem",
            fontWeight: "bold",
            backdropFilter: "blur(10px)",
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              background: "white",
              borderRadius: "50%",
              animation: "pulse 1s infinite",
            }}
          />
          REC
        </div>
      )}

      {/* Loading Indicator */}
      {!isCameraReady && !cameraError && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.8)",
            zIndex: 20,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                border: "2px solid rgba(255,255,255,0.3)",
                borderTop: "2px solid white",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <span style={{ color: "rgba(255,255,255,0.8)" }}>Starting camera...</span>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
