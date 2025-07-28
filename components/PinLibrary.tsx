"use client"

import { useState, useCallback } from "react"
import { ArrowLeft, MapPin, Calendar, Edit3, Share2, Navigation, Camera, Video, Star, BookOpen } from "lucide-react"
import type { PinData } from "@/app/page"

interface PinLibraryProps {
  pins: PinData[]
  onBack: () => void
  onPinSelect: (pin: PinData) => void
  onPinUpdate: (pinId: string, updates: Partial<PinData>) => void
}

type TabType = 'photos' | 'videos' | 'pins' | 'recommended'

export function PinLibrary({ pins, onBack, onPinSelect, onPinUpdate }: PinLibraryProps) {
  const [activeTab, setActiveTab] = useState<TabType>('photos')
  const [selectedPin, setSelectedPin] = useState<PinData | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")

  // Mock data for demonstration
  const photos = [
    {
      id: '1',
      title: 'Memorable Place',
      locationName: 'Memorable Place',
      latitude: -33.3543,
      longitude: 18.8698,
      timestamp: '2025-07-22T10:00:00Z',
      tags: ['quick-pin', 'ai-generated'],
      mediaUrl: '/placeholder.jpg',
      mediaType: 'photo' as const
    },
    {
      id: '2', 
      title: 'Amazing Coffee Spot',
      locationName: 'Popular Coffee Shop',
      latitude: -33.3543,
      longitude: 18.8698,
      timestamp: '2025-07-21T10:00:00Z',
      tags: ['food', 'coffee', 'recommended'],
      mediaUrl: '/placeholder.jpg',
      mediaType: 'photo' as const
    }
  ]

  const videos = [
    {
      id: '3',
      title: 'Sunset Walk',
      locationName: 'Beach Promenade',
      latitude: -33.3543,
      longitude: 18.8698,
      timestamp: '2025-07-20T18:30:00Z',
      tags: ['sunset', 'beach', 'walk'],
      mediaUrl: '/placeholder.jpg',
      mediaType: 'video' as const
    }
  ]

  const recommended = [
    {
      id: '4',
      title: 'Hidden Gem Restaurant',
      locationName: 'Local Favorite',
      latitude: -33.3543,
      longitude: 18.8698,
      timestamp: '2025-07-19T12:00:00Z',
      tags: ['food', 'restaurant', 'ai-recommended'],
      mediaUrl: '/placeholder.jpg',
      mediaType: 'photo' as const,
      isRecommended: true
    }
  ]

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

  const renderCard = (item: any, type: 'photo' | 'video' | 'pin' | 'recommended') => {
    if (!item || !item.id) return null
    
    const isPin = type === 'pin' || type === 'recommended'
    const isPhoto = type === 'photo'
    const isVideo = type === 'video'
    const isRecommended = type === 'recommended' || item.isRecommended

    return (
      <div key={item.id} className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 p-2">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/20 transition-colors h-full relative shadow-lg border border-white/10">
          <div className="flex gap-4">
            {/* Media Section */}
            <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0">
              {item.mediaUrl ? (
                <img 
                  src={item.mediaUrl} 
                  alt={item.title || 'Pin'} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    try {
                      const target = e.target as HTMLImageElement
                      if (target) {
                        target.src = '/placeholder.jpg'
                      }
                    } catch (error) {
                      console.log('Image error handled')
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl text-white/40">
                  {isPin && <MapPin />}
                  {isPhoto && <Camera />}
                  {isVideo && <Video />}
                  {type === 'recommended' && <Star />}
                </div>
              )}
              
              {/* Recommended Badge */}
              {isRecommended && (
                <div className="absolute bottom-1 right-1 bg-orange-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                  <Star size={10} />
                  Recommended
                </div>
              )}
            </div>

            {/* Text Content */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-lg text-white">{item.title || 'Untitled'}</h3>
                <div className="flex gap-2">
                  <button 
                    className="p-1 bg-white/20 hover:bg-white/30 rounded transition-colors"
                    onClick={() => onPinUpdate(item.id, {})}
                  >
                    <Edit3 size={14} />
                  </button>
                  <button 
                    className="p-1 bg-white/20 hover:bg-white/30 rounded transition-colors"
                    onClick={() => onPinSelect(item)}
                  >
                    <Share2 size={14} />
                  </button>
                </div>
              </div>

              {item.description && (
                <p className="text-white/80 text-sm mb-2">{item.description}</p>
              )}

              {isPin && item.locationName && (
                <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
                  <MapPin size={14} />
                  <span>{item.locationName}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
                <Calendar size={14} />
                <span>
                  {item.timestamp ? (() => {
                    try {
                      return new Date(item.timestamp).toLocaleDateString()
                    } catch {
                      return 'Unknown date'
                    }
                  })() : 'Unknown date'}
                </span>
              </div>

              {item.tags && Array.isArray(item.tags) && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag: string, index: number) => (
                    <span 
                      key={index} 
                      className="text-xs bg-white/20 text-white/80 px-2 py-1 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
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
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white hover:text-white/80 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-lg font-semibold">Library</span>
        </button>
        <button className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
          <BookOpen size={16} />
          Story
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="bg-black/20 backdrop-blur-sm px-4 py-2">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('photos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'photos' 
                ? 'bg-white/30 text-white' 
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            <Camera size={16} />
            Photos
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'videos' 
                ? 'bg-white/30 text-white' 
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            <Video size={16} />
            Videos
          </button>
          <button
            onClick={() => setActiveTab('pins')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'pins' 
                ? 'bg-white/30 text-white' 
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            <MapPin size={16} />
            Pinned Places
          </button>
          <button
            onClick={() => setActiveTab('recommended')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'recommended' 
                ? 'bg-white/30 text-white' 
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            <Star size={16} />
            Recommended
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-wrap justify-center gap-4 px-4 max-w-screen-xl mx-auto">
          {activeTab === 'photos' && photos.map((photo) => renderCard(photo, 'photo'))}
          {activeTab === 'videos' && videos.map((video) => renderCard(video, 'video'))}
          {activeTab === 'pins' && pins.map((pin) => renderCard(pin, 'pin'))}
          {activeTab === 'recommended' && recommended.map((item) => renderCard(item, 'recommended'))}
        </div>
      </div>

      {/* Bottom Summary Bar */}
      <div className="bg-black/20 backdrop-blur-sm p-4">
        <div className="flex justify-between text-white/80 text-sm">
          <span>Photos: {photos.length}</span>
          <span>Videos: {videos.length}</span>
          <span>Pins: {pins.length}</span>
          <span>Recommended: {recommended.length}</span>
        </div>
      </div>
    </div>
  )
}
