"use client"

import { useState } from "react"
import { ArrowLeft, Download, Share2, MessageCircle, Mail, Copy, Check } from "lucide-react"

interface SocialSharingProps {
  postcardDataUrl: string
  locationName: string
  onComplete: () => void
}

export function SocialSharing({ postcardDataUrl, locationName, onComplete }: SocialSharingProps) {
  const [copied, setCopied] = useState(false)

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = postcardDataUrl
    link.download = `postcard-${locationName.replace(/[^a-zA-Z0-9]/g, "-")}-${Date.now()}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleShare = async (platform: string) => {
    const text = `Check out this postcard from ${locationName}! 📍`
    const url = window.location.origin

    try {
      if (platform === "whatsapp") {
        window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, "_blank")
      } else if (platform === "twitter") {
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
          "_blank",
        )
      } else if (platform === "email") {
        window.open(
          `mailto:?subject=${encodeURIComponent(`Postcard from ${locationName}`)}&body=${encodeURIComponent(
            text + "\n\n" + url,
          )}`,
          "_blank",
        )
      } else if (platform === "native" && navigator.share) {
        // Convert data URL to blob for native sharing
        const response = await fetch(postcardDataUrl)
        const blob = await response.blob()
        const file = new File([blob], `postcard-${locationName}.jpg`, { type: "image/jpeg" })

        await navigator.share({
          title: `Postcard from ${locationName}`,
          text: text,
          files: [file],
        })
      }
    } catch (error) {
      console.error("Share failed:", error)
      // Fallback to copy link
      handleCopyLink()
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Copy failed:", error)
    }
  }

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
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onComplete}
          style={{
            padding: "0.5rem",
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.5rem" }}>Share Your Postcard</h2>
          <p style={{ margin: 0, fontSize: "0.875rem", opacity: 0.7 }}>Download or share your creation</p>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "2rem",
          overflowY: "auto",
        }}
      >
        {/* Postcard Preview */}
        <div
          style={{
            maxWidth: "400px",
            width: "100%",
            borderRadius: "1rem",
            overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.2)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          }}
        >
          <img
            src={postcardDataUrl || "/placeholder.svg"}
            alt="Your postcard"
            style={{
              width: "100%",
              height: "auto",
              display: "block",
            }}
          />
        </div>

        {/* Success Message */}
        <div
          style={{
            textAlign: "center",
            padding: "1.5rem",
            borderRadius: "1rem",
            background: "rgba(16, 185, 129, 0.2)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            maxWidth: "400px",
            width: "100%",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✅</div>
          <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.25rem" }}>Postcard Created!</h3>
          <p style={{ margin: 0, fontSize: "0.875rem", opacity: 0.8 }}>
            Your postcard from {locationName} is ready to share
          </p>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            width: "100%",
            maxWidth: "400px",
          }}
        >
          {/* Download Button */}
          <button
            onClick={handleDownload}
            style={{
              padding: "1rem",
              borderRadius: "1rem",
              border: "none",
              background: "#10B981",
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
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#059669"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#10B981"
            }}
          >
            <Download size={20} />
            Download Postcard
          </button>

          {/* Native Share (if supported) */}
          {navigator.share && (
            <button
              onClick={() => handleShare("native")}
              style={{
                padding: "1rem",
                borderRadius: "1rem",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                fontSize: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.2)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)"
              }}
            >
              <Share2 size={20} />
              Share
            </button>
          )}

          {/* Share Options */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: "0.5rem",
            }}
          >
            <button
              onClick={() => handleShare("whatsapp")}
              style={{
                padding: "0.75rem",
                borderRadius: "0.75rem",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(37, 211, 102, 0.2)",
                color: "white",
                cursor: "pointer",
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                transition: "all 0.3s ease",
              }}
            >
              <MessageCircle size={16} />
              WhatsApp
            </button>

            <button
              onClick={() => handleShare("twitter")}
              style={{
                padding: "0.75rem",
                borderRadius: "0.75rem",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(29, 161, 242, 0.2)",
                color: "white",
                cursor: "pointer",
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                transition: "all 0.3s ease",
              }}
            >
              <Share2 size={16} />
              Twitter
            </button>

            <button
              onClick={() => handleShare("email")}
              style={{
                padding: "0.75rem",
                borderRadius: "0.75rem",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(107, 114, 128, 0.2)",
                color: "white",
                cursor: "pointer",
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                transition: "all 0.3s ease",
              }}
            >
              <Mail size={16} />
              Email
            </button>

            <button
              onClick={handleCopyLink}
              style={{
                padding: "0.75rem",
                borderRadius: "0.75rem",
                border: "1px solid rgba(255,255,255,0.2)",
                background: copied ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                transition: "all 0.3s ease",
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </div>

        {/* Done Button */}
        <button
          onClick={onComplete}
          style={{
            padding: "1rem 2rem",
            borderRadius: "1rem",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.1)",
            color: "white",
            cursor: "pointer",
            fontSize: "1rem",
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
    </div>
  )
}
