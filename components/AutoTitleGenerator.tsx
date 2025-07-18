"use client"

import { useState, useEffect, useCallback } from "react"
import { Sparkles, Edit, Check, X } from "lucide-react"

interface AutoTitleGeneratorProps {
  mediaUrl: string | null
  location: string | undefined
  mediaType: "photo" | "video"
  onTitleGenerated: (title: string) => void
}

export function AutoTitleGenerator({ mediaUrl, location, mediaType, onTitleGenerated }: AutoTitleGeneratorProps) {
  const [generatedTitle, setGeneratedTitle] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [customTitle, setCustomTitle] = useState("")
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([])

  // Generate title when media or location changes
  useEffect(() => {
    if (mediaUrl && location) {
      generateTitle()
    }
  }, [mediaUrl, location, mediaType])

  const generateTitle = useCallback(async () => {
    if (!location) return

    setIsGenerating(true)

    try {
      // Simulate AI title generation with various creative options
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const timeOfDay = new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 18 ? "Afternoon" : "Evening"
      const dayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" })
      const mediaEmoji = mediaType === "photo" ? "📸" : "🎥"
      const season = getSeason()

      const titleTemplates = [
        `${mediaEmoji} ${timeOfDay} at ${location}`,
        `Beautiful ${location} ${mediaType}`,
        `${dayOfWeek} memories from ${location}`,
        `${location} adventure`,
        `Exploring ${location}`,
        `${season} vibes at ${location}`,
        `${location} moments`,
        `Discovering ${location}`,
        `${location} ${timeOfDay.toLowerCase()}`,
        `My ${location} experience`,
        `${mediaEmoji} Captured at ${location}`,
        `${location} - ${new Date().toLocaleDateString()}`,
      ]

      // Generate multiple suggestions
      const suggestions = titleTemplates.sort(() => Math.random() - 0.5).slice(0, 5)

      setTitleSuggestions(suggestions)

      // Set the first one as the main generated title
      const mainTitle = suggestions[0]
      setGeneratedTitle(mainTitle)
      onTitleGenerated(mainTitle)
    } catch (error) {
      console.error("Failed to generate title:", error)
      const fallbackTitle = `${mediaType === "photo" ? "📸" : "🎥"} ${location}`
      setGeneratedTitle(fallbackTitle)
      onTitleGenerated(fallbackTitle)
    } finally {
      setIsGenerating(false)
    }
  }, [location, mediaType, onTitleGenerated])

  const getSeason = () => {
    const month = new Date().getMonth()
    if (month >= 2 && month <= 4) return "Spring"
    if (month >= 5 && month <= 7) return "Summer"
    if (month >= 8 && month <= 10) return "Fall"
    return "Winter"
  }

  const handleTitleSelect = useCallback(
    (title: string) => {
      setGeneratedTitle(title)
      onTitleGenerated(title)
      setShowSuggestions(false)
    },
    [onTitleGenerated],
  )

  const handleCustomTitle = useCallback(() => {
    if (customTitle.trim()) {
      setGeneratedTitle(customTitle.trim())
      onTitleGenerated(customTitle.trim())
      setCustomTitle("")
      setShowSuggestions(false)
    }
  }, [customTitle, onTitleGenerated])

  // Don't render if no media
  if (!mediaUrl) return null

  return (
    <div
      style={{
        position: "fixed",
        top: "4rem",
        left: "1rem",
        right: "1rem",
        zIndex: 100,
        pointerEvents: showSuggestions ? "auto" : "none",
      }}
    >
      {/* Generated Title Display */}
      {generatedTitle && !showSuggestions && (
        <div
          style={{
            background: "rgba(0,0,0,0.8)",
            borderRadius: "0.75rem",
            padding: "0.75rem 1rem",
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            pointerEvents: "auto",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <div
            style={{
              padding: "0.25rem",
              borderRadius: "50%",
              background: "rgba(139, 92, 246, 0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={14} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.75rem", opacity: 0.8, marginBottom: "0.25rem" }}>AI Generated Title:</div>
            <div style={{ fontSize: "0.875rem", fontWeight: "bold" }}>{generatedTitle}</div>
          </div>

          <button
            onClick={() => setShowSuggestions(true)}
            style={{
              padding: "0.5rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              cursor: "pointer",
            }}
            title="Edit title"
          >
            <Edit size={14} />
          </button>
        </div>
      )}

      {/* Title Generation Loading */}
      {isGenerating && (
        <div
          style={{
            background: "rgba(0,0,0,0.8)",
            borderRadius: "0.75rem",
            padding: "1rem",
            color: "white",
            textAlign: "center",
            pointerEvents: "auto",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "20px",
                height: "20px",
                border: "2px solid rgba(255,255,255,0.3)",
                borderTop: "2px solid white",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <span style={{ fontSize: "0.875rem" }}>Generating creative title...</span>
          </div>
        </div>
      )}

      {/* Title Suggestions Panel */}
      {showSuggestions && (
        <div
          style={{
            background: "rgba(0,0,0,0.9)",
            borderRadius: "1rem",
            padding: "1.5rem",
            color: "white",
            pointerEvents: "auto",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.2)",
            maxHeight: "60vh",
            overflowY: "auto",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Sparkles size={20} />
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "bold" }}>Choose Your Title</h3>
            </div>
            <button
              onClick={() => setShowSuggestions(false)}
              style={{
                padding: "0.25rem",
                borderRadius: "50%",
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* AI Suggestions */}
          <div style={{ marginBottom: "1.5rem" }}>
            <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.875rem", fontWeight: "bold", opacity: 0.8 }}>
              🤖 AI Suggestions:
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {titleSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleTitleSelect(suggestion)}
                  style={{
                    padding: "0.75rem",
                    borderRadius: "0.5rem",
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: suggestion === generatedTitle ? "rgba(139, 92, 246, 0.3)" : "rgba(255,255,255,0.1)",
                    color: "white",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "0.875rem",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (suggestion !== generatedTitle) {
                      e.currentTarget.style.background = "rgba(255,255,255,0.15)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (suggestion !== generatedTitle) {
                      e.currentTarget.style.background = "rgba(255,255,255,0.1)"
                    }
                  }}
                >
                  {suggestion}
                  {suggestion === generatedTitle && (
                    <span style={{ float: "right", color: "#10B981" }}>
                      <Check size={16} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Title Input */}
          <div>
            <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.875rem", fontWeight: "bold", opacity: 0.8 }}>
              ✏️ Custom Title:
            </h4>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Enter your own title..."
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleCustomTitle()
                  }
                }}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                  fontSize: "0.875rem",
                }}
              />
              <button
                onClick={handleCustomTitle}
                disabled={!customTitle.trim()}
                style={{
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: customTitle.trim() ? "#10B981" : "rgba(255,255,255,0.2)",
                  color: "white",
                  cursor: customTitle.trim() ? "pointer" : "not-allowed",
                  opacity: customTitle.trim() ? 1 : 0.5,
                }}
              >
                <Check size={16} />
              </button>
            </div>
          </div>

          {/* Regenerate Button */}
          <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
            <button
              onClick={generateTitle}
              disabled={isGenerating}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
                color: "white",
                cursor: isGenerating ? "not-allowed" : "pointer",
                fontWeight: "bold",
                fontSize: "0.875rem",
                opacity: isGenerating ? 0.5 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                margin: "0 auto",
              }}
            >
              <Sparkles size={16} />
              {isGenerating ? "Generating..." : "Generate New Ideas"}
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
