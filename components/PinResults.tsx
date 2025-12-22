"use client"

import { useState, useEffect } from "react"
import { PinData } from "@/lib/types"
import { ArrowLeft, Share2, Save, Calendar, MapPin, Bot, MessageSquare, Star } from "lucide-react"
import { resolvePinContext, resolveTitleFallback } from "@/lib/pinText"

// Helper to get display title with fallback
function getDisplayTitle(pin: PinData): string {
  const title = pin.title?.trim()
  if (title && title !== "Location" && title !== "Untitled Location") {
    return title
  }
  // Use fallback from pin context
  const ctx = resolvePinContext(pin)
  return resolveTitleFallback(ctx)
}

interface PinResultsProps {
  pin: PinData
  onSave: (pin: PinData) => void
  onShare: (pin: PinData) => void
  onBack: () => void
}

export function PinResults({ pin, onSave, onShare, onBack }: PinResultsProps) {
  const [personalThoughts, setPersonalThoughts] = useState(pin.personalThoughts || "")
  
  // Update personal thoughts when pin changes
  useEffect(() => {
    setPersonalThoughts(pin.personalThoughts || "")
  }, [pin.id, pin.personalThoughts])
  
  const photos = pin.additionalPhotos || []
  const primaryPhoto = pin.mediaUrl

  const handleSave = () => {
    const updatedPin = {
      ...pin,
      personalThoughts: personalThoughts.trim() || undefined
    }
    onSave(updatedPin)
  }

  const handleShare = () => {
    const updatedPin = {
      ...pin,
      personalThoughts: personalThoughts.trim() || undefined
    }
    onShare(updatedPin)
  }

  // Combine all photos for carousel - filter out invalid URLs
  // Priority: 1. primaryPhoto (mediaUrl), 2. additionalPhotos
  const allPhotos = [
    ...(primaryPhoto ? [primaryPhoto] : []), // Primary photo first
    ...photos.map(p => p.url).filter(url => url && url !== '/pinit-placeholder.jpg' && !url.includes('placeholder') && url !== primaryPhoto)
  ].filter(Boolean)
  
  // Format date/time
  const formatDateTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return `${day}/${month}/${year}, ${hours}:${minutes}`
    } catch {
      return new Date().toLocaleString()
    }
  }
  
  // Get rating and review count
  const rating = pin.rating || 4.0
  const reviewCount = pin.totalEndorsements || 52
  const score = pin.score || pin.totalEndorsements || 23000
  
  // Format score (23K format)
  const formatScore = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`
    }
    return num.toString()
  }
  
  // Log for debugging
  useEffect(() => {
    console.log("📋 PinResults received pin:", {
      id: pin.id,
      title: pin.title,
      locationName: pin.locationName,
      latitude: pin.latitude,
      longitude: pin.longitude,
      hasMediaUrl: !!pin.mediaUrl,
      additionalPhotosCount: photos.length,
      allPhotosCount: allPhotos.length,
      rating: pin.rating,
      totalEndorsements: pin.totalEndorsements
    })
  }, [pin.id, pin.title, pin.locationName, pin.latitude, pin.longitude])

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
      overflow: "hidden",
      zIndex: 1000
    }}>
      {/* Header */}
      <div style={{
        padding: "1rem",
        paddingTop: "3rem",
        background: "rgba(30, 58, 138, 0.95)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backdropFilter: "blur(15px)",
        borderBottom: "1px solid rgba(255,255,255,0.2)"
      }}>
        <button
          onClick={onBack}
          style={{
            background: "transparent",
            border: "none",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.875rem",
            fontWeight: "500",
            padding: "0.5rem",
            transition: "all 0.2s ease"
          }}
        >
          <ArrowLeft size={18} />
          <span>Return Now</span>
        </button>
        <h1 style={{ fontSize: "1.125rem", fontWeight: "600", margin: 0 }}>Pin Results</h1>
        <div style={{
          background: "rgba(255,255,255,0.15)",
          padding: "0.375rem 0.75rem",
          borderRadius: "999px",
          fontSize: "0.75rem",
          color: "rgba(255,255,255,0.9)"
        }}>
          Timer paused (stationary)
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", position: "relative" }}>
        {/* Image Carousel - Full Width, Scrollable */}
        {allPhotos.length > 0 ? (
          <>
            <div style={{
              height: "280px",
              width: "100%",
              overflowX: "auto",
              overflowY: "hidden",
              display: "flex",
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
              background: "rgba(0,0,0,0.3)"
            }}>
              {allPhotos.map((photoUrl, index) => (
                <div 
                  key={`photo-${index}-${photoUrl}`} 
                  style={{
                    minWidth: "100%",
                    width: "100%",
                    height: "100%",
                    scrollSnapAlign: "start",
                    position: "relative",
                    flexShrink: 0
                  }}
                >
                  <img
                    src={photoUrl}
                    alt={pin.title || pin.locationName}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block"
                    }}
                    onError={(e) => {
                      console.error("❌ Failed to load image:", photoUrl)
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const fallback = target.nextElementSibling as HTMLElement
                      if (fallback) fallback.style.display = 'flex'
                    }}
                    onLoad={() => {
                      console.log("✅ Image loaded:", photoUrl.substring(0, 50))
                    }}
                  />
                  {/* Fallback if image fails to load */}
                  <div 
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: "none",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(30, 58, 138, 0.5)"
                    }}
                  >
                    <span style={{ fontSize: "3rem" }}>📍</span>
                  </div>
                </div>
              ))}
            </div>
            
          </>
        ) : (
          <div style={{
            height: "280px",
            background: "rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <div style={{ textAlign: "center" }}>
              <span style={{ fontSize: "4rem", display: "block", marginBottom: "1rem" }}>📍</span>
              <p style={{ color: "rgba(255,255,255,0.7)" }}>No images available</p>
            </div>
          </div>
        )}

        {/* Content Cards Container */}
        <div style={{
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem"
        }}>
          {/* Location Details Card */}
          <div style={{
            background: "rgba(255,255,255,0.1)",
            borderRadius: "16px",
            padding: "1.25rem",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.15)"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "0.75rem"
            }}>
              <MapPin size={20} style={{ color: "#ef4444" }} />
              <h3 style={{
                fontSize: "1.125rem",
                fontWeight: "600",
                margin: 0,
                color: "white"
              }}>
                {getDisplayTitle(pin)}
              </h3>
            </div>
            
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "0.75rem",
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.9)"
            }}>
              <MapPin size={16} style={{ color: "#ef4444" }} />
              <span>{pin.locationName || `${pin.latitude?.toFixed(6)}, ${pin.longitude?.toFixed(6)}`}</span>
            </div>
            
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.8)"
            }}>
              <Calendar size={16} />
              <span>{formatDateTime(pin.timestamp)}</span>
            </div>
          </div>

          {/* AI Generated Description Card */}
          {pin.description && (
            <div style={{
              background: "rgba(255,255,255,0.1)",
              borderRadius: "16px",
              padding: "1.25rem",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderLeft: "4px solid #22c55e"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "0.75rem"
              }}>
                <Bot size={18} style={{ color: "#22c55e" }} />
                <span style={{
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "rgba(255,255,255,0.9)"
                }}>
                  AI Generated Description
                </span>
              </div>
              <p style={{
                color: "rgba(255,255,255,0.9)",
                lineHeight: "1.6",
                fontSize: "0.875rem",
                margin: 0
              }}>
                {pin.description}
              </p>
            </div>
          )}

          {/* Personal Thoughts Card */}
          <div style={{
            background: "rgba(255,255,255,0.1)",
            borderRadius: "16px",
            padding: "1.25rem",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.15)"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "0.75rem"
            }}>
              <MessageSquare size={18} style={{ color: "#3b82f6" }} />
              <span style={{
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "rgba(255,255,255,0.9)"
              }}>
                Your Personal Thoughts
              </span>
            </div>
            <textarea
              value={personalThoughts}
              onChange={(e) => setPersonalThoughts(e.target.value)}
              placeholder="Add your own thoughts about this place..."
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "0.75rem",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "white",
                fontSize: "0.875rem",
                minHeight: "80px",
                resize: "none",
                fontFamily: "inherit"
              }}
              rows={3}
            />
          </div>

          {/* Tags */}
          {pin.tags && pin.tags.length > 0 && (
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
              padding: "0 0.25rem"
            }}>
              {pin.tags.map((tag, index) => (
                <span
                  key={index}
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "999px",
                    fontSize: "0.75rem",
                    color: "rgba(255,255,255,0.9)",
                    border: "1px solid rgba(255,255,255,0.2)"
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Community Rating Card */}
          <div style={{
            background: "rgba(255,255,255,0.1)",
            borderRadius: "16px",
            padding: "1.25rem",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.15)"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0.75rem"
            }}>
              <span style={{
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "rgba(255,255,255,0.9)"
              }}>
                Community Rating
              </span>
              <button
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "8px",
                  padding: "0.5rem 1rem",
                  color: "white",
                  fontSize: "0.75rem",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.25)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.15)"
                }}
              >
                Add Review
              </button>
            </div>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem"
            }}>
              <div style={{ display: "flex", gap: "0.25rem" }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={18}
                    fill={star <= Math.round(rating) ? "#fbbf24" : "transparent"}
                    color={star <= Math.round(rating) ? "#fbbf24" : "rgba(255,255,255,0.3)"}
                    style={{ strokeWidth: star <= Math.round(rating) ? 0 : 1.5 }}
                  />
                ))}
              </div>
              <span style={{
                fontSize: "0.875rem",
                color: "rgba(255,255,255,0.9)",
                fontWeight: "500"
              }}>
                {rating.toFixed(1)} ({reviewCount} reviews)
              </span>
            </div>
          </div>
        </div>

        {/* Floating Shield Badge */}
        <div style={{
          position: "absolute",
          bottom: "120px",
          right: "1rem",
          background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
          borderRadius: "12px",
          padding: "0.75rem 1rem",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          zIndex: 10
        }}>
          <div style={{
            width: "24px",
            height: "24px",
            background: "rgba(255,255,255,0.2)",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px"
          }}>
            🛡️
          </div>
          <span style={{
            fontSize: "0.875rem",
            fontWeight: "700",
            color: "white"
          }}>
            {formatScore(score)}
          </span>
        </div>
      </div>

      {/* Action Buttons - Fixed at Bottom */}
      <div style={{
        padding: "1rem",
        background: "rgba(30, 58, 138, 0.95)",
        backdropFilter: "blur(15px)",
        borderTop: "1px solid rgba(255,255,255,0.1)"
      }}>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={handleShare}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "white",
              fontWeight: "700",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.5rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "1rem"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.3)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.2)"
            }}
          >
            <Share2 size={20} />
            Share
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "white",
              fontWeight: "700",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.5rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: "1rem"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.3)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.2)"
            }}
          >
            <Save size={20} />
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
