"use client"

import { useState, useCallback } from "react"
import { ArrowLeft, MapPin, Calendar, Edit3, Share2, Navigation, BookOpen } from "lucide-react"
import type { PinData } from "@/app/page"

interface PinLibraryProps {
  pins: PinData[]
  onBack: () => void
  onPinSelect: (pin: PinData) => void
  onPinUpdate: (pinId: string, updates: Partial<PinData>) => void
}

export function PinLibrary({ pins, onBack, onPinSelect, onPinUpdate }: PinLibraryProps) {
  const [selectedPin, setSelectedPin] = useState<PinData | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")

  const handlePinClick = useCallback((pin: PinData) => {
    setSelectedPin(pin)
    setEditTitle(pin.title)
    setEditDescription(pin.description || "")
  }, [])

  const handleEditSave = useCallback(() => {
    if (selectedPin) {
      onPinUpdate(selectedPin.id, {
        title: editTitle,
        description: editDescription,
      })
      setSelectedPin({ ...selectedPin, title: editTitle, description: editDescription })
      setIsEditing(false)
    }
  }, [selectedPin, editTitle, editDescription, onPinUpdate])

  const openInMaps = useCallback((pin: PinData) => {
    const url = `https://www.google.com/maps?q=${pin.latitude},${pin.longitude}`
    window.open(url, "_blank")
  }, [])

  const sharePin = useCallback((pin: PinData) => {
    const shareText = `Check out this amazing place I discovered: ${pin.title} at ${pin.locationName}! 📍`

    if (navigator.share) {
      navigator.share({
        title: pin.title,
        text: shareText,
        url: `https://www.google.com/maps?q=${pin.latitude},${pin.longitude}`,
      })
    } else {
      navigator.clipboard.writeText(shareText)
      alert("Pin details copied to clipboard!")
    }
  }, [])

  const renderPinCard = (pin: PinData) => {
    return (
      <div key={pin.id} className="w-full max-w-md mx-auto mb-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/20 transition-colors shadow-lg border border-white/10">
          {/* Title with Map Pin Icon */}
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={16} className="text-red-500" />
            <h3 className="font-bold text-lg text-white">{pin.title}</h3>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
            <MapPin size={14} className="text-red-500" />
            <span>{pin.locationName} ({pin.latitude}, {pin.longitude})</span>
          </div>

          {/* Timestamp */}
          <div className="flex items-center gap-2 text-white/60 text-sm mb-3">
            <Calendar size={14} />
            <span>
              {pin.timestamp ? new Date(pin.timestamp).toLocaleString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              }) : 'Unknown date'}
            </span>
          </div>

          {/* Tags */}
          {pin.tags && pin.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pin.tags.map((tag, index) => (
                <span 
                  key={index} 
                  className="text-xs bg-white/20 text-white/80 px-3 py-1 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mt-3">
            <button 
              className="flex-1 bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              onClick={() => openInMaps(pin)}
            >
              <Navigation size={14} />
              Open in Maps
            </button>
            <button 
              className="flex-1 bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              onClick={() => sharePin(pin)}
            >
              <Share2 size={14} />
              Share
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-purple-600 to-blue-600">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <div className="w-6 h-1 bg-red-500 rounded mb-1"></div>
              <div className="w-6 h-1 bg-green-500 rounded mb-1"></div>
              <div className="w-6 h-1 bg-blue-500 rounded"></div>
            </div>
            <div className="w-2 h-4 bg-red-500 rounded"></div>
          </div>
          <span className="text-lg font-semibold text-white">Pin Library</span>
        </div>
        
        <div className="flex gap-2">
          <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
            <BookOpen size={16} />
            Story
          </button>
          <button 
            onClick={onBack}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {pins.length > 0 ? (
            pins.map((pin) => renderPinCard(pin))
          ) : (
            <div className="text-center text-white/60 py-8">
              <MapPin size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg">No pins yet</p>
              <p className="text-sm">Start pinning places to see them here!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
