"use client"

import { useState, useEffect } from "react"
import { MapPin, Calendar, Share2, Save, ArrowLeft, MessageCircle } from "lucide-react"
import type { PinData } from "@/app/page"

interface PinResultsProps {
  pin: PinData
  onBack: () => void
  onSave: (pin: PinData) => void
  onShare: (pin: PinData) => void
}

interface GooglePhoto {
  photo_reference: string
  url: string
  width: number
  height: number
}

export function PinResults({ pin, onBack, onSave, onShare }: PinResultsProps) {
  const [photos, setPhotos] = useState<GooglePhoto[]>([])
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null)
  const [personalThoughts, setPersonalThoughts] = useState("")
  const [autoReturnTimer, setAutoReturnTimer] = useState(5) // 5 second countdown

  // Auto-return timer effect
  useEffect(() => {
    if (autoReturnTimer > 0) {
      const timer = setTimeout(() => {
        setAutoReturnTimer(autoReturnTimer - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      // Auto-return to main page
      onBack()
    }
  }, [autoReturnTimer, onBack])

  // Use already fetched photos from pin.additionalPhotos instead of re-fetching
  useEffect(() => {
    try {
      console.log("📸 Setting up photo display from pin data...")
      
      const allPhotos: GooglePhoto[] = []
      
      // Add the pin's own photo if it exists
      if (pin.mediaUrl) {
        allPhotos.push({
          photo_reference: 'pin-photo',
          url: pin.mediaUrl,
          width: 400,
          height: 300
        })
      }
      
      // Add the already fetched location photos from pin.additionalPhotos
      if (pin.additionalPhotos && pin.additionalPhotos.length > 0) {
        console.log("📸 Found", pin.additionalPhotos.length, "location photos in pin data")
        
        pin.additionalPhotos.forEach((photoData, index) => {
          allPhotos.push({
            photo_reference: `location-${index}`,
            url: photoData.url,
            width: 400,
            height: 300
          })
        })
      } else {
        console.log("📸 No additional photos found in pin data")
      }
      
      setPhotos(allPhotos)
      if (allPhotos.length > 0) {
        setSelectedPhotoUrl(allPhotos[0].url)
        console.log("📸 Photo display set up with", allPhotos.length, "photos")
      } else {
        console.log("📸 No photos available")
      }
      
      setIsLoading(false)
    } catch (error) {
      console.error("❌ Error setting up photo display:", error)
      setIsLoading(false)
    }
  }, [pin.mediaUrl, pin.additionalPhotos])

  const handleSave = () => {
    const updatedPin = {
      ...pin,
      mediaUrl: selectedPhotoUrl || pin.mediaUrl,
      personalThoughts: personalThoughts.trim() || undefined
    }
    onSave(updatedPin)
  }

  const handleShare = () => {
    const updatedPin = {
      ...pin,
      mediaUrl: selectedPhotoUrl || pin.mediaUrl,
      personalThoughts: personalThoughts.trim() || undefined
    }
    onShare(updatedPin)
  }

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
      display: "flex",
      flexDirection: "column",
      color: "white",
      zIndex: 1000
    }}>
      {/* Header */}
      <div style={{
        padding: "1rem",
        background: "rgba(30, 58, 138, 0.95)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backdropFilter: "blur(15px)",
        borderBottom: "1px solid rgba(255,255,255,0.2)",
      }}>
        <button
          onClick={onBack}
          style={{
            background: "rgba(255,255,255,0.15)",
            color: "white",
            padding: "0.75rem",
            borderRadius: "0.75rem",
            border: "1px solid rgba(255,255,255,0.2)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "all 0.2s ease",
            backdropFilter: "blur(10px)",
          }}
        >
          <ArrowLeft size={20} />
          Back
        </button>
        
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.125rem", fontWeight: "600" }}>Pin Results</span>
          <span style={{ 
            fontSize: "0.875rem", 
            background: "rgba(255,255,255,0.2)", 
            padding: "0.25rem 0.5rem", 
            borderRadius: "0.5rem",
            border: "1px solid rgba(255,255,255,0.3)"
          }}>
            Auto-return in {autoReturnTimer}s
          </span>
        </div>

        <div style={{ width: "40px" }}></div> {/* Spacer for centering */}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
        {/* Single Photo Display */}
        <div style={{
          marginBottom: "1.5rem",
          position: "relative",
          borderRadius: "1rem",
          overflow: "hidden",
          background: "rgba(255,255,255,0.1)",
          minHeight: "200px",
          border: "1px solid rgba(255,255,255,0.2)",
          backdropFilter: "blur(15px)",
        }}>
          {isLoading ? (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "200px",
              color: "rgba(255,255,255,0.7)"
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📸</div>
                <div>Loading area photo...</div>
              </div>
            </div>
          ) : photos.length > 0 ? (
            <div style={{ position: "relative" }}>
              <img
                src={selectedPhotoUrl || photos[0]?.url}
                alt="Location photo"
                style={{
                  width: "100%",
                  height: "200px",
                  objectFit: "cover"
                }}
                onError={(e) => {
                  console.log("❌ Image failed to load, using placeholder")
                  e.currentTarget.src = "/pinit-placeholder.jpg"
                }}
              />
            </div>
          ) : (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "200px",
              color: "rgba(255,255,255,0.7)"
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📍</div>
                <div>No photos available for this area</div>
              </div>
            </div>
          )}
        </div>

        {/* Pin Details */}
        <div style={{
          background: "rgba(255,255,255,0.1)",
          borderRadius: "1rem",
          padding: "1.5rem",
          marginBottom: "1rem",
          border: "1px solid rgba(255,255,255,0.2)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          backdropFilter: "blur(15px)",
        }}>
          {/* Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <MapPin size={20} style={{ color: "#EF4444" }} />
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>{pin.title}</h2>
          </div>

          {/* Location */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", opacity: 0.8 }}>
            <MapPin size={16} style={{ color: "#EF4444" }} />
            <span>{pin.locationName}</span>
          </div>

          {/* Timestamp */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", opacity: 0.6 }}>
            <Calendar size={16} />
            <span>
              {pin.timestamp ? new Date(pin.timestamp).toLocaleString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) : 'Unknown date'}
            </span>
          </div>

          {/* AI Generated Description */}
          <div style={{
            background: "rgba(255,255,255,0.1)",
            borderRadius: "0.75rem",
            padding: "1rem",
            marginBottom: "1rem",
            borderLeft: "3px solid #10B981",
            backdropFilter: "blur(10px)",
          }}>
            <div style={{ fontSize: "0.875rem", opacity: 0.8, marginBottom: "0.5rem" }}>
              🤖 AI Generated Description
            </div>
            <div style={{ fontSize: "1rem", lineHeight: "1.5" }}>
              {pin.description || "This location looks amazing! Perfect for capturing memories and sharing with friends."}
            </div>
          </div>

          {/* Personal Thoughts Input */}
          <div style={{
            background: "rgba(255,255,255,0.1)",
            borderRadius: "0.75rem",
            padding: "1rem",
            marginBottom: "1rem",
            borderLeft: "3px solid #3B82F6",
            backdropFilter: "blur(10px)",
          }}>
            <div style={{ fontSize: "0.875rem", opacity: 0.8, marginBottom: "0.5rem" }}>
              💭 Your Personal Thoughts
            </div>
            <textarea
              value={personalThoughts}
              onChange={(e) => setPersonalThoughts(e.target.value)}
              placeholder="Add your own thoughts about this place..."
              style={{
                width: "100%",
                minHeight: "80px",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                fontSize: "0.875rem",
                outline: "none",
                resize: "vertical",
                fontFamily: "inherit",
                backdropFilter: "blur(10px)",
              }}
            />
          </div>

          {/* Tags */}
          {pin.tags && pin.tags.length > 0 && (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {pin.tags.map((tag, index) => (
                <span
                  key={index}
                  style={{
                    fontSize: "0.875rem",
                    background: "rgba(255,255,255,0.2)",
                    color: "rgba(255,255,255,0.9)",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "9999px",
                    border: "1px solid rgba(255,255,255,0.3)",
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={handleShare}
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.15)",
              color: "white",
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(255,255,255,0.2)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "all 0.2s ease",
              backdropFilter: "blur(10px)",
            }}
          >
            <Share2 size={16} />
            Share
          </button>
          
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.15)",
              color: "white",
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(255,255,255,0.2)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "all 0.2s ease",
              backdropFilter: "blur(10px)",
            }}
          >
            <Save size={16} />
            Save
          </button>
        </div>
      </div>
    </div>
  )
} 
