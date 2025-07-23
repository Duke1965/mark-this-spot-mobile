"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Plus, ExternalLink, Navigation, AlertCircle, CheckCircle } from "lucide-react"

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

export default function SharedPlaceViewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sharedData, setSharedData] = useState<SharedPlaceData | null>(null)
  const [isProcessing, setIsProcessing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const handleSharedData = async () => {
      try {
        // Check for error parameter first
        const errorParam = searchParams.get("error")
        if (errorParam) {
          const errorMessages = {
            no_data: "No shared data received",
            processing_failed: "Failed to process shared data",
            invalid_url: "Invalid Google Maps URL",
          }
          setError(errorMessages[errorParam as keyof typeof errorMessages] || "Unknown error occurred")
          setIsProcessing(false)
          return
        }

        // Get shared data from URL parameters
        const title = searchParams.get("title") || ""
        const url = searchParams.get("url") || ""
        const text = searchParams.get("text") || ""

        console.log("🔍 Processing shared data:", { title, url, text })

        // Check if we have any data
        if (!title && !url && !text) {
          setError("No shared data received")
          setIsProcessing(false)
          return
        }

        // Validate that this looks like a Google Maps URL
        if (url && !url.includes("google.com") && !url.includes("maps.app.goo.gl")) {
          setError("This doesn't appear to be a Google Maps link")
          setIsProcessing(false)
          return
        }

        // Parse the Google Maps share data
        const extractedData = parseGoogleMapsShare(title, url, text)

        // Validate extracted data
        if (!extractedData.placeName || extractedData.placeName === "Unknown Place") {
          setError("Could not extract place information from shared data")
          setIsProcessing(false)
          return
        }

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

    // Extract place name with multiple fallback strategies
    let placeName = "Unknown Place"

    // Strategy 1: Use title if available
    if (title && title.trim()) {
      placeName = title.trim()
    }
    // Strategy 2: Extract from text (first non-empty line)
    else if (text) {
      const lines = text.split("\n").filter((line) => line.trim())
      if (lines.length > 0) {
        placeName = lines[0].trim()
      }
    }
    // Strategy 3: Extract from URL query parameter
    else if (url) {
      const qMatch = url.match(/q=([^&]+)/)
      if (qMatch) {
        placeName = decodeURIComponent(qMatch[1].replace(/\+/g, " ")).trim()
      }
    }

    // Extract Knowledge Graph ID from URL
    const kgMatch = url.match(/kgmid=([^&]+)/)
    const knowledgeGraphId = kgMatch ? decodeURIComponent(kgMatch[1]) : undefined

    // Extract search query
    const qMatch = url.match(/q=([^&]+)/)
    const searchQuery = qMatch ? decodeURIComponent(qMatch[1].replace(/\+/g, " ")).trim() : placeName

    // Try to extract coordinates from various Google Maps URL formats
    let coordinates: { lat: number; lng: number } | undefined

    // Format 1: @lat,lng,zoom
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

    // Format 3: !3d and !4d parameters (Google's internal format)
    const latMatch = url.match(/!3d(-?\d+\.\d+)/)
    const lngMatch = url.match(/!4d(-?\d+\.\d+)/)
    if (!coordinates && latMatch && lngMatch) {
      coordinates = {
        lat: Number.parseFloat(latMatch[1]),
        lng: Number.parseFloat(lngMatch[1]),
      }
    }

    // Extract place ID if present
    const placeIdMatch = url.match(/place_id:([^&]+)/)
    const placeId = placeIdMatch ? placeIdMatch[1] : undefined

    return {
      placeName,
      knowledgeGraphId,
      searchQuery,
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
      setSuccess(true)

      // Redirect to main app with success message after a short delay
      setTimeout(() => {
        router.push("/?shared=success&place=" + encodeURIComponent(sharedData.extractedData.placeName))
      }, 2000)
    } catch (error) {
      console.error("❌ Failed to add shared place:", error)
      setError("Failed to add place to recommendations")
    } finally {
      setIsAdding(false)
    }
  }

  const fetchPlaceDetails = async (coordinates: { lat: number; lng: number }) => {
    try {
      const response = await fetch(`/api/places?lat=${coordinates.lat}&lng=${coordinates.lng}&radius=50`)

      if (!response.ok) {
        throw new Error("Places API request failed")
      }

      const data = await response.json()

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

  // Loading state
  if (isProcessing) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-800 via-indigo-700 to-purple-800 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg">Processing shared place...</p>
          <p className="text-sm opacity-70 mt-2">Extracting location data</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-800 via-indigo-700 to-purple-800 flex items-center justify-center text-white p-6">
        <div className="text-center max-w-md">
          <AlertCircle size={64} className="mx-auto mb-4 text-red-400" />
          <h2 className="text-2xl font-bold mb-2">Oops!</h2>
          <p className="mb-6 opacity-80">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => router.push("/")}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
            >
              Go to PINIT
            </button>
            <p className="text-xs opacity-60">
              💡 Tip: Make sure PINIT is installed as a PWA for sharing to work properly
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 flex items-center justify-center text-white p-6">
        <div className="text-center max-w-md">
          <CheckCircle size={64} className="mx-auto mb-4 text-green-200" />
          <h2 className="text-2xl font-bold mb-2">Success!</h2>
          <p className="mb-4 opacity-90">
            <strong>{sharedData?.extractedData.placeName}</strong> has been added to your recommendations
          </p>
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm opacity-70">Redirecting to PINIT...</p>
        </div>
      </div>
    )
  }

  // Main content
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-800 via-indigo-700 to-purple-800 flex flex-col text-white">
      {/* Header */}
      <div className="p-4 bg-black/30 flex items-center gap-4 border-b border-white/10">
        <button
          onClick={() => router.push("/")}
          className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold">📍 Shared Place</h1>
          <p className="text-sm opacity-70">From Google Maps</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {sharedData && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
            {/* Place Preview */}
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-green-400 via-blue-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
                📍
              </div>
              <h2 className="text-2xl font-bold mb-2">{sharedData.extractedData.placeName}</h2>
              <p className="opacity-80">{sharedData.extractedData.searchQuery}</p>
            </div>

            {/* Extracted Data */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">📊 Extracted Data</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="opacity-70">Place Name:</span>
                  <span className="font-medium">{sharedData.extractedData.placeName}</span>
                </div>
                {sharedData.extractedData.knowledgeGraphId && (
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="opacity-70">Knowledge Graph ID:</span>
                    <span className="font-mono text-xs bg-black/20 px-2 py-1 rounded">
                      {sharedData.extractedData.knowledgeGraphId}
                    </span>
                  </div>
                )}
                {sharedData.extractedData.coordinates && (
                  <div className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="opacity-70">Coordinates:</span>
                    <span className="font-mono text-xs bg-black/20 px-2 py-1 rounded">
                      {sharedData.extractedData.coordinates.lat.toFixed(6)},{" "}
                      {sharedData.extractedData.coordinates.lng.toFixed(6)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2">
                  <span className="opacity-70">Search Query:</span>
                  <span className="font-medium">{sharedData.extractedData.searchQuery}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <button
                onClick={addToRecommendations}
                disabled={isAdding}
                className="w-full p-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-colors"
              >
                {isAdding ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Adding to Recommendations...
                  </>
                ) : (
                  <>
                    <Plus size={24} />
                    Add to Recommendations
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => window.open(sharedData.url, "_blank")}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <ExternalLink size={18} />
                  Open in Maps
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Navigation size={18} />
                  Go to PINIT
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Debug Info */}
        <details className="bg-black/20 rounded-lg p-4 text-xs">
          <summary className="cursor-pointer mb-2 font-medium">🔍 Debug Info (Raw Share Data)</summary>
          <pre className="bg-black/30 p-3 rounded overflow-auto whitespace-pre-wrap">
            {JSON.stringify(sharedData, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}
