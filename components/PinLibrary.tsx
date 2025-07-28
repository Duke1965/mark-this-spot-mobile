"use client"

import { useState, useCallback } from "react"
import { ArrowLeft, MapPin, Calendar, Edit3, Share2, Navigation, BookOpen, Camera, Video, Star } from "lucide-react"
import type { PinData } from "@/app/page"

interface PinLibraryProps {
  pins: PinData[]
  onBack: () => void
  onPinSelect: (pin: PinData) => void
  onPinUpdate: (pinId: string, updates: Partial<PinData>) => void
}

type TabType = 'photos' | 'videos' | 'pins' | 'recommended'

export function PinLibrary({ pins, onBack, onPinSelect, onPinUpdate }: PinLibraryProps) {
  const [activeTab, setActiveTab] = useState<TabType>('pins')

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

  const renderPinCard = (pin: PinData) => {
    return (
      <div key={pin.id} style={{
        background: "rgba(255,255,255,0.1)",
        borderRadius: "0.75rem",
        padding: "1rem",
        marginBottom: "1rem",
        color: "white",
        border: "1px solid rgba(255,255,255,0.1)"
      }}>
        {/* Title with Map Pin Icon */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <MapPin size={16} style={{ color: "#EF4444" }} />
          <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: "bold" }}>{pin.title}</h3>
        </div>

        {/* Location */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", opacity: 0.8, fontSize: "0.875rem" }}>
          <MapPin size={14} style={{ color: "#EF4444" }} />
          <span>{pin.locationName} ({pin.latitude}, {pin.longitude})</span>
        </div>

        {/* Timestamp */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", opacity: 0.6, fontSize: "0.875rem" }}>
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
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
            {pin.tags.map((tag, index) => (
              <span 
                key={index} 
                style={{
                  fontSize: "0.75rem",
                  background: "rgba(255,255,255,0.2)",
                  color: "rgba(255,255,255,0.8)",
                  padding: "0.25rem 0.75rem",
                  borderRadius: "9999px"
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button 
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.2)",
              color: "white",
              padding: "0.5rem 0.75rem",
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem"
            }}
            onClick={() => {
              const url = `https://www.google.com/maps?q=${pin.latitude},${pin.longitude}`
              window.open(url, "_blank")
            }}
          >
            <Navigation size={14} />
            Open in Maps
          </button>
          <button 
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.2)",
              color: "white",
              padding: "0.5rem 0.75rem",
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem"
            }}
            onClick={() => {
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
            }}
          >
            <Share2 size={14} />
            Share
          </button>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'photos':
        return photos.map((photo) => renderPinCard(photo))
      case 'videos':
        return videos.map((video) => renderPinCard(video))
      case 'pins':
        return pins.map((pin) => renderPinCard(pin))
      case 'recommended':
        return recommended.map((item) => renderPinCard(item))
      default:
        return pins.map((pin) => renderPinCard(pin))
    }
  }

  const getTabCount = (tab: TabType) => {
    switch (tab) {
      case 'photos': return photos.length
      case 'videos': return videos.length
      case 'pins': return pins.length
      case 'recommended': return recommended.length
      default: return 0
    }
  }

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)",
      display: "flex",
      flexDirection: "column",
      color: "white"
    }}>
      {/* Header */}
      <div style={{
        padding: "1rem",
        background: "rgba(0,0,0,0.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ width: "1.5rem", height: "0.25rem", background: "#EF4444", borderRadius: "0.125rem", marginBottom: "0.25rem" }}></div>
              <div style={{ width: "1.5rem", height: "0.25rem", background: "#10B981", borderRadius: "0.125rem", marginBottom: "0.25rem" }}></div>
              <div style={{ width: "1.5rem", height: "0.25rem", background: "#3B82F6", borderRadius: "0.125rem" }}></div>
            </div>
            <div style={{ width: "0.5rem", height: "1rem", background: "#EF4444", borderRadius: "0.125rem" }}></div>
          </div>
          <span style={{ fontSize: "1.125rem", fontWeight: "600" }}>Pin Library</span>
        </div>
        
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button style={{
            background: "#10B981",
            color: "white",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <BookOpen size={16} />
            Story
          </button>
          <button 
            onClick={onBack}
            style={{
              background: "#6B7280",
              color: "white",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer"
            }}
          >
            Back
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        padding: "0.5rem 1rem",
        background: "rgba(0,0,0,0.2)",
        display: "flex",
        gap: "0.25rem"
      }}>
        <button
          onClick={() => setActiveTab('photos')}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            background: activeTab === 'photos' ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
            color: activeTab === 'photos' ? "white" : "rgba(255,255,255,0.7)"
          }}
        >
          <Camera size={16} />
          Photos
        </button>
        <button
          onClick={() => setActiveTab('videos')}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            background: activeTab === 'videos' ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
            color: activeTab === 'videos' ? "white" : "rgba(255,255,255,0.7)"
          }}
        >
          <Video size={16} />
          Videos
        </button>
        <button
          onClick={() => setActiveTab('pins')}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            background: activeTab === 'pins' ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
            color: activeTab === 'pins' ? "white" : "rgba(255,255,255,0.7)"
          }}
        >
          <MapPin size={16} />
          Pinned Places
        </button>
        <button
          onClick={() => setActiveTab('recommended')}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            background: activeTab === 'recommended' ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
            color: activeTab === 'recommended' ? "white" : "rgba(255,255,255,0.7)"
          }}
        >
          <Star size={16} />
          Recommended
        </button>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {renderContent().length > 0 ? (
            renderContent()
          ) : (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.6)", padding: "2rem" }}>
              <MapPin size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
              <p style={{ fontSize: "1.125rem", margin: "0 0 0.5rem 0" }}>No {activeTab} yet</p>
              <p style={{ fontSize: "0.875rem", margin: 0 }}>Start pinning places to see them here!</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Summary Bar */}
      <div style={{
        padding: "1rem",
        background: "rgba(0,0,0,0.2)",
        display: "flex",
        justifyContent: "space-between",
        fontSize: "0.875rem",
        color: "rgba(255,255,255,0.8)"
      }}>
        <span>Photos: {getTabCount('photos')}</span>
        <span>Videos: {getTabCount('videos')}</span>
        <span>Pins: {getTabCount('pins')}</span>
        <span>Recommended: {getTabCount('recommended')}</span>
      </div>
    </div>
  )
}
