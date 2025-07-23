"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Plus, ExternalLink, Navigation, AlertCircle, MapPin } from "lucide-react"

interface SharedPlace {
  title: string
  description: string
  url: string
  coordinates: {
    lat: number
    lng: number
  }
}

export default function SharedPlaceView() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [place, setPlace] = useState<SharedPlace | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const title = searchParams.get("title") || "Unknown Place"
      const description = searchParams.get("description") || "No description available"
      const url = searchParams.get("url") || ""
      const lat = Number.parseFloat(searchParams.get("lat") || "0")
      const lng = Number.parseFloat(searchParams.get("lng") || "0")

      setPlace({
        title,
        description,
        url,
        coordinates: { lat, lng },
      })
    } catch (err) {
      console.error("Error parsing shared place data:", err)
      setError("Failed to load shared place information")
    } finally {
      setIsLoading(false)
    }
  }, [searchParams])

  const handleAddToRecommendations = async () => {
    if (!place) return

    setIsAdding(true)

    try {
      // Simulate adding to recommendations (you'd implement actual storage here)
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Redirect back to main app with success message
      router.push(`/?shared=success&place=${encodeURIComponent(place.title)}`)
    } catch (err) {
      console.error("Error adding place:", err)
      setError("Failed to add place to recommendations")
    } finally {
      setIsAdding(false)
    }
  }

  const handleOpenInMaps = () => {
    if (place?.url) {
      window.open(place.url, "_blank")
    } else if (place?.coordinates.lat && place?.coordinates.lng) {
      const mapsUrl = `https://www.google.com/maps?q=${place.coordinates.lat},${place.coordinates.lng}`
      window.open(mapsUrl, "_blank")
    }
  }

  const handleBackToApp = () => {
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-800 via-indigo-700 to-purple-800 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading shared place...</p>
          <p className="text-sm opacity-70">Extracting location data</p>
        </div>
      </div>
    )
  }

  if (error || !place) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center p-6 text-white">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center max-w-md">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-300" />
          <h1 className="text-2xl font-bold mb-2">Oops!</h1>
          <p className="mb-6 opacity-90">{error || "Something went wrong loading the shared place."}</p>
          <button
            onClick={handleBackToApp}
            className="bg-white/20 hover:bg-white/30 px-6 py-3 rounded-lg font-bold transition-colors"
          >
            Back to PINIT
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-800 via-indigo-700 to-purple-800 flex flex-col text-white">
      {/* Header */}
      <div className="p-4 bg-black/30 flex items-center gap-4 border-b border-white/10">
        <button onClick={handleBackToApp} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold">📍 Shared Place</h1>
          <p className="text-sm opacity-70">From Google Maps</p>
        </div>
        <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-lg">
          📍
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {place && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
            {/* Place Preview */}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin size={24} className="text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">{place.title}</h2>
                <p className="opacity-80 leading-relaxed">{place.description}</p>
              </div>
            </div>

            {place.coordinates.lat !== 0 && place.coordinates.lng !== 0 && (
              <div className="bg-white/10 rounded-lg p-3 mb-4">
                <p className="text-white/70 text-sm mb-1">Coordinates</p>
                <p className="text-white font-mono text-sm">
                  {place.coordinates.lat.toFixed(6)}, {place.coordinates.lng.toFixed(6)}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-4">
              <button
                onClick={handleAddToRecommendations}
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
                  onClick={handleOpenInMaps}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <ExternalLink size={18} />
                  Open in Maps
                </button>
                <button
                  onClick={handleBackToApp}
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
            {JSON.stringify(place, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}
