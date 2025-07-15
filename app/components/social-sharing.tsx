"use client"

import { useState } from "react"
import { Share2, Download, Copy, Check, Instagram, MessageCircle, Twitter, Facebook, Mail } from "lucide-react"

interface SocialSharingProps {
  postcardDataUrl: string
  locationName: string
  onComplete: () => void
}

export function SocialSharing({ postcardDataUrl, locationName, onComplete }: SocialSharingProps) {
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const link = document.createElement("a")
      link.download = `postcard-${locationName.replace(/[^a-zA-Z0-9]/g, "-")}-${Date.now()}.jpg`
      link.href = postcardDataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Download failed:", error)
    } finally {
      setDownloading(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      // In a real app, you'd upload the image and get a shareable URL
      const shareText = `Check out this amazing postcard from ${locationName}! 📍`
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Copy failed:", error)
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        // Convert data URL to blob for sharing
        const response = await fetch(postcardDataUrl)
        const blob = await response.blob()
        const file = new File([blob], `postcard-${locationName}.jpg`, { type: "image/jpeg" })

        await navigator.share({
          title: `Postcard from ${locationName}`,
          text: `Check out this amazing postcard from ${locationName}! 📍`,
          files: [file],
        })
      } catch (error) {
        console.error("Native share failed:", error)
        // Fallback to copy
        handleCopyLink()
      }
    } else {
      // Fallback for browsers without native share
      handleCopyLink()
    }
  }

  const socialPlatforms = [
    {
      name: "Instagram",
      icon: Instagram,
      color: "#E4405F",
      action: () => {
        // Instagram doesn't support direct URL sharing, so download the image
        handleDownload()
        alert("📸 Image downloaded! Open Instagram and share from your gallery.")
      },
    },
    {
      name: "WhatsApp",
      icon: MessageCircle,
      color: "#25D366",
      action: () => {
        const text = encodeURIComponent(`Check out this postcard from ${locationName}! 📍`)
        window.open(`https://wa.me/?text=${text}`, "_blank")
      },
    },
    {
      name: "Twitter",
      icon: Twitter,
      color: "#1DA1F2",
      action: () => {
        const text = encodeURIComponent(`Check out this amazing postcard from ${locationName}! 📍`)
        window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank")
      },
    },
    {
      name: "Facebook",
      icon: Facebook,
      color: "#1877F2",
      action: () => {
        const text = encodeURIComponent(`Check out this postcard from ${locationName}! 📍`)
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${text}`, "_blank")
      },
    },
    {
      name: "Email",
      icon: Mail,
      color: "#6B7280",
      action: () => {
        const subject = encodeURIComponent(`Postcard from ${locationName}`)
        const body = encodeURIComponent(`Check out this amazing postcard from ${locationName}! 📍`)
        window.open(`mailto:?subject=${subject}&body=${body}`, "_blank")
      },
    },
  ]

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "linear-gradient(135deg, #1e293b 0%, #1e40af 50%, #4338ca 100%)",
        color: "white",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "rgba(16, 185, 129, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1rem",
            border: "2px solid rgba(16, 185, 129, 0.4)",
          }}
        >
          <Share2 size={28} color="#10B981" />
        </div>
        <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.5rem", fontWeight: "bold" }}>Postcard Ready! 🎉</h2>
        <p style={{ margin: 0, fontSize: "0.875rem", opacity: 0.7 }}>Share your postcard from {locationName}</p>
      </div>

      {/* Preview */}
      <div
        style={{
          padding: "2rem",
          display: "flex",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            maxWidth: "300px",
            borderRadius: "1rem",
            overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.2)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          }}
        >
          <img
            src={postcardDataUrl || "/placeholder.svg"}
            alt="Generated postcard"
            style={{
              width: "100%",
              height: "auto",
              display: "block",
            }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div
        style={{
          padding: "0 2rem 2rem",
          display: "flex",
          gap: "1rem",
          flexShrink: 0,
        }}
      >
        <button
          onClick={handleDownload}
          disabled={downloading}
          style={{
            flex: 1,
            padding: "1rem",
            borderRadius: "0.75rem",
            border: "none",
            background: downloading ? "#6B7280" : "#10B981",
            color: "white",
            cursor: downloading ? "not-allowed" : "pointer",
            fontSize: "1rem",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            transition: "all 0.3s ease",
          }}
        >
          {downloading ? (
            <>
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTop: "2px solid white",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
              Downloading...
            </>
          ) : (
            <>
              <Download size={20} />
              Download
            </>
          )}
        </button>

        <button
          onClick={handleNativeShare}
          style={{
            flex: 1,
            padding: "1rem",
            borderRadius: "0.75rem",
            border: "none",
            background: "#3B82F6",
            color: "white",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            transition: "all 0.3s ease",
          }}
        >
          <Share2 size={20} />
          Share
        </button>

        <button
          onClick={handleCopyLink}
          style={{
            padding: "1rem",
            borderRadius: "0.75rem",
            border: "2px solid rgba(255,255,255,0.2)",
            background: "transparent",
            color: "white",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.3s ease",
          }}
        >
          {copied ? <Check size={20} color="#10B981" /> : <Copy size={20} />}
        </button>
      </div>

      {/* Social Platforms */}
      <div
        style={{
          flex: 1,
          padding: "0 2rem 2rem",
          overflowY: "auto",
        }}
      >
        <h3
          style={{
            margin: "0 0 1rem 0",
            fontSize: "1.125rem",
            fontWeight: "bold",
            textAlign: "center",
            opacity: 0.9,
          }}
        >
          Share on Social Media
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "1rem",
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          {socialPlatforms.map((platform) => {
            const IconComponent = platform.icon

            return (
              <button
                key={platform.name}
                onClick={platform.action}
                style={{
                  padding: "1rem",
                  borderRadius: "0.75rem",
                  border: "2px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)",
                  color: "white",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.5rem",
                  textAlign: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `${platform.color}20`
                  e.currentTarget.style.borderColor = `${platform.color}40`
                  e.currentTarget.style.transform = "scale(1.05)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)"
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"
                  e.currentTarget.style.transform = "scale(1)"
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    background: `${platform.color}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `1px solid ${platform.color}40`,
                  }}
                >
                  <IconComponent size={20} color={platform.color} />
                </div>
                <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{platform.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Done Button */}
      <div
        style={{
          padding: "2rem",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onComplete}
          style={{
            width: "100%",
            padding: "1rem",
            borderRadius: "0.75rem",
            border: "none",
            background: "rgba(255,255,255,0.1)",
            color: "white",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: "bold",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.2)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)"
          }}
        >
          Done
        </button>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
