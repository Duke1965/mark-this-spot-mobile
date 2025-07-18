"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Mic, MicOff, X, Send, Sparkles } from "lucide-react"

interface AIAssistantProps {
  onCommand: (command: string) => void
  onClose: () => void
}

export function AIAssistant({ onCommand, onClose }: AIAssistantProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [chatHistory, setChatHistory] = useState<Array<{ type: "user" | "ai"; message: string }>>([])

  const recognitionRef = useRef<any>(null)

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()

      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = "en-US"

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = ""
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript)
          handleVoiceCommand(finalTranscript)
        }
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error)
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }

    // Set initial suggestions
    setSuggestions(["Take a photo", "Record a video", "Add effects", "Start story mode", "Export and share"])

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true)
      setTranscript("")
      recognitionRef.current.start()
    }
  }, [isListening])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }, [isListening])

  const handleVoiceCommand = useCallback(
    async (command: string) => {
      if (!command.trim()) return

      setIsProcessing(true)
      setChatHistory((prev) => [...prev, { type: "user", message: command }])

      // Simulate AI processing
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const lowerCommand = command.toLowerCase()
      let response = ""

      if (lowerCommand.includes("photo") || lowerCommand.includes("picture")) {
        response = "📸 Ready to take a photo! Point your camera and tap the capture button."
        onCommand("take photo")
      } else if (lowerCommand.includes("video") || lowerCommand.includes("record")) {
        response = "🎥 Switching to video mode! Hold the record button to capture video."
        onCommand("record video")
      } else if (lowerCommand.includes("effect") || lowerCommand.includes("filter")) {
        response = "✨ Opening effects panel! You can adjust brightness, contrast, and apply filters."
        onCommand("add effects")
      } else if (lowerCommand.includes("story") || lowerCommand.includes("collection")) {
        response = "📖 Starting story mode! You can create collections of your pins."
        onCommand("story mode")
      } else if (lowerCommand.includes("share") || lowerCommand.includes("export")) {
        response = "📤 Opening export options! You can share to social media or download."
        onCommand("export")
      } else if (lowerCommand.includes("location") || lowerCommand.includes("where")) {
        response =
          "📍 I can help you with location-based features. Your current location will be added to your pins automatically."
      } else if (lowerCommand.includes("help") || lowerCommand.includes("what can")) {
        response =
          "🤖 I can help you take photos, record videos, add effects, create stories, and share your content! Just tell me what you'd like to do."
      } else {
        response =
          "🤔 I'm not sure about that command. Try saying 'take photo', 'add effects', 'start story', or 'help' for assistance."
      }

      setChatHistory((prev) => [...prev, { type: "ai", message: response }])
      setIsProcessing(false)
      setTranscript("")
    },
    [onCommand],
  )

  const handleTextCommand = useCallback(
    (command: string) => {
      if (command.trim()) {
        handleVoiceCommand(command)
      }
    },
    [handleVoiceCommand],
  )

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      handleVoiceCommand(suggestion)
    },
    [handleVoiceCommand],
  )

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.8)",
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-end",
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxHeight: "70vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: "1rem",
          padding: "1.5rem",
          color: "white",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                padding: "0.5rem",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: "bold" }}>PINIT AI Assistant</h3>
              <p style={{ margin: 0, fontSize: "0.875rem", opacity: 0.8 }}>
                {isListening ? "Listening..." : "Ready to help!"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem",
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              cursor: "pointer",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Chat History */}
        {chatHistory.length > 0 && (
          <div
            style={{
              maxHeight: "200px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            {chatHistory.map((chat, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent: chat.type === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "0.75rem",
                    borderRadius: "1rem",
                    background: chat.type === "user" ? "rgba(59, 130, 246, 0.8)" : "rgba(255,255,255,0.2)",
                    fontSize: "0.875rem",
                  }}
                >
                  {chat.message}
                </div>
              </div>
            ))}
            {isProcessing && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    padding: "0.75rem",
                    borderRadius: "1rem",
                    background: "rgba(255,255,255,0.2)",
                    fontSize: "0.875rem",
                  }}
                >
                  <div style={{ display: "flex", gap: "0.25rem" }}>
                    <div
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "white",
                        animation: "pulse 1.5s infinite",
                      }}
                    ></div>
                    <div
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "white",
                        animation: "pulse 1.5s infinite 0.5s",
                      }}
                    ></div>
                    <div
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "white",
                        animation: "pulse 1.5s infinite 1s",
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Voice Input */}
        <div style={{ textAlign: "center" }}>
          <button
            onMouseDown={startListening}
            onMouseUp={stopListening}
            onTouchStart={startListening}
            onTouchEnd={stopListening}
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              border: "none",
              background: isListening
                ? "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)"
                : "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto",
              boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
              transform: isListening ? "scale(1.1)" : "scale(1)",
              transition: "all 0.3s ease",
            }}
          >
            {isListening ? <MicOff size={32} /> : <Mic size={32} />}
          </button>

          <p style={{ margin: "0.75rem 0 0 0", fontSize: "0.875rem", opacity: 0.8 }}>
            {isListening ? "Release to stop" : "Hold to speak"}
          </p>

          {transcript && (
            <div
              style={{
                marginTop: "1rem",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                background: "rgba(255,255,255,0.1)",
                fontSize: "0.875rem",
                fontStyle: "italic",
              }}
            >
              "{transcript}"
            </div>
          )}
        </div>

        {/* Text Input */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            placeholder="Or type your command..."
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleTextCommand(e.currentTarget.value)
                e.currentTarget.value = ""
              }
            }}
            style={{
              flex: 1,
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(255,255,255,0.3)",
              background: "rgba(255,255,255,0.1)",
              color: "white",
              fontSize: "0.875rem",
            }}
          />
          <button
            onClick={() => {
              const input = document.querySelector('input[placeholder="Or type your command..."]') as HTMLInputElement
              if (input?.value) {
                handleTextCommand(input.value)
                input.value = ""
              }
            }}
            style={{
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#3B82F6",
              color: "white",
              cursor: "pointer",
            }}
          >
            <Send size={16} />
          </button>
        </div>

        {/* Quick Suggestions */}
        <div>
          <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.875rem", fontWeight: "bold" }}>💡 Quick Commands:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "1rem",
                  border: "none",
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.3)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.2)"
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <style jsx>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  )
}
