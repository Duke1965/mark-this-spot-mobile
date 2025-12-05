"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAIBehaviorTracker } from '../hooks/useAIBehaviorTracker'
import { useLocationServices } from '../hooks/useLocationServices'
import { usePinStorage } from '../hooks/usePinStorage'
import { RecommendationForm } from './RecommendationForm'
import { FsqImage } from './FsqImage'
import type { PinData } from '../lib/types'

// Google Maps global declaration
declare global {
  interface Window {
    google: any
  }
}

// CSS to override Google Maps InfoWindow default styling
const infoWindowStyles = `
  .gm-style .gm-style-iw-c {
    background: transparent !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    padding: 0 !important;
  }
  
  .gm-style .gm-style-iw-d {
    background: transparent !important;
    border: none !important;
    overflow: hidden !important;
  }
  
  .gm-style .gm-style-iw-t::after {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }
  
  .gm-style .gm-style-iw-t::before {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }
`

interface Recommendation {
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
  fallbackImage?: string // NEW: Fallback emoji when no Google photo available
  mediaUrl?: string // NEW: Image URL from Foursquare
  photoUrl?: string // Foursquare direct photo URL
  fsq_id?: string // Foursquare place ID
}

interface ClusteredPin {
  id: string
  location: { lat: number; lng: number }
  count: number
  recommendations: Recommendation[]
  category: string
}

interface AIRecommendationsHubProps {
  onBack: () => void
  userLocation?: any
  // NEW: Receive recommendations from parent component
  initialRecommendations?: Recommendation[]
  // Pin editing props
  editingPin?: any
  editingPinLocation?: { lat: number; lng: number } | null
  onPinLocationUpdate?: (lat: number, lng: number) => void
  onPinEditDone?: () => void
  onPinEditCancel?: () => void
}

export default function AIRecommendationsHub({ 
  onBack, 
  userLocation, 
  initialRecommendations,
  editingPin,
  editingPinLocation,
  onPinLocationUpdate,
  onPinEditDone,
  onPinEditCancel
}: AIRecommendationsHubProps) {
  const [viewMode, setViewMode] = useState<"map" | "list" | "insights">("map")
  const { insights, getLearningStatus, getPersonalizedRecommendations } = useAIBehaviorTracker()
  const { location: hookLocation, watchLocation, getCurrentLocation } = useLocationServices()
  const { addPin } = usePinStorage()
  const [learningProgress, setLearningProgress] = useState<any>(null)
  const [selectedRecommendation, setSelectedRecommendation] = useState<any>(null)
  const [showReadOnlyRecommendation, setShowReadOnlyRecommendation] = useState(false)
  const [showRecommendationForm, setShowRecommendationForm] = useState(false)
  const [recommendationFormData, setRecommendationFormData] = useState<{
    mediaUrl: string
    locationName: string
    foursquareData?: {
      placeName: string | null
      description: string | null
      latitude: number
      longitude: number
    }
  } | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  
  // NEW: Add ref to track the user location marker
  const userLocationMarkerRef = useRef<any>(null)
  
  // Inject CSS to override Google Maps InfoWindow styling
  useEffect(() => {
    const styleElement = document.createElement('style')
    styleElement.textContent = infoWindowStyles
    document.head.appendChild(styleElement)
    
    return () => {
      document.head.removeChild(styleElement)
    }
  }, [])
  
  // Use passed userLocation if available, otherwise fall back to hook location
  const location = userLocation || hookLocation
  
  // Initialize component when location becomes available
  useEffect(() => {
    if (location && location.latitude && location.longitude && !isInitialized) {
      console.log('🧠 AIRecommendationsHub: Initializing with location:', location)
      setIsInitialized(true)
    }
  }, [location, isInitialized])
  
  // Map states - use useRef for stable references
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const [isMapLoading, setIsMapLoading] = useState(true)
  const [mapError, setMapError] = useState<string | null>(null)
  
  // NEW: Track map state to prevent unwanted centering
  const [mapInitialized, setMapInitialized] = useState(false)
  const [userHasInteracted, setUserHasInteracted] = useState(false)
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | null>(null)
  const [mapZoom, setMapZoom] = useState(16)
  
  // AI Recommendations
  const [recommendations, setRecommendations] = useState<Recommendation[]>(initialRecommendations || [])
  const [clusteredPins, setClusteredPins] = useState<ClusteredPin[]>([])
  
  // NEW: Load cached recommendations - will be defined after getLocationCacheKey and clusterPins
  
  // NEW: State for filtered recommendations when viewing a specific cluster
  const [filteredRecommendations, setFilteredRecommendations] = useState<Recommendation[]>([])
  const [isShowingCluster, setIsShowingCluster] = useState(false)
  const [currentCluster, setCurrentCluster] = useState<ClusteredPin | null>(null)
  
  // NEW: State for filtering by User vs AI recommendations
  const [recommendationFilter, setRecommendationFilter] = useState<"all" | "user" | "ai">("all")
  
  // Helper function to categorize places based on their types (must be defined before functions that use it)
  const getCategoryFromTypes = useCallback((types: string[]): string => {
    if (types.includes('restaurant') || types.includes('cafe') || types.includes('food')) {
      return 'Food & Dining'
    } else if (types.includes('park') || types.includes('natural_feature')) {
      return 'Nature & Parks'
    } else if (types.includes('museum') || types.includes('art_gallery') || types.includes('tourist_attraction')) {
      return 'Culture & Arts'
    } else if (types.includes('shopping_mall') || types.includes('store')) {
      return 'Shopping'
    } else {
      return 'Location Discovery'
    }
  }, [])
  
  // NEW: Request management to prevent duplicate API calls
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastRequestParamsRef = useRef<{lat: number, lng: number, timestamp: number} | null>(null)
  
  // NEW: Location-based recommendation cache for consistency
  const recommendationCacheRef = useRef<Map<string, { recommendations: Recommendation[], timestamp: number }>>(new Map())
  
  // Helper to create cache key from location (rounded to ~500m precision for consistency)
  const getLocationCacheKey = useCallback((lat: number, lng: number): string => {
    // Round to ~500m precision (0.0045 degrees ≈ 500m)
    const roundedLat = Math.round(lat / 0.0045) * 0.0045
    const roundedLng = Math.round(lng / 0.0045) * 0.0045
    return `${roundedLat.toFixed(4)},${roundedLng.toFixed(4)}`
  }, [])
  
  // NEW: Enhanced motion detection state with throttling
  const [isUserMoving, setIsUserMoving] = useState(false)
  const [lastMotionCheck, setLastMotionCheck] = useState(Date.now())
  const [lastLocationUpdate, setLastLocationUpdate] = useState(Date.now())
  
  // NEW: Function to get the appropriate marker icon based on motion
  const getMarkerIcon = useCallback((isMoving: boolean) => {
    if (isMoving) {
      // Car icon when moving
      return {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="#10b981" stroke="white" stroke-width="3"/>
            <path d="M8 20 L24 20 L22 16 L10 16 Z" fill="white"/>
            <circle cx="12" cy="22" r="2" fill="#10b981"/>
            <circle cx="20" cy="22" r="2" fill="#10b981"/>
            <path d="M14 14 L18 14 L17 12 L15 12 Z" fill="#10b981"/>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(32, 32),
        anchor: new window.google.maps.Point(16, 16)
      }
    } else {
      // Pin icon when stationary
      return {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="#10b981" stroke="white" stroke-width="3"/>
            <circle cx="16" cy="16" r="6" fill="white"/>
            <text x="16" y="20" text-anchor="middle" fill="#10b981" font-size="12" font-weight="bold">📍</text>
          </svg>
        `),
        scaledSize: new window.google.maps.Size(32, 32),
        anchor: new window.google.maps.Point(16, 16)
      }
    }
  }, [])

  // NEW: Throttled location updates with dynamic icon
  useEffect(() => {
    if (!location || !location.latitude || !location.longitude || !isInitialized) return
    
    const now = Date.now()
    const timeSinceLastUpdate = now - lastLocationUpdate
    
    // Only update location every 300ms (3.3 times per second) for smooth movement
    if (timeSinceLastUpdate >= 300) {
      setLastLocationUpdate(now)
      
      // Update user location marker with smooth movement and dynamic icon
      if (mapInstanceRef.current && userLocationMarkerRef.current) {
        const newPosition = { lat: location.latitude, lng: location.longitude }
        
        // Update marker position
        userLocationMarkerRef.current.setPosition(newPosition)
        
        // Update marker icon based on motion state
        const newIcon = getMarkerIcon(isUserMoving)
        userLocationMarkerRef.current.setIcon(newIcon)
        
        // Pan map to keep marker centered (smooth pan)
        mapInstanceRef.current.panTo(newPosition)
        
        console.log('🗺️ Smooth location update:', newPosition, isUserMoving ? '🚗 Moving' : ' Stationary')
      }
    }
  }, [location, lastLocationUpdate, isUserMoving, getMarkerIcon, isInitialized])

  // NEW: Motion detection with reduced frequency
  useEffect(() => {
    if (!location || !location.latitude || !location.longitude || !isInitialized) return
    
    const checkMotion = () => {
      const now = Date.now()
      const timeSinceLastCheck = now - lastMotionCheck
      
      // Check motion every 2 seconds instead of 1 second
      if (timeSinceLastCheck >= 2000) {
        const speed = location.speed || 0
        const isMoving = speed > 1.5 // Use existing algorithm threshold
        
        setIsUserMoving(isMoving)
        setLastMotionCheck(now)
        
        if (isMoving) {
          console.log('🚗 Motion detected - speed:', speed.toFixed(2), 'm/s - Switching to car icon')
        } else {
          console.log('📍 User stationary - speed:', speed.toFixed(2), 'm/s - Switching to pin icon')
        }
      }
    }
    
    const motionInterval = setInterval(checkMotion, 2000)
    return () => clearInterval(motionInterval)
  }, [location, lastMotionCheck, isInitialized])

  // NEW: Real-time map centering during movement
  useEffect(() => {
    if (!mapInstanceRef.current || !location || !location.latitude || !location.longitude || !isInitialized) return
    
    // Only auto-center if user is moving and hasn't manually interacted with map
    if (isUserMoving && !userHasInteracted) {
      const newCenter = { lat: location.latitude, lng: location.longitude }
      
      // Smoothly pan to new location
      mapInstanceRef.current.panTo(newCenter)
      setMapCenter(newCenter)
      
      console.log('🗺️ Auto-centering map during movement to:', newCenter)
    }
  }, [location, isUserMoving, userHasInteracted, isInitialized])

  // NEW: Pin clustering function
  const clusterPins = useCallback((pins: Recommendation[]) => {
    const clusters: ClusteredPin[] = []
    const clusterRadius = 0.0005 // About 50 meters - smaller radius for tighter clustering
    
    // Filter out pins without valid locations
    const validPins = pins.filter((pin) => {
      if (!pin.location || !pin.location.lat || !pin.location.lng || 
          !isFinite(pin.location.lat) || !isFinite(pin.location.lng)) {
        console.warn('🧠 Skipping pin without valid location:', pin.title || pin.id)
        return false
      }
      return true
    })
    
    console.log(`🧠 Clustering ${validPins.length} valid pins (filtered ${pins.length - validPins.length} invalid)`)
    
    validPins.forEach((pin) => {
      let addedToCluster = false
      
      // Try to add to existing cluster
      for (const cluster of clusters) {
        const distance = Math.sqrt(
          Math.pow(pin.location.lat - cluster.location.lat, 2) +
          Math.pow(pin.location.lng - cluster.location.lng, 2)
        )
        
        if (distance < clusterRadius) {
          // Add to existing cluster
          cluster.recommendations.push(pin)
          cluster.count = cluster.recommendations.length
          
          // Update category if this pin has a different one
          if (pin.category && !cluster.category.includes(pin.category)) {
            cluster.category = cluster.category ? `${cluster.category}, ${pin.category}` : pin.category
          }
          
          addedToCluster = true
          break
        }
      }
      
      // Create new cluster if not added to existing one
      if (!addedToCluster) {
        clusters.push({
          id: `cluster-${pin.id}`,
          location: pin.location,
          count: 1,
          recommendations: [pin],
          category: pin.category || 'general'
        })
      }
    })
    
    console.log(`🧠 Clustered ${pins.length} pins into ${clusters.length} clusters`)
    return clusters
  }, [])

  // NEW: Function to fetch real place names from pin-intel gateway
  const fetchPlaceName = useCallback(async (lat: number, lng: number): Promise<{name: string, category: string, photoUrl?: string} | null> => {
    try {
      console.log('🧠 Fetching place name for coordinates:', lat, lng)
      
      // Call our pin-intel gateway
      const response = await fetch('/api/pinit/pin-intel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lat: lat,
          lng: lng,
          precision: 5
        })
      })
      
      if (!response.ok) {
        console.log('🧠 Pin-intel gateway error:', response.status)
        return null
      }
      
      const data = await response.json()
      console.log('🧠 Pin-intel gateway response:', data)
      
      if (data.places && data.places.length > 0) {
        const place = data.places[0] // Get the closest place
        return {
          name: place.name || data.geocode?.formatted || 'Unknown Place',
          category: place.categories?.[0] || 'general',
          photoUrl: data.imagery?.image_url || undefined
        }
      }
      
      // Fallback to just the geocoded address if no places found
      if (data.geocode?.formatted) {
        return {
          name: data.geocode.formatted,
          category: 'general',
          photoUrl: data.imagery?.image_url || undefined
        }
      }
      
      return null
    } catch (error) {
      console.log('🧠 Error fetching place name:', error)
      return null
    }
  }, [])

  // NEW: Fallback clipart system for when Google photos aren't available
  const getFallbackImage = useCallback((category: string): string => {
    const categoryMap: { [key: string]: string } = {
      // Food & Drink
      'restaurant': '🍽️',
      'cafe': '☕',
      'bar': '🍺',
      'bakery': '🥐',
      'food': '🍕',
      
      // Shopping
      'store': '🛍️',
      'shopping_mall': '🏬',
      'clothing_store': '👕',
      'jewelry_store': '💍',
      'book_store': '📚',
      
      // Entertainment
      'movie_theater': '🎬',
      'museum': '🏛️',
      'art_gallery': '🎨',
      'theater': '🎭',
      'amusement_park': '🎢',
      
      // Outdoor & Nature
      'park': '🌳',
      'natural_feature': '🏔️',
      'beach': '🏖️',
      'hiking_trail': '🥾',
      'garden': '🌺',
      
      // Health & Fitness
      'gym': '💪',
      'spa': '🧖‍♀️',
      'hospital': '🏥',
      'pharmacy': '💊',
      
      // Transportation
      'airport': '✈️',
      'train_station': '🚂',
      'bus_station': '🚌',
      'subway_station': '🚇',
      
      // Business & Services
      'bank': '🏦',
      'post_office': '📮',
      'library': '📖',
      'school': '🎓',
      'university': '🎓',
      
      // Accommodation
      'hotel': '🏨',
      'lodging': '🛏️',
      'campground': '⛺',
      
      // Default fallbacks
      'general': '📍',
      'adventure': '🗺️',
      'discovery': '🔍'
    }
    
    // Try to match the category, fall back to general if no match
    return categoryMap[category] || categoryMap['general']
  }, [])
  
  // Generate mock USER recommendations using REAL places from Foursquare API (different from AI mocks)
  const generateMockUserRecommendations = useCallback(async (lat: number, lng: number, signal?: AbortSignal): Promise<Recommendation[]> => {
    try {
      // Fetch real places from Foursquare API
      const response = await fetch('/api/foursquare-places', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lat: lat,
          lng: lng,
          radius: 5000, // 5km radius
          limit: 12 // Get more places to choose different ones from AI
        }),
        signal
      })

      if (signal?.aborted) {
        return []
      }

      if (response.ok) {
        const data = await response.json()
        const places = data.items || data.results || []
        
        if (places.length === 0) {
          return []
        }

        // DETERMINISTIC: Sort by ID and take places 4-7 (different from AI which takes 0-3)
        // This ensures AI and User mocks show different places
        const sortedPlaces = [...places].sort((a: any, b: any) => {
          const idA = a.fsq_id || a.id || a.place_id || ''
          const idB = b.fsq_id || b.id || b.place_id || ''
          return idA.localeCompare(idB)
        }).slice(4, 8) // Take different places than AI mocks

        return sortedPlaces.map((place: any, index: number) => {
          const placeLat = place.location?.lat || place.geometry?.location?.lat || lat
          const placeLng = place.location?.lng || place.geometry?.location?.lng || lng
          
          // Extract photo URL
          let photoUrl = place.photoUrl || place.mediaUrl
          if (!photoUrl && place.photos && Array.isArray(place.photos) && place.photos.length > 0) {
            const firstPhoto = place.photos[0]
            photoUrl = firstPhoto.url || firstPhoto.prefix || firstPhoto.href || firstPhoto.link
          }

          const category = place.category || getCategoryFromTypes(place.types || [])

          return {
            id: `mock-user-${place.fsq_id || place.id || index}`,
            title: place.title || place.name || "Local Place",
            description: place.description || 
              (place.category ? `A great ${place.category.toLowerCase()} spot recommended by the community` : 
               "A recommended location nearby"),
            category: category,
            location: {
              lat: placeLat,
              lng: placeLng,
            },
            rating: place.rating || 4.0,
            isAISuggestion: false, // User recommendations
            confidence: 0,
            reason: "Recommended by community members",
            timestamp: new Date(),
            photoUrl: photoUrl || undefined,
            mediaUrl: photoUrl || undefined,
            fallbackImage: photoUrl ? undefined : getFallbackImage(category.toLowerCase().split(' ')[0]),
            fsq_id: place.fsq_id || place.id || undefined
          }
        })
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return []
      }
      console.error('Error fetching mock user recommendations:', error)
    }
    
    return []
  }, [getFallbackImage, getCategoryFromTypes])
  
  // NEW: Get user recommendations from localStorage pins, with gradual mock fade-out
  const getUserRecommendations = useCallback(async (): Promise<Recommendation[]> => {
    try {
      const pinsJson = localStorage.getItem('pinit-pins') || '[]'
      const pins: any[] = JSON.parse(pinsJson)
      
      // Filter pins that are recommended by users (not AI)
      const userRecommendedPins = pins.filter(pin => 
        pin.isRecommended && !pin.isAISuggestion
      )
      
      // Convert pins to Recommendation format
      const realUserRecs = userRecommendedPins.map(pin => ({
        id: pin.id,
        title: pin.title || pin.locationName || "User Recommendation",
        description: pin.description || pin.personalThoughts || "A recommended place",
        category: pin.category || "general",
        location: {
          lat: pin.latitude,
          lng: pin.longitude
        },
        rating: pin.rating || 4.0,
        isAISuggestion: false, // User recommendations
        confidence: 0,
        reason: "Recommended by community",
        timestamp: new Date(pin.timestamp),
        photoUrl: pin.mediaUrl || undefined,
        mediaUrl: pin.mediaUrl || undefined,
        fallbackImage: pin.mediaUrl ? undefined : getFallbackImage(pin.category || "general")
      }))
      
      // GRADUAL FADE-OUT: Add mock user recommendations if we have few real ones
      // Get AI confidence to determine fade-out level
      const aiConfidence = insights.userPersonality?.confidence || 0
      const realRecCount = realUserRecs.length
      
      // Calculate how many mock recommendations to show based on confidence and real count
      // At confidence 0: show 4 mocks, at confidence 0.3: show 0 mocks
      // Also fade out if we have real recommendations
      let mockCount = 0
      if (realRecCount === 0 && aiConfidence < 0.3) {
        // Full mocks when no real recommendations and low confidence
        mockCount = Math.max(0, Math.floor(4 * (1 - (aiConfidence / 0.3))))
      } else if (realRecCount > 0 && realRecCount < 4) {
        // Partial mocks when we have some real recommendations
        mockCount = Math.max(0, 4 - realRecCount)
        // Further reduce based on confidence
        mockCount = Math.floor(mockCount * (1 - (aiConfidence / 0.3)))
      }
      
      if (mockCount > 0 && location && location.latitude && location.longitude) {
        // Fetch real places from Foursquare for mock user recommendations
        try {
          const mockUserRecs = await generateMockUserRecommendations(location.latitude, location.longitude)
          // Take only the number we need
          const selectedMocks = mockUserRecs.slice(0, mockCount)
          console.log(`👥 Adding ${selectedMocks.length} mock user recommendations (${realRecCount} real, confidence: ${aiConfidence.toFixed(2)})`)
          return [...realUserRecs, ...selectedMocks]
        } catch (error) {
          console.error('Error fetching mock user recommendations:', error)
        }
      }
      
      return realUserRecs
    } catch (error) {
      console.error('Error loading user recommendations:', error)
      // Return mock recommendations as fallback
      if (location && location.latitude && location.longitude) {
        try {
          return await generateMockUserRecommendations(location.latitude, location.longitude)
        } catch (err) {
          console.error('Error fetching fallback mock user recommendations:', err)
        }
      }
      return []
    }
  }, [getFallbackImage, insights.userPersonality?.confidence, location, generateMockUserRecommendations])


  // Generate mock AI recommendations using REAL places from Foursquare API
  const generateMockAIRecommendations = useCallback(async (lat: number, lng: number, signal?: AbortSignal): Promise<Recommendation[]> => {
    try {
      // Fetch real places from Foursquare API
      const response = await fetch('/api/foursquare-places', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lat: lat,
          lng: lng,
          radius: 5000, // 5km radius
          limit: 8 // Get enough places to choose from
        }),
        signal
      })

      if (signal?.aborted) {
        return []
      }

      if (response.ok) {
        const data = await response.json()
        const places = data.items || data.results || []
        
        if (places.length === 0) {
          return []
        }

        // DETERMINISTIC: Sort by ID and take first 4 for AI mocks
        const sortedPlaces = [...places].sort((a: any, b: any) => {
          const idA = a.fsq_id || a.id || a.place_id || ''
          const idB = b.fsq_id || b.id || b.place_id || ''
          return idA.localeCompare(idB)
        }).slice(0, 4)

        return sortedPlaces.map((place: any, index: number) => {
          const placeLat = place.location?.lat || place.geometry?.location?.lat || lat
          const placeLng = place.location?.lng || place.geometry?.location?.lng || lng
          
          // Extract photo URL
          let photoUrl = place.photoUrl || place.mediaUrl
          if (!photoUrl && place.photos && Array.isArray(place.photos) && place.photos.length > 0) {
            const firstPhoto = place.photos[0]
            photoUrl = firstPhoto.url || firstPhoto.prefix || firstPhoto.href || firstPhoto.link
          }

          const category = place.category || getCategoryFromTypes(place.types || [])

          return {
            id: `mock-ai-${place.fsq_id || place.id || index}`,
            title: place.title || place.name || "Local Place",
            description: place.description || 
              (place.category ? `A great ${place.category.toLowerCase()} spot in your area` : 
               "A recommended location nearby"),
            category: category,
            location: {
              lat: placeLat,
              lng: placeLng,
            },
            rating: place.rating || 4.0,
            isAISuggestion: true,
            confidence: 20, // Low confidence for mock data
            reason: "Local area discovery - exploring your neighborhood",
            timestamp: new Date(),
            photoUrl: photoUrl || undefined,
            mediaUrl: photoUrl || undefined,
            fallbackImage: photoUrl ? undefined : getFallbackImage(category.toLowerCase().split(' ')[0]),
            fsq_id: place.fsq_id || place.id || undefined
          }
        })
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return []
      }
      console.error('Error fetching mock AI recommendations:', error)
    }
    
    return []
  }, [getFallbackImage, getCategoryFromTypes])

  // Get learning status when component mounts
  useEffect(() => {
    try {
      const learningStatus = getLearningStatus()
      setLearningProgress({
        level: learningStatus.isLearning ? 'Learning' : 'Beginner',
        progress: Math.min(learningStatus.confidence * 100, 100),
        pinsAnalyzed: learningStatus.totalBehaviors,
        confidence: Math.round(learningStatus.confidence * 100)
      })
    } catch (error) {
      console.log('🧠 AI not ready yet:', error)
      setLearningProgress({
        level: 'Beginner',
        progress: 0,
        pinsAnalyzed: 0,
        confidence: 0
      })
    }
  }, [getLearningStatus])

  // Debug location data
  useEffect(() => {
    console.log('🧠 AIRecommendationsHub: Location data received:', {
      userLocation,
      hookLocation,
      finalLocation: location,
      hasLatLng: location && location.latitude && location.longitude
    })
  }, [userLocation, hookLocation, location])
  
  // Initialize location watching and get current location
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      console.log('🧠 AIRecommendationsHub: Setting up location services...')
      
      // Get current location immediately
      getCurrentLocation({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0 // Always get fresh location
      }).then((locationData) => {
        console.log('🧠 AIRecommendationsHub: Got current location:', locationData)
      }).catch((error) => {
        console.log('🧠 AIRecommendationsHub: Location error:', error)
      })
      
      // Start watching for location changes
      if (location) {
        console.log('🧠 AIRecommendationsHub: Starting location watch...')
        watchLocation()
      }
    }
  }, [getCurrentLocation, watchLocation, location])

  // NEW: Update clusters whenever recommendations change
  useEffect(() => {
    if (recommendations.length > 0) {
      // ENHANCED: Don't process recommendations if user is moving
      if (isUserMoving) {
        console.log('🧠 Skipping cluster update - user is moving, recommendations will be processed when stationary')
        // Clear existing clusters when moving to prevent driving artifacts
        setClusteredPins([])
        return
      }
      
      const clusters = clusterPins(recommendations)
      setClusteredPins(clusters)
      console.log('🧠 Updated clusters:', clusters.length, 'clusters from', recommendations.length, 'recommendations')
    } else {
      console.log('🧠 No recommendations to cluster')
      setClusteredPins([])
    }
  }, [recommendations, clusterPins, isUserMoving])

  // Generate AI recommendations when location changes - with rate limiting
  useEffect(() => {
    if (location && location.latitude && location.longitude && insights && recommendations.length < 5 && isInitialized) { // Limit total recommendations
      // ENHANCED: Use the dedicated motion detection state
      if (isUserMoving) {
        console.log('🧠 Skipping recommendation generation - user is moving (motion state: true)')
        console.log('🧠 Use the 🔄 button to manually generate recommendations while moving')
        return
      }
      
      // ADDITIONAL SAFEGUARD: Double-check speed directly
      const currentSpeed = location.speed || 0
      if (currentSpeed > 1.5) {
        console.log('🧠 Additional safeguard: Speed check failed - user moving at', currentSpeed.toFixed(2), 'm/s')
        return
      }
      
      // CACHE CHECK: First check if we have cached recommendations for this location
      const cacheKey = getLocationCacheKey(location.latitude, location.longitude)
      const cached = recommendationCacheRef.current.get(cacheKey)
      const now = Date.now()
      
      // Use cached recommendations if available and recent (within 1 hour)
      if (cached && (now - cached.timestamp) < 3600000) {
        console.log('🧠 Using cached recommendations for location:', cacheKey)
        if (cached.recommendations.length > 0) {
          setRecommendations(cached.recommendations)
          const clusters = clusterPins(cached.recommendations)
          setClusteredPins(clusters)
          console.log(`✅ Loaded ${cached.recommendations.length} cached recommendations (${clusters.length} clusters)`)
        }
        return // Don't generate new recommendations if cache is valid
      }
      
      // Only generate new recommendations if we don't have many already
      // and if enough time has passed since last generation
      const lastGeneration = localStorage.getItem('last-ai-recommendation-time')
      const timeSinceLastGeneration = lastGeneration ? now - parseInt(lastGeneration) : 60000
      
      // Only generate new recommendations every 30 seconds minimum
      if (timeSinceLastGeneration < 30000) {
        console.log('🧠 Skipping recommendation generation - too soon since last batch')
        return
      }
      
      console.log('🧠 Generating new AI recommendations for location:', cacheKey)
      
      // Prevent duplicate requests - check if already generating
      if (isGeneratingRecommendations) {
        console.log('🧠 Recommendation generation already in progress, skipping...')
        return
      }
      
      // Check if we're making the same request (same location within 100m and within 5 seconds)
      const currentParams = {
        lat: Math.round(location.latitude * 1000) / 1000, // Round to ~100m precision
        lng: Math.round(location.longitude * 1000) / 1000,
        timestamp: now
      }
      if (lastRequestParamsRef.current && 
          lastRequestParamsRef.current.lat === currentParams.lat &&
          lastRequestParamsRef.current.lng === currentParams.lng &&
          (now - lastRequestParamsRef.current.timestamp) < 5000) {
        console.log('🧠 Duplicate request detected (same location, too soon), skipping...')
        return
      }
      
      setIsGeneratingRecommendations(true)
      lastRequestParamsRef.current = currentParams
      
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal
      
      const generateRecommendations = async () => {
        const aiRecs: Recommendation[] = []
        
        try {
            // Generate AI recommendations based on user preferences
            if (insights.userPersonality && insights.userPersonality.confidence > 0.3) {
              const categories = Object.entries(insights.userPersonality)
                .filter(([key, value]) => key !== 'confidence' && value === true)
                .map(([key]) => key.replace('is', '').toLowerCase())
              
              // Only generate 2-3 recommendations at a time, not continuously
              const numToGenerate = Math.min(2 + Math.floor(Math.random() * 2), categories.length)
              const shuffledCategories = categories.sort(() => 0.5 - Math.random()).slice(0, numToGenerate)
              
              // OPTIMIZED: Make a SINGLE API call for all categories instead of one per category
              try {
                console.log('🧠 Fetching places from Foursquare for all categories in one request...')
                const response = await fetch('/api/foursquare-places', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    lat: location.latitude,
                    lng: location.longitude,
                    radius: 5000, // 5km radius for recommendations
                    limit: 30 // Get enough places to filter by multiple categories
                  }),
                  signal // Add abort signal
                })
                
                if (signal.aborted) {
                  console.log('🧠 Request aborted')
                  return
                }
                
                if (response.ok) {
                  const data = await response.json()
                  const allPlaces = data.items || data.results || []
                  console.log(`🧠 Fetched ${allPlaces.length} places from Foursquare`)
                  
                  // Process each category from the same API response
                  // DETERMINISTIC: Sort places by ID for consistent selection (same region = same places)
                  const sortedPlaces = [...allPlaces].sort((a: any, b: any) => {
                    const idA = a.fsq_id || a.id || a.place_id || ''
                    const idB = b.fsq_id || b.id || b.place_id || ''
                    return idA.localeCompare(idB)
                  })
                  
                  for (const category of shuffledCategories) {
                    if (signal.aborted) break
                    
                    // Filter places by category preference - match category names from Foursquare
                    const categoryPlaces = sortedPlaces.filter((place: any) => {
                      const placeCategory = place.category?.toLowerCase() || ''
                      const categoryLower = category.toLowerCase()
                      
                      return (
                        placeCategory.includes(categoryLower) ||
                        (categoryLower === 'food' && ['restaurant', 'cafe', 'food', 'dining', 'catering'].some(c => placeCategory.includes(c))) ||
                        (categoryLower === 'adventure' && ['activity', 'leisure', 'tourism', 'outdoor', 'sport'].some(c => placeCategory.includes(c))) ||
                        (categoryLower === 'culture' && ['entertainment', 'art', 'museum', 'theater', 'gallery', 'cultural'].some(c => placeCategory.includes(c))) ||
                        (categoryLower === 'nature' && ['park', 'natural', 'outdoor', 'garden', 'beach', 'hiking'].some(c => placeCategory.includes(c)))
                      )
                    })
                    
                    if (categoryPlaces.length > 0) {
                      // DETERMINISTIC: Use first place (sorted by ID) instead of random for consistency
                      // Same region will always get the same recommendations
                      const selectedPlace = categoryPlaces[0]
                      
                      // CRITICAL: Validate coordinates before adding recommendation
                      const placeLat = selectedPlace.location?.lat || selectedPlace.geometry?.location?.lat
                      const placeLng = selectedPlace.location?.lng || selectedPlace.geometry?.location?.lng
                      
                      // Skip places without valid coordinates
                      if (!placeLat || !placeLng || !isFinite(placeLat) || !isFinite(placeLng)) {
                        console.warn('🧠 Skipping place without valid coordinates:', selectedPlace.title || selectedPlace.name)
                        continue
                      }
                      
                      // Extract photo URL from Foursquare response
                      let photoUrl = selectedPlace.photoUrl || selectedPlace.mediaUrl
                      if (!photoUrl && selectedPlace.photos && Array.isArray(selectedPlace.photos) && selectedPlace.photos.length > 0) {
                        const firstPhoto = selectedPlace.photos[0]
                        photoUrl = firstPhoto.url || firstPhoto.prefix || firstPhoto.href || firstPhoto.link
                      }
                      
                      // Use Foursquare's real title and description
                      const placeTitle = selectedPlace.title || selectedPlace.name || 'Interesting Place'
                      const placeDescription = selectedPlace.description || 
                        (selectedPlace.category ? `A great ${selectedPlace.category.toLowerCase()} spot` : 
                         `A recommended ${category} location`)
                      
                      console.log(`🧠 AI Recommendation using Foursquare data for ${placeTitle}:`, {
                        hasDescription: !!selectedPlace.description,
                        description: selectedPlace.description?.substring(0, 50) + '...',
                        category: selectedPlace.category,
                        hasPhoto: !!photoUrl
                      })
                      
                      aiRecs.push({
                        id: `ai-${category}-${selectedPlace.fsq_id || selectedPlace.id || Date.now()}`,
                        title: placeTitle,
                        description: placeDescription, // Use real Foursquare description
                        category: selectedPlace.category || category,
                        location: {
                          lat: placeLat,
                          lng: placeLng,
                        },
                        rating: selectedPlace.rating || 4.0,
                        isAISuggestion: true,
                        confidence: Math.round(insights.userPersonality.confidence * 100),
                        reason: `Learned from your ${category} preferences`,
                        timestamp: new Date(),
                        fallbackImage: photoUrl ? undefined : getFallbackImage(selectedPlace.category || category),
                        photoUrl: photoUrl || undefined,
                        mediaUrl: photoUrl || undefined,
                        fsq_id: selectedPlace.fsq_id || selectedPlace.id || undefined
                      } as Recommendation)
                    }
                  }
                }
              } catch (error: any) {
                if (error.name === 'AbortError') {
                  console.log('🧠 Request was aborted')
                  return
                }
                console.log(`🧠 Error fetching recommendations:`, error)
              }
            } else {
              // NEW USER FALLBACK: Generate local area recommendations when AI hasn't learned enough yet
              console.log('🧠 New user detected - generating local area recommendations')
              
              // API SAFEGUARD: Check if we've already made requests recently
              const lastRequestTime = localStorage.getItem('last-new-user-request')
              const timeSinceLastRequest = lastRequestTime ? now - parseInt(lastRequestTime) : Infinity
              
              // Only make API request if it's been at least 5 minutes since last request
              if (timeSinceLastRequest > 5 * 60 * 1000) {
                try {
                  console.log('🧠 Fetching local places for new user...')
                  
                  // Use Foursquare Places API with safeguards
                  const response = await fetch('/api/foursquare-places', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      lat: location.latitude,
                      lng: location.longitude,
                      radius: 5000, // 5km radius for local area
                      limit: 5 // Get 5 places
                    }),
                    signal // Add abort signal
                  })
                  
                  if (signal.aborted) {
                    console.log('🧠 Request aborted')
                    return
                  }
                
                if (response.ok) {
                  const data = await response.json()
                  // Handle both new format (items) and old format (results) for compatibility
                  const places = data.items || data.results || []
                  
                  // DETERMINISTIC: Sort places by ID for consistent selection
                  const sortedPlaces = [...places].sort((a: any, b: any) => {
                    const idA = a.fsq_id || a.id || a.place_id || ''
                    const idB = b.fsq_id || b.id || b.place_id || ''
                    return idA.localeCompare(idB)
                  })
                  
                  // Generate 3-4 recommendations from local places (deterministic - same places each time)
                  const numRecommendations = Math.min(4, sortedPlaces.length)
                  const selectedPlaces = sortedPlaces.slice(0, numRecommendations)
                  
                  for (const place of selectedPlaces) {
                    // Handle both new format (category) and old format (types)
                    const category = place.category || getCategoryFromTypes(place.types || [])
                    
                    // CRITICAL: Extract location coordinates - must have valid lat/lng or skip this place
                    const placeLat = place.location?.lat || place.geometry?.location?.lat
                    const placeLng = place.location?.lng || place.geometry?.location?.lng
                    
                    // Skip places without valid coordinates - don't fall back to user location!
                    if (!placeLat || !placeLng || !isFinite(placeLat) || !isFinite(placeLng)) {
                      console.warn('🧠 Skipping place without valid coordinates:', place.title || place.name, place)
                      continue
                    }
                    
                    // Extract photo URL - prioritize photoUrl, then mediaUrl, then check for photos array
                    let photoUrl = place.photoUrl || place.mediaUrl
                    if (!photoUrl && place.photos && Array.isArray(place.photos) && place.photos.length > 0) {
                      const firstPhoto = place.photos[0]
                      photoUrl = firstPhoto.url || firstPhoto.prefix || firstPhoto.href || firstPhoto.link
                    }
                    
                    console.log(`🧠 Recommendation image for ${place.title || place.name}:`, {
                      hasPhotoUrl: !!place.photoUrl,
                      hasMediaUrl: !!place.mediaUrl,
                      hasPhotosArray: !!(place.photos && place.photos.length > 0),
                      finalPhotoUrl: photoUrl ? photoUrl.substring(0, 50) + '...' : 'none',
                      fsq_id: place.fsq_id || place.id
                    })
                    
                    // Use Foursquare's real title and description - prioritize actual data over generic text
                    const placeTitle = place.title || place.name || 'Local Spot'
                    const placeDescription = place.description || 
                      (place.category ? `A great ${place.category.toLowerCase()} spot in your area` : 
                       `A recommended ${category.toLowerCase()} location nearby`)
                    
                    console.log(`🧠 New User Recommendation using Foursquare data for ${placeTitle}:`, {
                      hasDescription: !!place.description,
                      description: place.description?.substring(0, 50) + '...',
                      category: place.category || category,
                      hasPhoto: !!photoUrl
                    })
                    
                    aiRecs.push({
                      id: `new-user-${place.fsq_id || place.id || place.place_id}`,
                      title: placeTitle,
                      description: placeDescription, // Use real Foursquare description
                      category: place.category || category,
                      location: {
                        lat: placeLat,
                        lng: placeLng,
                      },
                      rating: place.rating || 4.0,
                      isAISuggestion: true,
                      confidence: 25, // Low confidence for new users
                      reason: "Local area discovery - exploring your neighborhood",
                      timestamp: new Date(),
                      fallbackImage: photoUrl ? undefined : getFallbackImage(place.category || category),
                      photoUrl: photoUrl || undefined,
                      mediaUrl: photoUrl || undefined, // Also set mediaUrl for compatibility
                      fsq_id: place.fsq_id || place.id || undefined
                    } as Recommendation)
                  }
                  
                  // Update last request time to prevent API loops
                  localStorage.setItem('last-new-user-request', now.toString())
                  console.log(`🧠 Generated ${aiRecs.length} local area recommendations for new user`)
                }
              } catch (error) {
                console.log('🧠 Error fetching local places for new user:', error)
                
                // Fallback to mock AI recommendations if API fails
                // NEW LOGIC: Show mock recommendations until 3+ real user recommendations exist in the area
                // Count real user recommendations within 5km radius
                const userRecommendationsInArea = recommendations.filter(rec => {
                  if (rec.isAISuggestion) return false // Skip AI suggestions
                  
                  // Calculate distance from current location to recommendation
                  const lat1 = location.latitude
                  const lng1 = location.longitude
                  const lat2 = rec.location.lat
                  const lng2 = rec.location.lng
                  
                  const R = 6371 // Earth radius in km
                  const dLat = (lat2 - lat1) * Math.PI / 180
                  const dLng = (lng2 - lng1) * Math.PI / 180
                  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                           Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                           Math.sin(dLng / 2) * Math.sin(dLng / 2)
                  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
                  const distance = R * c // Distance in km
                  
                  return distance <= 5 // Within 5km
                }).length
                
                // Show up to 4 mock recommendations if less than 3 real user recommendations in area
                const mockCount = userRecommendationsInArea < 3 ? 4 : 0
                
                if (mockCount > 0) {
                  try {
                    const mockRecommendations = await generateMockAIRecommendations(location.latitude, location.longitude, signal)
                    if (!signal.aborted && mockRecommendations.length > 0) {
                      const selectedMocks = mockRecommendations.slice(0, mockCount)
                      aiRecs.push(...selectedMocks)
                      console.log(`🧠 Using ${selectedMocks.length} mock AI recommendations (${userRecommendationsInArea} real user recs in area - need 3+)`)
                    }
                  } catch (mockError) {
                    console.error('Error fetching mock AI recommendations:', mockError)
                  }
                } else {
                  console.log(`🧠 Skipping mock recommendations - ${userRecommendationsInArea} real user recommendations already exist in this area`)
                }
              }
            } else {
              console.log('🧠 Skipping API request - too soon since last request (rate limiting)')
              
              // NEW LOGIC: Show mock recommendations until 3+ real user recommendations exist in the area
              // Count real user recommendations within 5km radius
              const userRecommendationsInArea = recommendations.filter(rec => {
                if (rec.isAISuggestion) return false // Skip AI suggestions
                
                // Calculate distance from current location to recommendation
                const lat1 = location.latitude
                const lng1 = location.longitude
                const lat2 = rec.location.lat
                const lng2 = rec.location.lng
                
                const R = 6371 // Earth radius in km
                const dLat = (lat2 - lat1) * Math.PI / 180
                const dLng = (lng2 - lng1) * Math.PI / 180
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                         Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                         Math.sin(dLng / 2) * Math.sin(dLng / 2)
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
                const distance = R * c // Distance in km
                
                return distance <= 5 // Within 5km
              }).length
              
              // Show up to 4 mock recommendations if less than 3 real user recommendations in area
              const mockCount = userRecommendationsInArea < 3 ? 4 : 0
              
              if (mockCount > 0) {
                try {
                  const mockRecommendations = await generateMockAIRecommendations(location.latitude, location.longitude, signal)
                  if (!signal.aborted && mockRecommendations.length > 0) {
                    const selectedMocks = mockRecommendations.slice(0, mockCount)
                    aiRecs.push(...selectedMocks)
                    console.log(`🧠 Using ${selectedMocks.length} cached/mock AI recommendations (${userRecommendationsInArea} real user recs in area - need 3+)`)
                  }
                } catch (mockError) {
                  console.error('Error fetching mock AI recommendations:', mockError)
                }
              } else {
                console.log(`🧠 Skipping mock recommendations - ${userRecommendationsInArea} real user recommendations already exist in this area`)
              }
            }
          }
          
            // Add only 1-2 discovery recommendations (40% as specified, but limited)
            // OPTIMIZED: Reuse the same API response if we already fetched places above
            const discoveryCount = Math.min(1 + Math.floor(Math.random() * 2), 2)
            
            let discoveryPlaces: any[] = []
            
            // If we already fetched places for categories, reuse them for discovery
            if (insights.userPersonality && insights.userPersonality.confidence > 0.3) {
              // We already have places from the category fetch above - reuse them
              try {
                const response = await fetch('/api/foursquare-places', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    lat: location.latitude,
                    lng: location.longitude,
                    radius: 5000,
                    limit: 30
                  }),
                  signal
                })
                
                if (!signal.aborted && response.ok) {
                  const data = await response.json()
                  discoveryPlaces = data.items || data.results || []
                  console.log(`🧠 Reusing Foursquare places for discovery: ${discoveryPlaces.length} places`)
                }
              } catch (error: any) {
                if (error.name !== 'AbortError') {
                  console.log('🧠 Error fetching discovery places:', error)
                }
              }
            } else {
              // For new users, fetch discovery places separately
              try {
                const discoveryResponse = await fetch('/api/foursquare-places', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    lat: location.latitude,
                    lng: location.longitude,
                    radius: 3000, // 3km radius for discovery
                    limit: 10 // Get multiple places to choose from
                  }),
                  signal
                })
                
                if (signal.aborted) {
                  console.log('🧠 Discovery request aborted')
                  return
                }
                
                if (discoveryResponse.ok) {
                  const discoveryData = await discoveryResponse.json()
                  discoveryPlaces = discoveryData.items || discoveryData.results || []
                }
              } catch (error: any) {
                if (error.name === 'AbortError') {
                  console.log('🧠 Discovery request was aborted')
                  return
                }
                console.log('🧠 Error fetching discovery recommendations:', error)
              }
            }
            
            if (!signal.aborted) {
            
              // DETERMINISTIC: Sort discovery places by ID for consistent selection
              const sortedDiscoveryPlaces = [...discoveryPlaces].sort((a: any, b: any) => {
                const idA = a.fsq_id || a.id || a.place_id || ''
                const idB = b.fsq_id || b.id || b.place_id || ''
                return idA.localeCompare(idB)
              })
              
              // Select places from Foursquare results deterministically (same region = same places)
            for (let i = 0; i < discoveryCount; i++) {
              let placeTitle: string
              let placeDescription: string
              let recLat: number
              let recLng: number
              let photoUrl: string | undefined
              let fsqId: string | undefined
              let rating: number
              let category: string
              
              if (sortedDiscoveryPlaces.length > 0 && i < sortedDiscoveryPlaces.length) {
                // Use real Foursquare place (deterministic - same index = same place)
                const place = sortedDiscoveryPlaces[i]
                // CRITICAL: Use EXACT coordinates from Foursquare API
                recLat = place.location?.lat || place.geometry?.location?.lat
                recLng = place.location?.lng || place.geometry?.location?.lng
                
                // CRITICAL: Validate coordinates are exact and valid
                if (recLat && recLng && isFinite(recLat) && isFinite(recLng)) {
                  // Use EXACT coordinates from Foursquare (no rounding or approximation)
                  placeTitle = place.title || place.name || `Hidden Gem #${i + 1}`
                  placeDescription = place.description || 
                    (place.category ? `Discover this ${place.category.toLowerCase()} spot` : 
                     "A cool spot I think you'll love!")
                  category = place.category || 'adventure'
                  // DETERMINISTIC: Use fixed rating based on place ID instead of random
                  const placeId = place.fsq_id || place.id || place.place_id || ''
                  rating = place.rating || (3.5 + (placeId.charCodeAt(0) % 10) / 10) // Deterministic rating
                  fsqId = place.fsq_id || place.id
                  
                  // Extract photo URL
                  photoUrl = place.photoUrl || place.mediaUrl
                  if (!photoUrl && place.photos && Array.isArray(place.photos) && place.photos.length > 0) {
                    const firstPhoto = place.photos[0]
                    photoUrl = firstPhoto.url || firstPhoto.prefix || firstPhoto.href || firstPhoto.link
                  }
                  
                  console.log(`🧠 Discovery Recommendation using Foursquare data for ${placeTitle}:`, {
                    hasDescription: !!place.description,
                    description: place.description?.substring(0, 50) + '...',
                    category: category,
                    hasPhoto: !!photoUrl
                  })
                } else {
                  // Skip places without valid coordinates - don't use fallback random locations
                  console.warn('🧠 Skipping discovery place without valid coordinates:', place.title || place.name)
                  continue
                }
              } else {
                // No more places available - skip this discovery recommendation
                console.log('🧠 No more discovery places available, skipping')
                break
              }
              
              // CRITICAL: Use EXACT coordinates from Foursquare API (no approximation)
              aiRecs.push({
                id: `discovery-${fsqId || Date.now()}-${i}`, // Use place ID for deterministic IDs
                title: placeTitle,
                description: placeDescription,
                category: category,
                location: {
                  lat: recLat, // EXACT coordinate from Foursquare
                  lng: recLng  // EXACT coordinate from Foursquare
                },
                rating: rating,
                isAISuggestion: true,
                confidence: Math.round((insights.userPersonality?.confidence || 0.5) * 60),
                reason: "Discovery mode - expanding your horizons",
                timestamp: new Date(),
                fallbackImage: photoUrl ? undefined : getFallbackImage(category),
                photoUrl: photoUrl || undefined,
                mediaUrl: photoUrl || undefined,
                fsq_id: fsqId
              } as Recommendation)
            }
            }
            
            // Store the timestamp of this generation
            localStorage.setItem('last-ai-recommendation-time', now.toString())
            
            // CACHE: Store recommendations by location for consistency
            if (aiRecs.length > 0 && location && location.latitude && location.longitude) {
              const cacheKey = getLocationCacheKey(location.latitude, location.longitude)
              recommendationCacheRef.current.set(cacheKey, {
                recommendations: aiRecs,
                timestamp: now
              })
              console.log(`💾 Cached ${aiRecs.length} recommendations for location: ${cacheKey}`)
            }
            
            // Add new recommendations to existing ones (don't replace)
            setRecommendations(prev => {
              // Remove duplicates by ID
              const existingIds = new Set(prev.map(r => r.id))
              const newRecs = aiRecs.filter(r => !existingIds.has(r.id))
              const combined = [...prev, ...newRecs]
              // Keep only the most recent 10 recommendations to prevent spam
              return combined.slice(-10)
            })
            
            // NEW: Update clustered pins whenever recommendations change
            setRecommendations(prev => {
              const updatedClusters = clusterPins(prev)
              setClusteredPins(updatedClusters)
              return prev
            })
            
            console.log(`🧠 Generated ${aiRecs.length} new AI recommendations (cached for consistency)`)
        } catch (error: any) {
          if (error.name === 'AbortError') {
            console.log('🧠 Request was aborted')
            return
          }
          console.log('🧠 Error in recommendation generation:', error)
          if (error.name === 'AbortError') {
            console.log('🧠 Recommendation generation aborted')
            return
          }
          console.log('🧠 Error generating recommendations:', error)
        } finally {
          setIsGeneratingRecommendations(false)
        }
      }
      
      generateRecommendations().catch((error) => {
        console.log('🧠 Error in recommendation generation effect:', error)
        setIsGeneratingRecommendations(false)
      })
    }
  }, [location, insights, recommendations.length, isInitialized, isGeneratingRecommendations, getLocationCacheKey, clusterPins]) // Added cache key and cluster functions

  // Load user recommendations on mount and location change
  useEffect(() => {
    if (location && location.latitude && location.longitude && isInitialized) {
      const loadUserRecs = async () => {
        try {
          const userRecs = await getUserRecommendations()
          if (userRecs.length > 0) {
            console.log(`👥 Loaded ${userRecs.length} user recommendations (including mocks)`)
            setRecommendations(prev => {
              // Remove duplicates by ID
              const existingIds = new Set(prev.map(r => r.id))
              const newRecs = userRecs.filter(r => !existingIds.has(r.id))
              return [...prev, ...newRecs]
            })
          }
        } catch (error) {
          console.error('Error loading user recommendations:', error)
        }
      }
      loadUserRecs()
    }
  }, [location, isInitialized, getUserRecommendations])

  // Refresh map when returning to map view
  useEffect(() => {
    if (viewMode === "map" && mapRef.current) {
      console.log('🗺️ Map view active, ensuring map is properly displayed...')
      
      if (mapInstanceRef.current) {
        // Map instance exists, try to refresh it
        console.log('🗺️ Refreshing existing map instance...')
        setTimeout(() => {
          if (mapInstanceRef.current && mapRef.current) {
            try {
              // Force a complete map refresh
              window.google.maps.event.trigger(mapInstanceRef.current, 'resize')
              console.log('🗺️ Map resize completed')
              
              // Check if tiles are actually visible
              const mapDiv = mapRef.current.querySelector('.gm-style')
              if (!mapDiv || mapDiv.children.length === 0) {
                console.log('🗺️ Map tiles not visible, recreating map...')
                recreateMap()
                          } else {
              console.log('🗺️ Map tiles visible, preserving user position...')
              // NEW: Don't force center if user has interacted with the map
              if (!userHasInteracted && location) {
                console.log('🗺️ User hasn\'t interacted, centering on location...')
                mapInstanceRef.current.setCenter({ lat: location.latitude, lng: location.longitude })
              } else {
                console.log('🗺️ User has interacted, preserving current position')
              }
            }
            } catch (error) {
              console.error('🗺️ Error refreshing map:', error)
              recreateMap()
            }
          }
        }, 200)
      } else {
        // No map instance, create new one
        console.log('🗺️ No map instance, creating new map...')
        initializeMap()
      }
    }
  }, [viewMode, location])

  // Function to recreate the map instance
  const recreateMap = () => {
    try {
      console.log('🗺️ Recreating map instance...')
      
      // Clear existing map instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null
      }
      
      // Reset loading state
      setIsMapLoading(true)
      setMapError(null)
      
      // Create new map instance
      setTimeout(() => {
        if (mapRef.current) {
          createMapInstance()
        }
      }, 100)
    } catch (error) {
      console.error('🗺️ Error recreating map:', error)
      setMapError('Failed to recreate map')
      setIsMapLoading(false)
    }
  }

  // Handle view mode changes and preserve map
  const handleViewModeChange = (newViewMode: "map" | "list" | "insights") => {
    console.log('🗺️ Switching to view mode:', newViewMode)
    
    if (newViewMode === "map" && mapInstanceRef.current) {
      // Returning to map view - ensure map is visible and properly sized
      console.log('🗺️ Returning to map view, refreshing map...')
      setTimeout(() => {
        if (mapInstanceRef.current && mapRef.current) {
          console.log('🗺️ Refreshing map after tab switch...')
          try {
            window.google.maps.event.trigger(mapInstanceRef.current, 'resize')
            
            // Check if tiles are visible after resize
            setTimeout(() => {
              const mapDiv = mapRef.current?.querySelector('.gm-style')
              if (!mapDiv || mapDiv.children.length === 0) {
                console.log('🗺️ Map tiles still not visible, recreating...')
                recreateMap()
                          } else {
              console.log('🗺️ Map tiles visible after resize')
              // NEW: Don't force center if user has interacted with the map
              if (!userHasInteracted && location) {
                console.log('🗺️ User hasn\'t interacted, centering on location after resize...')
                mapInstanceRef.current.setCenter({ lat: location.latitude, lng: location.longitude })
              } else {
                console.log('🗺️ User has interacted, preserving current position after resize')
              }
            }
            }, 300)
          } catch (error) {
            console.error('🗺️ Error during map refresh:', error)
            recreateMap()
          }
        }
      }, 100)
    }
    
    setViewMode(newViewMode)
  }

  // Center map on user location when it becomes available (only if user hasn't interacted)
  useEffect(() => {
    if (location && location.latitude && location.longitude && mapInstanceRef.current && isInitialized) {
      console.log('🗺️ Location updated, current user interaction state:', userHasInteracted)
      
      // NEW: Only center map if user hasn't interacted with it yet
      if (!userHasInteracted) {
        console.log('🗺️ User hasn\'t interacted, centering map on new location:', location)
        console.log('🗺️ Location coordinates:', { lat: location.latitude, lng: location.longitude })
        
        // Center the map immediately
        mapInstanceRef.current.setCenter({ lat: location.latitude, lng: location.longitude })
        
        // Update zoom to street level for precise location
        mapInstanceRef.current.setZoom(16)
        
        // Update our state
        setMapCenter({ lat: location.latitude, lng: location.longitude })
        setMapZoom(16)
        
        console.log('🗺️ Map centered and zoomed to user location')
      } else {
        console.log('🗺️ User has interacted with map, preserving current position')
      }
      
      // FIXED: Create user location marker with dynamic icon
      if (mapRef.current) {
        if (userLocationMarkerRef.current) {
          // Update existing marker position and icon smoothly
          const newPosition = { lat: location.latitude, lng: location.longitude }
          const newIcon = getMarkerIcon(isUserMoving)
          
          userLocationMarkerRef.current.setPosition(newPosition)
          userLocationMarkerRef.current.setIcon(newIcon)
          
          // Pan map to keep marker centered
          mapInstanceRef.current.panTo(newPosition)
          
          console.log('🗺️ User location marker updated smoothly with', isUserMoving ? 'car' : 'pin', 'icon')
        } else {
          // Create new marker with dynamic icon based on current motion state
          const marker = new window.google.maps.Marker({
            position: { lat: location.latitude, lng: location.longitude },
            map: mapInstanceRef.current,
            title: 'Your Location',
            icon: getMarkerIcon(isUserMoving),
            optimized: false, // Disable optimization for smoother updates
            zIndex: 0 // Put user location marker at the bottom so recommendations appear on top
          })
          
          // Store reference to marker
          userLocationMarkerRef.current = marker
          console.log('🗺️ User location marker created with', isUserMoving ? 'car' : 'pin', 'icon')
        }
      }
      
      // Force a map refresh to ensure smooth rendering
      setTimeout(() => {
        if (mapInstanceRef.current) {
          window.google.maps.event.trigger(mapInstanceRef.current, 'resize')
          console.log('🗺️ Map refreshed after location update')
        }
      }, 100)
    }
  }, [location, isInitialized])

  // Initialize Google Maps when map ref is ready AND location is available
  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current && !mapError && isInitialized) {
      if (location && location.latitude && location.longitude) {
        console.log('🗺️ Map ref ready and location available, starting initialization...')
        console.log('🗺️ Location data:', { lat: location.latitude, lng: location.longitude })
        initializeMap()
      } else {
        console.log('🗺️ Map ref ready but location not ready yet, waiting for location...')
        // Don't create map without location - wait for it to be passed
      }
    }
  }, [mapError, location, isInitialized]) // Only depend on mapError and location

  const initializeMap = useCallback(async () => {
    try {
      console.log('🗺️ Starting map initialization...')
      setIsMapLoading(true)
      setMapError(null)
      
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps) {
        console.log('🗺️ Google Maps already loaded, creating map instance...')
        createMapInstance()
      } else {
        console.log('🗺️ Loading Google Maps script...')
        await loadGoogleMapsScript()
        console.log('🗺️ Google Maps script loaded, creating map instance...')
        createMapInstance()
      }
    } catch (error) {
      console.error('🗺️ Failed to initialize map:', error)
      setMapError('Failed to load map')
      setIsMapLoading(false)
    }
  }, [])

  const loadGoogleMapsScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      console.log('🗺️ Setting up Google Maps script loading...')
      
      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
      if (existingScript) {
        console.log('🗺️ Google Maps script already loading, waiting...')
        existingScript.addEventListener('load', () => {
          console.log('🗺️ Existing script loaded, resolving...')
          resolve()
        })
        existingScript.addEventListener('error', reject) // ✅ Properly rejects on error
        return
      }

      // Create and load new script
      console.log('🗺️ Creating new Google Maps script...')
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}&libraries=places`
      script.async = true
      script.onload = () => {
        console.log('🗺️ New Google Maps script loaded successfully')
        resolve()
      }
      script.onerror = (error) => {
        console.error('🗺️ Google Maps script failed to load:', error)
        reject(error)
      }
      document.head.appendChild(script)
      console.log('🗺️ Google Maps script added to document head')
    })
  }

  const createMapInstance = () => {
    try {
      console.log('🗺️ Creating map instance...')
      if (!mapRef.current) {
        console.log('🗺️ Map ref not ready, skipping...')
        return
      }

      // Use the actual location that was passed to the component
      if (!location || !location.latitude || !location.longitude) {
        console.log('🗺️ No valid location available, cannot create map')
        return
      }
      
      const mapLocation = { latitude: location.latitude, longitude: location.longitude }
      console.log('🗺️ Using real GPS location:', mapLocation)
      
      const centerLocation = { lat: mapLocation.latitude, lng: mapLocation.longitude }
      console.log('🗺️ Center location for map:', centerLocation)
      
      if (!window.google || !window.google.maps) {
        console.error('🗺️ Google Maps not available after script load')
        setMapError('Google Maps not available')
        setIsMapLoading(false)
        return
      }

      console.log('🗺️ Creating Google Maps instance...')
      const map = new window.google.maps.Map(mapRef.current, {
        center: centerLocation,
        zoom: 16, // Street level zoom for precise location
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: false,
        zoomControl: true,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_TOP
        },
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        backgroundColor: '#000000',
        // Remove custom styles that might interfere with tiles
        styles: [],
        gestureHandling: 'auto', // Let Google Maps automatically choose the best gesture handling
        scrollwheel: true, // Enable mouse wheel zoom
        draggable: true, // Ensure map can be dragged
        // Mobile-specific optimizations
        clickableIcons: true,
        keyboardShortcuts: false, // Disable keyboard shortcuts on mobile
        // Ensure touch events work properly
        tilt: 0 // Disable 3D tilt on mobile for better performance
      })

      console.log('🗺️ Google Maps instance created successfully')
      mapInstanceRef.current = map
      
      // Wait for map to render and then remove loading
      setTimeout(() => {
        if (mapRef.current && map) {
          console.log('🗺️ Triggering map resize...')
          try {
            window.google.maps.event.trigger(map, 'resize')
            console.log('🗺️ Map resize completed')
            
            // Check if map actually rendered with tiles
            const mapDiv = mapRef.current.querySelector('.gm-style')
            if (mapDiv) {
              console.log('🗺️ Map rendered successfully, removing loading state')
              setIsMapLoading(false)
              
              // Center map on user location
              map.setCenter({ lat: mapLocation.latitude, lng: mapLocation.longitude })
              map.setZoom(16)
              
              // NOTE: User location marker is created in the useEffect above, not here
              // This prevents duplicate markers
            } else {
              console.log('🗺️ Map not rendered, triggering another resize')
              setTimeout(() => {
                window.google.maps.event.trigger(map, 'resize')
                setIsMapLoading(false)
                
                // Center map on user location
                console.log('🗺️ Centering map on user location after resize:', mapLocation)
                map.setCenter({ lat: mapLocation.latitude, lng: mapLocation.longitude })
              }, 500)
            }
          } catch (error) {
            console.error('🗺️ Error during map resize:', error)
            setIsMapLoading(false)
          }
        } else {
          console.log('🗺️ Map ref or instance not available during resize')
          setIsMapLoading(false)
        }
      }, 200)
      
    } catch (error) {
      console.error('🗺️ Failed to create map instance:', error)
      setMapError('Failed to create map')
      setIsMapLoading(false)
    }
  }

  // REMOVED: Map markers - now using buttons to navigate to list view instead

  // Add after createMapInstance function:
  const createFallbackMap = () => {
    if (!mapRef.current) return
    
    console.log('🗺️ Creating fallback static map...')
    mapRef.current.innerHTML = `
      <div style="width: 100%; height: 100%; background: #f0f0f0; display: flex; align-items: center; justify-content: center; flex-direction: column; color: #666;">
        <div style="font-size: 24px; margin-bottom: 10px;">🗺️</div>
        <div style="font-size: 16px; text-align: center;">
          Map temporarily unavailable<br/>
          <small style="font-size: 12px;">Location: ${location?.latitude?.toFixed(4)}, ${location?.longitude?.toFixed(4)}</small>
        </div>
      </div>
    `
  }

  // Don't render if location is not properly initialized
  if (!location || !location.latitude || !location.longitude || !isInitialized) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #581c87 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        color: 'white',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>📍</div>
        <h2 style={{ margin: '0 0 10px 0', fontSize: '20px' }}>Initializing Recommendations</h2>
        <p style={{ margin: 0, opacity: 0.8, fontSize: '14px' }}>
          {!location ? 'Waiting for location services...' : 'Preparing personalized recommendations...'}
        </p>
        <button
          onClick={onBack}
          style={{
            marginTop: '20px',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '12px',
            padding: '12px 24px',
            color: 'white',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(10px)'
          }}
        >
          ← Go Back
        </button>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #581c87 100%)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        paddingTop: '60px',
        textAlign: 'center',
        color: 'white',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        position: 'relative'
      }}>
        <button
          onClick={onBack}
          style={{
            position: 'absolute',
            left: '20px',
            top: '60px',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '8px',
            width: '40px',
            height: '40px',
            color: 'white',
            fontSize: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
            e.currentTarget.style.transform = 'scale(1.05)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          ←
        </button>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
          📍 Recommendations
        </h1>
        <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
          Personalized for you based on your behavior
        </p>
      </div>

      {/* View Mode Tabs - Map view disabled (migrating to Mapbox) */}
      <div style={{
        display: 'flex',
        padding: '0 20px',
        marginTop: '20px',
        gap: '10px'
      }}>
        {[
          { key: "map", label: "Map", icon: "🗺️" },
          { key: "list", label: "List", icon: "📋" },
          { key: "insights", label: "Insights", icon: "🧠" }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleViewModeChange(tab.key as any)}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '0.75rem',
              border: '1px solid rgba(255,255,255,0.2)',
              background: viewMode === tab.key 
                ? 'rgba(255,255,255,0.2)' 
                : 'rgba(255,255,255,0.1)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(10px)',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, padding: '20px', overflow: 'hidden' }}>
        {viewMode === "map" && (
          <div style={{
            background: 'rgba(30, 58, 138, 0.95)',
            borderRadius: '16px',
            height: '100%',
            position: 'relative',
            overflow: 'hidden',
            backdropFilter: 'blur(15px)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            <div
              ref={mapRef}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '16px',
                minHeight: '400px',
                position: 'relative',
                zIndex: 1,
                background: mapInstanceRef.current ? 'transparent' : '#f0f0f0' // Transparent when map is loaded, light gray when loading
              }}
            />
            
            {/* Loading overlay */}
            {isMapLoading && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '18px',
                textAlign: 'center',
                zIndex: 2
              }}>
                <div>
                  <div style={{ fontSize: '48px', marginBottom: '20px' }}>🗺️</div>
                  <div>Loading AI-powered map...</div>
                  <div style={{ 
                    marginTop: '10px', 
                    fontSize: '14px', 
                    opacity: 0.7 
                  }}>
                    {location ? 'Location detected, initializing map...' : 'Waiting for location...'}
                  </div>
                </div>
              </div>
            )}
            
            {/* Error overlay */}
            {mapError && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: 'white',
                fontSize: '16px',
                textAlign: 'center',
                background: 'rgba(0,0,0,0.8)',
                padding: '20px',
                borderRadius: '12px',
                zIndex: 3
              }}>
                <div style={{ marginBottom: '15px' }}>⚠️</div>
                <div>{mapError}</div>
                <button
                  onClick={() => {
                    setMapError(null)
                    mapInstanceRef.current = null
                    setIsMapLoading(true)
                    setTimeout(() => {
                      if (mapRef.current) {
                        initializeMap()
                      }
                    }, 1000)
                  }}
                  style={{
                    marginTop: '15px',
                    padding: '8px 16px',
                    background: 'rgba(59, 130, 246, 0.8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  🔄 Retry
                </button>
              </div>
            )}
            
            {/* NEW: User Recommendations and AI Recommendations buttons - centered on map */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              gap: '12px',
              zIndex: 5,
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <button
                onClick={async () => {
                  console.log('👥 User clicked User Recommendations button')
                  const userRecs = await getUserRecommendations()
                  setFilteredRecommendations(userRecs)
                  setIsShowingCluster(false)
                  setCurrentCluster(null)
                  setRecommendationFilter("user")
                  setViewMode('list')
                }}
                style={{
                  background: 'rgba(147, 197, 253, 0.9)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '0.75rem',
                  padding: '10px 16px',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(15px)',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  minWidth: '140px',
                  maxWidth: '160px',
                  textAlign: 'center',
                  lineHeight: '1.3'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(147, 197, 253, 1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(147, 197, 253, 0.9)'
                }}
              >
                👥 User Recommendations
              </button>
              
              <button
                onClick={() => {
                  console.log('🤖 User clicked AI Recommendations button')
                  const aiRecs = recommendations.filter(rec => rec.isAISuggestion)
                  setFilteredRecommendations(aiRecs)
                  setIsShowingCluster(false)
                  setCurrentCluster(null)
                  setRecommendationFilter("ai")
                  setViewMode('list')
                }}
                style={{
                  background: 'rgba(147, 197, 253, 0.9)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '0.75rem',
                  padding: '10px 16px',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(15px)',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  minWidth: '140px',
                  maxWidth: '160px',
                  textAlign: 'center',
                  lineHeight: '1.3'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(147, 197, 253, 1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(147, 197, 253, 0.9)'
                }}
              >
                🤖 AI Recommendations
              </button>
            </div>
            
            {/* Status indicator */}
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '500',
              zIndex: '4'
            }}>
              🧠 AI: {insights ? '✅ Ready' : '⏳ Learning...'}
            </div>

            {/* NEW: Simple Motion Indicator - Only shows when moving */}
            {mapInstanceRef.current && location && location.latitude && location.longitude && location.speed && location.speed > 2 && (
              <div style={{
                position: 'absolute',
                top: '60px',
                right: '20px',
                background: 'rgba(255, 165, 0, 0.9)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '500',
                zIndex: '4',
                textAlign: 'center'
              }}>
                🚗 {Math.round(location.speed * 3.6)} km/h
                <div style={{ fontSize: '10px', marginTop: '2px', opacity: 0.8 }}>
                  Use 🔄 for recommendations
                </div>
              </div>
            )}

            {/* NEW: Google Maps Style Location Button */}
            {mapInstanceRef.current && location && location.latitude && location.longitude && (
              <button
                onClick={() => {
                  if (mapInstanceRef.current && location) {
                    console.log('🗺️ User clicked My Location button')
                    mapInstanceRef.current.setCenter({ lat: location.latitude, lng: location.longitude })
                    mapInstanceRef.current.setZoom(16)
                    setMapCenter({ lat: location.latitude, lng: location.longitude })
                    setMapZoom(16)
                    setUserHasInteracted(false) // Reset interaction state to allow future auto-centering
                    console.log('🗺️ Map returned to user location')
                  }
                }}
                style={{
                  position: 'absolute',
                  top: '20px',
                  left: '20px',
                  background: 'white',
                  color: '#5f6368',
                  border: 'none',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  zIndex: 4
                }}
                title="My Location"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" fill="white" stroke="#5f6368" strokeWidth="2"/>
                  <circle cx="12" cy="12" r="3" fill="#5f6368"/>
                  <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="#5f6368" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            )}

            {/* NEW: Manual Refresh Recommendations Button */}
            {mapInstanceRef.current && location && location.latitude && location.longitude && (
              <button
                onClick={async () => {
                  // ENHANCED: Prevent manual refresh while moving
                  if (isUserMoving) {
                    console.log('🧠 Manual refresh blocked - user is moving')
                    return
                  }
                  
                  // Prevent duplicate manual refresh requests
                  if (isGeneratingRecommendations) {
                    console.log('🧠 Manual refresh already in progress, skipping...')
                    return
                  }
                  
                  console.log('🧠 User manually requested new recommendations')
                  setIsGeneratingRecommendations(true)
                  
                  // Cancel any previous request
                  if (abortControllerRef.current) {
                    abortControllerRef.current.abort()
                  }
                  abortControllerRef.current = new AbortController()
                  const signal = abortControllerRef.current.signal
                  
                  // Force generate new recommendations regardless of motion state
                  const now = Date.now()
                  localStorage.setItem('last-ai-recommendation-time', '0') // Reset timer
                  
                  try {
                    // Trigger recommendation generation
                    if (insights) {
                      const aiRecs: Recommendation[] = []
                    
                    // Generate AI recommendations based on user preferences
                    if (insights.userPersonality && insights.userPersonality.confidence > 0.3) {
                      const categories = Object.entries(insights.userPersonality)
                        .filter(([key, value]) => key !== 'confidence' && value === true)
                        .map(([key]) => key.replace('is', '').toLowerCase())
                      
                      // Generate 2-3 recommendations
                      const numToGenerate = Math.min(2 + Math.floor(Math.random() * 2), categories.length)
                      const shuffledCategories = categories.sort(() => 0.5 - Math.random()).slice(0, numToGenerate)
                      
                      // OPTIMIZED: Make a SINGLE API call for all categories
                      try {
                        console.log('🧠 Manual refresh: Fetching places from Foursquare for all categories in one request...')
                        const response = await fetch('/api/foursquare-places', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            lat: location.latitude,
                            lng: location.longitude,
                            radius: 5000,
                            limit: 30
                          }),
                          signal
                        })
                        
                        if (signal.aborted) {
                          console.log('🧠 Manual refresh request aborted')
                          return
                        }
                        
                        if (response.ok) {
                          const data = await response.json()
                          const allPlaces = data.items || data.results || []
                          console.log(`🧠 Manual refresh: Fetched ${allPlaces.length} places from Foursquare`)
                          
                          // Process each category from the same API response
                          for (const category of shuffledCategories) {
                            if (signal.aborted) break
                            
                            // Filter by category
                            const categoryPlaces = allPlaces.filter((place: any) => {
                              const placeCategory = place.category?.toLowerCase() || ''
                              const categoryLower = category.toLowerCase()
                              return (
                                placeCategory.includes(categoryLower) ||
                                (categoryLower === 'food' && ['restaurant', 'cafe', 'food', 'dining'].some(c => placeCategory.includes(c))) ||
                                (categoryLower === 'adventure' && ['activity', 'leisure', 'tourism'].some(c => placeCategory.includes(c))) ||
                                (categoryLower === 'culture' && ['entertainment', 'art', 'museum'].some(c => placeCategory.includes(c))) ||
                                (categoryLower === 'nature' && ['park', 'natural', 'outdoor'].some(c => placeCategory.includes(c)))
                              )
                            })
                            
                            if (categoryPlaces.length > 0) {
                              const place = categoryPlaces[Math.floor(Math.random() * categoryPlaces.length)]
                              const placeLat = place.location?.lat || place.geometry?.location?.lat
                              const placeLng = place.location?.lng || place.geometry?.location?.lng
                              
                              if (placeLat && placeLng && isFinite(placeLat) && isFinite(placeLng)) {
                                let photoUrl = place.photoUrl || place.mediaUrl
                                if (!photoUrl && place.photos && Array.isArray(place.photos) && place.photos.length > 0) {
                                  const firstPhoto = place.photos[0]
                                  photoUrl = firstPhoto.url || firstPhoto.prefix || firstPhoto.href || firstPhoto.link
                                }
                                
                                aiRecs.push({
                                  id: `ai-${category}-${Date.now()}-${category}`,
                                  title: place.title || place.name || `${category.charAt(0).toUpperCase() + category.slice(1)} Spot`,
                                  description: place.description || 
                                    (place.category ? `A great ${place.category.toLowerCase()} spot` : 
                                     `Found this ${category} place that looks perfect for you!`),
                                  category: place.category || category,
                                  location: {
                                    lat: placeLat,
                                    lng: placeLng
                                  },
                                  rating: place.rating || (4 + Math.random()),
                                  isAISuggestion: true,
                                  confidence: Math.round(insights.userPersonality.confidence * 100),
                                  reason: `Learned from your ${category} preferences`,
                                  timestamp: new Date(),
                                  fallbackImage: photoUrl ? undefined : getFallbackImage(place.category || category),
                                  photoUrl: photoUrl || undefined,
                                  mediaUrl: photoUrl || undefined,
                                  fsq_id: place.fsq_id || place.id
                                } as Recommendation)
                              }
                            }
                          }
                        }
                      } catch (error: any) {
                        if (error.name === 'AbortError') {
                          console.log('🧠 Manual refresh request was aborted')
                          return
                        }
                        console.log(`🧠 Error fetching recommendations in manual refresh:`, error)
                      }
                    }
                    
                    // OPTIMIZED: Reuse the same API response for discovery (already fetched above)
                    const discoveryCount = Math.min(1 + Math.floor(Math.random() * 2), 2)
                    let discoveryPlaces: any[] = []
                    
                    // Reuse places from the category fetch if available, otherwise fetch separately
                    try {
                      const discoveryResponse = await fetch('/api/foursquare-places', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          lat: location.latitude,
                          lng: location.longitude,
                          radius: 5000,
                          limit: 30
                        }),
                        signal
                      })
                      
                      if (signal.aborted) {
                        console.log('🧠 Discovery request aborted')
                        return
                      }
                      
                      if (discoveryResponse.ok) {
                        const discoveryData = await discoveryResponse.json()
                        discoveryPlaces = discoveryData.items || discoveryData.results || []
                      }
                    } catch (error: any) {
                      if (error.name !== 'AbortError') {
                        console.log('🧠 Error fetching discovery places in manual refresh:', error)
                      }
                    }
                      
                      for (let i = 0; i < discoveryCount; i++) {
                        if (discoveryPlaces.length > 0 && i < discoveryPlaces.length) {
                          const place = discoveryPlaces[i]
                          const recLat = place.location?.lat || place.geometry?.location?.lat
                          const recLng = place.location?.lng || place.geometry?.location?.lng
                          
                          if (recLat && recLng && isFinite(recLat) && isFinite(recLng)) {
                            let photoUrl = place.photoUrl || place.mediaUrl
                            if (!photoUrl && place.photos && Array.isArray(place.photos) && place.photos.length > 0) {
                              const firstPhoto = place.photos[0]
                              photoUrl = firstPhoto.url || firstPhoto.prefix || firstPhoto.href || firstPhoto.link
                            }
                            
                            aiRecs.push({
                              id: `discovery-${Date.now()}-${i}`,
                              title: place.title || place.name || `Hidden Gem #${i + 1}`,
                              description: place.description || 
                                (place.category ? `Discover this ${place.category.toLowerCase()} spot` : 
                                 "A cool spot I think you'll love!"),
                              category: place.category || 'adventure',
                              location: {
                                lat: recLat,
                                lng: recLng
                              },
                              rating: place.rating || (3.5 + Math.random() * 1.5),
                              isAISuggestion: true,
                              confidence: Math.round((insights.userPersonality?.confidence || 0.5) * 60),
                              reason: "Discovery mode - expanding your horizons",
                              timestamp: new Date(),
                              fallbackImage: photoUrl ? undefined : getFallbackImage(place.category || 'adventure'),
                              photoUrl: photoUrl || undefined,
                              mediaUrl: photoUrl || undefined,
                              fsq_id: place.fsq_id || place.id
                            } as Recommendation)
                            continue
                          }
                        }
                        
                        // Fallback to geocoding
                        const offsetLat = (Math.random() - 0.5) * 0.02
                        const offsetLng = (Math.random() - 0.5) * 0.02
                        const recLat = location.latitude + offsetLat
                        const recLng = location.longitude + offsetLng
                        const placeInfo = await fetchPlaceName(recLat, recLng)
                        
                        aiRecs.push({
                          id: `discovery-${Date.now()}-${i}`,
                          title: placeInfo?.name || `Hidden Gem #${i + 1}`,
                          description: placeInfo?.name ? 
                            "A cool spot I think you'll love!" :
                            "A cool spot I think you'll love!",
                          category: 'adventure',
                          location: {
                            lat: recLat,
                            lng: recLng
                          },
                          rating: 3.5 + Math.random() * 1.5,
                          isAISuggestion: true,
                          confidence: Math.round((insights.userPersonality?.confidence || 0.5) * 60),
                          reason: "Discovery mode - expanding your horizons",
                          timestamp: new Date(),
                          fallbackImage: placeInfo?.photoUrl ? undefined : getFallbackImage('adventure')
                        })
                      }
                    
                    // Add new recommendations
                    setRecommendations(prev => {
                      const combined = [...prev, ...aiRecs]
                      const updated = combined.slice(-8) // Keep only most recent 8
                      // Update clusters
                      const updatedClusters = clusterPins(updated)
                      setClusteredPins(updatedClusters)
                      return updated
                    })
                    
                    console.log(`🧠 Manually generated ${aiRecs.length} new AI recommendations`)
                    }
                  } catch (error: any) {
                    if (error.name === 'AbortError') {
                      console.log('🧠 Manual refresh aborted')
                      return
                    }
                    console.log('🧠 Error in manual refresh:', error)
                  } finally {
                    setIsGeneratingRecommendations(false)
                  }
                }}
                style={{
                  position: 'absolute',
                  top: '70px', // Below the My Location button
                  left: '20px',
                  background: isUserMoving ? 'rgba(255, 165, 0, 0.6)' : 'rgba(59, 130, 246, 0.9)',
                  color: 'white',
                  border: 'none',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  cursor: isUserMoving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  zIndex: 4,
                  opacity: isUserMoving ? 0.6 : 1
                }}
                title={isUserMoving ? "Refresh blocked while moving" : "Refresh Recommendations"}
              >
                {isUserMoving ? '⏸️' : '🔄'}
              </button>
            )}
          </div>
        )}

        {viewMode === "list" && (
          <div style={{
            background: 'rgba(30, 58, 138, 0.95)',
            borderRadius: '16px',
            height: '100%',
            padding: '20px',
            color: 'white',
            overflow: 'auto',
            backdropFilter: 'blur(15px)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            {/* NEW: Dynamic header based on filter type */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              marginBottom: '20px',
              gap: '15px'
            }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold' }}>
                  {recommendationFilter === "user" ? 
                    '👥 User Recommendations' :
                    recommendationFilter === "ai" ?
                    '🤖 AI Recommendations' :
                    isShowingCluster ?
                    `📍 ${currentCluster?.count || 0} Recommendations` : 
                    '🧠 Recommendations'
                  }
                </h3>
                {isShowingCluster && currentCluster && (
                  <p style={{ margin: 0, fontSize: '14px', opacity: 0.8, color: 'rgba(255,255,255,0.8)' }}>
                    {currentCluster.category} • {currentCluster.location.lat.toFixed(4)}, {currentCluster.location.lng.toFixed(4)}
                  </p>
                )}
              </div>
              
              {/* NEW: Back button when showing cluster recommendations */}
              {isShowingCluster && (
                <button
                  onClick={() => {
                    setIsShowingCluster(false)
                    setFilteredRecommendations([])
                    setCurrentCluster(null)
                    console.log('🧠 Returning to all recommendations')
                  }}
                  style={{
                      background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '0.75rem',
                      padding: '0.5rem 0.75rem',
                    color: 'white',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap',
                      backdropFilter: 'blur(10px)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                  }}
                >
                  ← Back to All
                </button>
              )}
            </div>
            
            {/* NEW: Show filtered recommendations based on filter type */}
            {(() => {
              let displayRecs: Recommendation[] = []
              if (recommendationFilter === "user") {
                displayRecs = filteredRecommendations
              } else if (recommendationFilter === "ai") {
                displayRecs = filteredRecommendations
              } else if (isShowingCluster) {
                displayRecs = filteredRecommendations
              } else {
                displayRecs = recommendations
              }
              
              return displayRecs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {displayRecs.map((rec) => (
                  <div
                    key={rec.id}
                    onClick={() => {
                      console.log('📍 Card clicked for:', rec.title)
                      setSelectedRecommendation(rec)
                      // First show read-only view, then user can choose to save/share
                      setShowReadOnlyRecommendation(true)
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      padding: '18px',
                      borderRadius: '16px',
                      border: '1px solid rgba(255,255,255,0.2)',
                      backdropFilter: 'blur(15px)',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'stretch', gap: '12px', height: '100%' }}>
                      {/* Thumbnail image - fills top to bottom */}
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
                        {/* Priority 1: Direct photoUrl from Foursquare API */}
                        {rec.photoUrl ? (
                          <img 
                            src={rec.photoUrl} 
                            alt={rec.title}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block'
                            }}
                            onError={(e) => {
                              console.log('🧠 Image failed to load (photoUrl):', rec.photoUrl?.substring(0, 50))
                              // Hide this image and let fallback handle it
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              // Try to show fallback
                              const container = target.parentElement
                              if (container) {
                                const fallback = container.querySelector('.image-fallback') as HTMLElement
                                if (fallback) fallback.style.display = 'flex'
                              }
                            }}
                            onLoad={() => {
                              console.log('🧠 Image loaded successfully (photoUrl):', rec.title)
                            }}
                          />
                        ) : rec.mediaUrl ? (
                          /* Priority 2: mediaUrl as fallback */
                          <img 
                            src={rec.mediaUrl} 
                            alt={rec.title}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block'
                            }}
                            onError={(e) => {
                              console.log('🧠 Image failed to load (mediaUrl):', rec.mediaUrl?.substring(0, 50))
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              const container = target.parentElement
                              if (container) {
                                const fallback = container.querySelector('.image-fallback') as HTMLElement
                                if (fallback) fallback.style.display = 'flex'
                              }
                            }}
                            onLoad={() => {
                              console.log('🧠 Image loaded successfully (mediaUrl):', rec.title)
                            }}
                          />
                        ) : rec.fsq_id ? (
                          /* Priority 3: FsqImage component for places with fsq_id */
                          <FsqImage 
                            fsqId={rec.fsq_id}
                            lat={rec.location?.lat}
                            lng={rec.location?.lng}
                            alt={rec.title}
                            fill
                            style={{
                              objectFit: 'cover'
                            }}
                          />
                        ) : null}
                        
                        {/* Fallback display - shown when no image loads or no image URL available */}
                        <div 
                          className="image-fallback"
                          style={{
                            display: rec.photoUrl || rec.mediaUrl ? 'none' : 'flex',
                            width: '100%',
                            height: '100%',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: rec.photoUrl || rec.mediaUrl ? 'absolute' : 'relative',
                            top: 0,
                            left: 0,
                            background: rec.fallbackImage ? 'transparent' : 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)'
                          }}
                        >
                          {rec.fallbackImage ? (
                            <span style={{ fontSize: '32px' }}>{rec.fallbackImage}</span>
                          ) : (
                            <span style={{ fontSize: '20px' }}>📍</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Content area */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        {/* Top section - Title and AI badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', flex: 1 }}>
                            {rec.title}
                          </h4>
                          <span style={{
                            background: rec.isAISuggestion ? 'rgba(59, 130, 246, 0.8)' : 'rgba(16, 185, 129, 0.8)',
                            padding: '4px 8px',
                            borderRadius: '8px',
                            fontSize: '10px',
                            fontWeight: '500',
                            whiteSpace: 'nowrap',
                            marginLeft: '8px'
                          }}>
                            {rec.isAISuggestion ? '🤖 AI' : '👥 Community'}
                          </span>
                        </div>
                        
                        {/* Category */}
                        <span style={{
                          background: 'rgba(255,255,255,0.1)',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          color: 'rgba(255,255,255,0.8)',
                          alignSelf: 'flex-start',
                          marginBottom: '8px'
                        }}>
                          {rec.category}
                        </span>
                      </div>
                    </div>
                    
                    <p style={{ margin: '0 0 12px 0', fontSize: '14px', opacity: 0.9, lineHeight: '1.5' }}>
                      {rec.description}
                    </p>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '11px', opacity: 0.8, whiteSpace: 'nowrap' }}>
                          📍 {rec.rating.toFixed(1)}/5
                        </span>
                        {rec.isAISuggestion && (
                          <span style={{ fontSize: '11px', opacity: 0.8, whiteSpace: 'nowrap' }}>
                            🎯 {Math.round(rec.confidence)}%
                          </span>
                        )}
                        <span style={{ fontSize: '11px', opacity: 0.8, whiteSpace: 'nowrap' }}>
                          📍 {rec.title.includes('Current Location') ? 'Current Location' : 'Nearby Area'}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button 
                          onClick={() => {
                            console.log('🗺️ Navigating to location:', rec.location)
                            // Switch to map view and center on this location
                            setViewMode('map')
                            if (mapInstanceRef.current) {
                              mapInstanceRef.current.setCenter({ lat: rec.location.lat, lng: rec.location.lng })
                              mapInstanceRef.current.setZoom(18) // Close zoom for precise location
                              setUserHasInteracted(true) // Mark as user interaction
                              console.log('🗺️ Map centered on recommendation location')
                            }
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
                          🗺️ Map
                        </button>
                        
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '40px 20px',
                borderRadius: '16px',
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>
                  {isShowingCluster ? '📍' : '🧠'}
                </div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
                  {isShowingCluster ? 
                    'No Recommendations in This Cluster' : 
                    'No AI Recommendations Yet'
                  }
                </h4>
                <p style={{ margin: 0, opacity: 0.8, fontSize: '14px' }}>
                  {isShowingCluster ? 
                    'This cluster appears to be empty. Try another location!' :
                    'Start pinning places and the AI will learn your preferences!'
                  }
                </p>
              </div>
              )
            })()}
          </div>
        )}

        {viewMode === "insights" && (
          <div style={{
            background: 'rgba(30, 58, 138, 0.95)',
            borderRadius: '16px',
            height: '100%',
            padding: '20px',
            color: 'white',
            overflow: 'auto',
            backdropFilter: 'blur(15px)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 'bold' }}>
              🧠 Your AI Learning Progress
            </h3>
            
            {learningProgress ? (
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.1)',
                  padding: '15px',
                  borderRadius: '12px',
                  marginBottom: '15px'
                }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
                    📊 Learning Level: {learningProgress.level}
                  </h4>
                  <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    height: '8px',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${learningProgress.progress}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #10b981, #3b82f6)',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.8 }}>
                    {learningProgress.pinsAnalyzed} pins analyzed • {Math.round(learningProgress.confidence)}% confidence
                  </p>
                </div>

                {/* AI Personality Insights */}
                {insights && insights.userPersonality && insights.userPersonality.confidence > 0.2 && (
                  <div style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: '15px',
                    borderRadius: '12px',
                    marginBottom: '15px'
                  }}>
                    <h4 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>
                      🎭 Your AI Personality
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {Object.entries(insights.userPersonality)
                        .filter(([key, value]) => key !== 'confidence' && value === true)
                        .map(([key, value]) => (
                          <span key={key} style={{
                            background: 'rgba(59, 130, 246, 0.8)',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            {key.replace('is', '').replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        ))}
                    </div>
                    <p style={{ margin: '10px 0 0 0', fontSize: '12px', opacity: 0.7 }}>
                      AI Confidence: {Math.round(insights.userPersonality.confidence * 100)}%
                    </p>
                  </div>
                )}

                {/* Recommendation Preferences */}
                {insights && insights.recommendationPreferences && (
                  <div style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: '15px',
                    borderRadius: '12px',
                    marginBottom: '15px'
                  }}>
                    <h4 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>
                      🎯 Recommendation Style
                    </h4>
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontSize: '14px' }}>Similar to what you love</span>
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>
                          {Math.round(insights.recommendationPreferences.similarToLikes * 100)}%
                        </span>
                      </div>
                      <div style={{
                        background: 'rgba(0,0,0,0.3)',
                        height: '6px',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${insights.recommendationPreferences.similarToLikes * 100}%`,
                          height: '100%',
                          background: '#10b981',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontSize: '14px' }}>Discovery & new experiences</span>
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>
                          {Math.round(insights.recommendationPreferences.discoveryMode * 100)}%
                        </span>
                      </div>
                      <div style={{
                        background: 'rgba(0,0,0,0.3)',
                        height: '6px',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${insights.recommendationPreferences.discoveryMode * 100}%`,
                          height: '100%',
                          background: '#3b82f6',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '20px',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <p style={{ margin: 0, opacity: 0.8 }}>
                  Start pinning places to see your AI insights!
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Read-Only Recommendation View - Shows completed recommendation first */}
      {showReadOnlyRecommendation && selectedRecommendation && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%)',
            zIndex: 2000,
            overflowY: 'auto',
            padding: '20px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <button
              onClick={() => {
                setShowReadOnlyRecommendation(false)
                setSelectedRecommendation(null)
              }}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.9rem',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
              }}
            >
              ← Back
            </button>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'white' }}>
              {selectedRecommendation.isAISuggestion ? '🤖 AI Recommendation' : '👤 User Recommendation'}
            </div>
            <div style={{ width: '60px' }}></div>
          </div>

          {/* Image Carousel */}
          <div
            style={{
              width: '100%',
              height: '300px',
              borderRadius: '16px',
              overflow: 'hidden',
              marginBottom: '20px',
              background: 'rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {selectedRecommendation.photoUrl || selectedRecommendation.mediaUrl ? (
              <img
                src={selectedRecommendation.photoUrl || selectedRecommendation.mediaUrl}
                alt={selectedRecommendation.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div style={{ fontSize: '4rem' }}>
                {selectedRecommendation.fallbackImage || '📍'}
              </div>
            )}
          </div>

          {/* Content Card */}
          <div
            style={{
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '20px',
            }}
          >
            {/* Title */}
            <h2 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '12px', marginTop: 0 }}>
              {selectedRecommendation.title || 'Location'}
            </h2>

            {/* Rating */}
            {selectedRecommendation.rating && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ fontSize: '1.2rem' }}>⭐</div>
                <span style={{ color: 'white', fontSize: '1.1rem', fontWeight: 'bold' }}>
                  {selectedRecommendation.rating.toFixed(1)}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                  / 5.0
                </span>
              </div>
            )}

            {/* Description */}
            {selectedRecommendation.description && (
              <p style={{ color: 'rgba(255,255,255,0.9)', lineHeight: '1.6', margin: '0 0 16px 0' }}>
                {selectedRecommendation.description}
              </p>
            )}

            {/* Reason (for AI recommendations) */}
            {selectedRecommendation.reason && (
              <div
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '12px',
                  marginTop: '12px',
                }}
              >
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>
                  Why we recommend this:
                </div>
                <div style={{ color: 'white', fontSize: '0.95rem' }}>
                  {selectedRecommendation.reason}
                </div>
              </div>
            )}

            {/* Category */}
            {selectedRecommendation.category && (
              <div
                style={{
                  display: 'inline-block',
                  background: 'rgba(255,255,255,0.2)',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  color: 'white',
                  marginTop: '16px',
                }}
              >
                {selectedRecommendation.category}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => {
                console.log('💾 Save button clicked - opening editable form')
                // Prepare data and open editable form
                setRecommendationFormData({
                  mediaUrl: selectedRecommendation.photoUrl || selectedRecommendation.mediaUrl || '',
                  locationName: selectedRecommendation.title || 'Location',
                  foursquareData: selectedRecommendation.fsq_id ? {
                    placeName: selectedRecommendation.title || null,
                    description: selectedRecommendation.description || null,
                    latitude: selectedRecommendation.location?.lat,
                    longitude: selectedRecommendation.location?.lng,
                  } : undefined,
                })
                setShowReadOnlyRecommendation(false)
                setShowRecommendationForm(true)
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.25)'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'
              }}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(15px)',
                border: '1px solid rgba(255,255,255,0.2)',
                padding: '16px',
                borderRadius: '12px',
                color: 'white',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              }}
            >
              💾 Save to Library
            </button>
            <button
              onClick={() => {
                console.log('📤 Share button clicked - opening editable form')
                // Prepare data and open editable form for sharing
                setRecommendationFormData({
                  mediaUrl: selectedRecommendation.photoUrl || selectedRecommendation.mediaUrl || '',
                  locationName: selectedRecommendation.title || 'Location',
                  foursquareData: selectedRecommendation.fsq_id ? {
                    placeName: selectedRecommendation.title || null,
                    description: selectedRecommendation.description || null,
                    latitude: selectedRecommendation.location?.lat,
                    longitude: selectedRecommendation.location?.lng,
                  } : undefined,
                })
                setShowReadOnlyRecommendation(false)
                setShowRecommendationForm(true)
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.25)'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'
              }}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(15px)',
                border: '1px solid rgba(255,255,255,0.2)',
                padding: '16px',
                borderRadius: '12px',
                color: 'white',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              }}
            >
              📤 Share
            </button>
          </div>
        </div>
      )}

      {/* Recommendation Form Modal - Enhanced for recommendations (Editable) */}
      {showRecommendationForm && recommendationFormData && selectedRecommendation && (
        <RecommendationForm
          mediaUrl={recommendationFormData.mediaUrl || ''}
          locationName={recommendationFormData.locationName}
          foursquareData={recommendationFormData.foursquareData}
          additionalPhotos={selectedRecommendation.additionalPhotos || (selectedRecommendation.photoUrl ? [{ url: selectedRecommendation.photoUrl, placeName: selectedRecommendation.title }] : undefined)}
          onSave={() => {
            console.log('📍 Saving recommendation to library (without recommending)')
            // Use the existing onSkip logic for saving
            const savedPin: PinData = {
              id: Date.now().toString(),
              latitude: selectedRecommendation.location?.lat || 0,
              longitude: selectedRecommendation.location?.lng || 0,
              locationName: selectedRecommendation.title || 'Location',
              mediaUrl: selectedRecommendation.photoUrl || selectedRecommendation.mediaUrl || null,
              mediaType: (selectedRecommendation.photoUrl || selectedRecommendation.mediaUrl) ? "photo" : null,
              audioUrl: null,
              timestamp: new Date().toISOString(),
              title: selectedRecommendation.title || 'Location',
              description: selectedRecommendation.description || undefined,
              tags: [
                "saved",
                selectedRecommendation.category?.toLowerCase() || "general"
              ],
              isRecommended: false,
              types: ["saved"],
              category: selectedRecommendation.category || "general",
              isAISuggestion: selectedRecommendation.isAISuggestion || false
            }
            addPin(savedPin)
            setShowRecommendationForm(false)
            setShowReadOnlyRecommendation(false)
            setRecommendationFormData(null)
            setSelectedRecommendation(null)
            console.log('✅ Pin saved to library!')
          }}
          onShare={() => {
            console.log('📤 Share on social media - to be implemented')
            // TODO: Navigate to platform select screen or implement sharing
            // For now, just log
          }}
          onRecommend={async (rating: number, review: string) => {
            console.log('📍 Recommendation submitted:', { rating, review, rec: selectedRecommendation })
            
            // Create a new recommendation pin
            const newRecommendation: PinData = {
              id: Date.now().toString(),
              latitude: selectedRecommendation.location?.lat || 0,
              longitude: selectedRecommendation.location?.lng || 0,
              locationName: selectedRecommendation.title || 'Location',
              mediaUrl: selectedRecommendation.photoUrl || selectedRecommendation.mediaUrl || null,
              mediaType: (selectedRecommendation.photoUrl || selectedRecommendation.mediaUrl) ? "photo" : null,
              audioUrl: null,
              timestamp: new Date().toISOString(),
              title: `Recommendation - ${selectedRecommendation.title || 'Location'}`,
              description: selectedRecommendation.description 
                ? `${review}\n\n${selectedRecommendation.description}` 
                : review,
              tags: [
                "recommendation", 
                "user-submitted",
                selectedRecommendation.category?.toLowerCase() || "general"
              ],
              isRecommended: true,
              rating: rating,
              types: ["recommendation"],
              category: selectedRecommendation.category || "general",
              personalThoughts: review,
              isAISuggestion: selectedRecommendation.isAISuggestion || false
            }

            console.log('📍 Created recommendation pin:', newRecommendation)
            
            // Save to library as a recommendation
            addPin(newRecommendation)
            
            // Close the form
            setShowRecommendationForm(false)
            setShowReadOnlyRecommendation(false)
            setRecommendationFormData(null)
            setSelectedRecommendation(null)
            
            // Show success message (you can add a toast/notification here)
            console.log('✅ Recommendation saved!')
          }}
          onSkip={() => {
            console.log('📍 Recommendation skipped - saving to library without recommendation')
            
            // Save to library without recommendation (just as a saved pin)
            const savedPin: PinData = {
              id: Date.now().toString(),
              latitude: selectedRecommendation.location?.lat || 0,
              longitude: selectedRecommendation.location?.lng || 0,
              locationName: selectedRecommendation.title || 'Location',
              mediaUrl: selectedRecommendation.photoUrl || selectedRecommendation.mediaUrl || null,
              mediaType: (selectedRecommendation.photoUrl || selectedRecommendation.mediaUrl) ? "photo" : null,
              audioUrl: null,
              timestamp: new Date().toISOString(),
              title: selectedRecommendation.title || 'Location',
              description: selectedRecommendation.description || undefined,
              tags: [
                "saved",
                selectedRecommendation.category?.toLowerCase() || "general"
              ],
              isRecommended: false, // Not a recommendation, just saved
              types: ["saved"],
              category: selectedRecommendation.category || "general",
              isAISuggestion: selectedRecommendation.isAISuggestion || false
            }

            console.log('📍 Created saved pin:', savedPin)
            
            // Save to library
            addPin(savedPin)
            
            // Close the form
            setShowRecommendationForm(false)
            setShowReadOnlyRecommendation(false)
            setRecommendationFormData(null)
            setSelectedRecommendation(null)
            
            console.log('✅ Pin saved to library!')
          }}
        />
      )}
    </div>
  )
} 
