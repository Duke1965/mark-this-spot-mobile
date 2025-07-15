"use client"

import { useState, useEffect, useRef } from "react"
import { Mic, MicOff } from "lucide-react"

interface VoiceCommanderProps {
  onCommand: (command: string, confidence: number) => void
  isEnabled: boolean
  onToggle: () => void
}

export function VoiceCommander({ onCommand, isEnabled, onToggle }: VoiceCommanderProps) {
  const [isListening, setIsListening] = useState(false)
  const [lastCommand, setLastCommand] = useState<string>("")
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    // Check if speech recognition is available
    const SpeechRecognition =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null

    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser")
      return
    }

    // Initialize speech recognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = "en-US"

    recognition.onstart = () => {
      setIsListening(true)
      console.log("🎤 Voice recognition started")
    }

    recognition.onend = () => {
      setIsListening(false)
      console.log("🎤 Voice recognition ended")

      // Restart if still enabled
      if (isEnabled) {
        setTimeout(() => {
          try {
            recognition.start()
          } catch (error) {
            console.warn("Failed to restart voice recognition:", error)
          }
        }, 1000)
      }
    }

    recognition.onresult = (event: any) => {
      const results = Array.from(event.results)
      const lastResult = results[results.length - 1]

      if (lastResult.isFinal) {
        const transcript = lastResult[0].transcript.trim()
        const confidence = lastResult[0].confidence || 0.8

        console.log(`🎤 Voice command detected: "${transcript}" (confidence: ${confidence})`)
        setLastCommand(transcript)
        onCommand(transcript, confidence)
      }
    }

    recognition.onerror = (event: any) => {
      console.error("🎤 Voice recognition error:", event.error)
      setIsListening(false)

      // Try to restart after error
      if (isEnabled && event.error !== "not-allowed") {
        setTimeout(() => {
          try {
            recognition.start()
          } catch (error) {
            console.warn("Failed to restart after error:", error)
          }
        }, 2000)
      }
    }

    recognitionRef.current = recognition

    return () => {
      if (recognition) {
        recognition.stop()
      }
    }
  }, [onCommand])

  useEffect(() => {
    const recognition = recognitionRef.current
    if (!recognition) return

    if (isEnabled) {
      try {
        recognition.start()
      } catch (error) {
        console.warn("Failed to start voice recognition:", error)
      }
    } else {
      recognition.stop()
      setIsListening(false)
    }
  }, [isEnabled])

  // Don't render on mobile devices
  if (
    typeof window !== "undefined" &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  ) {
    return null
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "2rem",
        left: "2rem",
        zIndex: 15,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "0.5rem",
      }}
    >
      {/* Voice Status Indicator */}
      <div
        style={{
          background: isListening
            ? "rgba(16, 185, 129, 0.9)"
            : isEnabled
              ? "rgba(59, 130, 246, 0.9)"
              : "rgba(107, 114, 128, 0.9)",
          padding: "0.75rem 1rem",
          borderRadius: "2rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          color: "white",
          fontSize: "0.875rem",
          fontWeight: 500,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.2)",
          transition: "all 0.3s ease",
          cursor: "pointer",
        }}
        onClick={onToggle}
      >
        {isListening ? (
          <>
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "white",
                animation: "pulse 1.5s infinite",
              }}
            />
            <Mic size={16} />
            <span>Listening...</span>
          </>
        ) : isEnabled ? (
          <>
            <Mic size={16} />
            <span>Voice Ready</span>
          </>
        ) : (
          <>
            <MicOff size={16} />
            <span>Voice Off</span>
          </>
        )}
      </div>

      {/* Last Command Display */}
      {lastCommand && isEnabled && (
        <div
          style={{
            background: "rgba(0,0,0,0.8)",
            padding: "0.5rem 0.75rem",
            borderRadius: "1rem",
            color: "white",
            fontSize: "0.75rem",
            maxWidth: "200px",
            wordWrap: "break-word",
            border: "1px solid rgba(255,255,255,0.2)",
            animation: "fadeIn 0.3s ease",
          }}
        >
          <div style={{ opacity: 0.7, marginBottom: "0.25rem" }}>Last command:</div>
          <div style={{ fontWeight: 500 }}>"{lastCommand}"</div>
        </div>
      )}

      {/* Voice Commands Help */}
      {isEnabled && (
        <div
          style={{
            background: "rgba(0,0,0,0.8)",
            padding: "0.75rem",
            borderRadius: "1rem",
            color: "white",
            fontSize: "0.75rem",
            maxWidth: "250px",
            border: "1px solid rgba(255,255,255,0.2)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "0.5rem", color: "#10B981" }}>Voice Commands:</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", opacity: 0.9 }}>
            <div>• "Pin it" - Create location pin</div>
            <div>• "Take photo" - Open camera</div>
            <div>• "Record video" - Start recording</div>
            <div>• "Library" - View saved pins</div>
            <div>• "Go back" - Return to main</div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
