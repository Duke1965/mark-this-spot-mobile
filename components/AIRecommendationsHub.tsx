"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAIBehaviorTracker } from '../hooks/useAIBehaviorTracker'
import { useLocationServices } from '../hooks/useLocationServices'
import { usePinStorage } from '../hooks/usePinStorage'
import { RecommendationForm } from './RecommendationForm'
import { FsqImage } from './FsqImage'
import type { PinData } from '../lib/types'
// Google Maps removed - using Mapbox only
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MAPBOX_API_KEY } from '@/lib/mapConfig'
import { auth } from '@/lib/firebase'

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
  onSharePin?: (pin: PinData) => void
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
  onSharePin,
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
    placeDescription?: string | null
  } | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  
  // NEW: Add ref to track the user location marker
  // Google Maps CSS removed - migrating to Mapbox
  
  // Use passed userLocation if available, otherwise fall back to hook location
  const location = userLocation || hookLocation
  
  // Initialize component when location becomes available
  useEffect(() => {
    // Handle both location formats: {latitude, longitude} or {lat, lng}
    const lat = location?.latitude || location?.lat
    const lng = location?.longitude || location?.lng
    if (location && lat && lng && !isInitialized) {
      console.log('🧠 AIRecommendationsHub: Initializing with location:', location)
      setIsInitialized(true)
    }
  }, [location, isInitialized])
  
  // Map view - Mapbox implementation
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const recommendationMarkersRef = useRef<any[]>([])
  const poiMarkersRef = useRef<Map<string, any>>(new Map())
  const userMarkerRef = useRef<any>(null)
  const isMapInitializedRef = useRef<boolean>(false)
  const lastLocationCoordsRef = useRef<{ lat: number; lng: number } | null>(null)
  
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

  // Shared clustering logic (exact coordinate grouping).
  // Defined here so it can be used before the hook-defined `clusterPins`.
  function clusterPinsImpl(pins: Recommendation[]) {
    const clustersByKey = new Map<string, ClusteredPin>()
    const validPins = pins.filter((pin) => {
      if (
        !pin.location ||
        !pin.location.lat ||
        !pin.location.lng ||
        !isFinite(pin.location.lat) ||
        !isFinite(pin.location.lng)
      ) {
        return false
      }
      return true
    })

    validPins.forEach((pin) => {
      const key = `${pin.location.lat.toFixed(6)},${pin.location.lng.toFixed(6)}`
      const existing = clustersByKey.get(key)
      if (existing) {
        existing.recommendations.push(pin)
        existing.count = existing.recommendations.length
        if (pin.category && !existing.category.includes(pin.category)) {
          existing.category = existing.category ? `${existing.category}, ${pin.category}` : pin.category
        }
      } else {
        clustersByKey.set(key, {
          id: `cluster-${pin.id}`,
          location: pin.location,
          count: 1,
          recommendations: [pin],
          category: pin.category || 'general'
        })
      }
    })

    return Array.from(clustersByKey.values())
  }

  const getIdToken = useCallback(async (): Promise<string | null> => {
    try {
      const u: any = (auth as any)?.currentUser
      if (!u?.getIdToken) return null
      return await u.getIdToken()
    } catch {
      return null
    }
  }, [])

  const loadRecommendationsFromServer = useCallback(async () => {
    const lat = location?.latitude || location?.lat
    const lng = location?.longitude || location?.lng
    if (!lat || !lng) return
    try {
      const token = await getIdToken()
      const resp = await fetch(`/api/recommendations/query?lat=${lat}&lng=${lng}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      })
      if (!resp.ok) return
      const data = await resp.json()
      const serverRecs: Recommendation[] = Array.isArray(data?.recommendations) ? data.recommendations : []
      if (serverRecs.length > 0) {
        setRecommendations(serverRecs)
        setClusteredPins(clusterPinsImpl(serverRecs))
      }
    } catch {
      // ignore
    }
  }, [getIdToken, location?.lat, location?.latitude, location?.lng, location?.longitude])

  // Firestore-backed recommendations (community + personalized AI) for this area.
  useEffect(() => {
    if (!isInitialized) return
    loadRecommendationsFromServer()
  }, [isInitialized, loadRecommendationsFromServer])

  const persistAIRecommendationsToServer = useCallback(
    async (items: Recommendation[]) => {
      if (!items || items.length === 0) return
      const token = await getIdToken()
      if (!token) return
      try {
        await fetch('/api/recommendations/upsert-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            items: items
              .filter((r) => r.isAISuggestion)
              .map((r) => ({
                id: r.id,
                title: r.title,
                description: r.description,
                category: r.category,
                location: r.location,
                rating: r.rating,
                confidence: r.confidence,
                reason: r.reason
              }))
          })
        })
      } catch {
        // ignore
      }
    },
    [getIdToken]
  )
  
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
  
  // Google Maps marker code removed - migrating to Mapbox

  // NEW: Pin clustering function
  const clusterPins = useCallback((pins: Recommendation[]) => {
    const clustersByKey = new Map<string, ClusteredPin>()
    
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
    
    // IMPORTANT: cluster by exact coordinate (rounded) so pins stay at their true location.
    // This avoids "nearby" clustering that can make a recommendation look misplaced.
    validPins.forEach((pin) => {
      const key = `${pin.location.lat.toFixed(6)},${pin.location.lng.toFixed(6)}`
      const existing = clustersByKey.get(key)
      if (existing) {
        existing.recommendations.push(pin)
        existing.count = existing.recommendations.length
        if (pin.category && !existing.category.includes(pin.category)) {
          existing.category = existing.category ? `${existing.category}, ${pin.category}` : pin.category
        }
      } else {
        clustersByKey.set(key, {
          id: `cluster-${pin.id}`,
          location: pin.location,
          count: 1,
          recommendations: [pin],
          category: pin.category || 'general'
        })
      }
    })
    
    const clusters = Array.from(clustersByKey.values())
    console.log(`🧠 Clustered ${pins.length} pins into ${clusters.length} clusters (exact coords)`)
    return clusters
  }, [])

  // Helper function to get POI icon based on category
  const getPOIIcon = useCallback((category: string = ''): string => {
    const cat = category.toLowerCase()
    if (cat.includes('restaurant') || cat.includes('food') || cat.includes('dining')) return '🍽️'
    if (cat.includes('cafe') || cat.includes('coffee')) return '☕'
    if (cat.includes('museum') || cat.includes('gallery') || cat.includes('art')) return '🎨'
    if (cat.includes('monument') || cat.includes('memorial') || cat.includes('landmark')) return '🏛️'
    if (cat.includes('park') || cat.includes('garden')) return '🌳'
    if (cat.includes('beach') || cat.includes('nature')) return '🏖️'
    if (cat.includes('hotel') || cat.includes('lodging')) return '🏨'
    if (cat.includes('church') || cat.includes('temple') || cat.includes('worship')) return '⛪'
    return '📍' // Default icon
  }, [])

  // Fetch POIs from pin-intel and display them on the map
  const fetchAndDisplayPOIs = useCallback(async (map: any, lat: number, lng: number) => {
    try {
      console.log('🏪 Fetching POIs for map display...')
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
        console.warn('⚠️ Failed to fetch POIs:', response.status)
        return
      }
      
      const data = await response.json()
      const places = data.places || []
      
      console.log(`✅ Found ${places.length} POIs to display on map`)
      
      // Clear existing POI markers
      poiMarkersRef.current.forEach(marker => marker.remove())
      poiMarkersRef.current.clear()
      
      // Add markers for each POI (limit to 30 to avoid clutter)
      places.slice(0, 30).forEach((place: any) => {
        const category = place.categories?.[0] || ''
        const icon = getPOIIcon(category)
        
        // Create POI marker element
        const poiElement = document.createElement('div')
        poiElement.style.width = '28px'
        poiElement.style.height = '28px'
        poiElement.style.fontSize = '20px'
        poiElement.style.display = 'flex'
        poiElement.style.alignItems = 'center'
        poiElement.style.justifyContent = 'center'
        poiElement.style.cursor = 'pointer'
        poiElement.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))'
        poiElement.style.transition = 'transform 0.2s ease'
        poiElement.textContent = icon
        poiElement.title = place.name || category || 'POI'
        
        // Add hover effect
        poiElement.addEventListener('mouseenter', () => {
          poiElement.style.transform = 'scale(1.3)'
        })
        poiElement.addEventListener('mouseleave', () => {
          poiElement.style.transform = 'scale(1)'
        })
        
        // Add click handler to show POI details
        poiElement.addEventListener('click', () => {
          console.log('📍 POI clicked:', place.name)
          // Could open a popup or add to recommendations here
        })
        
        const marker = new mapboxgl.Marker({
          element: poiElement
        })
          .setLngLat([place.lng, place.lat])
          .addTo(map)
        
        poiMarkersRef.current.set(place.id || `poi-${Math.random().toString(36).substr(2, 9)}`, marker)
      })
      
      console.log(`✅ Added ${poiMarkersRef.current.size} POI markers to map`)
    } catch (error) {
      console.error('❌ Error fetching POIs for map:', error)
    }
  }, [getPOIIcon])

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
  
  // Generate mock USER recommendations using REAL places from Mapbox API (different from AI mocks)
  const generateMockUserRecommendations = useCallback(async (lat: number, lng: number, signal?: AbortSignal): Promise<Recommendation[]> => {
    try {
      // Using pin-intel gateway (Foursquare) for nearby travel POIs
      // Categories: restaurants, coffee shops, historical buildings, tourist attractions, etc.
      // Already filtered for travel-related places only
      const response = await fetch(`/api/pinit/pin-intel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, precision: 5 }),
        signal
      })

      if (signal?.aborted) {
        return []
      }

      if (response.ok) {
        const data = await response.json()
        // pin-intel gateway returns {places: [...]}
        const places = data.places || []
        
        if (places.length === 0) {
          return []
        }

        // DETERMINISTIC: Sort by ID and take places 4-7 (different from AI which takes 0-3)
        // This ensures AI and User mocks show different places
        const sortedPlaces = [...places].sort((a: any, b: any) => {
          const idA = a.id || ''
          const idB = b.id || ''
          return idA.localeCompare(idB)
        }).slice(4, 8) // Take different places than AI mocks

        return sortedPlaces.map((place: any, index: number) => {
          // Foursquare format: { lat, lng } directly on the place object
          const placeLat = place.lat || place.location?.lat || lat
          const placeLng = place.lng || place.location?.lng || lng
          
          // Foursquare doesn't provide photos in pin-intel response
          const photoUrl = undefined

          const placeCategories = place.categories || []
          const category = placeCategories.join(', ') || place.category || "general"

          return {
            id: `mock-user-${place.id || index}`,
            title: place.name || "Local Place",
            description: `${category} • ${place.distance_m ? `${place.distance_m}m away` : 'Nearby'}`,
            category: category,
            location: {
              lat: placeLat,
              lng: placeLng,
            },
            rating: 4.0,
            isAISuggestion: false, // User recommendations
            confidence: 0,
            reason: "Recommended by community members",
            timestamp: new Date(),
            photoUrl: photoUrl || undefined,
            mediaUrl: photoUrl || undefined,
            fallbackImage: photoUrl ? undefined : getFallbackImage(category.toLowerCase().split(' ')[0])
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
        // Fetch real places from Mapbox for mock user recommendations
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


  // Generate mock AI recommendations using REAL places from Mapbox API
  const generateMockAIRecommendations = useCallback(async (lat: number, lng: number, signal?: AbortSignal): Promise<Recommendation[]> => {
    try {
      // Using Mapbox Search API for nearby travel POIs (restaurants, cafes, monuments, museums, art galleries, churches, tourism)
      const response = await fetch(`/api/places/search?lat=${lat}&lng=${lng}&radius=5000&limit=8&categories=restaurant,cafe,monument,museum,art_gallery,place_of_worship,tourism`, {
        signal
      })

      if (signal?.aborted) {
        return []
      }

      if (response.ok) {
        const data = await response.json()
        // Mapbox Search returns {pois: [...]}
        const places = data.pois || []
        
        if (places.length === 0) {
          return []
        }

        // DETERMINISTIC: Sort by ID and take first 4 for AI mocks
        const sortedPlaces = [...places].sort((a: any, b: any) => {
          const idA = a.id || ''
          const idB = b.id || ''
          return idA.localeCompare(idB)
        }).slice(0, 4)

        return sortedPlaces.map((place: any, index: number) => {
          const placeLat = place.location?.lat || lat
          const placeLng = place.location?.lng || lng
          
          // Mapbox doesn't provide photos, so no photoUrl
          const photoUrl = undefined

          const category = place.category || "general"

          return {
            id: `mock-ai-${place.id || index}`,
            title: place.name || "Local Place",
            description: place.description || 
              (place.category ? `A great ${place.category.toLowerCase()} spot in your area` : 
               "A recommended location nearby"),
            category: category,
            location: {
              lat: placeLat,
              lng: placeLng,
            },
            rating: 4.0,
            isAISuggestion: true,
            confidence: 20, // Low confidence for mock data
            reason: "Local area discovery - exploring your neighborhood",
            timestamp: new Date(),
            photoUrl: photoUrl || undefined,
            mediaUrl: photoUrl || undefined,
            fallbackImage: photoUrl ? undefined : getFallbackImage(category.toLowerCase().split(' ')[0])
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
                console.log('🧠 Fetching travel places from pin-intel gateway (Foursquare) for all categories in one request...')
                // Use pin-intel gateway which already filters for travel-related POIs
                // Categories: restaurants, cafes, monuments, museums, art galleries, churches, tourism, etc.
                const response = await fetch(`/api/pinit/pin-intel`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    lat: location.latitude || location.lat,
                    lng: location.longitude || location.lng,
                    precision: 5
                  }),
                  signal // Add abort signal
                })
                
                if (signal.aborted) {
                  console.log('🧠 Request aborted')
                  return
                }
                
                if (response.ok) {
                  const data = await response.json()
                  const allPlaces = data.places || [] // pin-intel returns 'places', not 'pois'
                  console.log(`🧠 Fetched ${allPlaces.length} travel places from pin-intel gateway`)
                  
                  // Process each category from the same API response
                  // DETERMINISTIC: Sort places by ID for consistent selection (same region = same places)
                  const sortedPlaces = [...allPlaces].sort((a: any, b: any) => {
                    const idA = a.id || ''
                    const idB = b.id || ''
                    return idA.localeCompare(idB)
                  })
                  
                  for (const category of shuffledCategories) {
                    if (signal.aborted) break
                    
                    // Filter places by category preference - match category names from Foursquare
                    const categoryPlaces = sortedPlaces.filter((place: any) => {
                      const placeCategories = place.categories || []
                      const categoryStr = placeCategories.join(' ').toLowerCase() || place.category?.toLowerCase() || ''
                      const categoryLower = category.toLowerCase()
                      
                      return (
                        categoryStr.includes(categoryLower) ||
                        (categoryLower === 'food' && ['restaurant', 'cafe', 'food', 'dining', 'catering', 'coffee'].some(c => categoryStr.includes(c))) ||
                        (categoryLower === 'adventure' && ['activity', 'leisure', 'tourism', 'outdoor', 'sport'].some(c => categoryStr.includes(c))) ||
                        (categoryLower === 'culture' && ['entertainment', 'art', 'museum', 'theater', 'gallery', 'cultural', 'monument', 'historic'].some(c => categoryStr.includes(c))) ||
                        (categoryLower === 'nature' && ['park', 'natural', 'outdoor', 'garden', 'beach', 'hiking'].some(c => categoryStr.includes(c)))
                      )
                    })
                    
                    if (categoryPlaces.length > 0) {
                      // DETERMINISTIC: Use first place (sorted by ID) instead of random for consistency
                      // Same region will always get the same recommendations
                      const selectedPlace = categoryPlaces[0]
                      
                      // CRITICAL: Validate coordinates before adding recommendation
                      // Foursquare format: { lat, lng } directly on the place object
                      const placeLat = selectedPlace.lat || selectedPlace.location?.lat || selectedPlace.geometry?.location?.lat
                      const placeLng = selectedPlace.lng || selectedPlace.location?.lng || selectedPlace.geometry?.location?.lng
                      
                      // Skip places without valid coordinates
                      if (!placeLat || !placeLng || !isFinite(placeLat) || !isFinite(placeLng)) {
                        console.warn('🧠 Skipping place without valid coordinates:', selectedPlace.name)
                        continue
                      }
                      
                    // Foursquare doesn't provide photos in pin-intel response
                    const photoUrl = undefined
                      
                      // Use Foursquare's real name and categories
                      const placeTitle = selectedPlace.name || 'Interesting Place'
                      const placeCategories = selectedPlace.categories || []
                      const categoryStr = placeCategories.join(', ') || selectedPlace.category || category
                      const placeDescription = `${categoryStr} • ${selectedPlace.distance_m ? `${selectedPlace.distance_m}m away` : 'Nearby'}`
                      
                      console.log(`🧠 AI Recommendation using Foursquare data for ${placeTitle}:`, {
                        categories: placeCategories,
                        category: categoryStr,
                        distance: selectedPlace.distance_m,
                        hasPhoto: !!photoUrl
                      })
                      
                      aiRecs.push({
                        id: `ai-${category}-${selectedPlace.id || Date.now()}`,
                        title: placeTitle,
                        description: placeDescription,
                        category: categoryStr,
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
                        fsq_id: selectedPlace.id || undefined
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
                  
                  // Use Mapbox Search API with safeguards - focus on travel POIs
                  const response = await fetch(`/api/places/search?lat=${location.latitude || location.lat}&lng=${location.longitude || location.lng}&radius=5000&limit=5&categories=restaurant,cafe,monument,museum,art_gallery,place_of_worship,tourism`, {
                    signal // Add abort signal
                  })
                  
                  if (signal.aborted) {
                    console.log('🧠 Request aborted')
                    return
                  }
                
                if (response.ok) {
                  const data = await response.json()
                  // Mapbox Search returns {pois: [...]}
                  const places = data.pois || []
                  
                  // DETERMINISTIC: Sort places by ID for consistent selection
                  const sortedPlaces = [...places].sort((a: any, b: any) => {
                    const idA = a.id || ''
                    const idB = b.id || ''
                    return idA.localeCompare(idB)
                  })
                  
                  // Generate 3-4 recommendations from local places (deterministic - same places each time)
                  const numRecommendations = Math.min(4, sortedPlaces.length)
                  const selectedPlaces = sortedPlaces.slice(0, numRecommendations)
                  
                  for (const place of selectedPlaces) {
                    // Handle both new format (category) and old format (types)
                    const category = place.category || "general"
                    
                    // CRITICAL: Extract location coordinates - must have valid lat/lng or skip this place
                    const placeLat = place.location?.lat
                    const placeLng = place.location?.lng
                    
                    // Skip places without valid coordinates - don't fall back to user location!
                    if (!placeLat || !placeLng || !isFinite(placeLat) || !isFinite(placeLng)) {
                      console.warn('🧠 Skipping place without valid coordinates:', place.name, place)
                      continue
                    }
                    
                    // Mapbox doesn't provide photos, so no photoUrl
                    let photoUrl = undefined
                    
                    console.log(`🧠 Recommendation image for ${place.name}:`, {
                      hasPhotoUrl: false,
                      hasMediaUrl: false,
                      hasPhotosArray: false,
                      finalPhotoUrl: 'none',
                      id: place.id
                    })
                    
                    // Use Mapbox's real title and description - prioritize actual data over generic text
                    const placeTitle = place.name || 'Local Spot'
                    const placeDescription = place.description || 
                      (place.category ? `A great ${place.category.toLowerCase()} spot in your area` : 
                       `A recommended ${category.toLowerCase()} location nearby`)
                    
                    console.log(`🧠 New User Recommendation using Mapbox data for ${placeTitle}:`, {
                      hasDescription: !!place.description,
                      description: place.description?.substring(0, 50) + '...',
                      category: place.category || category,
                      hasPhoto: !!photoUrl
                    })
                    
                    aiRecs.push({
                      id: `new-user-${place.id}`,
                      title: placeTitle,
                      description: placeDescription, // Use real Mapbox description
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
                      fsq_id: place.id || undefined
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
                // Focus on travel-related POIs for discovery recommendations
                const response = await fetch(`/api/places/search?lat=${location.latitude || location.lat}&lng=${location.longitude || location.lng}&radius=5000&limit=30&categories=restaurant,cafe,monument,museum,art_gallery,place_of_worship,tourism`, {
                  signal
                })
                
                if (!signal.aborted && response.ok) {
                  const data = await response.json()
                  discoveryPlaces = data.pois || []
                  console.log(`🧠 Reusing Mapbox places for discovery: ${discoveryPlaces.length} places`)
                }
              } catch (error: any) {
                if (error.name !== 'AbortError') {
                  console.log('🧠 Error fetching discovery places:', error)
                }
              }
            } else {
              // For new users, fetch discovery places separately
              try {
                // Focus on travel-related POIs for discovery
                const discoveryResponse = await fetch(`/api/places/search?lat=${location.latitude || location.lat}&lng=${location.longitude || location.lng}&radius=3000&limit=10&categories=restaurant,cafe,monument,museum,art_gallery,place_of_worship,tourism`, {
                  signal
                })
                
                if (signal.aborted) {
                  console.log('🧠 Discovery request aborted')
                  return
                }
                
                if (discoveryResponse.ok) {
                  const discoveryData = await discoveryResponse.json()
                  discoveryPlaces = discoveryData.pois || []
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
                const idA = a.id || ''
                const idB = b.id || ''
                return idA.localeCompare(idB)
              })
              
              // Select places from Mapbox results deterministically (same region = same places)
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
                // Use real Mapbox place (deterministic - same index = same place)
                const place = sortedDiscoveryPlaces[i]
                // CRITICAL: Use EXACT coordinates from Mapbox API
                recLat = place.location?.lat
                recLng = place.location?.lng
                
                // CRITICAL: Validate coordinates are exact and valid
                if (recLat && recLng && isFinite(recLat) && isFinite(recLng)) {
                  // Use EXACT coordinates from Mapbox (no rounding or approximation)
                  placeTitle = place.name || `Hidden Gem #${i + 1}`
                  placeDescription = place.description || 
                    (place.category ? `Discover this ${place.category.toLowerCase()} spot` : 
                     "A cool spot I think you'll love!")
                  category = place.category || 'adventure'
                  // DETERMINISTIC: Use fixed rating based on place ID instead of random
                  const placeId = place.id || ''
                  rating = place.rating || (3.5 + (placeId.charCodeAt(0) % 10) / 10) // Deterministic rating
                  fsqId = place.id
                  
                  // Mapbox doesn't provide photos
                  photoUrl = undefined
                  if (false && place.photos && Array.isArray(place.photos) && place.photos.length > 0) {
                    const firstPhoto = place.photos[0]
                    photoUrl = firstPhoto.url || firstPhoto.prefix || firstPhoto.href || firstPhoto.link
                  }
                  
                  console.log(`🧠 Discovery Recommendation using Mapbox data for ${placeTitle}:`, {
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
              
              // CRITICAL: Use EXACT coordinates from Mapbox API (no approximation)
              aiRecs.push({
                id: `discovery-${fsqId || Date.now()}-${i}`, // Use place ID for deterministic IDs
                title: placeTitle,
                description: placeDescription,
                category: category,
                location: {
                  lat: recLat, // EXACT coordinate from Mapbox
                  lng: recLng  // EXACT coordinate from Mapbox
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

            // Persist AI recommendations to Firestore for cross-device consistency.
            // (Best-effort; silently ignored if user is not signed in.)
            persistAIRecommendationsToServer(aiRecs)
            
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
  }, [location, insights, recommendations.length, isInitialized, isGeneratingRecommendations, getLocationCacheKey, clusterPins, persistAIRecommendationsToServer]) // Added cache key and cluster functions

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

  // Handle view mode changes
  const handleViewModeChange = (newViewMode: "map" | "list" | "insights") => {
    console.log('🗺️ Switching to view mode:', newViewMode)
    setViewMode(newViewMode)
  }

  // Track if we've already fitted bounds to prevent repeated zooming
  const hasFittedBoundsRef = useRef<boolean>(false)
  const lastRecommendationsSignatureRef = useRef<string>("")

  // Function to update recommendation markers on map
  // Update recommendation markers (Mapbox only)
  const updateRecommendationMarkers = useCallback((map: any, mapLib: any, shouldFitBounds: boolean = false) => {
    // Clear existing markers
    recommendationMarkersRef.current.forEach(marker => marker.remove())
    recommendationMarkersRef.current = []
    
    if (!recommendations || recommendations.length === 0) {
      console.log('🗺️ No recommendations to display on map')
      hasFittedBoundsRef.current = false
      lastRecommendationsSignatureRef.current = ""
      return
    }

    // Apply map filter to reduce clutter.
    const visibleRecommendations =
      recommendationFilter === "all"
        ? recommendations
        : recommendations.filter((r) =>
            recommendationFilter === "ai" ? r.isAISuggestion === true : r.isAISuggestion !== true
          )

    if (!visibleRecommendations || visibleRecommendations.length === 0) {
      // Clear markers and stop here (no visible markers for this filter)
      console.log("🗺️ No visible recommendations for filter:", recommendationFilter)
      hasFittedBoundsRef.current = false
      lastRecommendationsSignatureRef.current = `filter:${recommendationFilter}|empty`
      return
    }
    
    // Only update if recommendations actually changed (by count or IDs)
    const currentSignature = `filter:${recommendationFilter}|` + visibleRecommendations.map(r => r.id).sort().join("|")
    if (currentSignature === lastRecommendationsSignatureRef.current && !shouldFitBounds) return
    lastRecommendationsSignatureRef.current = currentSignature
    
    // Calculate bounds to fit all recommendations
    const lat = location?.latitude || location?.lat
    const lng = location?.longitude || location?.lng
    
    // Mapbox uses LngLatBounds
    const bounds = new mapboxgl.LngLatBounds()
    
    if (lat && lng) {
      bounds.extend([lng, lat]) // Add user location
    }
    
    // Group markers by exact coordinate + type (user vs AI).
    // This lets us show a dot for users and a robot for AI, with a count badge per type.
    type MarkerGroup = {
      key: string
      coordKey: string
      isAISuggestion: boolean
      lat: number
      lng: number
      items: Recommendation[]
    }

    const groupsByKey = new Map<string, MarkerGroup>()
    const typeCoordToPresence = new Map<string, { user: boolean; ai: boolean }>()

    for (const rec of visibleRecommendations) {
      if (!rec.location || !isFinite(rec.location.lat) || !isFinite(rec.location.lng)) continue
      const lat0 = rec.location.lat
      const lng0 = rec.location.lng

      const coordKey = `${lat0.toFixed(6)},${lng0.toFixed(6)}`
      const typeKey = rec.isAISuggestion ? "ai" : "user"
      const key = `${typeKey}|${coordKey}`

      const presence = typeCoordToPresence.get(coordKey) || { user: false, ai: false }
      presence[typeKey] = true
      typeCoordToPresence.set(coordKey, presence)

      const existing = groupsByKey.get(key)
      if (existing) {
        existing.items.push(rec)
      } else {
        groupsByKey.set(key, {
          key,
          coordKey,
          isAISuggestion: !!rec.isAISuggestion,
          lat: lat0,
          lng: lng0,
          items: [rec]
        })
      }
    }

    const groups = Array.from(groupsByKey.values())
    for (const g of groups) {
      bounds.extend([g.lng, g.lat])

      const el = document.createElement("div")
      el.style.position = "relative"
      // Same-size markers so both can hold count badges comfortably.
      const markerSizePx = 28
      el.style.width = `${markerSizePx}px`
      el.style.height = `${markerSizePx}px`
      el.style.borderRadius = "50%"
      el.style.border = "2px solid rgba(255,255,255,0.92)"
      el.style.boxShadow = "0 2px 10px rgba(0,0,0,0.35)"
      el.style.cursor = "pointer"
      el.style.display = "flex"
      el.style.alignItems = "center"
      el.style.justifyContent = "center"
      el.style.userSelect = "none"
      el.style.background = g.isAISuggestion ? "rgba(59,130,246,0.95)" : "rgba(16,185,129,0.95)"

      // If both types exist at the same coordinate, offset them slightly so both are visible.
      const presence = typeCoordToPresence.get(g.coordKey)
      if (presence?.user && presence?.ai) {
        el.style.transform = g.isAISuggestion ? "translateX(11px)" : "translateX(-11px)"
      }

      // No icons inside markers (keeps them clean and leaves room for count badges).
      el.textContent = ""
      el.title = `${g.items.length} ${g.isAISuggestion ? "AI" : "user"} recommendation${g.items.length === 1 ? "" : "s"}`

      if (g.items.length > 1) {
        const badge = document.createElement("div")
        badge.textContent = String(g.items.length)
        badge.style.position = "absolute"
        badge.style.top = "-8px"
        badge.style.right = "-8px"
        badge.style.minWidth = "18px"
        badge.style.height = "18px"
        badge.style.padding = "0 5px"
        badge.style.borderRadius = "999px"
        badge.style.background = "rgba(255,255,255,0.95)"
        badge.style.color = "#0f172a"
        badge.style.fontSize = "11px"
        badge.style.fontWeight = "800"
        badge.style.display = "flex"
        badge.style.alignItems = "center"
        badge.style.justifyContent = "center"
        badge.style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)"
        badge.style.border = "1px solid rgba(15, 23, 42, 0.15)"
        el.appendChild(badge)
      }

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([g.lng, g.lat])
        .addTo(map)

      el.addEventListener("click", () => {
        // Show the exact items for this marker in the list view.
        setRecommendationFilter(g.isAISuggestion ? "ai" : "user")
        setFilteredRecommendations(g.items)
        setIsShowingCluster(false)
        setCurrentCluster(null)
        setViewMode("list")
      })

      recommendationMarkersRef.current.push(marker)
    }
    
    // Don't use fitBounds - keep fixed zoom level to match main page circle map (zoom: 16)
    // This ensures consistent view between main page and recommendations page
    // The map is already initialized with zoom: 16, matching the main page
    
    console.log(`✅ Added ${recommendationMarkersRef.current.length} recommendation markers to Mapbox map`)
  }, [recommendations, location, recommendationFilter])

  // Initialize map when map view is active (Mapbox only)
  useEffect(() => {
    if (viewMode !== "map" || !mapRef.current || !location || isMapInitializedRef.current) return
    
    const lat = location?.latitude || location?.lat
    const lng = location?.longitude || location?.lng
    
    if (!lat || !lng) return
    
    // Only check location change if map is already initialized (prevent re-initialization on location updates)
    // On first load, lastLocationCoordsRef.current will be null, so we allow initialization
    const lastCoords = lastLocationCoordsRef.current
    if (lastCoords && isMapInitializedRef.current) {
      // Map is already initialized and location hasn't changed significantly, don't re-initialize
      const distance = Math.sqrt(
        Math.pow((lastCoords.lat - lat) * 111000, 2) + 
        Math.pow((lastCoords.lng - lng) * 111000 * Math.cos(lat * Math.PI / 180), 2)
      )
      if (distance < 100) {
        // Location hasn't changed significantly (less than 100m), don't re-initialize
        return
      }
    }
    
    // Store current coordinates before initialization
    lastLocationCoordsRef.current = { lat, lng }
    
    // Always use Mapbox (TomTom has been removed)
    if (!mapRef.current || mapInstanceRef.current) return

    if (!MAPBOX_API_KEY) {
      console.error('❌ Mapbox API key is missing')
      return
    }

    // Set Mapbox access token
    mapboxgl.accessToken = MAPBOX_API_KEY

    try {
      // Initialize Mapbox map
      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [lng, lat], // Mapbox uses [lng, lat]
        zoom: 16, // Zoom level to show approximately 1km (street level)
        interactive: true
      })

      mapInstanceRef.current = map
      isMapInitializedRef.current = true

      // Wait for map to load, then add user marker and recommendation markers
      map.on('load', () => {
        console.log('🗺️ Mapbox recommendations map loaded')
        
        // Add user location marker
        const userEl = document.createElement('div')
        userEl.style.width = '20px'
        userEl.style.height = '20px'
        userEl.style.borderRadius = '50%'
        userEl.style.backgroundColor = '#22C55E'
        userEl.style.border = '3px solid white'
        userEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)'
        userEl.style.cursor = 'pointer'
        userEl.title = '📍 Your Location'
        
        const userMarker = new mapboxgl.Marker({
          element: userEl
        })
          .setLngLat([lng, lat])
          .addTo(map)
        
        userMarkerRef.current = userMarker
        
        // Fetch and display nearby POIs
        fetchAndDisplayPOIs(map, lat, lng)
        
        // Small delay to ensure map is fully rendered before adding markers
        setTimeout(() => {
          updateRecommendationMarkers(map, mapboxgl, false) // Don't fit bounds - use fixed zoom to match main page
        }, 100)
      })

      map.on('error', (e) => {
        console.error('❌ Mapbox map error:', e)
      })
    } catch (error) {
      console.error('❌ Failed to initialize Mapbox map:', error)
    }
    
    // Cleanup only when viewMode changes or component unmounts
    return () => {
      // Only cleanup if viewMode is changing away from map
      if (viewMode !== "map" && mapInstanceRef.current) {
        recommendationMarkersRef.current.forEach(marker => marker.remove())
        poiMarkersRef.current.forEach(marker => marker.remove())
        poiMarkersRef.current.clear()
        if (userMarkerRef.current) {
          userMarkerRef.current.remove()
          userMarkerRef.current = null
        }
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        isMapInitializedRef.current = false
        hasFittedBoundsRef.current = false
        lastRecommendationsSignatureRef.current = ""
        lastLocationCoordsRef.current = null
      }
    }
  }, [viewMode, location?.latitude, location?.longitude, location?.lat, location?.lng]) // Depend on location coordinates to initialize when location becomes available

  // Update map center when location changes significantly (without re-initializing)
  useEffect(() => {
    if (viewMode !== "map" || !mapInstanceRef.current || !isMapInitializedRef.current || !location) return
    
    const lat = location?.latitude || location?.lat
    const lng = location?.longitude || location?.lng
    
    if (!lat || !lng) return
    
    // Only update if location has changed significantly (more than 100m)
    const lastCoords = lastLocationCoordsRef.current
    if (lastCoords) {
      const distance = Math.sqrt(
        Math.pow((lastCoords.lat - lat) * 111000, 2) + 
        Math.pow((lastCoords.lng - lng) * 111000 * Math.cos(lat * Math.PI / 180), 2)
      )
      if (distance < 100) {
        // Location hasn't changed significantly, don't update
        return
      }
    }
    
    // Update map center
    try {
      mapInstanceRef.current.setCenter([lng, lat])
      
      // Update user marker position
      if (userMarkerRef.current) {
        userMarkerRef.current.setLngLat([lng, lat])
      }
      
      // Refresh POIs when location changes significantly
      if (mapInstanceRef.current && isMapInitializedRef.current) {
        fetchAndDisplayPOIs(mapInstanceRef.current, lat, lng)
      }
      
      // Update stored coordinates
      lastLocationCoordsRef.current = { lat, lng }
    } catch (error) {
      console.warn('⚠️ Error updating map center:', error)
    }
  }, [location?.latitude, location?.longitude, location?.lat, location?.lng, viewMode])

  // Update markers when recommendations change (but don't fit bounds again)
  useEffect(() => {
    if (viewMode === "map" && mapInstanceRef.current && isMapInitializedRef.current && recommendations.length > 0) {
      // Always use Mapbox (TomTom has been removed)
      updateRecommendationMarkers(mapInstanceRef.current, mapboxgl, false)
    }
  }, [recommendations.length, viewMode, updateRecommendationMarkers]) // Only depend on count, not the full array

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
            {/* Mapbox Map Container */}
            <div
              ref={mapRef}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '16px',
                overflow: 'hidden'
              }}
            />

            {/* Legend (replaces the old two-button overlay) */}
            <div style={{
              position: 'absolute',
              top: '14px',
              left: '14px',
              zIndex: 5,
              background: 'rgba(15, 23, 42, 0.55)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: '12px',
              padding: '10px 12px',
              color: 'white',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.18)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800, opacity: 0.95, marginBottom: 6 }}>
                Tap a marker to open the list
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, opacity: 0.95 }}>
                {/* Toggle (All / Users / AI) */}
                <div style={{
                  display: 'flex',
                  gap: '6px',
                  padding: '6px',
                  borderRadius: '14px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)'
                }}>
                  {([
                    { key: "all", label: "All" },
                    { key: "user", label: "Users" },
                    { key: "ai", label: "AI" }
                  ] as const).map((tab) => {
                    const active = recommendationFilter === tab.key
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setRecommendationFilter(tab.key)}
                        style={{
                          border: '1px solid rgba(255,255,255,0.18)',
                          background: active ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.08)',
                          color: active ? '#0f172a' : 'rgba(255,255,255,0.92)',
                          borderRadius: '12px',
                          padding: '8px 12px',
                          fontSize: '12px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          minWidth: '64px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = active ? 'rgba(255,255,255,0.98)' : 'rgba(255,255,255,0.14)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = active ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.08)'
                        }}
                      >
                        {tab.label}
                      </button>
                    )
                  })}
                </div>

                {/* Key */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    display: 'inline-block',
                    background: 'rgba(16,185,129,0.95)',
                    border: '2px solid rgba(255,255,255,0.9)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.25)'
                  }} />
                  <span>Users</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: 'rgba(59,130,246,0.95)',
                    border: '2px solid rgba(255,255,255,0.95)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                    display: 'inline-block'
                  }} />
                  <span>AI</span>
                </div>
              </div>
            </div>
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
              {(isShowingCluster || recommendationFilter !== "all") && (
                <button
                  onClick={() => {
                    // Return to the full unfiltered list
                    setIsShowingCluster(false)
                    setCurrentCluster(null)
                    setFilteredRecommendations([])
                    setRecommendationFilter("all")
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
                            // Google Maps removed - map centering disabled
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
                  placeDescription: selectedRecommendation.description || null,
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
                console.log('📤 Share button clicked')
                if (onSharePin) {
                  const pinLike: PinData = {
                    id: String(selectedRecommendation?.originalPinId || selectedRecommendation?.id || Date.now()),
                    latitude: Number(selectedRecommendation?.location?.lat || 0),
                    longitude: Number(selectedRecommendation?.location?.lng || 0),
                    locationName: String(selectedRecommendation?.title || 'Location'),
                    mediaUrl: (selectedRecommendation?.photoUrl || selectedRecommendation?.mediaUrl || '/pinit-placeholder.jpg') as any,
                    mediaType: (selectedRecommendation?.photoUrl || selectedRecommendation?.mediaUrl) ? "photo" : null,
                    audioUrl: null,
                    timestamp: new Date().toISOString(),
                    title: String(selectedRecommendation?.title || 'Location'),
                    description: selectedRecommendation?.description || undefined,
                    tags: ["share", selectedRecommendation?.category?.toLowerCase?.() || "general"],
                    rating: typeof selectedRecommendation?.rating === "number" ? selectedRecommendation.rating : undefined,
                    isRecommended: !!selectedRecommendation?.isRecommended,
                    isAISuggestion: !!selectedRecommendation?.isAISuggestion,
                    category: selectedRecommendation?.category || "general",
                  }
                  onSharePin(pinLike)
                  return
                }

                // Fallback: keep existing editable form behavior if parent didn't provide share handler
                setRecommendationFormData({
                  mediaUrl: selectedRecommendation.photoUrl || selectedRecommendation.mediaUrl || '',
                  locationName: selectedRecommendation.title || 'Location',
                  placeDescription: selectedRecommendation.description || null,
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
          placeDescription={recommendationFormData.placeDescription ?? selectedRecommendation?.description ?? null}
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
            console.log('📤 Share on social media')
            if (onSharePin && selectedRecommendation) {
              const pinLike: PinData = {
                id: String(selectedRecommendation?.originalPinId || selectedRecommendation?.id || Date.now()),
                latitude: Number(selectedRecommendation?.location?.lat || 0),
                longitude: Number(selectedRecommendation?.location?.lng || 0),
                locationName: String(selectedRecommendation?.title || 'Location'),
                mediaUrl: (selectedRecommendation?.photoUrl || selectedRecommendation?.mediaUrl || '/pinit-placeholder.jpg') as any,
                mediaType: (selectedRecommendation?.photoUrl || selectedRecommendation?.mediaUrl) ? "photo" : null,
                audioUrl: null,
                timestamp: new Date().toISOString(),
                title: String(selectedRecommendation?.title || 'Location'),
                description: selectedRecommendation?.description || undefined,
                tags: ["share", selectedRecommendation?.category?.toLowerCase?.() || "general"],
                rating: typeof selectedRecommendation?.rating === "number" ? selectedRecommendation.rating : undefined,
                isRecommended: !!selectedRecommendation?.isRecommended,
                isAISuggestion: !!selectedRecommendation?.isAISuggestion,
                category: selectedRecommendation?.category || "general",
              }
              setShowRecommendationForm(false)
              setShowReadOnlyRecommendation(false)
              setRecommendationFormData(null)
              setSelectedRecommendation(null)
              onSharePin(pinLike)
            }
          }}
          onRecommend={async (rating: number, review: string, placeName?: string) => {
            console.log('📍 Recommendation submitted:', { rating, review, placeName, rec: selectedRecommendation })
            
            // Create a new recommendation pin
            const chosenName = (placeName || "").trim() || selectedRecommendation.title || 'Location'
            const newRecommendation: PinData = {
              id: Date.now().toString(),
              latitude: selectedRecommendation.location?.lat || 0,
              longitude: selectedRecommendation.location?.lng || 0,
              locationName: chosenName,
              mediaUrl: selectedRecommendation.photoUrl || selectedRecommendation.mediaUrl || null,
              mediaType: (selectedRecommendation.photoUrl || selectedRecommendation.mediaUrl) ? "photo" : null,
              audioUrl: null,
              timestamp: new Date().toISOString(),
              title: `Recommendation - ${chosenName}`,
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
