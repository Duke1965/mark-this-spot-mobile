"use client"

import { useState, useCallback } from "react"
import { Mic, MicOff, X, Send, Sparkles } from "lucide-react"

interface AIAssistantProps {
  onCommand: (command: string) => void
  onClose: () => void
}

export function AIAssistant({ onCommand, onClose }: AIAssistantProps) {
  const [isListening, setIsListening] = useState(false)
  const [inputText, setInputText] = useState("")
  const [chatHistory, setChatHistory] = useState<Array<{ type: "user" | "ai"; message: string }>>([])

  const suggestions = ["Take a photo", "Record a video", "Start story mode", "Add effects", "Export and share"]

  const handleCommand = useCallback(
    (command: string) => {
      if (!command.trim()) return

      setChatHistory((prev) => [...prev, { type: "user", message: command }])

      // Simulate AI response
      setTimeout(() => {
        const lowerCommand = command.toLowerCase()
        let response = ""

        if (lowerCommand.includes("photo")) {
          response = "📸 Ready to take a photo! Point your camera and tap the capture button."
        } else if (lowerCommand.includes("video")) {
          response = "🎥 Switching to video mode! Hold the record button to capture video."
        } else if (lowerCommand.includes("story")) {
          response = "📖 Opening story mode! You can create collections of your pins."
        } else if (lowerCommand.includes("effect")) {
          response = "✨ Opening effects panel! You can adjust brightness, contrast, and apply filters."
        } else {
          response =
            "🤖 I can help you take photos, record videos, create stories, and edit your content! What would you like to do?"
        }

        setChatHistory((prev) => [...prev, { type: "ai", message: response }])

        // Execute command
        onCommand(command)
      }, 1000)

      setInputText("")
    },
    [onCommand],
  )

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      handleCommand(suggestion)
    },
    [handleCommand],
  )

  const toggleListening = useCallback(() => {
    setIsListening(!isListening)

    if (!isListening) {
      // Simulate voice recognition
      setTimeout(() => {
        setIsListening(false)
        handleCommand("Take a photo")
      }, 2000)
    }
  }, [isListening, handleCommand])

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end p-4">
      <div className="w-full max-h-[70vh] bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-6 text-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold">PINIT AI Assistant</h3>
              <p className="text-sm opacity-80">{isListening ? "Listening..." : "Ready to help!"}</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Chat History */}
        {chatHistory.length > 0 && (
          <div className="max-h-48 overflow-y-auto mb-6 space-y-3">
            {chatHistory.map((chat, index) => (
              <div key={index} className={`flex ${chat.type === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    chat.type === "user" ? "bg-blue-500 text-white" : "bg-white/20 text-white"
                  }`}
                >
                  {chat.message}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Voice Input */}
        <div className="text-center mb-6">
          <button
            onClick={toggleListening}
            className={`w-20 h-20 rounded-full transition-all ${
              isListening ? "bg-red-500 scale-110" : "bg-white/20 hover:bg-white/30"
            }`}
          >
            {isListening ? <MicOff size={32} /> : <Mic size={32} />}
          </button>

          <p className="mt-3 text-sm opacity-80">{isListening ? "Release to stop" : "Tap to speak"}</p>
        </div>

        {/* Text Input */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleCommand(inputText)}
            placeholder="Or type your command..."
            className="flex-1 p-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/60"
          />
          <button
            onClick={() => handleCommand(inputText)}
            className="p-3 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
          >
            <Send size={20} />
          </button>
        </div>

        {/* Quick Suggestions */}
        <div>
          <p className="text-sm font-bold mb-3">💡 Quick Commands:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-full text-sm transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
