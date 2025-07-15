"use client"

import { Download, Instagram, Facebook, Twitter, Smartphone, Monitor, Square } from "lucide-react"

interface ExportHubProps {
  projectData: any
  generatedPostcard: string | null
  onGenerate: () => void
  onSave: () => void
  isGenerating: boolean
}

export function ExportHub({ projectData, generatedPostcard, onGenerate, onSave, isGenerating }: ExportHubProps) {
  const socialFormats = {
    instagram: {
      name: "Instagram Post",
      icon: <Instagram size={20} />,
      dimensions: "1080x1080",
      description: "Perfect square format for Instagram feed",
      color: "#E4405F",
    },
    story: {
      name: "Instagram Story",
      icon: <Smartphone size={20} />,
      dimensions: "1080x1920",
      description: "Vertical format for Instagram/Facebook stories",
      color: "#8B5CF6",
    },
    facebook: {
      name: "Facebook Post",
      icon: <Facebook size={20} />,
      dimensions: "1200x630",
      description: "Optimized for Facebook timeline sharing",
      color: "#1877F2",
    },
    twitter: {
      name: "Twitter Post",
      icon: <Twitter size={20} />,
      dimensions: "1200x675",
      description: "Perfect for Twitter image posts",
      color: "#1DA1F2",
    },
    desktop: {
      name: "Desktop Wallpaper",
      icon: <Monitor size={20} />,
      dimensions: "1920x1080",
      description: "High resolution for desktop backgrounds",
      color: "#10B981",
    },
    square: {
      name: "Square Format",
      icon: <Square size={20} />,
      dimensions: "1080x1080",
      description: "Universal square format",
      color: "#F59E0B",
    },
  }

  const downloadPostcard = (format = "default") => {
    if (!generatedPostcard) return

    const link = document.createElement("a")
    const formatName = socialFormats[format as keyof typeof socialFormats]?.name || "Postcard"
    link.download = `${projectData.locationName.replace(/[^a-zA-Z0-9]/g, "-")}-${formatName.replace(/\s+/g, "-")}-${Date.now()}.jpg`
    link.href = generatedPostcard
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    console.log(`📥 Downloaded: ${formatName}`)
  }

  const shareToSocial = (platform: string) => {
    const text = `Check out this amazing moment at ${projectData.locationName}! 📍✨`

    const urls = {
      instagram: () => {
        navigator.clipboard
          .writeText(`${text} #Travel #Adventure #${projectData.locationName.replace(/\s+/g, "")}`)
          .then(() => {
            alert("📋 Caption copied! Now download your image and share it on Instagram!")
          })
      },
      facebook: () => {
        const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(text)}`
        window.open(url, "_blank")
      },
      twitter: () => {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text + " #Travel #Adventure")}`
        window.open(url, "_blank")
      },
    }

    const shareFunction = urls[platform as keyof typeof urls]
    if (shareFunction) {
      shareFunction()
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
            onClick={onGenerate}
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

      {/* Download Formats */}
      {generatedPostcard && (
        <div>
          <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: "bold" }}>📥 DOWNLOAD FORMATS</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.75rem" }}>
            {Object.entries(socialFormats).map(([id, format]) => (
              <button
                key={id}
                onClick={() => downloadPostcard(id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "1rem",
                  borderRadius: "0.75rem",
                  border: "none",
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.15)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)"
                }}
              >
                <div
                  style={{
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    background: format.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {format.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <h5 style={{ margin: "0 0 0.25rem 0", fontSize: "0.875rem", fontWeight: "bold" }}>{format.name}</h5>
                  <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.75rem", opacity: 0.8 }}>{format.description}</p>
                  <p style={{ margin: 0, fontSize: "0.75rem", opacity: 0.6 }}>{format.dimensions}</p>
                </div>
                <Download size={16} style={{ opacity: 0.6 }} />
              </button>
            ))}
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
              }}
            >
              <Twitter size={24} />
              Twitter
            </button>
          </div>
        </div>
      )}

      {/* Save to Library */}
      {generatedPostcard && (
        <button
          onClick={onSave}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            padding: "1rem 2rem",
            borderRadius: "0.75rem",
            border: "none",
            background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
            color: "white",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "1rem",
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
            marginTop: "1rem",
          }}
        >
          <Download size={20} />
          Save to Library
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

