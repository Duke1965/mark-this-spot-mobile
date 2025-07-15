"use client"

import { useState } from "react"
import { Share2, Download, Copy, Check, X, MessageCircle, Twitter, Instagram, Mail } from "lucide-react"

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
      link.download = `pinit-postcard-${locationName.replace(/[^a-zA-Z0-9]/g, "-")}-${Date.now()}.jpg`
      link.href = postcardDataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      console.log("📥 Postcard downloaded successfully")
    } catch (error) {
      console.error("❌ Download failed:", error)
    } finally {
      setDownloading(false)
    }
  }

  const handleCopyImage = async () => {
    try {
      // Convert data URL to blob
      const response = await fetch(postcardDataUrl)
      const blob = await response.blob()

      // Copy to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ])

      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      console.log("📋 Image copied to clipboard")
    } catch (error) {
      console.error("❌ Copy failed:", error)
      // Fallback: copy the data URL as text
      try {
        await navigator.clipboard.writeText(postcardDataUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (fallbackError) {
        console.error("❌ Fallback copy failed:", fallbackError)
      }
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        // Convert data URL to blob for sharing
        const response = await fetch(postcardDataUrl)
        const blob = await response.blob()
        const file = new File([blob], `pinit-postcard-${Date.now()}.jpg`, { type: "image/jpeg" })

        await navigator.share({
          title: `Check out this spot: ${locationName}`,
          text: `Amazing place I found using PinIt! 📍`,
          files: [file],
        })

        console.log("📤 Shared successfully via native share")
      } catch (error) {
        console.error("❌ Native share failed:", error)
      }
    }
  }

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(`Check out this amazing spot: ${locationName}! 📍 Created with PinIt`)
    window.open(`https://wa.me/?text=${text}`, "_blank")
  }

  const shareToTwitter = () => {
    const text = encodeURIComponent(`Amazing spot: ${locationName}! 📍 #PinIt #Travel`)
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank")
  }

  const shareToFacebook = () => {
    const url = encodeURIComponent(window.location.href)
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank")
  }

  const shareToInstagram = () => {
    // Instagram doesn't support direct URL sharing, so we'll copy text and guide user
    const text = `Amazing spot discovered: ${locationName}! 📍✨ #PinIt #Travel`
    navigator.clipboard.writeText(text).then(() => {
      alert("📋 Caption copied! Now save your postcard and share it on Instagram Stories!")
    })
    console.log("📸 Instagram sharing prepared")
  }

  const shareViaEmail = () => {
    const subject = `Amazing Spot Discovery: ${locationName}`
    const body = `Hey! I just discovered this amazing spot: ${locationName}! 📍✨

Check out the postcard I created to remember this moment!`
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(url)
    console.log("📧 Email sharing opened")
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        color: "white",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1rem",
          borderBottom: "1px solid rgba(255,255,255,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>🎉 Postcard Ready!</h2>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", opacity: 0.8 }}>Share your amazing spot</p>
        </div>
        <button
          onClick={onComplete}
          style={{
            padding: "0.5rem",
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
            fontSize: "1.25rem",
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Scrollable Content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "2rem",
        }}
      >
        {/* Preview */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              maxWidth: "300px",
              maxHeight: "400px",
              borderRadius: "1rem",
              overflow: "hidden",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
              border: "3px solid rgba(255,255,255,0.3)",
            }}
          >
            <img
              src={postcardDataUrl || "/placeholder.svg"}
              alt="Your postcard"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Primary Actions */}
          <div style={{ display: "grid", gap: "1rem" }}>
            {/* Native Share (if available) */}
            {navigator.share && (
              <button
                onClick={handleNativeShare}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.75rem",
                  padding: "1rem",
                  borderRadius: "1rem",
                  border: "none",
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontWeight: "bold",
                  transition: "all 0.3s ease",
                }}
              >
                <Share2 size={20} />
                Share Postcard
              </button>
            )}

            {/* Download */}
            <button
              onClick={handleDownload}
              disabled={downloading}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.75rem",
                padding: "1rem",
                borderRadius: "1rem",
                border: "none",
                background: downloading ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.2)",
                color: "white",
                cursor: downloading ? "not-allowed" : "pointer",
                fontSize: "1rem",
                fontWeight: "bold",
                transition: "all 0.3s ease",
              }}
            >
              <Download size={20} />
              {downloading ? "Downloading..." : "Save to Device"}
            </button>

            {/* Copy to Clipboard */}
            <button
              onClick={handleCopyImage}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.75rem",
                padding: "1rem",
                borderRadius: "1rem",
                border: "none",
                background: copied ? "rgba(34, 197, 94, 0.3)" : "rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "bold",
                transition: "all 0.3s ease",
              }}
            >
              {copied ? <Check size={20} /> : <Copy size={20} />}
              {copied ? "Copied!" : "Copy Image"}
            </button>
          </div>

          {/* Social Media Quick Share */}
          <div
            style={{
              marginTop: "1rem",
              paddingTop: "1rem",
              borderTop: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <p
              style={{
                margin: "0 0 1rem 0",
                fontSize: "0.875rem",
                opacity: 0.8,
                textAlign: "center",
              }}
            >
              Quick share to:
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "1rem",
              }}
            >
              <button
                onClick={shareToWhatsApp}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "1rem",
                  borderRadius: "1rem",
                  border: "none",
                  background: "rgba(37, 211, 102, 0.2)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  transition: "all 0.3s ease",
                }}
              >
                <MessageCircle size={24} />
                WhatsApp
              </button>

              <button
                onClick={shareToInstagram}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "1rem",
                  borderRadius: "1rem",
                  border: "none",
                  background: "rgba(225, 48, 108, 0.2)",
                  color: "white",
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
                onClick={shareToTwitter}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "1rem",
                  borderRadius: "1rem",
                  border: "none",
                  background: "rgba(29, 161, 242, 0.2)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  transition: "all 0.3s ease",
                }}
              >
                <Twitter size={24} />
                Twitter
              </button>

              <button
                onClick={shareViaEmail}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "1rem",
                  borderRadius: "1rem",
                  border: "none",
                  background: "rgba(107, 114, 128, 0.2)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  transition: "all 0.3s ease",
                }}
              >
                <Mail size={24} />
                Email
              </button>
            </div>
          </div>

          {/* Success Message */}
          <div
            style={{
              textAlign: "center",
              marginTop: "1rem",
              padding: "1rem",
              background: "rgba(255,255,255,0.1)",
              borderRadius: "1rem",
            }}
          >
            <p style={{ margin: 0, fontSize: "0.875rem", opacity: 0.9 }}>
              🎯 Your postcard has been saved to your library!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
