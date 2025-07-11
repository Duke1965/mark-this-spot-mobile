"use client"

import { Share2, Download, MessageCircle, Instagram, Send, Mail, Facebook, Twitter } from "lucide-react"

interface SocialSharingProps {
  postcardDataUrl: string
  locationName: string
  onComplete: () => void
}

export function SocialSharing({ postcardDataUrl, locationName, onComplete }: SocialSharingProps) {
  const downloadPostcard = async () => {
    try {
      const link = document.createElement("a")
      link.download = `postcard-${locationName.replace(/[^a-zA-Z0-9]/g, "-")}-${Date.now()}.jpg`
      link.href = postcardDataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      console.log("📥 Postcard downloaded successfully")
    } catch (error) {
      console.error("❌ Download failed:", error)
    }
  }

  const shareToWhatsApp = () => {
    const text = `Check out this amazing spot I discovered: ${locationName}! 📍✨`
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, "_blank")
    console.log("📱 Shared to WhatsApp")
  }

  const shareToInstagram = () => {
    // Instagram doesn't support direct URL sharing, so we'll copy text and guide user
    const text = `Amazing spot discovered: ${locationName}! 📍✨ #MarkThisSpot #Travel`
    navigator.clipboard.writeText(text).then(() => {
      alert("📋 Caption copied! Now save your postcard and share it on Instagram Stories!")
    })
    console.log("📸 Instagram sharing prepared")
  }

  const shareToTwitter = () => {
    const text = `Just discovered this amazing spot: ${locationName}! 📍✨ #MarkThisSpot #Travel`
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
    window.open(url, "_blank")
    console.log("🐦 Shared to Twitter")
  }

  const shareToFacebook = () => {
    const text = `Check out this amazing spot I discovered: ${locationName}! 📍✨`
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(text)}`
    window.open(url, "_blank")
    console.log("📘 Shared to Facebook")
  }

  const shareViaEmail = () => {
    const subject = `Amazing Spot Discovery: ${locationName}`
    const body = `Hey! I just discovered this amazing spot: ${locationName}! 📍✨\n\nCheck out the postcard I created to remember this moment!`
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(url)
    console.log("📧 Email sharing opened")
  }

  const shareGeneric = async () => {
    if (navigator.share) {
      try {
        // Convert data URL to blob for native sharing
        const response = await fetch(postcardDataUrl)
        const blob = await response.blob()
        const file = new File([blob], `postcard-${Date.now()}.jpg`, { type: "image/jpeg" })

        await navigator.share({
          title: `Amazing Spot: ${locationName}`,
          text: `Check out this amazing spot I discovered: ${locationName}! 📍✨`,
          files: [file],
        })
        console.log("📤 Native sharing completed")
      } catch (error) {
        console.log("📤 Native sharing cancelled or failed")
      }
    } else {
      // Fallback for browsers without native sharing
      const text = `Check out this amazing spot I discovered: ${locationName}! 📍✨`
      navigator.clipboard.writeText(text).then(() => {
        alert("📋 Text copied to clipboard! You can now paste it anywhere you'd like to share.")
      })
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        padding: "1.5rem",
        background: "rgba(255,255,255,0.1)",
        backdropFilter: "blur(10px)",
        borderRadius: "1rem",
        border: "1px solid rgba(255,255,255,0.2)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h3 style={{ color: "white", fontSize: "1.25rem", fontWeight: "bold", margin: "0 0 0.5rem 0" }}>
          📮 Share Your Postcard
        </h3>
        <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.875rem", margin: 0 }}>
          Save locally or share with friends!
        </p>
      </div>

      {/* Primary Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <button
          onClick={downloadPostcard}
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
            transition: "all 0.3s ease",
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
          }}
        >
          <Download size={18} />
          Save to Device
        </button>

        <button
          onClick={shareGeneric}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            padding: "1rem",
            borderRadius: "0.75rem",
            border: "none",
            background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
            color: "white",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "0.875rem",
            transition: "all 0.3s ease",
            boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
          }}
        >
          <Share2 size={18} />
          Quick Share
        </button>
      </div>

      {/* Social Media Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
        <button
          onClick={shareToWhatsApp}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.5rem",
            padding: "1rem 0.5rem",
            borderRadius: "0.75rem",
            border: "none",
            background: "rgba(37, 211, 102, 0.2)",
            color: "white",
            cursor: "pointer",
            transition: "all 0.3s ease",
            fontSize: "0.75rem",
          }}
        >
          <MessageCircle size={20} />
          WhatsApp
        </button>

        <button
          onClick={shareToInstagram}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.5rem",
            padding: "1rem 0.5rem",
            borderRadius: "0.75rem",
            border: "none",
            background: "rgba(225, 48, 108, 0.2)",
            color: "white",
            cursor: "pointer",
            transition: "all 0.3s ease",
            fontSize: "0.75rem",
          }}
        >
          <Instagram size={20} />
          Instagram
        </button>

        <button
          onClick={shareToTwitter}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.5rem",
            padding: "1rem 0.5rem",
            borderRadius: "0.75rem",
            border: "none",
            background: "rgba(29, 161, 242, 0.2)",
            color: "white",
            cursor: "pointer",
            transition: "all 0.3s ease",
            fontSize: "0.75rem",
          }}
        >
          <Twitter size={20} />
          Twitter
        </button>

        <button
          onClick={shareToFacebook}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.5rem",
            padding: "1rem 0.5rem",
            borderRadius: "0.75rem",
            border: "none",
            background: "rgba(24, 119, 242, 0.2)",
            color: "white",
            cursor: "pointer",
            transition: "all 0.3s ease",
            fontSize: "0.75rem",
          }}
        >
          <Facebook size={20} />
          Facebook
        </button>

        <button
          onClick={shareViaEmail}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.5rem",
            padding: "1rem 0.5rem",
            borderRadius: "0.75rem",
            border: "none",
            background: "rgba(107, 114, 128, 0.2)",
            color: "white",
            cursor: "pointer",
            transition: "all 0.3s ease",
            fontSize: "0.75rem",
          }}
        >
          <Mail size={20} />
          Email
        </button>

        <button
          onClick={() => {
            // TikTok sharing - copy caption and guide user
            const text = `Amazing spot discovered! 📍✨ ${locationName} #MarkThisSpot #Travel #Adventure`
            navigator.clipboard.writeText(text).then(() => {
              alert("📋 TikTok caption copied! Save your postcard and create your TikTok!")
            })
          }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.5rem",
            padding: "1rem 0.5rem",
            borderRadius: "0.75rem",
            border: "none",
            background: "rgba(255, 0, 80, 0.2)",
            color: "white",
            cursor: "pointer",
            transition: "all 0.3s ease",
            fontSize: "0.75rem",
          }}
        >
          <Send size={20} />
          TikTok
        </button>
      </div>

      {/* Done Button */}
      <button
        onClick={onComplete}
        style={{
          padding: "1rem 2rem",
          borderRadius: "0.75rem",
          border: "none",
          background: "rgba(255,255,255,0.2)",
          color: "white",
          cursor: "pointer",
          fontWeight: "bold",
          fontSize: "1rem",
          transition: "all 0.3s ease",
          marginTop: "0.5rem",
        }}
      >
        ✅ Done Sharing
      </button>
    </div>
  )
}
