"use client"

import type React from "react"

import { useState } from "react"
import { ArrowLeft, Instagram, MessageCircle, Twitter, Facebook, Mail, Download } from "lucide-react"

interface Platform {
  id: string
  name: string
  icon: React.ReactNode
  dimensions: { width: number; height: number }
  color: string
  requiresPhone?: boolean
  requiresEmail?: boolean
}

const platforms: Platform[] = [
  {
    id: "instagram-story",
    name: "Instagram Story",
    icon: <Instagram size={24} />,
    dimensions: { width: 1080, height: 1920 },
    color: "#E4405F",
  },
  {
    id: "instagram-post",
    name: "Instagram Post",
    icon: <Instagram size={24} />,
    dimensions: { width: 1080, height: 1080 },
    color: "#E4405F",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: <MessageCircle size={24} />,
    dimensions: { width: 800, height: 600 },
    color: "#25D366",
    requiresPhone: true,
  },
  {
    id: "twitter",
    name: "Twitter/X",
    icon: <Twitter size={24} />,
    dimensions: { width: 1200, height: 675 },
    color: "#1DA1F2",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: <Facebook size={24} />,
    dimensions: { width: 1200, height: 630 },
    color: "#1877F2",
  },
  {
    id: "email",
    name: "Email",
    icon: <Mail size={24} />,
    dimensions: { width: 800, height: 600 },
    color: "#6B7280",
    requiresEmail: true,
  },
  {
    id: "download",
    name: "Download",
    icon: <Download size={24} />,
    dimensions: { width: 1080, height: 1080 },
    color: "#10B981",
  },
]

interface SocialPlatformSelectorProps {
  mediaUrl: string
  mediaType: "photo" | "video"
  locationName: string
  onPlatformSelect: (
    platformId: string,
    dimensions: { width: number; height: number },
    contactInfo?: { phone?: string; email?: string },
  ) => void
  onClose: () => void
}

export function SocialPlatformSelector({
  mediaUrl,
  mediaType,
  locationName,
  onPlatformSelect,
  onClose,
}: SocialPlatformSelectorProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [email, setEmail] = useState("")
  const [showContactForm, setShowContactForm] = useState(false)

  const handlePlatformClick = (platform: Platform) => {
    if (platform.requiresPhone || platform.requiresEmail) {
      setSelectedPlatform(platform)
      setShowContactForm(true)
    } else {
      onPlatformSelect(platform.id, platform.dimensions)
    }
  }

  const handleContactSubmit = () => {
    if (!selectedPlatform) return

    const contactInfo: { phone?: string; email?: string } = {}

    if (selectedPlatform.requiresPhone && phoneNumber) {
      contactInfo.phone = phoneNumber
    }

    if (selectedPlatform.requiresEmail && email) {
      contactInfo.email = email
    }

    onPlatformSelect(selectedPlatform.id, selectedPlatform.dimensions, contactInfo)
  }

  const isContactFormValid = () => {
    if (!selectedPlatform) return false

    if (selectedPlatform.requiresPhone && !phoneNumber.trim()) return false
    if (selectedPlatform.requiresEmail && !email.trim()) return false

    return true
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
            onClick={onClose}
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
          <h2 style={{ fontSize: "1.5rem", margin: 0 }}>{showContactForm ? "Contact Info" : "Choose Platform"}</h2>
        </div>
      </div>

      {!showContactForm ? (
        <>
          {/* Preview */}
          <div
            style={{
              padding: "2rem",
              display: "flex",
              justifyContent: "center",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div
              style={{
                width: "200px",
                height: "150px",
                borderRadius: "1rem",
                overflow: "hidden",
                background: "rgba(255,255,255,0.1)",
              }}
            >
              {mediaType === "photo" ? (
                <img
                  src={mediaUrl || "/placeholder.svg"}
                  alt="Captured media"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <video
                  src={mediaUrl}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                  muted
                  loop
                  autoPlay
                />
              )}
            </div>
          </div>

          {/* Location */}
          <div
            style={{
              padding: "1rem 2rem",
              textAlign: "center",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <p style={{ margin: 0, opacity: 0.8 }}>📍 {locationName}</p>
          </div>

          {/* Platform Grid */}
          <div
            style={{
              flex: 1,
              padding: "2rem",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1rem",
                maxWidth: "800px",
                margin: "0 auto",
              }}
            >
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => handlePlatformClick(platform)}
                  style={{
                    padding: "1.5rem",
                    borderRadius: "1rem",
                    border: "2px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.05)",
                    color: "white",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = platform.color
                    e.currentTarget.style.background = `${platform.color}20`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)"
                  }}
                >
                  <div
                    style={{
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      background: platform.color,
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {platform.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: "0 0 0.25rem 0", fontSize: "1.125rem" }}>{platform.name}</h3>
                    <p style={{ margin: 0, fontSize: "0.875rem", opacity: 0.7 }}>
                      {platform.dimensions.width} × {platform.dimensions.height}
                    </p>
                    {platform.requiresPhone && (
                      <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.75rem", opacity: 0.6 }}>
                        📱 Phone number required
                      </p>
                    )}
                    {platform.requiresEmail && (
                      <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.75rem", opacity: 0.6 }}>
                        ✉️ Email address required
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Contact Form */
        <div
          style={{
            flex: 1,
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            maxWidth: "400px",
            margin: "0 auto",
          }}
        >
          <div
            style={{
              padding: "1rem",
              borderRadius: "1rem",
              background: selectedPlatform?.color,
              color: "white",
              marginBottom: "2rem",
            }}
          >
            {selectedPlatform?.icon}
          </div>

          <h3 style={{ fontSize: "1.5rem", marginBottom: "1rem", textAlign: "center" }}>{selectedPlatform?.name}</h3>

          <div style={{ width: "100%", marginBottom: "2rem" }}>
            {selectedPlatform?.requiresPhone && (
              <div style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontSize: "0.875rem",
                    opacity: 0.8,
                  }}
                >
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    border: "1px solid rgba(255,255,255,0.3)",
                    background: "rgba(255,255,255,0.1)",
                    color: "white",
                    fontSize: "1rem",
                  }}
                />
              </div>
            )}

            {selectedPlatform?.requiresEmail && (
              <div style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontSize: "0.875rem",
                    opacity: 0.8,
                  }}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    border: "1px solid rgba(255,255,255,0.3)",
                    background: "rgba(255,255,255,0.1)",
                    color: "white",
                    fontSize: "1rem",
                  }}
                />
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "1rem", width: "100%" }}>
            <button
              onClick={() => {
                setShowContactForm(false)
                setSelectedPlatform(null)
                setPhoneNumber("")
                setEmail("")
              }}
              style={{
                flex: 1,
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid rgba(255,255,255,0.3)",
                background: "transparent",
                color: "white",
                cursor: "pointer",
                fontSize: "1rem",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleContactSubmit}
              disabled={!isContactFormValid()}
              style={{
                flex: 1,
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "none",
                background: isContactFormValid() ? "#10B981" : "rgba(255,255,255,0.2)",
                color: "white",
                cursor: isContactFormValid() ? "pointer" : "not-allowed",
                fontSize: "1rem",
                opacity: isContactFormValid() ? 1 : 0.5,
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
