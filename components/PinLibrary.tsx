"use client"

import { useState, useCallback } from "react"
import { ArrowLeft, MapPin, Calendar, Edit3, Share2, Navigation } from "lucide-react"
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
    const url = `https://www.google.com/maps?q=${pin.coordinates.lat},${pin.coordinates.lng}`
    window.open(url, "_blank")
  }, [])

  const sharePin = useCallback((pin: PinData) => {
    const shareText = `Check out this amazing place I discovered: ${pin.title} at ${pin.location}! 📍`

    if (navigator.share) {
      navigator.share({
        title: pin.title,
        text: shareText,
        url: `https://www.google.com/maps?q=${pin.coordinates.lat},${pin.coordinates.lng}`,
      })
    } else {
      navigator.clipboard.writeText(shareText)
      alert("Pin details copied to clipboard!")
    }
  }, [])

  if (selectedPin) {
    return (
      <div className="flex-1 flex flex-col bg-gradient-to-br from-purple-600 to-blue-600">
        {/* Header */}
        <div className="bg-black/20 backdrop-blur-sm p-4 flex items-center justify-between">
          <button
            onClick={() => setSelectedPin(null)}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>

          <h2 className="font-bold">Pin Details</h2>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
          >
            <Edit3 size={20} />
          </button>
        </div>

        {/* Pin Details */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-6">
            {/* Title */}
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full text-xl font-bold bg-white/20 text-white placeholder-white/60 rounded-lg p-3 border border-white/30"
                placeholder="Pin title..."
              />
            ) : (
              <h1 className="text-2xl font-bold text-white">{selectedPin.title}</h1>
            )}

            {/* Location Info */}
            <div className="flex items-center gap-3 text-white/90">
              <MapPin size={20} className="text-red-400" />
              <div>
                <div className="font-semibold">{selectedPin.location}</div>
                <div className="text-sm opacity-70">
                  {selectedPin.coordinates.lat.toFixed(4)}, {selectedPin.coordinates.lng.toFixed(4)}
                </div>
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center gap-3 text-white/90">
              <Calendar size={20} className="text-blue-400" />
              <div>
                <div className="font-semibold">
                  {new Date(selectedPin.timestamp).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                <div className="text-sm opacity-70">
                  {new Date(selectedPin.timestamp).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-white/90 font-semibold mb-2">Description</label>
              {isEditing ? (
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-white/20 text-white placeholder-white/60 rounded-lg p-3 border border-white/30 h-24 resize-none"
                  placeholder="Add a description for this pin..."
                />
              ) : (
                <p className="text-white/80">{selectedPin.description || "No description added yet."}</p>
              )}
            </div>

            {/* Tags */}
            {selectedPin.tags && selectedPin.tags.length > 0 && (
              <div>
                <label className="block text-white/90 font-semibold mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {selectedPin.tags.map((tag, index) => (
                    <span key={index} className="px-3 py-1 bg-white/20 rounded-full text-sm text-white/90">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              {isEditing ? (
                <>
                  <button
                    onClick={handleEditSave}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-bold transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 rounded-lg font-bold transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => openInMaps(selectedPin)}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Navigation size={16} />
                    Open in Maps
                  </button>
                  <button
                    onClick={() => sharePin(selectedPin)}
                    className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Share2 size={16} />
                    Share
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-purple-600 to-blue-600">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm p-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>

        <h1 className="text-xl font-bold">My Discoveries</h1>

        <div className="text-sm bg-white/20 px-3 py-1 rounded-full">{pins.length} pins</div>
      </div>

      {/* Pins List */}
      <div className="flex-1 overflow-y-auto p-4">
        {pins.length === 0 ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-4 text-center">
            <div className="text-6xl">📍</div>
            <h2 className="text-2xl font-bold">No Discoveries Yet!</h2>
            <p className="opacity-80 max-w-sm">
              Start exploring and pin interesting places you discover on your journeys.
            </p>
            <button
              onClick={onBack}
              className="bg-red-500 hover:bg-red-600 px-6 py-3 rounded-lg font-bold transition-colors"
            >
              Start Discovering
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {pins.map((pin) => (
              <button
                key={pin.id}
                onClick={() => handlePinClick(pin)}
                className="w-full bg-white/10 backdrop-blur-sm rounded-xl p-4 text-left hover:bg-white/20 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-white mb-1">{pin.title}</h3>

                    <div className="flex items-center gap-2 text-white/80 mb-2">
                      <MapPin size={14} className="text-red-400" />
                      <span className="text-sm">{pin.location}</span>
                    </div>

                    <div className="flex items-center gap-2 text-white/60 text-sm">
                      <Calendar size={14} />
                      <span>
                        {new Date(pin.timestamp).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    {pin.description && <p className="text-white/70 text-sm mt-2 line-clamp-2">{pin.description}</p>}

                    {pin.tags && pin.tags.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {pin.tags.slice(0, 3).map((tag, index) => (
                          <span key={index} className="px-2 py-1 bg-white/20 rounded-full text-xs text-white/80">
                            #{tag}
                          </span>
                        ))}
                        {pin.tags.length > 3 && (
                          <span className="px-2 py-1 bg-white/20 rounded-full text-xs text-white/80">
                            +{pin.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="ml-4 text-white/60">
                    <div className="text-2xl">📍</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
