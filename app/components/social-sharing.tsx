"use client"

import { useState } from "react"
import { ArrowLeft, Download, Copy, Share2, CheckCircle, ExternalLink } from "lucide-react"

interface SocialSharingProps {
  postcardDataUrl: string
  locationName: string
  onComplete: () => void
}

export function SocialSharing({ postcardDataUrl, locationName, onComplete }: SocialSharingProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [shareResult, setShareResult] = useState<{
    success: boolean
    message: string
    shareUrl?: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleDownload = () => {
    const link = document.createElement("a")
    link.download = `postcard-${locationName.replace(/[^a-zA-Z0-9]/g, "-")}-${Date.now()}.jpg`
    link.href = postcardDataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setShareResult({
      success: true,
      message: "Postcard downloaded successfully!",
    })
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postcardDataUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)

      setShareResult({
        success: true,
        message: "Postcard link copied to clipboard!",
      })
    } catch (error) {
      console.error("Failed to copy:", error)
      setShareResult({
        success: false,
        message: "Failed to copy link",
      })
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
          text: `Check out this postcard from ${locationName}!`,
          files: [file],
        })

        setShareResult({
          success: true,
          message: "Postcard shared successfully!",
        })
      } catch (error) {
        console.error("Native share failed:", error)
        // Fallback to copy link
        handleCopyLink()
      }
    } else {
      // Fallback for browsers without native share
      handleCopyLink()
    }
  }

  const handleOpenShareUrl = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer")
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
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
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
          <h2 style={{ fontSize: "1.5rem", margin: 0 }}>Share Your Postcard</h2>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        {/* Success Animation */}
        <div
          style={{
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #10B981, #059669)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "2rem",
            animation: "successPulse 2s ease-in-out infinite",
          }}
        >
          <CheckCircle size={60} color="white" />
        </div>

        <h3 style={{ fontSize: "2rem", marginBottom: "1rem", fontWeight: "bold" }}>Postcard Created! 🎉</h3>

        <p style={{ fontSize: "1.125rem", opacity: 0.8, marginBottom: "2rem", maxWidth: "400px" }}>
          Your beautiful postcard from <strong>{locationName}</strong> is ready to share with the world!
        </p>

        {/* Postcard Preview */}
        <div
          style={{
            width: "200px",
            height: "150px",
            borderRadius: "1rem",
            overflow: "hidden",
            marginBottom: "2rem",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            border: "3px solid rgba(255,255,255,0.2)",
          }}
        >
          <img
            src={postcardDataUrl || "/placeholder.svg"}
            alt="Your postcard"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>

        {/* Share Options */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            width: "100%",
            maxWidth: "300px",
          }}
        >
          <button
            onClick={handleDownload}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.75rem",
              padding: "1rem",
              borderRadius: "0.75rem",
              border: "none",
              background: "linear-gradient(135deg, #10B981, #059669)",
              color: "white",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: "600",
              transition: "transform 0.2s ease",
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <Download size={20} />
            Download Postcard
          </button>

          <button
            onClick={handleCopyLink}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.75rem",
              padding: "1rem",
              borderRadius: "0.75rem",
              border: "2px solid rgba(255,255,255,0.3)",
              background: "rgba(255,255,255,0.1)",
              color: "white",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: "600",
              transition: "all 0.2s ease",
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <Copy size={20} />
            {copied ? "Copied!" : "Copy Link"}
          </button>

          {navigator.share && (
            <button
              onClick={handleNativeShare}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.75rem",
                padding: "1rem",
                borderRadius: "0.75rem",
                border: "2px solid rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "600",
                transition: "all 0.2s ease",
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
              onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <Share2 size={20} />
              Share
            </button>
          )}
        </div>

        {/* Result Message */}
        {shareResult && (
          <div
            style={{
              marginTop: "2rem",
              padding: "1rem",
              borderRadius: "0.75rem",
              background: shareResult.success ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
              border: `1px solid ${shareResult.success ? "#10B981" : "#EF4444"}`,
              color: shareResult.success ? "#10B981" : "#EF4444",
              textAlign: "center",
              maxWidth: "400px",
            }}
          >
            <p style={{ margin: 0, fontSize: "0.875rem" }}>{shareResult.message}</p>

            {shareResult.shareUrl && (
              <button
                onClick={() => handleOpenShareUrl(shareResult.shareUrl!)}
                style={{
                  marginTop: "0.5rem",
                  padding: "0.5rem 1rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  margin: "0.5rem auto 0 auto",
                }}
              >
                <ExternalLink size={16} />
                Open Platform
              </button>
            )}
          </div>
        )}

        {/* Continue Button */}
        <button
          onClick={onComplete}
          style={{
            marginTop: "2rem",
            padding: "0.75rem 2rem",
            borderRadius: "0.75rem",
            border: "2px solid rgba(255,255,255,0.3)",
            background: "transparent",
            color: "white",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: "500",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent"
          }}
        >
          Create Another Postcard
        </button>
      </div>

      <style jsx>{`
        @keyframes successPulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 20px rgba(16, 185, 129, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `}</style>
    </div>
  )
}
