"use client"

import { useState, useRef } from "react"
import { X, Download, Instagram, Facebook, Twitter } from "lucide-react"

interface PostcardEditorProps {
  mediaUrl: string
  mediaType: "photo" | "video"
  locationName: string
  onSave: (postcardData: PostcardData) => void
  onClose: () => void
}

interface PostcardData {
  mediaUrl: string
  mediaType: "photo" | "video"
  frameStyle: string
  message: string
  locationName: string
  timestamp: string
}

export function PostcardEditor({ mediaUrl, mediaType, locationName, onSave, onClose }: PostcardEditorProps) {
  const [selectedFrame, setSelectedFrame] = useState("vintage")
  const [message, setMessage] = useState("")
  const [isSharing, setIsSharing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const frameStyles = {
    vintage: {
      name: "Vintage Postcard",
      emoji: "📮",
      border: "12px solid #8B4513",
      background: "linear-gradient(45deg, #F4E4BC, #E6D3A3)",
      boxShadow: "0 8px 32px rgba(139, 69, 19, 0.3)",
    },
    polaroid: {
      name: "Polaroid",
      emoji: "📸",
      border: "16px solid white",
      background: "white",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
    },
    film: {
      name: "Film Strip",
      emoji: "🎞️",
      border: "8px solid #1a1a1a",
      background: "linear-gradient(90deg, #1a1a1a 0%, #333 50%, #1a1a1a 100%)",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
    },
    tropical: {
      name: "Tropical",
      emoji: "🌺",
      border: "12px solid #FF6B9D",
      background: "linear-gradient(135deg, #FF6B9D, #C44569, #F8B500)",
      boxShadow: "0 8px 32px rgba(255, 107, 157, 0.3)",
    },
    nature: {
      name: "Nature",
      emoji: "🌿",
      border: "12px solid #27AE60",
      background: "linear-gradient(135deg, #27AE60, #2ECC71, #58D68D)",
      boxShadow: "0 8px 32px rgba(39, 174, 96, 0.3)",
    },
    sunset: {
      name: "Sunset",
      emoji: "🌅",
      border: "12px solid #E67E22",
      background: "linear-gradient(135deg, #E67E22, #F39C12, #F7DC6F)",
      boxShadow: "0 8px 32px rgba(230, 126, 34, 0.3)",
    },
  }

  const socialPlatforms = [
    {
      name: "Instagram",
      icon: Instagram,
      color: "#E4405F",
      gradient: "linear-gradient(45deg, #F58529, #DD2A7B, #8134AF)",
    },
    {
      name: "Facebook",
      icon: Facebook,
      color: "#1877F2",
      gradient: "linear-gradient(45deg, #1877F2, #42A5F5)",
    },
    {
      name: "Twitter",
      icon: Twitter,
      color: "#1DA1F2",
      gradient: "linear-gradient(45deg, #1DA1F2, #0D8BD9)",
    },
  ]

  const handleShare = async (platform: string) => {
    setIsSharing(true)

    const postcardData: PostcardData = {
      mediaUrl,
      mediaType,
      frameStyle: selectedFrame,
      message,
      locationName,
      timestamp: new Date().toISOString(),
    }

    await new Promise((resolve) => setTimeout(resolve, 2000))

    console.log(`🚀 SHARING TO ${platform.toUpperCase()}:`, {
      frame: postcardData.frameStyle,
      messageLength: postcardData.message.length,
      location: postcardData.locationName,
      mediaType: postcardData.mediaType,
    })

    onSave(postcardData)
    setIsSharing(false)
  }

  const currentFrame = frameStyles[selectedFrame as keyof typeof frameStyles]

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-600 to-purple-700 z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-white/10 backdrop-blur-md border-b border-white/20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-3xl">🎨</div>
          <div>
            <h1 className="text-xl font-black text-white">Create Postcard</h1>
            <p className="text-white/80 text-sm">Add a frame and message to your {mediaType}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-3 rounded-full bg-white/20 text-white hover:bg-white/30 transition-all">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Preview */}
        <div className="flex-1 flex items-center justify-center p-8 bg-white/5">
          <div
            className="relative max-w-sm max-h-96 rounded-2xl overflow-hidden transition-all duration-300"
            style={{
              ...currentFrame,
              transform: "rotate(-2deg)",
            }}
          >
            {/* Media Content */}
            <div className="relative w-full aspect-[4/3] overflow-hidden rounded-lg">
              {mediaType === "photo" ? (
                <img
                  src={mediaUrl || "/placeholder.svg?height=300&width=400&text=Photo"}
                  alt="Captured moment"
                  className="w-full h-full object-cover"
                />
              ) : (
                <video src={mediaUrl} autoPlay loop muted className="w-full h-full object-cover" />
              )}

              {/* Location Badge */}
              <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md text-white px-3 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                📍 {locationName}
              </div>
            </div>

            {/* Message Area */}
            {message && (
              <div className="p-6 bg-white/90 m-4 rounded-lg text-center text-slate-800 leading-relaxed shadow-inner">
                <div className="font-handwriting text-lg">"{message}"</div>
              </div>
            )}

            {/* Postcard Stamp */}
            <div className="absolute top-4 right-4 w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 rounded transform rotate-12 flex items-center justify-center text-xl shadow-lg">
              ❤️
            </div>
          </div>
        </div>

        {/* Right Panel - Controls */}
        <div className="w-96 bg-white/10 backdrop-blur-md border-l border-white/20 flex flex-col overflow-auto">
          {/* Frame Selection */}
          <div className="p-6 border-b border-white/10">
            <h3 className="text-lg font-bold text-white mb-4">🖼️ Choose Frame</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(frameStyles).map(([key, frame]) => (
                <button
                  key={key}
                  onClick={() => setSelectedFrame(key)}
                  className={`p-4 rounded-xl border-2 transition-all text-center text-white ${
                    selectedFrame === key
                      ? "border-blue-400 bg-blue-400/20"
                      : "border-transparent bg-white/10 hover:bg-white/20"
                  }`}
                >
                  <div className="text-2xl mb-2">{frame.emoji}</div>
                  <div className="text-sm font-bold">{frame.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Message Input */}
          <div className="p-6 border-b border-white/10">
            <h3 className="text-lg font-bold text-white mb-4">✍️ Add Message</h3>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a short note about this special place..."
              maxLength={120}
              className="w-full h-24 p-4 rounded-xl border-2 border-white/20 bg-white/10 backdrop-blur-md text-white placeholder-white/50 resize-none outline-none transition-all focus:border-blue-400 focus:bg-blue-400/10"
              style={{ fontFamily: "'Kalam', cursive" }}
            />
            <div className="text-right mt-2 text-xs text-white/60">{message.length}/120</div>
          </div>

          {/* Share Buttons */}
          <div className="p-6 flex-1">
            <h3 className="text-lg font-bold text-white mb-4">📤 Share Your Postcard</h3>

            {isSharing ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4" />
                <p className="text-white text-lg font-bold">Creating your postcard...</p>
                <p className="text-white/70 text-sm">Adding the perfect finishing touches ✨</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {socialPlatforms.map((platform) => {
                  const IconComponent = platform.icon
                  return (
                    <button
                      key={platform.name}
                      onClick={() => handleShare(platform.name)}
                      className="flex items-center gap-4 p-4 rounded-xl text-white font-bold transition-all hover:scale-105 hover:shadow-xl"
                      style={{ background: platform.gradient }}
                    >
                      <IconComponent size={24} />
                      Share to {platform.name}
                    </button>
                  )
                })}

                <button
                  onClick={() => handleShare("save")}
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-white/30 bg-white/10 backdrop-blur-md text-white font-bold transition-all hover:bg-white/20"
                >
                  <Download size={24} />
                  Save to Library
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
