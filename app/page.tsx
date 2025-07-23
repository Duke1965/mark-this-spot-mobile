"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Plus, ExternalLink, Navigation } from "lucide-react"

interface SharedPlaceData {
  title: string
  url: string
  text: string
  extractedData: {
    placeName: string
    knowledgeGraphId?: string
    searchQuery: string
    coordinates?: { lat: number; lng: number }
    placeId?: string
  }
}

export default function SharedPlacePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sharedData, setSharedData] = useState<SharedPlaceData | null>(null)
  const [isProcessing, setIsProcessing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    // Handle both GET (URL params) and POST (form data) requests
    const handleSharedData = async () => {
      try {
        // First try to get data from URL params (GET request)
        const title = searchParams.get("title") || ""
        const url = searchParams.get("url") || ""
        const text = searchParams.get("text") || ""

        // If no URL params, try to get from POST data (this would be handled server-side in production)
        if (!title && !url && !text) {
          // For demo purposes, we'll simulate POST data handling
          // In a real app, this would be handled by a server action or API route
          setError("No shared data received")
          setIsProcessing(false)
          return
        }

        // Parse the Google Maps share data
        const extractedData = parseGoogleMapsShare(title, url, text)

        setSharedData({
          title,
          url,
          text,
          extractedData,
        })
      } catch (err) {
        console.error("Error processing shared data:", err)
        setError("Failed to process shared data")
      } finally {
        setIsProcessing(false)
      }
    }

    handleSharedData()
  }, [searchParams])

  const parseGoogleMapsShare = (title: string, url: string, text: string) => {
    console.log("🔍 Parsing Google Maps share:", { title, url, text })

    // Extract place name (usually in title or first line of text)
    let placeName = title || "Unknown Place"
    if (!placeName && text) {
      const lines = text.split("\n")
      placeName = lines[0] || "Unknown Place"
    }

    // Extract Knowledge Graph ID from URL
    const kgMatch = url.match(/kgmid=([^&]+)/)
    const knowledgeGraphId = kgMatch ? decodeURIComponent(kgMatch[1]) : undefined

    // Extract search query
    const qMatch = url.match(/q=([^&]+)/)
    const searchQuery = qMatch ? decodeURIComponent(qMatch[1].replace(/\+/g, " ")) : placeName

    // Try to extract coordinates if present (from various Google Maps URL formats)
    let coordinates: { lat: number; lng: number } | undefined

    // Format 1: @lat,lng
    const coordMatch1 = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (coordMatch1) {
      coordinates = {
        lat: Number.parseFloat(coordMatch1[1]),
        lng: Number.parseFloat(coordMatch1[2]),
      }
    }

    // Format 2: ll=lat,lng
    const coordMatch2 = url.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/)
    if (!coordinates && coordMatch2) {
      coordinates = {
        lat: Number.parseFloat(coordMatch2[1]),
        lng: Number.parseFloat(coordMatch2[2]),
      }
    }

    // Extract place ID if present
    const placeIdMatch = url.match(/place_id:([^&]+)/)
    const placeId = placeIdMatch ? placeIdMatch[1] : undefined

    return {
      placeName: placeName.trim(),
      knowledgeGraphId,
      searchQuery: searchQuery.trim(),
      coordinates,
      placeId,
    }
  }

  const addToRecommendations = async () => {
    if (!sharedData) return

    setIsAdding(true)

    try {
      // Get additional place details if we have coordinates
      let placeDetails = null
      if (sharedData.extractedData.coordinates) {
        placeDetails = await fetchPlaceDetails(sharedData.extractedData.coordinates)
      }

      // Create recommendation object
      const recommendation = {
        id: `shared-${Date.now()}`,
        latitude: sharedData.extractedData.coordinates?.lat || 0,
        longitude: sharedData.extractedData.coordinates?.lng || 0,
        locationName: placeDetails?.vicinity || sharedData.extractedData.searchQuery || "Unknown Location",
        mediaUrl: placeDetails?.photoUrl || null,
        mediaType: null,
        audioUrl: null,
        timestamp: new Date().toISOString(),
        title: `📍 ${sharedData.extractedData.placeName}`,
        description: `Shared from Google Maps • ${sharedData.extractedData.searchQuery}`,
        tags: ["shared", "google-maps", "recommended"],
        isRecommended: true,
        googlePlaceId: sharedData.extractedData.placeId,
        rating: placeDetails?.rating,
        priceLevel: placeDetails?.priceLevel,
        types: placeDetails?.types || [],
        isAISuggestion: false,
        sharedData: {
          originalUrl: sharedData.url,
          knowledgeGraphId: sharedData.extractedData.knowledgeGraphId,
          sharedAt: Date.now(),
        },
      }

      // Save to localStorage (in a real app, this would be an API call)
      const existingPins = JSON.parse(localStorage.getItem("pinit-pins") || "[]")
      const updatedPins = [recommendation, ...existingPins]
      localStorage.setItem("pinit-pins", JSON.stringify(updatedPins))

      console.log("✅ Added shared place to recommendations:", recommendation)

      // Redirect to main app with success message
      router.push("/?shared=success&place=" + encodeURIComponent(sharedData.extractedData.placeName))
    } catch (error) {
      console.error("❌ Failed to add shared place:", error)
      setError("Failed to add place to recommendations")
    } finally {
      setIsAdding(false)
    }
  }

  const fetchPlaceDetails = async (coordinates: { lat: number; lng: number }) => {
    try {
      // Use our existing places API to get more details
      const response = await fetch(`/api/places?lat=${coordinates.lat}&lng=${coordinates.lng}&radius=50`)

      if (!response.ok) {
        throw new Error("Places API request failed")
      }

      const data = await response.json()

      // Find the closest place (this is a simplified approach)
      if (data.results && data.results.length > 0) {
        const place = data.results[0]
        return {
          vicinity: place.vicinity || `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`,
          photoUrl: place.photos?.[0]
            ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
            : null,
          rating: place.rating,
          priceLevel: place.price_level,
          types: place.types || [],
        }
      }
    } catch (error) {
      console.error("Failed to fetch place details:", error)
    }
    return null
  }

  if (isProcessing) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #581c87 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              border: "4px solid rgba(255,255,255,0.3)",
              borderTop: "4px solid white",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 1rem",
            }}
          />
          <p>Processing shared place...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #581c87 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          padding: "2rem",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "400px" }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>❌</div>
          <h2 style={{ margin: "0 0 1rem 0" }}>Oops!</h2>
          <p style={{ margin: "0 0 2rem 0", opacity: 0.8 }}>{error}</p>
          <button
            onClick={() => router.push("/")}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#3B82F6",
              border: "none",
              borderRadius: "0.5rem",
              color: "white",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Go to PINIT
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #581c87 100%)",
        display: "flex",
        flexDirection: "column",
        color: "white",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1rem",
          background: "rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <button
          onClick={() => router.push("/")}
          style={{
            padding: "0.5rem",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "bold" }}>📍 Shared Place</h1>
          <p style={{ margin: 0, fontSize: "0.875rem", opacity: 0.7 }}>From Google Maps</p>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "2rem", overflow: "auto" }}>
        {sharedData && (
          <div
            style={{
              background: "rgba(255,255,255,0.1)",
              borderRadius: "1rem",
              padding: "2rem",
              marginBottom: "2rem",
            }}
          >
            {/* Place Preview */}
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div
                style={{
                  width: "120px",
                  height: "120px",
                  background: "linear-gradient(135deg, #22C55E 0%, #3B82F6 50%, #10B981 100%)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem",
                  fontSize: "3rem",
                }}
              >
                📍
              </div>
              <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.5rem" }}>{sharedData.extractedData.placeName}</h2>
              <p style={{ margin: 0, opacity: 0.8 }}>{sharedData.extractedData.searchQuery}</p>
            </div>

            {/* Extracted Data */}
            <div style={{ marginBottom: "2rem" }}>
              <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem" }}>📊 Extracted Data</h3>
              <div style={{ display: "grid", gap: "0.5rem", fontSize: "0.875rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ opacity: 0.7 }}>Place Name:</span>
                  <span>{sharedData.extractedData.placeName}</span>
                </div>
                {sharedData.extractedData.knowledgeGraphId && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ opacity: 0.7 }}>Knowledge Graph ID:</span>
                    <span style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                      {sharedData.extractedData.knowledgeGraphId}
                    </span>
                  </div>
                )}
                {sharedData.extractedData.coordinates && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ opacity: 0.7 }}>Coordinates:</span>
                    <span style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                      {sharedData.extractedData.coordinates.lat.toFixed(6)},{" "}
                      {sharedData.extractedData.coordinates.lng.toFixed(6)}
                    </span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ opacity: 0.7 }}>Search Query:</span>
                  <span>{sharedData.extractedData.searchQuery}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "grid", gap: "1rem" }}>
              <button
                onClick={addToRecommendations}
                disabled={isAdding}
                style={{
                  padding: "1rem",
                  background: "#10B981",
                  border: "none",
                  borderRadius: "0.75rem",
                  color: "white",
                  cursor: isAdding ? "not-allowed" : "pointer",
                  fontSize: "1rem",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  opacity: isAdding ? 0.7 : 1,
                }}
              >
                {isAdding ? (
                  <>
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
                    Adding to Recommendations...
                  </>
                ) : (
                  <>
                    <Plus size={20} />
                    Add to Recommendations
                  </>
                )}
              </button>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <button
                  onClick={() => window.open(sharedData.url, "_blank")}
                  style={{
                    padding: "0.75rem",
                    background: "rgba(255,255,255,0.1)",
                    border: "none",
                    borderRadius: "0.5rem",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                  }}
                >
                  <ExternalLink size={16} />
                  Open in Maps
                </button>

                <button
                  onClick={() => router.push("/")}
                  style={{
                    padding: "0.75rem",
                    background: "rgba(255,255,255,0.1)",
                    border: "none",
                    borderRadius: "0.5rem",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Navigation size={16} />
                  Go to PINIT
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Debug Info */}
        <details
          style={{
            background: "rgba(0,0,0,0.2)",
            borderRadius: "0.5rem",
            padding: "1rem",
            fontSize: "0.75rem",
          }}
        >
          <summary style={{ cursor: "pointer", marginBottom: "0.5rem" }}>🔍 Debug Info (Raw Share Data)</summary>
          <pre
            style={{
              background: "rgba(0,0,0,0.3)",
              padding: "0.5rem",
              borderRadius: "0.25rem",
              overflow: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {JSON.stringify(sharedData, null, 2)}
          </pre>
        </details>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
