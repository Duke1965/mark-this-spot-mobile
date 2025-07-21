"use client"

import { forwardRef, useImperativeHandle, useRef, useState, useCallback } from "react"

interface EnhancedAudioProps {
  onAudioRecorded: (audioUrl: string) => void
  isRecording: boolean
}

export interface EnhancedAudioRef {
  startRecording: () => void
  stopRecording: () => void
}

const EnhancedAudio = forwardRef<EnhancedAudioRef, EnhancedAudioProps>(({ onAudioRecorded, isRecording }, ref) => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const [audioLevel, setAudioLevel] = useState(0)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      // Set up audio level monitoring
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const updateAudioLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
          setAudioLevel(average / 255)
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel)
        }
      }
      updateAudioLevel()

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4",
      })

      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorderRef.current?.mimeType || "audio/webm",
        })
        const audioUrl = URL.createObjectURL(audioBlob)
        onAudioRecorded(audioUrl)

        // Cleanup
        stream.getTracks().forEach((track) => track.stop())
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
        setAudioLevel(0)
      }

      mediaRecorderRef.current.start(100) // Record in 100ms chunks
      console.log("🎤 Enhanced audio recording started")
    } catch (error) {
      console.error("❌ Failed to start audio recording:", error)
    }
  }, [onAudioRecorded])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
      console.log("🎤 Enhanced audio recording stopped")
    }
  }, [])

  useImperativeHandle(ref, () => ({
    startRecording,
    stopRecording,
  }))

  return (
    <div
      style={{
        position: "fixed",
        bottom: "6rem",
        right: "1rem",
        zIndex: 50,
        pointerEvents: "none",
      }}
    >
      {isRecording && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.75rem",
            background: "rgba(239, 68, 68, 0.9)",
            borderRadius: "2rem",
            color: "white",
            fontSize: "0.875rem",
            fontWeight: "bold",
            backdropFilter: "blur(10px)",
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
          <span>Recording...</span>
          <div
            style={{
              width: "40px",
              height: "4px",
              background: "rgba(255,255,255,0.3)",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${audioLevel * 100}%`,
                height: "100%",
                background: "white",
                transition: "width 0.1s ease",
              }}
            />
          </div>
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
})

EnhancedAudio.displayName = "EnhancedAudio"

export default EnhancedAudio
export { EnhancedAudio }
