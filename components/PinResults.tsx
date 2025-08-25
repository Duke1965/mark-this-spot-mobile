"use client"

import { useState, useEffect } from "react"
import { MapPin, Calendar, Share2, Save, ArrowLeft, MessageCircle, Instagram, Facebook, Twitter, Star } from "lucide-react"
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

interface SocialAccount {
  instagram: string
  twitter: string
  facebook: string
}

export function PinResults({ pin, onBack, onSave, onShare }: PinResultsProps) {
  const [photos, setPhotos] = useState<GooglePhoto[]>([])
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null)
  const [personalThoughts, setPersonalThoughts] = useState("")
  const [autoReturnTimer, setAutoReturnTimer] = useState(5) // 5 second countdown
  const [isUserMoving, setIsUserMoving] = useState(false) // Track if user is driving
  const [showSocialShare, setShowSocialShare] = useState(false) // Show social sharing interface
  const [selectedPlatform, setSelectedPlatform] = useState<string>("")
  const [showRecommendationPrompt, setShowRecommendationPrompt] = useState(false)
  const [userSocialAccounts, setUserSocialAccounts] = useState<SocialAccount>({
    instagram: "",
    twitter: "",
    facebook: ""
  })

  // Load user's social media accounts from localStorage
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('userProfile')
      if (savedProfile) {
        const profile = JSON.parse(savedProfile)
        if (profile.socialAccounts) {
          setUserSocialAccounts(profile.socialAccounts)
        }
      }
    } catch (error) {
      console.log("Could not load social accounts from settings")
    }
  }, [])

  // Check if user is moving (driving) based on location changes
  useEffect(() => {
    let locationCheckInterval: ReturnType<typeof setInterval>
    
    const checkUserMovement = () => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            // Simple movement detection - if we have a previous position, check distance
            if (pin.latitude && pin.longitude) {
              const distance = Math.sqrt(
                Math.pow(position.coords.latitude - pin.latitude, 2) + 
                Math.pow(position.coords.longitude - pin.longitude, 2)
              )
              
              // If user has moved more than ~50 meters from pin location, they're likely driving
              const isMoving = distance > 0.0005 // Roughly 50 meters
              setIsUserMoving(isMoving)
              
              if (isMoving) {
                console.log("🚗 User is driving - auto-return timer active")
              } else {
                console.log("🛑 User is stationary - auto-return timer paused")
              }
            }
          },
          (error) => {
            console.log("📍 Location check failed, assuming user is driving:", error)
            setIsUserMoving(true) // Default to driving if we can't determine
          }
        )
      }
    }
    
    // Check movement every 2 seconds
    locationCheckInterval = setInterval(checkUserMovement, 2000)
    
    // Initial check
    checkUserMovement()
    
    return () => {
      if (locationCheckInterval) {
        clearInterval(locationCheckInterval)
      }
    }
  }, [pin.latitude, pin.longitude])

  // Auto-return timer effect - only active when user is driving
  useEffect(() => {
    if (autoReturnTimer > 0 && isUserMoving) {
      const timer = setTimeout(() => {
        setAutoReturnTimer(autoReturnTimer - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (autoReturnTimer === 0 && isUserMoving) {
      // Auto-return to main page only when driving
      console.log("⏰ Auto-returning to main page (user is driving)")
      onBack()
    }
  }, [autoReturnTimer, isUserMoving, onBack])

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
    setShowSocialShare(true)
  }

  const handlePlatformSelect = (platform: string) => {
    setSelectedPlatform(platform)
    setShowRecommendationPrompt(true)
  }

  const handleRecommendationChoice = (alsoRecommend: boolean) => {
    const updatedPin = {
      ...pin,
      mediaUrl: selectedPhotoUrl || pin.mediaUrl,
      personalThoughts: personalThoughts.trim() || undefined
    }
    
    if (alsoRecommend) {
      // Add to recommendations map
      console.log("⭐ Adding pin to recommendations map:", updatedPin.title)
      // This would integrate with your existing recommendation system
    }
    
    // Share to selected platform
    console.log(`📱 Sharing to ${selectedPlatform}:`, updatedPin.title)
    
    // Reset states and go back to results
    setShowRecommendationPrompt(false)
    setShowSocialShare(false)
    setSelectedPlatform("")
    
    // Call the original onShare function
    onShare(updatedPin)
  }

  // Show social sharing interface if active
  if (showSocialShare) {
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
            onClick={() => setShowSocialShare(false)}
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
            Back to Results
          </button>
          
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.125rem", fontWeight: "600" }}>Share Your Discovery</span>
          </div>

          <div style={{ width: "40px" }}></div>
        </div>

        {/* Social Platform Selection */}
        <div style={{ flex: 1, padding: "1rem", overflowY: "auto" }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Choose Platform</h2>
            <p style={{ opacity: 0.8 }}>Share your PINIT discovery with friends!</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", maxWidth: "600px", margin: "0 auto" }}>
            {/* Instagram */}
            <button
              onClick={() => handlePlatformSelect("instagram")}
              style={{
                padding: "1.5rem 1rem",
                borderRadius: "1rem",
                border: "2px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.75rem",
                transition: "all 0.2s ease",
                backdropFilter: "blur(10px)",
              }}
            >
              <Instagram size={32} />
              <span style={{ fontWeight: "600" }}>Instagram</span>
              {userSocialAccounts.instagram && (
                <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>@{userSocialAccounts.instagram}</span>
              )}
            </button>

            {/* Facebook */}
            <button
              onClick={() => handlePlatformSelect("facebook")}
              style={{
                padding: "1.5rem 1rem",
                borderRadius: "1rem",
                border: "2px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.75rem",
                transition: "all 0.2s ease",
                backdropFilter: "blur(10px)",
              }}
            >
              <Facebook size={32} />
              <span style={{ fontWeight: "600" }}>Facebook</span>
              {userSocialAccounts.facebook && (
                <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>@{userSocialAccounts.facebook}</span>
              )}
            </button>

            {/* Twitter/X */}
            <button
              onClick={() => handlePlatformSelect("twitter")}
              style={{
                padding: "1.5rem 1rem",
                borderRadius: "1rem",
                border: "2px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.75rem",
                transition: "all 0.2s ease",
                backdropFilter: "blur(10px)",
              }}
            >
              <Twitter size={32} />
              <span style={{ fontWeight: "600" }}>Twitter/X</span>
              {userSocialAccounts.twitter && (
                <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>@{userSocialAccounts.twitter}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show recommendation prompt if platform selected
  if (showRecommendationPrompt) {
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
        zIndex: 1000,
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem"
      }}>
        <div style={{ textAlign: "center", maxWidth: "400px" }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>⭐</div>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Great Discovery!</h2>
          <p style={{ fontSize: "1.1rem", marginBottom: "2rem", opacity: 0.9 }}>
            Would you also like to recommend this place to other PINIT users? 
            It will appear on the recommendations map for everyone to discover!
          </p>
          
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
            <button
              onClick={() => handleRecommendationChoice(false)}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "0.75rem",
                border: "1px solid rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                fontSize: "1rem",
                transition: "all 0.2s ease",
                backdropFilter: "blur(10px)",
              }}
            >
              Just Share
            </button>
            <button
              onClick={() => handleRecommendationChoice(true)}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "0.75rem",
                border: "1px solid rgba(255,255,255,0.3)",
                background: "rgba(16,185,129,0.8)",
                color: "white",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "600",
                transition: "all 0.2s ease",
                backdropFilter: "blur(10px)",
              }}
            >
              Share + Recommend ⭐
            </button>
          </div>
        </div>
      </div>
    )
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
          Return Now
        </button>
        
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.125rem", fontWeight: "600" }}>Pin Results</span>
          <span style={{ 
            fontSize: "0.875rem", 
            background: isUserMoving ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)", 
            padding: "0.25rem 0.5rem", 
            borderRadius: "0.5rem",
            border: "1px solid rgba(255,255,255,0.3)",
            opacity: isUserMoving ? 1 : 0.6
          }}>
            {isUserMoving ? `Auto-return in ${autoReturnTimer}s` : "Timer paused (stationary)"}
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
