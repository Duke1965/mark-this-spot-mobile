"use client"

import { useEffect, useState } from "react"
import { Mic, MicOff } from "lucide-react"

interface VoiceCommanderProps {
  onCommand: (command: string, confidence: number) => void
  isEnabled: boolean
  onToggle: () => void
}

export function VoiceCommander({ onCommand, isEnabled, onToggle }: VoiceCommanderProps) {
  const [isListening, setIsListening] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)
  const [lastCommand, setLastCommand] = useState<string>("")
  const [isSupported, setIsSupported] = useState(false)

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition

      if (SpeechRecognition) {
        setIsSupported(true)
        const recognitionInstance = new SpeechRecognition()

        recognitionInstance.continuous = true
        recognitionInstance.interimResults = false
        recognitionInstance.lang = "en-US"
        recognitionInstance.maxAlternatives = 1

        recognitionInstance.onstart = () => {
          console.log("🎤 Voice recognition started")
          setIsListening(true)
        }

        recognitionInstance.onend = () => {
          console.log("🎤 Voice recognition ended")
          setIsListening(false)

          // Auto-restart if still enabled
          if (isEnabled) {
            setTimeout(() => {
              try {
                recognitionInstance.start()
              } catch (error) {
                console.log("Recognition restart failed:", error)
              }
            }, 1000)
          }
        }

        recognitionInstance.onresult = (event: any) => {
          const result = event.results[event.results.length - 1]
          const transcript = result[0].transcript.toLowerCase().trim()
          const confidence = result[0].confidence

          console.log(`🎤 Heard: "${transcript}" (confidence: ${confidence})`)
          setLastCommand(transcript)
          onCommand(transcript, confidence)
        }

        recognitionInstance.onerror = (event: any) => {
          console.error("🎤 Speech recognition error:", event.error)
          setIsListening(false)
        }

        setRecognition(recognitionInstance)
      } else {
        console.warn("🎤 Speech Recognition not supported")
        setIsSupported(false)
      }
    }
  }, [onCommand, isEnabled])

  // Start/stop recognition based on enabled state
  useEffect(() => {
    if (!recognition || !isSupported) return

    if (isEnabled && !isListening) {
      try {
        recognition.start()
      } catch (error) {
        console.log("Recognition start failed:", error)
      }
    } else if (!isEnabled && isListening) {
      recognition.stop()
    }
  }, [isEnabled, recognition, isListening, isSupported])

  if (!isSupported) {
    return (
      <div
        style={{
          position: "fixed",
          top: "1rem",
          left: "1rem",
          background: "rgba(239, 68, 68, 0.2)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "0.75rem",
          padding: "0.75rem 1rem",
          color: "white",
          fontSize: "0.75rem",
          zIndex: 30,
        }}
      >
        🎤 Voice commands not supported in this browser
      </div>
    )
  }

  return (
    <div
      style={{
        position: "fixed",
        top: "1rem",
        left: "1rem",
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      {/* Voice Toggle Button */}
      <button
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.75rem 1rem",
          background: isEnabled ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
          border: isEnabled ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(255,255,255,0.2)",
          borderRadius: "0.75rem",
          color: "white",
          cursor: "pointer",
          transition: "all 0.3s ease",
          fontSize: "0.875rem",
          fontWeight: 600,
          boxShadow: isEnabled ? "0 4px 12px rgba(16, 185, 129, 0.3)" : "none",
        }}
      >
        {isListening ? (
          <div
            style={{
              width: "0.5rem",
              height: "0.5rem",
              borderRadius: "50%",
              background: "#ef4444",
              animation: "pulse 1s infinite",
            }}
          />
        ) : isEnabled ? (
          <Mic size={16} />
        ) : (
          <MicOff size={16} />
        )}
        {isListening ? "Listening..." : isEnabled ? "Voice ON" : "Voice OFF"}
      </button>

      {/* Last Command Display */}
      {lastCommand && isEnabled && (
        <div
          style={{
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(10px)",
            borderRadius: "0.5rem",
            padding: "0.5rem 0.75rem",
            color: "white",
            fontSize: "0.75rem",
            maxWidth: "200px",
            animation: "fadeInOut 3s ease-in-out",
          }}
        >
          💬 "{lastCommand}"
        </div>
      )}

      {/* Voice Commands Help */}
      {isEnabled && (
        <div
          style={{
            background: "rgba(59, 130, 246, 0.2)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            borderRadius: "0.5rem",
            padding: "0.75rem",
            color: "white",
            fontSize: "0.75rem",
            maxWidth: "250px",
            lineHeight: "1.4",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>🎤 Voice Commands:</div>
          <div>• "Mark this spot"</div>
          <div>• "Take a photo"</div>
          <div>• "Record video"</div>
          <div>• "Show my spots"</div>
          <div>• "Mute" / "Unmute"</div>
        </div>
      )}
    </div>
  )
}

// Add global type declaration
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}
