// Shared Types for PINIT
// Centralized type definitions to avoid circular dependencies

export interface PinData {
  id: string
  latitude: number
  longitude: number
  locationName: string
  mediaUrl: string | null
  mediaType: "photo" | "video" | null
  audioUrl: string | null
  timestamp: string
  title: string
  description?: string
  tags?: string[]
  isRecommended?: boolean
  googlePlaceId?: string
  rating?: number
  priceLevel?: number
  types?: string[]
  isAISuggestion?: boolean
  additionalPhotos?: Array<{ url: string; placeName: string }>
  personalThoughts?: string
  originalPinId?: string
  placeId?: string
  totalEndorsements?: number
  recentEndorsements?: number
  lastEndorsedAt?: string
  score?: number
  downvotes?: number
  isHidden?: boolean
  category?: string
  stickers?: Array<{
    id: string
    name: string
    x: number
    y: number
    scale: number
    rotation: number
  }>
  platform?: string
  isPending?: boolean // NEW: True if pin needs location confirmation (created while traveling)
  isViewed?: boolean // NEW: True if pending pin has been viewed/opened by user
  // AI generation metadata
  aiConfidence?: "high" | "medium" | "low"
  aiUsedFallback?: boolean
  aiGeneratedAt?: string
}

export interface GooglePlace {
  place_id: string
  name: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  rating?: number
  price_level?: number
  types: string[]
  vicinity?: string
  photos?: Array<{
    photo_reference: string
    height: number
    width: number
  }>
}

export interface Recommendation {
  id: string
  type: string
  title: string
  description: string
  action: string
  data?: any
  priority: number
  color: string
  isAISuggestion?: boolean
  timestamp: number
  category: string
  isCompleted?: boolean
}

export interface LocationData {
  latitude: number
  longitude: number
  accuracy?: number
  timestamp: number
  speed?: number
  heading?: number
} 
