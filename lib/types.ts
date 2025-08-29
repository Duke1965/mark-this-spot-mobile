// Centralized Types for PINIT
// All TypeScript interfaces and type definitions

// Core Data Types
export interface PinData {
  id: string
  latitude: number
  longitude: number
  title?: string
  locationName: string
  description?: string
  tags?: string[]
  mediaUrl?: string
  mediaType?: MediaType
  timestamp: string
  isRecommended?: boolean
  isAISuggestion?: boolean
  aiGenerated?: boolean
  
  // Pin Management System fields
  placeId?: string
  category?: string
  score?: number
  totalEndorsements?: number
  recentEndorsements?: number
  downvotes?: number
  lastEndorsedAt?: string
  
  // Social features
  rating?: number
  reviews?: UserReview[]
  sharedCount?: number
  
  // Metadata
  _lastSaved?: string
  _version?: string
}

export type MediaType = "photo" | "video"

export interface LocationData {
  latitude: number
  longitude: number
  name: string
  accuracy?: number
  timestamp: string
}

export interface UserReview {
  id: string
  userId: string
  rating: number
  comment: string
  timestamp: string
  helpful: number
}

// UI Component Props
export interface ScreenProps {
  onBack: () => void
  onComplete?: () => void
}

export interface PinProps {
  pin: PinData
  onSelect?: (pin: PinData) => void
  onEdit?: (pin: PinData) => void
  onDelete?: (pinId: string) => void
}

// Authentication Types
export interface User {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

export interface UserProfile {
  name: string
  email: string
  avatar: string
  homeLocation: string
  theme: 'light' | 'dark'
  socialAccounts: {
    instagram: string
    twitter: string
    facebook: string
    whatsapp: string
    tiktok: string
    linkedin: string
    youtube: string
  }
  preferences: {
    shareByDefault: boolean
    autoTag: boolean
    locationSharing: boolean
    publicProfile: boolean
  }
}

// AI & ML Types
export interface UserBehavior {
  id: string
  type: 'pin_created' | 'pin_shared' | 'place_visited' | 'photo_taken' | 'search_performed'
  data: any
  timestamp: string
  location?: { latitude: number; longitude: number }
  context?: string
}

export interface UserPreferences {
  categories: string[]
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  socialActivity: 'low' | 'medium' | 'high'
  explorationStyle: 'planned' | 'spontaneous' | 'mixed'
  contentStyle: 'minimal' | 'detailed' | 'visual'
  sharingFrequency: 'never' | 'sometimes' | 'often' | 'always'
  
  // AI recommendation preferences
  similarToLikes: number // 0-1 scale
  discoveryMode: number // 0-1 scale
  locationAccuracy: number // 0-1 scale
}

export interface AIInsights {
  personality: {
    adventurous: number
    social: number
    cultural: number
    foodie: number
    photographer: number
    explorer: number
    planner: number
    spontaneous: number
  }
  confidence: number
  lastUpdated: string
  behaviorCount: number
}

export interface Recommendation {
  id: string
  title: string
  description: string
  category: string
  location: {
    lat: number
    lng: number
  }
  rating: number
  isAISuggestion: boolean
  confidence: number
  reason: string
  timestamp: Date
  fallbackImage?: string
  photoReference?: string
}

// Data Management Types
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface DataIssue {
  type: 'corruption' | 'migration' | 'duplicate' | 'orphan' | 'format'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  pin?: PinData
  fixable: boolean
}

export interface SyncResult {
  success: boolean
  synced: number
  conflicts: number
  errors: string[]
}

export interface DataConflict {
  localPin: PinData
  remotePin: PinData
  conflictType: 'timestamp' | 'content' | 'duplicate'
}

// API Types
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
  photos?: Array<{
    photo_reference: string
    height: number
    width: number
  }>
  types: string[]
  vicinity?: string
}

export interface GooglePhoto {
  photo_reference: string
  url: string
  width: number
  height: number
}

// Social Platform Types
export interface SocialPlatform {
  id: string
  name: string
  icon: any
  color: string
  template: string
  maxLength: number
  shareUrl?: (mediaUrl: string, caption: string) => string
}

export interface SocialAccount {
  instagram: string
  twitter: string
  facebook: string
  whatsapp?: string
  tiktok?: string
  linkedin?: string
}

// Map & Location Types
export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface ClusteredPin {
  id: string
  location: { lat: number; lng: number }
  count: number
  pins: PinData[]
}

// System Configuration Types
export interface AppState {
  currentScreen: string
  lastActivity: string
  settings: {
    theme: 'light' | 'dark'
    notifications: boolean
    locationSharing: boolean
  }
}

// Error Types
export interface AppError {
  code: string
  message: string
  timestamp: string
  context?: any
}

// Event Types
export type AppEvent = 
  | { type: 'pin_created'; data: PinData }
  | { type: 'location_updated'; data: LocationData }
  | { type: 'error_occurred'; data: AppError }
  | { type: 'user_action'; data: { action: string; context?: any } } 
