"use client"

import React, { useState } from 'react'
import { ArrowLeft, MapPin, Calendar, Clock, Hash, Camera, Video, Star, Edit, Share } from 'lucide-react'

interface PinData {
  id: string
  title: string
  description?: string
  latitude: number
  longitude: number
  locationName: string
  timestamp: string
  tags?: string[]
  mediaUrl?: string | null
  mediaType?: 'photo' | 'video' | null
  isRecommended?: boolean
  hasStreetView?: boolean
}

interface PinLibraryProps {
  pins: PinData[]
  onBack: () => void
  onPinSelect: (pin: PinData) => void
  onPinUpdate: (pin: PinData) => void
}

export default function PinLibrary({ pins, onBack, onPinSelect, onPinUpdate }: PinLibraryProps) {
  const [activeTab, setActiveTab] = useState<'Photos' | 'Videos' | 'Pinned Places' | 'Recommended Places'>('Pinned Places')

  // Mock data for demonstration
  const photos = [
    { id: '1', title: 'Car Interior', mediaUrl: '/placeholder.jpg', timestamp: 'Jul 22, 2025', tags: ['#car', '#interior'] },
    { id: '2', title: 'Road View', mediaUrl: '/placeholder.jpg', timestamp: 'Jul 21, 2025', tags: ['#road', '#travel'] },
  ]

  const videos = [
    { id: '1', title: 'Sunset Drive', mediaUrl: '/placeholder.jpg', timestamp: 'Jul 20, 2025', tags: ['#sunset', '#drive'] },
  ]

  const recommendedPins = pins.filter(pin => pin.isRecommended)

  const handlePinClick = (pin: PinData) => {
    onPinSelect(pin)
  }

  const renderCard = (item: any, type: 'pin' | 'photo' | 'video' | 'recommended') => {
    const isPin = type === 'pin' || type === 'recommended'
    const isPhoto = type === 'photo'
    const isVideo = type === 'video'
    
    return (
      <div key={item.id} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4 hover:bg-white/20 transition-colors">
        <div className="flex gap-4">
          {/* Media/Image Section */}
          <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0 relative">
            {item.mediaUrl ? (
              <img 
                src={item.mediaUrl} 
                alt={item.title} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to placeholder if image fails to load
                  const target = e.target as HTMLImageElement
                  target.src = '/placeholder.jpg'
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
            
            {/* Street View Badge for pins */}
            {isPin && item.hasStreetView && (
              <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                Street View
              </div>
            )}
            
            {/* Recommended Badge */}
            {type === 'recommended' && (
              <div className="absolute bottom-1 right-1 bg-orange-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                <Star size={10} />
                Recommended
              </div>
            )}
          </div>

          {/* Content Section */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-bold text-lg text-white">{item.title}</h3>
              <div className="flex gap-2">
                <button className="p-1 bg-white/20 hover:bg-white/30 rounded transition-colors">
                  <Edit size={14} />
                </button>
                <button className="p-1 bg-white/20 hover:bg-white/30 rounded transition-colors">
                  <Share size={14} />
                </button>
              </div>
            </div>

            {item.description && (
              <p className="text-white/80 text-sm mb-2">{item.description}</p>
            )}

            {isPin && (
              <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
                <MapPin size={14} />
                <span>{item.locationName}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
              <Calendar size={14} />
              <span>{item.timestamp}</span>
            </div>

            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {item.tags.map((tag: string, index: number) => (
                  <span key={index} className="text-xs bg-white/20 text-white/80 px-2 py-1 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pinit-full-bg flex flex-col">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm p-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>

        <div className="text-center">
          <h1 className="text-xl font-bold">Library</h1>
          <p className="text-sm text-white/70">
            {activeTab === 'Photos' && `${photos.length} items in photos`}
            {activeTab === 'Videos' && `${videos.length} items in videos`}
            {activeTab === 'Pinned Places' && `${pins.length} items in pins`}
            {activeTab === 'Recommended Places' && `${recommendedPins.length} items in recommended`}
          </p>
        </div>

        <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
          <Star size={16} />
          Story
        </button>
      </div>

      {/* Tabs */}
      <div className="flex justify-around bg-black/10 py-2">
        {[
          { key: 'Photos', icon: Camera, count: photos.length },
          { key: 'Videos', icon: Video, count: videos.length },
          { key: 'Pinned Places', icon: MapPin, count: pins.length },
          { key: 'Recommended Places', icon: Star, count: recommendedPins.length }
        ].map(({ key, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`px-4 py-2 font-semibold rounded-full transition-colors flex items-center gap-2 ${
              activeTab === key ? 'bg-white/30 text-white' : 'text-white/70 hover:bg-white/10'
            }`}
          >
            <Icon size={16} />
            {key} ({count})
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'Pinned Places' && (
          <div className="space-y-4">
            {pins.map((pin) => renderCard(pin, 'pin'))}
          </div>
        )}
        
        {activeTab === 'Photos' && (
          <div className="space-y-4">
            {photos.map((photo) => renderCard(photo, 'photo'))}
          </div>
        )}
        
        {activeTab === 'Videos' && (
          <div className="space-y-4">
            {videos.map((video) => renderCard(video, 'video'))}
          </div>
        )}
        
        {activeTab === 'Recommended Places' && (
          <div className="space-y-4">
            {recommendedPins.map((pin) => renderCard(pin, 'recommended'))}
          </div>
        )}
      </div>

      {/* Footer Summary */}
      <div className="bg-black/20 backdrop-blur-sm p-4 flex justify-around text-sm text-white/70">
        <div className="flex items-center gap-1">
          <Camera size={14} />
          {photos.length} photos
        </div>
        <div className="flex items-center gap-1">
          <Video size={14} />
          {videos.length} videos
        </div>
        <div className="flex items-center gap-1">
          <MapPin size={14} />
          {pins.length} pins
        </div>
        <div className="flex items-center gap-1">
          <Star size={14} />
          {recommendedPins.length} recommended
        </div>
      </div>
    </div>
  )
}
