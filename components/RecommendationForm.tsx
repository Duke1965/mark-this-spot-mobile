"use client"

import { useState } from "react"
import { Star, X, Send } from "lucide-react"

interface RecommendationFormProps {
  mediaUrl: string
  locationName: string
  onRecommend: (rating: number, review: string) => void
  onSkip: () => void
}

export function RecommendationForm({ mediaUrl, locationName, onRecommend, onSkip }: RecommendationFormProps) {
  const [showForm, setShowForm] = useState(false)
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  console.log("🎯 RecommendationForm rendered with:", { mediaUrl, locationName, showForm, rating, review, isSubmitting })

  const handleRecommendClick = () => {
    console.log("🔍 handleRecommendClick called")
    setShowForm(true)
  }

  const handleSkip = () => {
    onSkip()
  }

  const handleSubmit = () => {
    console.log("🔍 handleSubmit called with:", { rating, review, reviewLength: review.trim().length })
    
    if (review.trim().length === 0) {
      console.log("❌ Review is empty, submission blocked")
      return
    }
    
    console.log("✅ Submitting recommendation:", { rating, review: review.trim() })
    setIsSubmitting(true)
    
    // Call the onRecommend callback
    onRecommend(rating, review.trim())
  }

  const handleStarClick = (pinNumber: number) => {
    setRating(pinNumber)
  }

  // Remove the initial recommendation prompt - go straight to the form
  // Recommendation form
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        color: "white",
        padding: "2rem",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
        <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "white" }}>
          Write a Review
        </div>
        <button
          onClick={onSkip}
          style={{
            padding: "0.75rem",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.1)",
            color: "white",
            borderRadius: "0.5rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.2rem",
          }}
        >
          <X size={24} />
        </button>
      </div>

      {/* Media Preview */}
      <div style={{ 
        marginBottom: "2rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}>
        <div style={{
          width: "100%",
          maxWidth: "400px",
          height: "300px",
          borderRadius: "1rem",
          overflow: "hidden",
          border: "2px solid rgba(255,255,255,0.2)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#000",
          marginBottom: "1rem"
        }}>
          <img
            src={mediaUrl}
            alt="Your post with stickers"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "center",
            }}
          />
        </div>
        <div style={{ 
          fontSize: "1rem", 
          opacity: 0.9, 
          fontWeight: "500",
          textAlign: "center"
        }}>
          {locationName}
        </div>
      </div>

      {/* Star Rating */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ 
          fontSize: "1rem", 
          marginBottom: "1rem",
          opacity: 0.9,
          textAlign: "center"
        }}>
          Rate this place (optional)
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem" }}>
          {[1, 2, 3, 4, 5].map((pin) => (
            <button
              key={pin}
              onClick={() => handleStarClick(pin)}
              style={{
                padding: "0.5rem",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: "2rem",
                color: pin <= rating ? "#FBBF24" : "rgba(255,255,255,0.3)",
                transition: "color 0.2s ease",
                transform: `rotate(${pin % 2 === 0 ? '15deg' : '-15deg'})`,
              }}
            >
              📍
            </button>
          ))}
        </div>
      </div>

      {/* Review Text */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ 
          fontSize: "1rem", 
          marginBottom: "1rem",
          opacity: 0.9,
          textAlign: "center"
        }}>
          Tell others why you recommend this PIN – in a sentence or two.
        </div>
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="Share your experience..."
          style={{
            width: "100%",
            minHeight: "120px",
            padding: "1rem",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "0.75rem",
            background: "rgba(255,255,255,0.1)",
            color: "white",
            fontSize: "1rem",
            resize: "vertical",
            fontFamily: "inherit",
          }}
          maxLength={200}
        />
        <div style={{ 
          fontSize: "0.875rem", 
          opacity: 0.7, 
          marginTop: "0.5rem",
          textAlign: "right"
        }}>
          {review.length}/200 characters
        </div>
      </div>

      {/* Submit Button - FIXED STYLING */}
      <button
        onClick={handleSubmit}
        disabled={review.trim().length === 0 || isSubmitting}
        style={{
          width: "100%",
          padding: "1rem 1.5rem",
          border: "1px solid rgba(255,255,255,0.2)",
          background: review.trim().length > 0 ? "white" : "rgba(255,255,255,0.1)",
          color: review.trim().length > 0 ? "#1e3a8a" : "rgba(255,255,255,0.5)",
          borderRadius: "0.75rem",
          cursor: review.trim().length > 0 ? "pointer" : "not-allowed",
          fontSize: "1.1rem",
          fontWeight: "600",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          transition: "all 0.2s ease",
          boxShadow: review.trim().length > 0 ? "0 4px 12px rgba(255,255,255,0.3)" : "none",
        }}
        onMouseEnter={(e) => {
          if (review.trim().length > 0) {
            e.currentTarget.style.background = "rgba(255,255,255,0.9)"
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(255,255,255,0.4)"
          }
        }}
        onMouseLeave={(e) => {
          if (review.trim().length > 0) {
            e.currentTarget.style.background = "white"
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(255,255,255,0.3)"
          }
        }}
      >
        {isSubmitting ? (
          <>
            <div style={{ 
              width: "20px", 
              height: "20px", 
              border: "2px solid transparent", 
              borderTop: "2px solid #1e3a8a", 
              borderRadius: "50%", 
              animation: "spin 1s linear infinite" 
            }} />
            Sending...
          </>
        ) : (
          <>
            <Send size={20} />
            Send Recommendation
          </>
        )}
      </button>
      
      {/* CSS Animation for spinner */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
} 
