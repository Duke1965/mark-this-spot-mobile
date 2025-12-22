"use client"

import { useState } from "react"
import { ArrowLeft, Search, Filter, Plus, Share2, Edit3, Trash2, Camera, Video, MapPin, Star, Calendar } from "lucide-react"
import type { PinData } from "@/lib/types"
import { resolvePinContext, resolveTitleFallback } from "@/lib/pinText"

// Helper to get display title with fallback
function getDisplayTitle(pin: PinData): string {
  const title = pin.title?.trim()
  if (title && title !== "Location" && title !== "Untitled Location") {
    return title
  }
  // Use fallback from pin context
  const ctx = resolvePinContext(pin)
  return resolveTitleFallback(ctx)
}

interface PinLibraryProps {
  pins: PinData[]
  onBack: () => void
  onPinSelect: (pin: PinData) => void
  onPinUpdate: (pinId: string, updates: any) => void
  onPinDelete?: (pinId: string) => void
}

export function PinLibrary({ pins, onBack, onPinSelect, onPinUpdate, onPinDelete }: PinLibraryProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentTab, setCurrentTab] = useState<"photos" | "videos" | "pins" | "recommended">("pins")

  const getTabData = () => {
    console.log("🔍 Current tab:", currentTab, "Total pins:", pins.length)
    console.log("📌 Sample pins:", pins.slice(0, 2))
    
    switch (currentTab) {
      case "photos":
        const photos = pins.filter(pin => pin.mediaType === "photo")
        console.log("📸 Photos found:", photos.length)
        return photos
      case "videos":
        const videos = pins.filter(pin => pin.mediaType === "video")
        console.log("🎥 Videos found:", videos.length)
        return videos
      case "pins":
        const regularPins = pins.filter(pin => !pin.isRecommended)
        console.log("📍 Regular pins found:", regularPins.length)
        return regularPins
      case "recommended":
        const recommended = pins.filter(pin => pin.isRecommended)
        console.log("⭐ Recommended found:", recommended.length)
        return recommended
      default:
        return pins
    }
  }

  const filteredData = getTabData().filter(item => {
    const displayTitle = getDisplayTitle(item)
    const matchesSearch = displayTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.locationName.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const renderPinCard = (item: any, type: 'pin' | 'photo' | 'video' | 'recommended') => {
    if (!item || !item.id) return null

    const isPin = type === 'pin' || type === 'recommended'
    const isPhoto = type === 'photo'
    const isVideo = type === 'video'
    const isPending = item.isPending === true

    // PENDING PIN CARD - Simple design with no photos
    if (isPending) {
      return (
        <div 
          key={item.id} 
          onClick={() => onPinSelect(item)}
          style={{
            background: 'rgba(255,255,255,0.08)',
            padding: '18px',
            borderRadius: '16px',
            border: '2px dashed rgba(255,255,255,0.3)',
            backdropFilter: 'blur(15px)',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            cursor: 'pointer',
            opacity: 0.9,
            position: 'relative' // For absolute positioning of delete button
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Empty placeholder - no photo */}
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              border: '2px dashed rgba(255,255,255,0.3)',
              flexShrink: 0
            }}>
              📍
            </div>
            
            {/* Content area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                  PINNED
                </h4>
                <span style={{
                  background: 'rgba(255, 165, 0, 0.3)',
                  color: '#FFA500',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  border: '1px solid rgba(255, 165, 0, 0.5)'
                }}>
                  Pending
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} style={{ opacity: 0.7 }} />
                <span style={{ fontSize: '12px', opacity: 0.8 }}>
                  {new Date(item.timestamp).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          
          {/* Delete Button */}
          {onPinDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation() // Prevent card click
                if (confirm('Are you sure you want to delete this pin?')) {
                  onPinDelete(item.id)
                }
              }}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(239, 68, 68, 0.9)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                padding: '6px 10px',
                color: 'white',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease',
                zIndex: 10
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 1)'
                e.currentTarget.style.transform = 'scale(1.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)'
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
        </div>
      )
    }

    // COMPLETED PIN CARD - Full design with photos, title, description
    // Get first photo from additionalPhotos if available
    const firstPhoto = item.additionalPhotos && item.additionalPhotos.length > 0 
      ? item.additionalPhotos[0] 
      : null

    // Log image sources for debugging
    if (item.id) {
      console.log(`📚 Library pin image sources for ${item.title}:`, {
        hasMediaUrl: !!item.mediaUrl,
        hasAdditionalPhotos: !!(item.additionalPhotos && item.additionalPhotos.length > 0),
        additionalPhotosCount: item.additionalPhotos?.length || 0,
        firstPhotoUrl: firstPhoto?.url ? firstPhoto.url.substring(0, 50) + '...' : 'none',
        mediaUrlPreview: item.mediaUrl ? item.mediaUrl.substring(0, 50) + '...' : 'none'
      })
    }

    return (
      <div 
        key={item.id} 
        onClick={() => onPinSelect(item)}
        style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '18px',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.2)',
          backdropFilter: 'blur(15px)',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'stretch', gap: '12px', height: '100%' }}>
          {/* Thumbnail image - matches AI Recommendations style */}
          <div style={{
            width: '60px',
            height: '100%',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            border: '1px solid rgba(255,255,255,0.2)',
            overflow: 'hidden',
            flexShrink: 0,
            position: 'relative',
            minHeight: '60px' // Ensure minimum height for image container
          }}>
            {/* Priority: Direct mediaUrl from pin, then first photo from additionalPhotos */}
            {item.mediaUrl ? (
              <img
                src={item.mediaUrl}
                alt={item.title}
                loading="lazy"
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  display: 'block'
                }}
                onError={(e) => {
                  console.log('📚 Library image failed to load (mediaUrl):', item.mediaUrl?.substring(0, 50))
                  const target = e.target as HTMLImageElement
                  if (target) {
                    target.style.display = 'none'
                    // Show fallback
                    const container = target.parentElement
                    if (container) {
                      const fallback = container.querySelector('.image-fallback') as HTMLElement
                      if (fallback) fallback.style.display = 'flex'
                    }
                  }
                }}
                onLoad={() => {
                  console.log('📚 Library image loaded successfully (mediaUrl):', item.title)
                }}
              />
            ) : firstPhoto?.url ? (
              /* Priority 2: First photo from additionalPhotos array (carousel) */
              <img
                src={firstPhoto.url}
                alt={item.title}
                loading="lazy"
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  display: 'block'
                }}
                onError={(e) => {
                  console.log('📚 Library image failed to load (additionalPhotos):', firstPhoto.url?.substring(0, 50))
                  const target = e.target as HTMLImageElement
                  if (target) {
                    target.style.display = 'none'
                    const container = target.parentElement
                    if (container) {
                      const fallback = container.querySelector('.image-fallback') as HTMLElement
                      if (fallback) fallback.style.display = 'flex'
                    }
                  }
                }}
                onLoad={() => {
                  console.log('📚 Library image loaded successfully (additionalPhotos):', item.title)
                }}
              />
            ) : null}
            
            {/* Fallback display - shown when no image loads or no image URL available */}
            <div 
              className="image-fallback"
              style={{
                display: item.mediaUrl || firstPhoto?.url ? 'none' : 'flex',
                width: '100%',
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                position: item.mediaUrl || firstPhoto?.url ? 'absolute' : 'relative',
                top: 0,
                left: 0,
                background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)'
              }}
            >
              {isPin && '📍'}
              {isPhoto && '📸'}
              {isVideo && '🎥'}
              {type === 'recommended' && '⭐'}
            </div>
            
            {/* Type Badge */}
            {isVideo && (
              <div style={{
                position: "absolute",
                top: "4px",
                right: "4px",
                background: "rgba(0,0,0,0.7)",
                color: "white",
                fontSize: "0.75rem",
                padding: "2px 4px",
                borderRadius: "4px",
                zIndex: 10
              }}>
                ▶
              </div>
            )}
          </div>
          
          {/* Content area - matches AI Recommendations style */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            {/* Top section - Title */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', flex: 1 }}>
                {getDisplayTitle(item)}
              </h4>
            </div>
            
            {/* Location */}
            <span style={{
              background: 'rgba(255,255,255,0.1)',
              padding: '4px 8px',
              borderRadius: '8px',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.8)',
              alignSelf: 'flex-start',
              marginBottom: '8px'
            }}>
              📍 {item.locationName}
            </span>
          </div>
        </div>
        
        {/* Description */}
        {item.description && (
          <p style={{ margin: '0 0 12px 0', fontSize: '14px', opacity: 0.9, lineHeight: '1.5' }}>
            {item.description}
          </p>
        )}
        
        {/* Personal Thoughts */}
        {item.personalThoughts && (
          <p style={{ margin: '0 0 12px 0', fontSize: '13px', opacity: 0.8, fontStyle: 'italic', lineHeight: '1.5' }}>
            💭 "{item.personalThoughts}"
          </p>
        )}
        
        {/* Bottom section - Date and Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '11px', opacity: 0.8, whiteSpace: 'nowrap' }}>
              <Calendar size={12} style={{ display: "inline", marginRight: "4px" }} />
              {new Date(item.timestamp).toLocaleDateString()}
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            <button 
              onClick={(e) => {
                e.stopPropagation()
                onPinSelect(item)
              }}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '6px',
                padding: '4px 8px',
                color: 'white',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
              }}
            >
              📍 View
            </button>
          </div>
        </div>
        
        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '0.25rem', marginTop: '8px', flexWrap: 'wrap' }}>
            {item.tags.slice(0, 3).map((tag: string, index: number) => (
              <span
                key={index}
                style={{
                  fontSize: '11px',
                  background: 'rgba(255,255,255,0.1)',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  color: 'rgba(255,255,255,0.8)'
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
      display: "flex",
      flexDirection: "column",
      color: "white",
      zIndex: 1000
    }}>
      {/* Header */}
      <div style={{
        padding: "1rem",
        background: "rgba(30, 58, 138, 0.95)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backdropFilter: "blur(15px)",
        borderBottom: "1px solid rgba(255,255,255,0.2)",
      }}>
        <button
          onClick={onBack}
          style={{
            background: "rgba(255,255,255,0.15)",
            color: "white",
            padding: "0.75rem",
            borderRadius: "0.75rem",
            border: "1px solid rgba(255,255,255,0.2)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "all 0.2s ease",
            backdropFilter: "blur(10px)",
          }}
        >
          <ArrowLeft size={20} />
          Back
        </button>
        
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.125rem", fontWeight: "600" }}>PINIT Library</span>
        </div>

        <div style={{ width: "40px" }}></div>
      </div>

      {/* Tab Navigation */}
      <div style={{ padding: "1rem", background: "rgba(30, 58, 138, 0.95)", backdropFilter: "blur(15px)", borderBottom: "1px solid rgba(255,255,255,0.2)" }}>
        <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1rem" }}>
          {[
            { id: "pins", label: "Pins", icon: "📍" },
            { id: "photos", label: "Photos", icon: "📸" },
            { id: "videos", label: "Videos", icon: "🎥" },
            { id: "recommended", label: "Recommended", icon: "⭐" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id as any)}
              style={{
                flex: 1,
                padding: "0.75rem 0.5rem",
                borderRadius: "0.75rem",
                border: "1px solid rgba(255,255,255,0.2)",
                background: currentTab === tab.id ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
                color: "white",
                cursor: "pointer",
                fontSize: "0.875rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.25rem",
                transition: "all 0.2s ease",
                backdropFilter: "blur(10px)",
              }}
            >
              <span style={{ fontSize: "1.25rem" }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", opacity: 0.6 }} />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem 0.75rem 0.75rem 2.5rem",
                borderRadius: "0.75rem",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.15)",
              color: "white",
                fontSize: "0.875rem",
                backdropFilter: "blur(10px)",
            }}
          />
        </div>
      </div>

      {/* Content Grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
        {filteredData.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", opacity: 0.7 }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
              {currentTab === "photos" ? "📸" : 
               currentTab === "videos" ? "🎥" : 
               currentTab === "recommended" ? "⭐" : "📍"}
            </div>
            <h3>No {currentTab} found</h3>
            <p>Create your first {currentTab.slice(0, -1)} to get started!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {filteredData.map((item) => renderPinCard(item, 
              currentTab === "pins" ? "pin" : 
              currentTab === "photos" ? "photo" : 
              currentTab === "videos" ? "video" : 
              "recommended"
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
