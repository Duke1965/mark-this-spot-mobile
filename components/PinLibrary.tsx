"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Search, Filter, Plus, Share2, Edit3, Trash2, Camera, Video, MapPin, Star, Calendar } from "lucide-react"
import type { PinData } from "@/lib/types"
import { MyPostcardsPanel } from "@/app/postcard/library/my-postcards-panel"
import { resolvePinContext, resolveTitleFallback } from "@/lib/pinText"
import { openGoogleMapsNavigation } from "@/lib/openGoogleMapsNavigation"
import {
  mappoBackButtonAbsoluteStyle,
  mappoHeaderBarStyle,
  mappoTitleImageStyle,
} from "@/lib/mappoHeaderStyles"

const POSTCARD_DRAFT_KEY = "pinit-postcard-draft-v1"
const ALLOWED_DRAFT_TEMPLATES = new Set(["template-1", "template-2", "template-3", "template-4"])

type LocalPostcardDraft = {
  template: string
  imageUrl?: string
  noPhoto?: boolean
  message?: string
  source?: "camera" | "gallery"
}

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
  const [currentTab, setCurrentTab] = useState<"pins" | "postcards" | "recommended">("pins")
  const [localDraft, setLocalDraft] = useState<LocalPostcardDraft | null>(null)

  const readLocalDraft = () => {
    try {
      if (typeof window === "undefined") return null
      const raw = sessionStorage.getItem(POSTCARD_DRAFT_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as any
      const template = typeof parsed?.template === "string" ? parsed.template.trim() : ""
      if (!ALLOWED_DRAFT_TEMPLATES.has(template)) return null
      const hasImage = typeof parsed?.imageUrl === "string" && parsed.imageUrl.length > 20
      const hasNoPhoto = typeof parsed?.noPhoto === "boolean" && parsed.noPhoto === true
      if (!hasImage && !hasNoPhoto) return null
      const draft: LocalPostcardDraft = {
        template,
        ...(hasImage ? { imageUrl: String(parsed.imageUrl) } : null),
        ...(typeof parsed?.noPhoto === "boolean" ? { noPhoto: parsed.noPhoto } : null),
        ...(typeof parsed?.message === "string" ? { message: String(parsed.message) } : null),
        ...(parsed?.source === "camera" || parsed?.source === "gallery" ? { source: parsed.source } : null),
      }
      return draft
    } catch {
      return null
    }
  }

  useEffect(() => {
    // Keep this local-only; drafts live in sessionStorage.
    if (currentTab !== "postcards") return
    setLocalDraft(readLocalDraft())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab])

  const draftThumbSrc = useMemo(() => {
    const url = localDraft?.imageUrl
    if (typeof url !== "string") return null
    // Avoid rendering extremely large base64 URLs in the library list.
    if (url.startsWith("data:image/") && url.length < 350_000) return url
    return null
  }, [localDraft?.imageUrl])

  const resumeDraft = () => {
    const t = localDraft?.template
    if (!t) return
    try {
      window.location.href = `/postcard/editor?template=${encodeURIComponent(t)}`
    } catch {
      // ignore
    }
  }

  const discardDraft = () => {
    try {
      sessionStorage.removeItem(POSTCARD_DRAFT_KEY)
    } catch {
      // ignore
    }
    setLocalDraft(null)
  }

  // Match the Recommendations list button styling.
  const removeBtnStyle: React.CSSProperties = {
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '6px',
    padding: '4px 8px',
    color: '#b91c1c',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px'
  }

  const getTabData = () => {
    console.log("🔍 Current tab:", currentTab, "Total pins:", pins.length)
    console.log("📌 Sample pins:", pins.slice(0, 2))
    
    switch (currentTab) {
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

  const renderPinCard = (item: any, type: "pin" | "recommended") => {
    if (!item || !item.id) return null

    const isPin = type === 'pin' || type === 'recommended'
    const isPending = item.isPending === true

    // PENDING PIN CARD - Simple design with no photos
    if (isPending) {
      return (
        <div 
          key={item.id} 
          onClick={() => onPinSelect(item)}
          style={{
            background: 'rgba(255,255,255,0.72)',
            padding: '18px',
            borderRadius: '16px',
            border: '2px dashed rgba(79,59,43,0.18)',
            backdropFilter: 'blur(12px)',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            cursor: 'pointer',
            opacity: 0.9,
            display: 'flex',
            flexDirection: 'column',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.85)'
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.72)'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Empty placeholder - no photo */}
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '12px',
              background: 'rgba(79,59,43,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              border: '2px dashed rgba(79,59,43,0.15)',
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
                  background: 'rgba(239, 68, 68, 0.18)',
                  color: '#EF4444',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  border: '1px solid rgba(239, 68, 68, 0.35)'
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
          
          {/* Date line */}
          <div style={{ marginTop: 12, fontSize: '12px', opacity: 0.8 }}>
            {new Date(item.timestamp).toLocaleDateString()}
          </div>

          {/* Bottom row: left tags (none for pending), right actions */}
          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 }}>
            <div />
            <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  openGoogleMapsNavigation({
                    latitude: item.latitude,
                    longitude: item.longitude,
                    placeName: item.locationName?.trim() || getDisplayTitle(item),
                  })
                }}
                style={{
                  background: "rgba(79,59,43,0.08)",
                  border: "1px solid rgba(79,59,43,0.15)",
                  borderRadius: "6px",
                  padding: "4px 8px",
                  color: "#4f3b2b",
                  fontSize: "11px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(79,59,43,0.15)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(79,59,43,0.08)"
                }}
              >
                Go there
              </button>
              {onPinDelete ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm("Remove this pin from your library?")) {
                      onPinDelete(item.id)
                    }
                  }}
                  style={removeBtnStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(239, 68, 68, 0.28)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(239, 68, 68, 0.18)"
                  }}
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              ) : null}
            </div>
          </div>
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
          background: 'rgba(255,255,255,0.78)',
          padding: '18px',
          borderRadius: '16px',
          border: '1px solid rgba(79,59,43,0.1)',
          backdropFilter: 'blur(12px)',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.9)'
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.1)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.78)'
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
        }}
      >
        {/* Card content */}
        <div style={{ display: 'flex', alignItems: 'stretch', gap: '12px' }}>
          {/* Thumbnail image - matches AI Recommendations style */}
          <div style={{
            width: '60px',
            height: '100%',
            borderRadius: '12px',
            background: 'rgba(79,59,43,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            border: '1px solid rgba(79,59,43,0.1)',
            overflow: 'hidden',
            flexShrink: 0,
            position: 'relative',
            minHeight: '60px'
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
                background: 'rgba(79,59,43,0.08)'
              }}
            >
              {type === "recommended" ? "⭐" : "📍"}
            </div>
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
              background: 'rgba(79,59,43,0.08)',
              padding: '4px 8px',
              borderRadius: '8px',
              fontSize: '11px',
              color: 'rgba(79,59,43,0.7)',
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
            💭 &quot;{item.personalThoughts}&quot;
          </p>
        )}
        
        {/* Date line */}
        <div style={{ marginTop: 8, fontSize: '11px', opacity: 0.8, whiteSpace: 'nowrap' }}>
          <Calendar size={12} style={{ display: "inline", marginRight: "4px" }} />
          {new Date(item.timestamp).toLocaleDateString()}
        </div>

        {/* Bottom row: left tags, right actions (sits at bottom of card) */}
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {(item.tags && item.tags.length > 0 ? item.tags.slice(0, 3) : []).map((tag: string, index: number) => (
              <span
                key={index}
                style={{
                  fontSize: '11px',
                  background: 'rgba(79,59,43,0.08)',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  color: 'rgba(79,59,43,0.65)'
                }}
              >
                #{tag}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onPinSelect(item)
              }}
              style={{
                background: 'rgba(79,59,43,0.08)',
                border: '1px solid rgba(79,59,43,0.15)',
                borderRadius: '6px',
                padding: '4px 8px',
                color: '#4f3b2b',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(79,59,43,0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(79,59,43,0.08)'
              }}
            >
              📍 View
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                openGoogleMapsNavigation({
                  latitude: item.latitude,
                  longitude: item.longitude,
                  placeName: item.locationName?.trim() || getDisplayTitle(item),
                })
              }}
              style={{
                background: 'rgba(79,59,43,0.08)',
                border: '1px solid rgba(79,59,43,0.15)',
                borderRadius: '6px',
                padding: '4px 8px',
                color: '#4f3b2b',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(79,59,43,0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(79,59,43,0.08)'
              }}
            >
              Go there
            </button>

            {onPinDelete ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('Remove this pin from your library?')) {
                    onPinDelete(item.id)
                  }
                }}
                style={removeBtnStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.28)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)'
                }}
              >
                <Trash2 size={14} />
                Remove
              </button>
            ) : null}
          </div>
        </div>
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
      backgroundImage: "url(/brand/mappo/mappo-library-bg.png)",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundColor: "#eef8f4",
      display: "flex",
      flexDirection: "column",
      color: "#3a2e1e",
      zIndex: 1000
    }}>
      {/* Header */}
      <div style={mappoHeaderBarStyle}>
        <button type="button" onClick={onBack} style={mappoBackButtonAbsoluteStyle}>
          <ArrowLeft size={20} />
          Back
        </button>
        <img
          src="/brand/mappo/mappo-library-title.png"
          alt="Library"
          style={mappoTitleImageStyle}
        />
      </div>

      {/* Tab Navigation */}
      <div style={{ padding: "1rem", background: "rgba(255,255,255,0.6)", backdropFilter: "blur(18px)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1rem" }}>
          <button
            onClick={() => setCurrentTab("pins")}
            style={{
              flex: 1,
              padding: "0.75rem 0.5rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(79,59,43,0.12)",
              background: currentTab === "pins" ? "rgba(79,59,43,0.12)" : "rgba(255,255,255,0.5)",
              color: "#4f3b2b",
              cursor: "pointer",
              fontSize: "0.875rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.25rem",
              transition: "all 0.2s ease",
            }}
            type="button"
          >
            <span style={{ fontSize: "1.25rem" }}>📍</span>
            <span>Pins</span>
          </button>

          <button
            onClick={() => setCurrentTab("postcards")}
            style={{
              flex: 1,
              padding: "0.75rem 0.5rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(79,59,43,0.12)",
              background: currentTab === "postcards" ? "rgba(79,59,43,0.12)" : "rgba(255,255,255,0.5)",
              color: "#4f3b2b",
              cursor: "pointer",
              fontSize: "0.875rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.25rem",
              transition: "all 0.2s ease",
            }}
            type="button"
          >
            <span style={{ fontSize: "1.25rem" }}>💌</span>
            <span>My Postcards</span>
          </button>

          <button
            onClick={() => setCurrentTab("recommended")}
            style={{
              flex: 1,
              padding: "0.75rem 0.5rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(79,59,43,0.12)",
              background: currentTab === "recommended" ? "rgba(79,59,43,0.12)" : "rgba(255,255,255,0.5)",
              color: "#4f3b2b",
              cursor: "pointer",
              fontSize: "0.875rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.25rem",
              transition: "all 0.2s ease",
            }}
            type="button"
          >
            <span style={{ fontSize: "1.25rem" }}>⭐</span>
            <span>Recommended</span>
          </button>
        </div>

        {/* Search (pins and recommended only) */}
        {currentTab !== "postcards" ? (
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
                border: "1px solid rgba(79,59,43,0.12)",
                background: "rgba(255,255,255,0.55)",
                color: "#3a2e1e",
                fontSize: "0.875rem",
              }}
            />
          </div>
        ) : null}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
        {currentTab === "postcards" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {localDraft ? (
              <div style={{ width: "min(520px, 100%)", margin: "0 auto" }}>
                <div style={{ fontWeight: 950, fontSize: "0.95rem", marginBottom: 8, opacity: 0.92 }}>Drafts</div>
                <div
                  style={{
                    background: "rgba(255,255,255,0.82)",
                    border: "1px solid rgba(79,59,43,0.12)",
                    borderRadius: 16,
                    padding: 12,
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 82,
                      height: 56,
                      borderRadius: 12,
                      overflow: "hidden",
                      position: "relative",
                      background: "rgba(0,0,0,0.06)",
                      border: "1px solid rgba(79,59,43,0.1)",
                      flexShrink: 0,
                    }}
                  >
                    {draftThumbSrc ? (
                      <img
                        src={draftThumbSrc}
                        alt=""
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                        draggable={false}
                      />
                    ) : null}
                    <img
                      src={`/postcards/${localDraft.template}.png`}
                      alt=""
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", opacity: 0.95 }}
                      draggable={false}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 950, fontSize: "1.02rem" }}>Postcard Draft</div>
                    <div style={{ opacity: 0.78, marginTop: 4, lineHeight: 1.25 }}>You have an unfinished postcard.</div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={resumeDraft}
                      style={{
                        background: "rgba(79,59,43,0.1)",
                        border: "1px solid rgba(79,59,43,0.15)",
                        borderRadius: 12,
                        padding: "0.55rem 0.7rem",
                        color: "#4f3b2b",
                        fontSize: "0.85rem",
                        fontWeight: 950,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Resume Draft
                    </button>
                    <button
                      type="button"
                      onClick={discardDraft}
                      style={{
                        background: "rgba(239, 68, 68, 0.12)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        borderRadius: 12,
                        padding: "0.5rem 0.7rem",
                        color: "#b91c1c",
                        fontSize: "0.82rem",
                        fontWeight: 900,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Discard Draft
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <MyPostcardsPanel />
          </div>
        ) : filteredData.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", opacity: 0.7 }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
              {currentTab === "recommended" ? "⭐" : "📍"}
            </div>
            <h3>No {currentTab === "recommended" ? "recommendations" : "pins"} found</h3>
            <p>{currentTab === "recommended" ? "Check back later for new recommendations." : "Create your first pin to get started!"}</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            {filteredData.map((item) => renderPinCard(item, currentTab === "recommended" ? "recommended" : "pin"))}
          </div>
        )}
      </div>
    </div>
  )
}
