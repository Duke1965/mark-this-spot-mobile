"use client"

import { useState, useEffect } from "react"
import { PinData } from "@/lib/types"
import { ArrowLeft, Share2, Save } from "lucide-react"

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
  const allPhotos = [
    ...(primaryPhoto ? [primaryPhoto] : []),
    ...photos.map(p => p.url).filter(url => url && url !== '/pinit-placeholder.jpg' && !url.includes('placeholder'))
  ].filter(Boolean)
  
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
      allPhotosCount: allPhotos.length
    })
  }, [pin.id, pin.title, pin.locationName, pin.latitude, pin.longitude])

  return (
    <div className="h-screen w-full flex flex-col bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-12 bg-blue-800/50 backdrop-blur-sm">
        <button
          onClick={onBack}
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Pin Created</h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Image Carousel */}
        {allPhotos.length > 0 ? (
          <div className="h-64 overflow-hidden bg-blue-900/50">
            <div className="h-full w-full overflow-x-auto snap-x snap-mandatory flex">
              {allPhotos.map((photoUrl, index) => (
                <div key={`photo-${index}-${photoUrl}`} className="min-w-full h-full snap-center relative">
                  <img
                    src={photoUrl}
                    alt={pin.title || pin.locationName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error("❌ Failed to load image:", photoUrl)
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      // Show fallback
                      const fallback = target.nextElementSibling as HTMLElement
                      if (fallback) fallback.style.display = 'flex'
                    }}
                    onLoad={() => {
                      console.log("✅ Image loaded:", photoUrl.substring(0, 50))
                    }}
                  />
                  {/* Fallback if image fails to load */}
                  <div 
                    className="absolute inset-0 flex items-center justify-center bg-blue-900/50"
                    style={{ display: 'none' }}
                  >
                    <span className="text-4xl">📍</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-64 bg-blue-900/50 flex items-center justify-center">
            <div className="text-center">
              <span className="text-6xl mb-4 block">📍</span>
              <p className="text-white/70">No images available</p>
            </div>
          </div>
        )}

        {/* Content Card */}
        <div className="p-4 bg-blue-800/50 backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-2 text-white">
            {pin.title || pin.locationName || "Untitled Location"}
          </h2>
          {pin.description ? (
            <p className="text-white/90 mb-4 leading-relaxed">{pin.description}</p>
          ) : (
            <p className="text-white/70 mb-4 italic">No description available</p>
          )}
          <p className="text-sm text-white/70 mb-4 flex items-center gap-2">
            <span>📍</span>
            {pin.locationName || `${pin.latitude?.toFixed(6)}, ${pin.longitude?.toFixed(6)}`}
          </p>

          {/* Comment/Personal Thoughts Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-white/90 mb-2">
              Add your thoughts or comments
            </label>
            <textarea
              value={personalThoughts}
              onChange={(e) => setPersonalThoughts(e.target.value)}
              placeholder="What did you think about this place?"
              className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
              rows={3}
              style={{
                minHeight: "80px"
              }}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons - Fixed at Bottom */}
      <div className="p-4 bg-blue-800/50 backdrop-blur-sm border-t border-white/10">
        <div className="flex gap-3">
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white font-bold py-3 px-6 rounded-lg transition-colors border border-white/20"
          >
            <Share2 size={20} />
            Share
          </button>
          <button
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white font-bold py-3 px-6 rounded-lg transition-colors border border-white/20"
          >
            <Save size={20} />
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
