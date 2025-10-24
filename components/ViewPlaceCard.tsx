"use client"

import { useState } from "react"
import { X, Share2, Heart, MapPin } from "lucide-react"

interface ViewPlaceCardProps {
  recommendation: {
    id: string
    title: string
    description: string
    category: string
    location: {
      lat: number
      lng: number
    }
    rating: number
    isAISuggestion: boolean
    confidence: number
    reason: string
    timestamp: Date
    fallbackImage?: string
    // Additional fields for the review
    userPhoto?: string
    userComment?: string
    userRating?: number
    userName?: string
  }
  onClose: () => void
  onShare?: (recommendation: any) => void
  onSaveToFavorites?: (recommendation: any) => void
}

export function ViewPlaceCard({ 
  recommendation, 
  onClose, 
  onShare, 
  onSaveToFavorites 
}: ViewPlaceCardProps) {
  const [isSaved, setIsSaved] = useState(false)

  const handleShare = () => {
    if (onShare) {
      onShare(recommendation)
    }
    console.log('📤 Sharing recommendation:', recommendation.title)
  }

  const handleSaveToFavorites = () => {
    setIsSaved(!isSaved)
    if (onSaveToFavorites) {
      onSaveToFavorites(recommendation)
    }
    console.log('💾 Saved to favorites:', recommendation.title)
  }

  // Generate pin rating display (1-5 pins)
  const renderPinRating = (rating: number) => {
    const pins = []
    const fullPins = Math.floor(rating)
    const hasHalfPin = rating % 1 >= 0.5

    for (let i = 0; i < 5; i++) {
      if (i < fullPins) {
        pins.push(
          <span key={i} style={{ fontSize: '16px', marginRight: '2px' }}>
            📍
          </span>
        )
      } else if (i === fullPins && hasHalfPin) {
        pins.push(
          <span key={i} style={{ fontSize: '16px', marginRight: '2px', opacity: 0.6 }}>
            📍
          </span>
        )
      } else {
        pins.push(
          <span key={i} style={{ fontSize: '16px', marginRight: '2px', opacity: 0.3 }}>
            📍
          </span>
        )
      }
    }
    return pins
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
        borderRadius: '20px',
        padding: '24px',
        maxWidth: '400px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{
            color: 'white',
            fontSize: '20px',
            fontWeight: '600',
            margin: 0
          }}>
            View Place
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Camera Capture Section */}
        <div style={{
          marginBottom: '20px'
        }}>
          <div style={{
            width: '100%',
            height: '200px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.1)',
            border: '2px solid rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {recommendation.userPhoto ? (
              <img 
                src={recommendation.userPhoto} 
                alt="User's photo"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                color: 'rgba(255,255,255,0.7)'
              }}>
                <span style={{ fontSize: '48px', marginBottom: '8px' }}>
                  {recommendation.fallbackImage || '📷'}
                </span>
                <span style={{ fontSize: '14px' }}>User's Photo</span>
              </div>
            )}
          </div>
          <div style={{
            textAlign: 'center',
            color: 'white',
            fontSize: '14px',
            marginTop: '8px',
            opacity: 0.8
          }}>
            Camera Capture
          </div>
        </div>

        {/* Rating Section */}
        <div style={{
          marginBottom: '20px'
        }}>
          <div style={{
            color: 'white',
            fontSize: '14px',
            marginBottom: '8px'
          }}>
            Rate this place (optional)
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {renderPinRating(recommendation.userRating || recommendation.rating)}
          </div>
        </div>

        {/* Comment Section */}
        <div style={{
          marginBottom: '24px'
        }}>
          <div style={{
            color: 'white',
            fontSize: '14px',
            marginBottom: '8px'
          }}>
            Tell others why you recommend this PIN - in a sentence or two.
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '12px',
            padding: '16px',
            color: 'white',
            fontSize: '14px',
            lineHeight: '1.5',
            minHeight: '80px',
            display: 'flex',
            alignItems: 'center'
          }}>
            {recommendation.userComment || recommendation.description || "No comment provided"}
          </div>
          <div style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '12px',
            marginTop: '4px',
            textAlign: 'right'
          }}>
            {(recommendation.userComment || recommendation.description || "").length}/200 characters
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px'
        }}>
          <button
            onClick={handleShare}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              padding: '12px 16px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
            }}
          >
            <Share2 size={16} />
            Share
          </button>
          
          <button
            onClick={handleSaveToFavorites}
            style={{
              flex: 1,
              background: isSaved ? 'rgba(239, 68, 68, 0.8)' : 'rgba(255,255,255,0.1)',
              border: isSaved ? '1px solid rgba(239, 68, 68, 0.8)' : '1px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              padding: '12px 16px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!isSaved) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isSaved) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
              }
            }}
          >
            <Heart size={16} fill={isSaved ? 'white' : 'none'} />
            {isSaved ? 'Saved' : 'Save to Favorites'}
          </button>
        </div>

        {/* Location Info */}
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <MapPin size={16} color="rgba(255,255,255,0.8)" />
          <span style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: '12px'
          }}>
            {recommendation.title} • {recommendation.category}
          </span>
        </div>
      </div>
    </div>
  )
}
