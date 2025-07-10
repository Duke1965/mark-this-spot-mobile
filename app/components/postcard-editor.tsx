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
      shadow: "0 8px 32px rgba(139, 69, 19, 0.3)",
    },
    polaroid: {
      name: "Polaroid",
      emoji: "📸",
      border: "16px solid white",
      background: "white",
      shadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
    },
    film: {
      name: "Film Strip",
      emoji: "🎞️",
      border: "8px solid #1a1a1a",
      background: "linear-gradient(90deg, #1a1a1a 0%, #333 50%, #1a1a1a 100%)",
      shadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
    },
    tropical: {
      name: "Tropical",
      emoji: "🌺",
      border: "12px solid #FF6B9D",
      background: "linear-gradient(135deg, #FF6B9D, #C44569, #F8B500)",
      shadow: "0 8px 32px rgba(255, 107, 157, 0.3)",
    },
    nature: {
      name: "Nature",
      emoji: "🌿",
      border: "12px solid #27AE60",
      background: "linear-gradient(135deg, #27AE60, #2ECC71, #58D68D)",
      shadow: "0 8px 32px rgba(39, 174, 96, 0.3)",
    },
    sunset: {
      name: "Sunset",
      emoji: "🌅",
      border: "12px solid #E67E22",
      background: "linear-gradient(135deg, #E67E22, #F39C12, #F7DC6F)",
      shadow: "0 8px 32px rgba(230, 126, 34, 0.3)",
    },
  }

  const socialPlatforms = [
    {
      name: "Instagram",
      icon: Instagram,
      color: "#E4405F",
      gradient: "linear-gradient(45deg, #F58529, #DD2A7B, #8134AF)",
    },
    { name: "Facebook", icon: Facebook, color: "#1877F2", gradient: "linear-gradient(45deg, #1877F2, #42A5F5)" },
    { name: "Twitter", icon: Twitter, color: "#1DA1F2", gradient: "linear-gradient(45deg, #1DA1F2, #0D8BD9)" },
  ]

  const handleShare = async (platform: string) => {
    setIsSharing(true)

    // Create postcard data
    const postcardData: PostcardData = {
      mediaUrl,
      mediaType,
      frameStyle: selectedFrame,
      message,
      locationName,
      timestamp: new Date().toISOString(),
    }

    // Simulate sharing delay with realistic timing
    await new Promise((resolve) => setTimeout(resolve, 2000))

    console.log(`🚀 SHARING TO ${platform.toUpperCase()}:`, {
      frame: postcardData.frameStyle,
      messageLength: postcardData.message.length,
      location: postcardData.locationName,
      mediaType: postcardData.mediaType,
    })

    // Save the postcard and close
    onSave(postcardData)
    setIsSharing(false)
  }

  const currentFrame = frameStyles[selectedFrame as keyof typeof frameStyles]

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1rem 1.5rem",
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255,255,255,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ fontSize: "2rem" }}>🎨</div>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 900, color: "white", margin: 0 }}>Create Postcard</h1>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.875rem", margin: 0 }}>
              Add a frame and message to your {mediaType}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            padding: "0.75rem",
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
        >
          <X size={24} />
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left Panel - Preview */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            background: "rgba(255,255,255,0.05)",
          }}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "400px",
              maxHeight: "500px",
              ...currentFrame,
              borderRadius: "1rem",
              overflow: "hidden",
              transform: "rotate(-2deg)",
              transition: "all 0.3s ease",
            }}
          >
            {/* Media Content */}
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "4/3",
                overflow: "hidden",
                borderRadius: "0.5rem",
              }}
            >
              {mediaType === "photo" ? (
                <img
                  src={mediaUrl || "/placeholder.svg"}
                  alt="Captured moment"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <video
                  src={mediaUrl}
                  autoPlay
                  loop
                  muted
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              )}

              {/* Location Badge */}
              <div
                style={{
                  position: "absolute",
                  top: "1rem",
                  left: "1rem",
                  background: "rgba(0,0,0,0.7)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  padding: "0.5rem 1rem",
                  borderRadius: "1rem",
                  fontSize: "0.875rem",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                📍 {locationName}
              </div>
            </div>

            {/* Message Area */}
            {message && (
              <div
                style={{
                  padding: "1.5rem",
                  background: "rgba(255,255,255,0.9)",
                  margin: "1rem",
                  borderRadius: "0.5rem",
                  fontFamily: "'Kalam', cursive",
                  fontSize: "1.125rem",
                  color: "#2c3e50",
                  lineHeight: 1.6,
                  textAlign: "center",
                  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)",
                }}
              >
                "{message}"
              </div>
            )}

            {/* Postcard Stamp */}
            <div
              style={{
                position: "absolute",
                top: "1rem",
                right: "1rem",
                width: "3rem",
                height: "3rem",
                background: "linear-gradient(135deg, #e74c3c, #c0392b)",
                borderRadius: "0.25rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                transform: "rotate(15deg)",
                boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
              }}
            >
              ❤️
            </div>
          </div>
        </div>

        {/* Right Panel - Controls */}
        <div
          style={{
            width: "400px",
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)",
            borderLeft: "1px solid rgba(255,255,255,0.2)",
            display: "flex",
            flexDirection: "column",
            overflow: "auto",
          }}
        >
          {/* Frame Selection */}
          <div style={{ padding: "1.5rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "white", marginBottom: "1rem" }}>
              🖼️ Choose Frame
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {Object.entries(frameStyles).map(([key, frame]) => (
                <button
                  key={key}
                  onClick={() => setSelectedFrame(key)}
                  style={{
                    padding: "1rem",
                    borderRadius: "0.75rem",
                    border: selectedFrame === key ? "2px solid #3B82F6" : "2px solid transparent",
                    background: selectedFrame === key ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.1)",
                    backdropFilter: "blur(10px)",
                    color: "white",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{frame.emoji}</div>
                  <div style={{ fontSize: "0.875rem", fontWeight: "bold" }}>{frame.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Message Input */}
          <div style={{ padding: "1.5rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "white", marginBottom: "1rem" }}>
              ✍️ Add Message
            </h3>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a short note about this special place..."
              maxLength={120}
              style={{
                width: "100%",
                height: "100px",
                padding: "1rem",
                borderRadius: "0.75rem",
                border: "2px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.1)",
                backdropFilter: "blur(10px)",
                color: "white",
                fontSize: "1rem",
                fontFamily: "'Kalam', cursive",
                resize: "none",
                outline: "none",
                transition: "all 0.3s ease",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#3B82F6"
                e.target.style.background = "rgba(59, 130, 246, 0.1)"
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(255,255,255,0.2)"
                e.target.style.background = "rgba(255,255,255,0.1)"
              }}
            />
            <div
              style={{
                textAlign: "right",
                marginTop: "0.5rem",
                fontSize: "0.75rem",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              {message.length}/120
            </div>
          </div>

          {/* Share Buttons */}
          <div style={{ padding: "1.5rem", flex: 1 }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "white", marginBottom: "1rem" }}>
              📤 Share Your Postcard
            </h3>

            {isSharing ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "2rem",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: "3rem",
                    height: "3rem",
                    border: "4px solid rgba(255,255,255,0.3)",
                    borderTop: "4px solid white",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    marginBottom: "1rem",
                  }}
                />
                <p style={{ color: "white", fontSize: "1.125rem", fontWeight: "bold" }}>Creating your postcard...</p>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem" }}>
                  Adding the perfect finishing touches ✨
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {socialPlatforms.map((platform) => {
                  const IconComponent = platform.icon
                  return (
                    <button
                      key={platform.name}
                      onClick={() => handleShare(platform.name)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                        padding: "1rem 1.5rem",
                        borderRadius: "1rem",
                        border: "none",
                        background: platform.gradient,
                        color: "white",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        fontSize: "1rem",
                        fontWeight: "bold",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)"
                        e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.3)"
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)"
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)"
                      }}
                    >
                      <IconComponent size={24} />
                      Share to {platform.name}
                    </button>
                  )
                })}

                <button
                  onClick={() => handleShare("save")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "1rem 1.5rem",
                    borderRadius: "1rem",
                    border: "2px solid rgba(255,255,255,0.3)",
                    background: "rgba(255,255,255,0.1)",
                    backdropFilter: "blur(10px)",
                    color: "white",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    fontSize: "1rem",
                    fontWeight: "bold",
                  }}
                >
                  <Download size={24} />
                  Save to Library
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Kalam:wght@400;700&display=swap');
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        ::placeholder {
          color: rgba(255,255,255,0.5);
          font-style: italic;
        }
      `}</style>
    </div>
  )
}
