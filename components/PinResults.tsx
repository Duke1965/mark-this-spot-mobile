"use client"

import { PinData } from "@/lib/types"
import { ArrowLeft, Share2, Save } from "lucide-react"

interface PinResultsProps {
  pin: PinData
  onSave: (pin: PinData) => void
  onShare: (pin: PinData) => void
  onBack: () => void
}

export function PinResults({ pin, onSave, onShare, onBack }: PinResultsProps) {
  const photos = pin.additionalPhotos || []
  const primaryPhoto = pin.mediaUrl

  return (
    <div className="h-screen w-full flex flex-col bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-12">
        <button
          onClick={onBack}
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Pin Created</h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Image Carousel */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full w-full overflow-x-auto snap-x snap-mandatory flex">
          {primaryPhoto && (
            <div className="min-w-full h-full snap-center">
              <img
                src={primaryPhoto}
                alt={pin.title || pin.locationName}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          {photos.map((photo, index) => (
            <div key={index} className="min-w-full h-full snap-center">
              <img
                src={photo.url}
                alt={photo.placeName || pin.locationName}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 bg-black/30 backdrop-blur-sm">
        <h2 className="text-2xl font-bold mb-2">{pin.title || pin.locationName}</h2>
        {pin.description && (
          <p className="text-white/90 mb-4">{pin.description}</p>
        )}
        <p className="text-sm text-white/70 mb-4">{pin.locationName}</p>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => onSave(pin)}
            className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            <Save size={20} />
            Save
          </button>
          <button
            onClick={() => onShare(pin)}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            <Share2 size={20} />
            Share
          </button>
        </div>
      </div>
    </div>
  )
}
