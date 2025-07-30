"use client"

import { useState, useEffect } from "react"
import { MapPin, Calendar, Edit3, Share2, Navigation, ArrowLeft, ChevronLeft, ChevronRight, Save, X } from "lucide-react"
import type { PinData } from "@/app/page"

interface PinResultsProps {
  pin: PinData
  onBack: () => void
  onSave: (pin: PinData) => void
  onShare: (pin: PinData) => void
  onEdit: (pin: PinData) => void
}

interface GooglePhoto {
  photo_reference: string
  url: string
  width: number
  height: number
}

export function PinResults({ pin, onBack, onSave, onShare, onEdit }: PinResultsProps) {
  const [photos, setPhotos] = useState<GooglePhoto[]>([])
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null)

  // Fetch Google Places photos for the area
  useEffect(() => {
    const fetchAreaPhotos = async () => {
      try {
        setIsLoading(true)
        console.log("📸 Fetching area photos for results page...")

        const radius = 1000 // 1km radius
        const types = [
          "tourist_attraction", "restaurant", "cafe", "museum", "park",
          "shopping_mall", "art_gallery", "amusement_park", "zoo", "aquarium",
        ]

        const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${pin.latitude},${pin.longitude}&radius=${radius}&type=${types.join("|")}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`

        const response = await fetch(placesUrl)
        const data = await response.json()

        if (data.results && data.results.length > 0) {
          const allPhotos: GooglePhoto[] = []
          
          // Collect photos from multiple nearby places
          data.results.slice(0, 5).forEach((place: any) => {
            if (place.photos && place.photos.length > 0) {
              place.photos.slice(0, 2).forEach((photo: any) => {
                const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photo.photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
                allPhotos.push({
                  photo_reference: photo.photo_reference,
                  url: photoUrl,
                  width: photo.width || 400,
                  height: photo.height || 300
                })
              })
            }
          })

          // Add the pin's own photo if it exists
          if (pin.mediaUrl) {
            allPhotos.unshift({
              photo_reference: 'pin-photo',
              url: pin.mediaUrl,
              width: 400,
              height: 300
            })
          }

          setPhotos(allPhotos)
          if (allPhotos.length > 0) {
            setSelectedPhotoUrl(allPhotos[0].url)
          }
        }

        setIsLoading(false)
      } catch (error) {
        console.error("❌ Error fetching area photos:", error)
        setIsLoading(false)
      }
    }

    fetchAreaPhotos()
  }, [pin.latitude, pin.longitude, pin.mediaUrl])

  const nextPhoto = () => {
    if (photos.length > 0) {
      const nextIndex = (currentPhotoIndex + 1) % photos.length
      setCurrentPhotoIndex(nextIndex)
      setSelectedPhotoUrl(photos[nextIndex].url)
    }
  }

  const prevPhoto = () => {
    if (photos.length > 0) {
      const prevIndex = currentPhotoIndex === 0 ? photos.length - 1 : currentPhotoIndex - 1
      setCurrentPhotoIndex(prevIndex)
      setSelectedPhotoUrl(photos[prevIndex].url)
    }
  }

  const handleSave = () => {
    const updatedPin = {
      ...pin,
      mediaUrl: selectedPhotoUrl || pin.mediaUrl
    }
    onSave(updatedPin)
  }

  const handleShare = () => {
    const updatedPin = {
      ...pin,
      mediaUrl: selectedPhotoUrl || pin.mediaUrl
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
      background: "linear-gradient(135deg, #002c7c 0%, #9ddbeb 100%)",
      display: "flex",
      flexDirection: "column",
      color: "white",
      zIndex: 1000
    }}>
      {/* Header */}
      <div style={{
        padding: "1rem",
        background: "rgba(0,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <button
          onClick={onBack}
          style={{
            background: "rgba(255,255,255,0.2)",
            color: "white",
            padding: "0.5rem",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          <ArrowLeft size={20} />
          Back
        </button>
        
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.125rem", fontWeight: "600" }}>Pin Results</span>
        </div>

        <div style={{ width: "40px" }}></div> {/* Spacer for centering */}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
        {/* Photo Gallery Carousel */}
        <div style={{
          marginBottom: "1.5rem",
          position: "relative",
          borderRadius: "1rem",
          overflow: "hidden",
          background: "rgba(0,0,0,0.3)",
          minHeight: "200px"
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
                <div>Loading area photos...</div>
              </div>
            </div>
          ) : photos.length > 0 ? (
            <>
              {/* Main Photo */}
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
                    e.currentTarget.src = "/pinit-placeholder.jpg"
                  }}
                />
                
                {/* Navigation Arrows */}
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={prevPhoto}
                      style={{
                        position: "absolute",
                        left: "0.5rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "rgba(0,0,0,0.6)",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: "40px",
                        height: "40px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={nextPhoto}
                      style={{
                        position: "absolute",
                        right: "0.5rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "rgba(0,0,0,0.6)",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: "40px",
                        height: "40px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
              </div>

              {/* Photo Indicators */}
              {photos.length > 1 && (
                <div style={{
                  position: "absolute",
                  bottom: "0.5rem",
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  gap: "0.25rem"
                }}>
                  {photos.map((_, index) => (
                    <div
                      key={index}
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: index === currentPhotoIndex ? "white" : "rgba(255,255,255,0.4)"
                      }}
                    />
                  ))}
                </div>
              )}
            </>
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
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
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
            borderRadius: "0.5rem",
            padding: "1rem",
            marginBottom: "1rem",
            borderLeft: "3px solid #10B981"
          }}>
            <div style={{ fontSize: "0.875rem", opacity: 0.8, marginBottom: "0.5rem" }}>
              🤖 AI Generated Description
            </div>
            <div style={{ fontSize: "1rem", lineHeight: "1.5" }}>
              {pin.description || "This location looks amazing! Perfect for capturing memories and sharing with friends."}
            </div>
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
                    borderRadius: "9999px"
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
            onClick={() => onEdit(pin)}
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.2)",
              color: "white",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem"
            }}
          >
            <Edit3 size={16} />
            Edit
          </button>
          
          <button
            onClick={handleShare}
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.2)",
              color: "white",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem"
            }}
          >
            <Share2 size={16} />
            Share
          </button>
          
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              background: "#10B981",
              color: "white",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem"
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
