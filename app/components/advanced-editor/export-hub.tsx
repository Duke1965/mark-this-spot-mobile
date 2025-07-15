"use client"

import { Download, Instagram, Facebook, Twitter, Smartphone, Monitor, Square, Share2 } from "lucide-react"
import { useState } from "react"

interface ExportHubProps {
  generatePostcard: () => Promise<string | null>
  postcardData: {
    mediaUrl: string
    mediaType: "photo" | "video"
    location?: string
    effects: string[]
    stickers: any[]
    canvasData: any
  }
}

export function ExportHub({ generatePostcard, postcardData }: ExportHubProps) {
  const [generatedPostcard, setGeneratedPostcard] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<string>("instagram")

  const socialFormats = {
    instagram: {
      name: "Instagram Post",
      icon: <Instagram size={20} />,
      dimensions: "1080x1080",
      description: "Perfect square format for Instagram feed",
      color: "#E4405F",
      aspectRatio: "1:1",
    },
    story: {
      name: "Instagram Story",
      icon: <Smartphone size={20} />,
      dimensions: "1080x1920",
      description: "Vertical format for Instagram/Facebook stories",
      color: "#8B5CF6",
      aspectRatio: "9:16",
    },
    facebook: {
      name: "Facebook Post",
      icon: <Facebook size={20} />,
      dimensions: "1200x630",
      description: "Optimized for Facebook timeline sharing",
      color: "#1877F2",
      aspectRatio: "1.91:1",
    },
    twitter: {
      name: "Twitter Post",
      icon: <Twitter size={20} />,
      dimensions: "1200x675",
      description: "Perfect for Twitter image posts",
      color: "#1DA1F2",
      aspectRatio: "16:9",
    },
    desktop: {
      name: "Desktop Wallpaper",
      icon: <Monitor size={20} />,
      dimensions: "1920x1080",
      description: "High resolution for desktop backgrounds",
      color: "#10B981",
      aspectRatio: "16:9",
    },
    square: {
      name: "Square Format",
      icon: <Square size={20} />,
      dimensions: "1080x1080",
      description: "Universal square format",
      color: "#F59E0B",
      aspectRatio: "1:1",
    },
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const result = await generatePostcard()
      if (result) {
        setGeneratedPostcard(result)
        console.log("✅ Postcard generated successfully")
      } else {
        console.error("❌ Failed to generate postcard")
      }
    } catch (error) {
      console.error("❌ Generation error:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadPostcard = (format = selectedFormat) => {
    if (!generatedPostcard) return

    const formatInfo = socialFormats[format as keyof typeof socialFormats]
    const link = document.createElement("a")
    link.download = `postcard-${postcardData.location?.replace(/[^a-zA-Z0-9]/g, "-") || "memory"}-${formatInfo.name.replace(/\s+/g, "-")}-${Date.now()}.jpg`
    link.href = generatedPostcard
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    console.log(`📥 Downloaded: ${formatInfo.name}`)
  }

  const shareToSocial = (platform: string) => {
    const text = `Check out this amazing moment${postcardData.location ? ` at ${postcardData.location}` : ""}! 📍✨`

    const shareActions = {
      instagram: () => {
        navigator.clipboard
          .writeText(
            `${text} #Travel #Adventure #Memories${postcardData.location ? ` #${postcardData.location.replace(/\s+/g, "")}` : ""}`,
          )
          .then(() => {
            alert("📋 Caption copied! Now download your image and share it on Instagram!")
          })
      },
      facebook: () => {
        const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(text)}`
        window.open(url, "_blank")
      },
      twitter: () => {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text + " #Travel #Adventure #Memories")}`
        window.open(url, "_blank")
      },
    }

    const shareAction = shareActions[platform as keyof typeof shareActions]
    if (shareAction) {
      shareAction()
    }
  }

  const copyToClipboard = async () => {
    if (!generatedPostcard) return

    try {
      const response = await fetch(generatedPostcard)
      const blob = await response.blob()

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob,
          }),
        ])
        alert("📋 Image copied to clipboard!")
      } else {
        // Fallback - just copy the data URL
        await navigator.clipboard.writeText(generatedPostcard)
        alert("📋 Image data copied to clipboard!")
      }
    } catch (error) {
      console.error("❌ Failed to copy to clipboard:", error)
      alert("❌ Failed to copy to clipboard")
    }
  }

  return (
    <div
      style={{
        flex: 1,
        padding: "1.5rem",
        color: "white",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      <div>
        <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.125rem", fontWeight: "bold" }}>📤 Export & Share</h3>
      </div>

      {/* Project Summary */}
      <div
        style={{
          background: "rgba(255,255,255,0.1)",
          borderRadius: "0.75rem",
          padding: "1rem",
        }}
      >
        <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.875rem", fontWeight: "bold" }}>📋 PROJECT SUMMARY</h4>
        <div style={{ fontSize: "0.75rem", opacity: 0.9, lineHeight: 1.5 }}>
          <div>
            <strong>Media Type:</strong> {postcardData.mediaType === "photo" ? "📸 Photo" : "🎥 Video"}
          </div>
          {postcardData.location && (
            <div>
              <strong>Location:</strong> 📍 {postcardData.location}
            </div>
          )}
          <div>
            <strong>Effects Applied:</strong> {postcardData.effects.length || "None"}
          </div>
          <div>
            <strong>Stickers Added:</strong> {postcardData.stickers.length || "None"}
          </div>
          <div>
            <strong>Text Elements:</strong> {postcardData.canvasData?.texts?.length || "None"}
          </div>
        </div>
      </div>

      {/* Generate Section */}
      {!generatedPostcard && (
        <div
          style={{
            background: "rgba(59, 130, 246, 0.1)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            borderRadius: "0.75rem",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎨</div>
          <h4 style={{ margin: "0 0 1rem 0", fontSize: "1.125rem", fontWeight: "bold" }}>
            Ready to Create Your Masterpiece?
          </h4>
          <p style={{ margin: "0 0 1.5rem 0", opacity: 0.8, fontSize: "0.875rem" }}>
            Generate your final postcard with all the customizations you've made
          </p>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "1rem 2rem",
              borderRadius: "0.75rem",
              border: "none",
              background: isGenerating ? "rgba(255,255,255,0.3)" : "#3B82F6",
              color: "white",
              cursor: isGenerating ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: "1rem",
              margin: "0 auto",
              transition: "all 0.3s ease",
            }}
          >
            {isGenerating ? (
              <>
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTop: "2px solid white",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                Generating...
              </>
            ) : (
              <>
                <Download size={20} />
                Generate Postcard
              </>
            )}
          </button>
        </div>
      )}

      {/* Generated Postcard Preview */}
      {generatedPostcard && (
        <div>
          <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: "bold" }}>✨ YOUR CREATION</h4>
          <div
            style={{
              background: "rgba(255,255,255,0.1)",
              borderRadius: "0.75rem",
              padding: "1rem",
              textAlign: "center",
            }}
          >
            <img
              src={generatedPostcard || "/placeholder.svg"}
              alt="Generated postcard"
              style={{
                maxWidth: "100%",
                maxHeight: "300px",
                objectFit: "contain",
                borderRadius: "0.5rem",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
            />
          </div>
        </div>
      )}

      {/* Format Selection */}
      {generatedPostcard && (
        <div>
          <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: "bold" }}>📐 SELECT FORMAT</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.5rem", marginBottom: "1rem" }}>
            {Object.entries(socialFormats).map(([id, format]) => (
              <button
                key={id}
                onClick={() => setSelectedFormat(id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: selectedFormat === id ? `2px solid ${format.color}` : "1px solid rgba(255,255,255,0.3)",
                  background: selectedFormat === id ? `${format.color}20` : "rgba(255,255,255,0.1)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: selectedFormat === id ? "bold" : "normal",
                  textAlign: "left",
                }}
              >
                <div style={{ color: format.color }}>{format.icon}</div>
                <div>
                  <div>{format.name}</div>
                  <div style={{ opacity: 0.7, fontSize: "0.6rem" }}>{format.dimensions}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Download Options */}
      {generatedPostcard && (
        <div>
          <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: "bold" }}>📥 DOWNLOAD OPTIONS</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <button
              onClick={() => downloadPostcard()}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "1rem",
                borderRadius: "0.75rem",
                border: "none",
                background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "0.875rem",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
              }}
            >
              <Download size={18} />
              Download {socialFormats[selectedFormat as keyof typeof socialFormats].name}
            </button>

            <button
              onClick={copyToClipboard}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "0.875rem",
              }}
            >
              📋 Copy to Clipboard
            </button>
          </div>
        </div>
      )}

      {/* Social Sharing */}
      {generatedPostcard && (
        <div>
          <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: "bold" }}>📱 SHARE DIRECTLY</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
            <button
              onClick={() => shareToSocial("instagram")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                padding: "1rem",
                borderRadius: "0.75rem",
                border: "none",
                background: "rgba(228, 64, 95, 0.2)",
                color: "#E4405F",
                cursor: "pointer",
                fontSize: "0.75rem",
                fontWeight: "bold",
                transition: "all 0.3s ease",
              }}
            >
              <Instagram size={24} />
              Instagram
            </button>

            <button
              onClick={() => shareToSocial("facebook")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                padding: "1rem",
                borderRadius: "0.75rem",
                border: "none",
                background: "rgba(24, 119, 242, 0.2)",
                color: "#1877F2",
                cursor: "pointer",
                fontSize: "0.75rem",
                fontWeight: "bold",
                transition: "all 0.3s ease",
              }}
            >
              <Facebook size={24} />
              Facebook
            </button>

            <button
              onClick={() => shareToSocial("twitter")}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.5rem",
                padding: "1rem",
                borderRadius: "0.75rem",
                border: "none",
                background: "rgba(29, 161, 242, 0.2)",
                color: "#1DA1F2",
                cursor: "pointer",
                fontSize: "0.75rem",
                fontWeight: "bold",
                transition: "all 0.3s ease",
              }}
            >
              <Twitter size={24} />
              Twitter
            </button>
          </div>
        </div>
      )}

      {/* Native Share */}
      {generatedPostcard && navigator.share && (
        <button
          onClick={async () => {
            try {
              const response = await fetch(generatedPostcard)
              const blob = await response.blob()
              const file = new File([blob], "postcard.jpg", { type: "image/jpeg" })

              await navigator.share({
                title: `Amazing moment${postcardData.location ? ` at ${postcardData.location}` : ""}`,
                text: `Check out this postcard I created! 📍✨`,
                files: [file],
              })
            } catch (error) {
              console.log("Native sharing cancelled or failed")
            }
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            padding: "1rem",
            borderRadius: "0.75rem",
            border: "none",
            background: "rgba(59, 130, 246, 0.2)",
            color: "#3B82F6",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "0.875rem",
            marginTop: "1rem",
          }}
        >
          <Share2 size={18} />
          Share via Device
        </button>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
