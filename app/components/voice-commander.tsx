"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Mic, MicOff } from "lucide-react"

interface VoiceCommanderProps {
  onCommand: (command: string, confidence: number) => void
  isEnabled: boolean
  onToggle: () => void
}

export function VoiceCommander({ onCommand, isEnabled, onToggle }: VoiceCommanderProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [lastCommand, setLastCommand] = useState<string>("")
  const recognitionRef = useRef<any>(null)

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      setIsSupported(true)
      console.log("🎤 Speech Recognition supported")
    } else {
      console.warn("⚠️ Speech Recognition not supported in this browser")
    }
  }, [])

  // Initialize speech recognition
  const initializeSpeechRecognition = useCallback(() => {
    if (!isSupported) return null

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = "en-US"
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      console.log("🎤 Voice recognition started")
    }

    recognition.onend = () => {
      setIsListening(false)
      console.log("🎤 Voice recognition ended")

      // Restart if still enabled
      if (isEnabled && recognitionRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current?.start()
          } catch (error) {
            console.warn("⚠️ Failed to restart recognition:", error)
          }
        }, 1000)
      }
    }

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1]
      const command = result[0].transcript.trim()
      const confidence = result[0].confidence

      console.log(`🎤 Voice command detected: "${command}" (confidence: ${confidence})`)
      setLastCommand(command)

      // Process the command
      onCommand(command, confidence)
    }

    recognition.onerror = (event: any) => {
      console.error("🎤 Speech recognition error:", event.error)
      setIsListening(false)

      // Handle specific errors
      if (event.error === "not-allowed") {
        console.error("❌ Microphone access denied")
      } else if (event.error === "no-speech") {
        console.log("🔇 No speech detected, continuing...")
      }
    }

    return recognition
  }, [isSupported, isEnabled, onCommand])

  // Start/stop voice recognition based on enabled state
  useEffect(() => {
    if (!isSupported) return

    if (isEnabled) {
      const recognition = initializeSpeechRecognition()
      if (recognition) {
        recognitionRef.current = recognition
        try {
          recognition.start()
        } catch (error) {
          console.warn("⚠️ Failed to start recognition:", error)
        }
      }
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
    }
  }, [isEnabled, isSupported, initializeSpeechRecognition])

  if (!isSupported) {
    return null
  }

  return (
    <div
      style={{
        position: "fixed",
        top: "2rem",
        left: "2rem",
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
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
          borderRadius: "2rem",
          border: "none",
          background: isEnabled
            ? isListening
              ? "rgba(239, 68, 68, 0.9)"
              : "rgba(16, 185, 129, 0.9)"
            : "rgba(255,255,255,0.2)",
          backdropFilter: "blur(10px)",
          color: "white",
          cursor: "pointer",
          transition: "all 0.3s ease",
          fontWeight: 600,
          fontSize: "0.875rem",
          boxShadow: isEnabled ? "0 4px 12px rgba(0,0,0,0.3)" : "none",
        }}
      >
        {isEnabled ? (
          isListening ? (
            <>
              <div
                style={{
                  width: "0.5rem",
                  height: "0.5rem",
                  borderRadius: "50%",
                  background: "white",
                  animation: "pulse 1s infinite",
                }}
              />
              <Mic size={16} />
              Listening...
            </>
          ) : (
            <>
              <Mic size={16} />
              Voice Active
            </>
          )
        ) : (
          <>
            <MicOff size={16} />
            Voice Off
          </>
        )}
      </button>

      {/* Last Command Display */}
      {isEnabled && lastCommand && (
        <div
          style={{
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(10px)",
            color: "white",
            padding: "0.5rem 1rem",
            borderRadius: "1rem",
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
            background: "rgba(59, 130, 246, 0.1)",
            backdropFilter: "blur(10px)",
            color: "rgba(255,255,255,0.9)",
            padding: "0.75rem",
            borderRadius: "0.75rem",
            fontSize: "0.75rem",
            maxWidth: "250px",
            border: "1px solid rgba(59, 130, 246, 0.3)",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "0.25rem" }}>🎤 Voice Commands:</div>
          <div style={{ opacity: 0.8, lineHeight: 1.4 }}>
            • "Mark this spot"
            <br />• "Take a photo"
            <br />• "Record video"
            <br />• "Show my spots"
            <br />• "Go back"
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(10px); }
          20% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
      `}</style>
    </div>
  )
}
