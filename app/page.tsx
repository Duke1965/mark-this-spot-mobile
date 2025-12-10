"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Camera, Video, Library, Sparkles, MapPin, Check, Star, ArrowLeft } from "lucide-react"
import { useLocationServices } from "@/hooks/useLocationServices"
import { usePinStorage } from "@/hooks/usePinStorage"
import { useMotionDetection } from "@/hooks/useMotionDetection"
import { ReliableCamera } from "@/components/reliable-camera"
import { SocialPlatformSelector } from "@/components/social-platform-selector"
import { ContentEditor } from "@/components/ContentEditor"
import { SettingsPage } from "@/components/SettingsPage"
import { PinStoryMode } from "@/components/PinStoryMode"

import { ProactiveAI } from "@/components/ProactiveAI"
import { EnhancedLocationService } from "@/components/EnhancedLocationService"
import { PinStoryBuilder } from "@/components/PinStoryBuilder"
import AIRecommendationsHub from "@/components/AIRecommendationsHub"
import { RecommendationForm } from "@/components/RecommendationForm"
// PlaceNavigation component removed - Google Maps migration to Mapbox
import { PinLibrary } from "@/components/PinLibrary"
import { PinResults } from "@/components/PinResults"
import { LocationPermissionPrompt } from "@/components/LocationPermissionPrompt"
import { useAuth } from "@/hooks/useAuth"
import { PinData } from "@/lib/types"

import { healPinData, checkDataIntegrity, autoHealOnStartup } from "@/lib/dataHealing"
import { DataSyncManager, dataSyncManager } from "@/lib/dataSync"
import { performNightlyMaintenance } from "@/lib/nightlyMaintenance"
import { decay, computeTrendingScore, daysAgo, getEventWeight } from "@/lib/trending"
import { postPinIntel, cancelPinIntel, maybeCallPinIntel } from "@/lib/pinIntelApi"
import { uploadImageToFirebase, generateImageFilename } from "@/lib/imageUpload"
import "mapbox-gl/dist/mapbox-gl.css"



interface GooglePlace {
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

interface Recommendation {
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

// NEW: Pin Management System Interfaces
interface Place {
  id: string
  googlePlaceId: string
  name: string
  lat: number
  lng: number
  category: string
  createdAt: string
  updatedAt: string
  
  // Aggregates
  totalEndorsements: number
  recentEndorsements: number
  lastEndorsedAt: string
  score: number
  
  // Community signals
  downvotes: number
  isHidden: boolean
}

interface Endorsement {
  id: string
  placeId: string
  userId: string
  createdAt: string
  // Optional: comment, media, etc.
}

interface Renewal {
  id: string
  placeId: string
  userId: string
  type: 'renew' | 'downvote'
  createdAt: string
}

// Interactive Map Editor Component with Draggable Marker (Mapbox)
function InteractiveMapEditor({ 
  initialLat, 
  initialLng, 
  onLocationChange 
}: { 
  initialLat: number
  initialLng: number
  onLocationChange: (lat: number, lng: number) => void
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current) return

    // Dynamically import Mapbox GL
    import('mapbox-gl').then((mapboxgl) => {
      if (!mapRef.current || mapInstanceRef.current) return

      // Set Mapbox access token
      mapboxgl.default.accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY || ''

      // Initialize Mapbox map - Changed to streets-v12 (normal map view)
      const map = new mapboxgl.default.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [initialLng, initialLat], // Mapbox uses [lng, lat]
        zoom: 17, // Higher zoom for more detail
        attributionControl: false
      })

      mapInstanceRef.current = map

      // Create draggable marker
      const marker = new mapboxgl.default.Marker({
        draggable: true,
        color: '#3B82F6'
      })
        .setLngLat([initialLng, initialLat])
        .addTo(map)

      markerRef.current = marker

      // Listen for marker drag events
      marker.on('dragend', () => {
        const lngLat = marker.getLngLat()
        console.log("📍 Marker dragged to:", { lat: lngLat.lat, lng: lngLat.lng })
        onLocationChange(lngLat.lat, lngLat.lng)
      })

      // Cleanup
      return () => {
        marker.remove()
        map.remove()
      }
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, []) // Only run once on mount

  // Update marker position when initial location changes (but not during drag)
  useEffect(() => {
    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLngLat([initialLng, initialLat])
      mapInstanceRef.current.setCenter([initialLng, initialLat])
    }
  }, [initialLat, initialLng])

  return (
    <div
      ref={mapRef}
      style={{
        width: "100%",
        height: "100%",
        position: "absolute",
        top: 0,
        left: 0
      }}
    />
  )
}

// Interactive Map Component for Main Circle with POI Markers
function InteractiveMainMap({ 
  lat, 
  lng 
}: { 
  lat: number
  lng: number
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const poiMarkersRef = useRef<any[]>([])
  const carMarkerRef = useRef<any>(null)
  const lastLatRef = useRef<number | null>(null)
  const lastLngRef = useRef<number | null>(null)
  const isInitializedRef = useRef<boolean>(false)

  // Helper function to calculate bearing (direction) between two points
  const calculateBearing = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const dLng = (lng2 - lng1) * Math.PI / 180
    const lat1Rad = lat1 * Math.PI / 180
    const lat2Rad = lat2 * Math.PI / 180
    
    const y = Math.sin(dLng) * Math.cos(lat2Rad)
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng)
    
    const bearing = Math.atan2(y, x) * 180 / Math.PI
    return (bearing + 360) % 360 // Normalize to 0-360
  }

  // Helper function to fetch and update POIs
  const updatePOIs = useCallback(async (currentLat: number, currentLng: number, mapboxgl: any, map: any) => {
    try {
      // Fetch nearby travel POIs from Mapbox Search API (restaurants, cafes, monuments, museums, art galleries, churches, tourism)
      const searchResponse = await fetch(`/api/mapbox/search?lat=${currentLat}&lng=${currentLng}&radius=200&limit=20&categories=restaurant,cafe,monument,museum,art_gallery,place_of_worship,tourism`)
      if (searchResponse.ok) {
        const searchData = await searchResponse.json()
        const pois = searchData.pois || []
        
        console.log(`📍 Found ${pois.length} POIs to display on map`)
        
        // Clear existing markers
        poiMarkersRef.current.forEach(marker => marker.remove())
        poiMarkersRef.current = []
        
        // Add markers for each POI
        pois.forEach((poi: any) => {
          if (poi.name && poi.name !== 'Unknown Place' && poi.distance <= 200) {
            // Create a custom marker element with icon
            const el = document.createElement('div')
            el.className = 'poi-marker'
            el.style.width = '24px'
            el.style.height = '24px'
            el.style.borderRadius = '50%'
            el.style.backgroundColor = '#3B82F6'
            el.style.border = '3px solid white'
            el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)'
            el.style.cursor = 'pointer'
            el.style.display = 'flex'
            el.style.alignItems = 'center'
            el.style.justifyContent = 'center'
            el.style.fontSize = '12px'
            el.style.color = 'white'
            el.style.fontWeight = 'bold'
            
            // Add icon based on travel category
            let icon = '📍'
            if (poi.category) {
              if (poi.category.includes('restaurant') || poi.category.includes('food')) {
                icon = '🍽️'
              } else if (poi.category.includes('cafe') || poi.category.includes('coffee')) {
                icon = '☕'
              } else if (poi.category.includes('monument') || poi.category.includes('memorial')) {
                icon = '🗿'
              } else if (poi.category.includes('museum')) {
                icon = '🏛️'
              } else if (poi.category.includes('art_gallery') || poi.category.includes('gallery')) {
                icon = '🎨'
              } else if (poi.category.includes('place_of_worship') || poi.category.includes('church')) {
                icon = '⛪'
              } else if (poi.category.includes('tourism') || poi.category.includes('attraction')) {
                icon = '🎯'
              }
            }
            el.textContent = icon
            
            // Create marker with popup
            const popup = new mapboxgl.default.Popup({ 
              offset: 25, 
              closeButton: false,
              className: 'poi-popup'
            }).setHTML(`
              <div style="font-weight: 600; font-size: 13px; color: #1e3a8a; margin-bottom: 4px;">
                ${poi.name}
              </div>
              ${poi.category ? `<div style="font-size: 11px; color: #666; text-transform: capitalize;">${poi.category.replace(/_/g, ' ')}</div>` : ''}
            `)
            
            const marker = new mapboxgl.default.Marker({
              element: el,
              anchor: 'bottom'
            })
              .setLngLat([poi.location.lng, poi.location.lat])
              .setPopup(popup)
              .addTo(map)
            
            // Show popup on hover (for better UX in the circle)
            el.addEventListener('mouseenter', () => {
              popup.addTo(map)
            })
            el.addEventListener('mouseleave', () => {
              popup.remove()
            })
            
            poiMarkersRef.current.push(marker)
          }
        })
        
        console.log(`✅ Added ${poiMarkersRef.current.length} POI markers to map`)
      }
    } catch (error) {
      console.error('❌ Error fetching POIs for map:', error)
    }
  }, [])

  // Initialize map only once on mount
  useEffect(() => {
    if (!mapRef.current || isInitializedRef.current) return

    // Dynamically import Mapbox GL
    import('mapbox-gl').then((mapboxgl) => {
      if (!mapRef.current || mapInstanceRef.current) return

      // Set Mapbox access token
      mapboxgl.default.accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY || ''

      // Initialize Mapbox map - Using streets-v12 (normal map view)
      const map = new mapboxgl.default.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [lng, lat], // Mapbox uses [lng, lat]
        zoom: 16, // Good zoom level for POI visibility
        attributionControl: false,
        interactive: false, // Disable interaction for the circle map
        pitch: 0,
        bearing: 0 // Always keep map north-up
      })

      mapInstanceRef.current = map
      isInitializedRef.current = true
      lastLatRef.current = lat
      lastLngRef.current = lng

      // Create car icon marker for user position
      const carEl = document.createElement('div')
      carEl.style.width = '32px'
      carEl.style.height = '32px'
      carEl.style.fontSize = '24px'
      carEl.style.display = 'flex'
      carEl.style.alignItems = 'center'
      carEl.style.justifyContent = 'center'
      carEl.style.transition = 'transform 0.3s ease'
      carEl.textContent = '🚗'
      
      const carMarker = new mapboxgl.default.Marker({
        element: carEl,
        anchor: 'center'
      })
        .setLngLat([lng, lat])
        .addTo(map)
      
      carMarkerRef.current = carMarker

      // Wait for map to load, then fetch and display POIs
      map.on('load', async () => {
        console.log('🗺️ Main map loaded, fetching nearby POIs...')
        await updatePOIs(lat, lng, mapboxgl, map)
      })

      // Cleanup on unmount
      return () => {
        if (mapInstanceRef.current) {
          poiMarkersRef.current.forEach(marker => marker.remove())
          if (carMarkerRef.current) {
            carMarkerRef.current.remove()
            carMarkerRef.current = null
          }
          mapInstanceRef.current.remove()
          mapInstanceRef.current = null
          isInitializedRef.current = false
        }
      }
    })

    return () => {
      if (mapInstanceRef.current) {
        poiMarkersRef.current.forEach(marker => marker.remove())
        if (carMarkerRef.current) {
          carMarkerRef.current.remove()
          carMarkerRef.current = null
        }
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        isInitializedRef.current = false
      }
    }
  }, []) // Only run once on mount

  // Update map center and POIs when location changes significantly (without re-initializing)
  useEffect(() => {
    if (!mapInstanceRef.current || !isInitializedRef.current) return

    // Check if location has changed significantly (more than ~50 meters)
    const hasChangedSignificantly = 
      lastLatRef.current === null || 
      lastLngRef.current === null ||
      Math.abs(lat - lastLatRef.current) > 0.0005 || // ~50 meters
      Math.abs(lng - lastLngRef.current) > 0.0005

    if (hasChangedSignificantly) {
      // CRITICAL: Always keep map bearing at 0 (north-up) - never rotate the map
      mapInstanceRef.current.setBearing(0)
      
      // Update map center smoothly
      mapInstanceRef.current.setCenter([lng, lat])
      
      // Calculate bearing for car icon rotation (direction of travel)
      let carBearing = 0
      if (lastLatRef.current !== null && lastLngRef.current !== null) {
        carBearing = calculateBearing(lastLatRef.current, lastLngRef.current, lat, lng)
      }
      
      // Update car marker position and rotation
      if (carMarkerRef.current) {
        carMarkerRef.current.setLngLat([lng, lat])
        // Rotate the car icon element to show direction of travel
        const carEl = carMarkerRef.current.getElement()
        if (carEl) {
          carEl.style.transform = `rotate(${carBearing}deg)`
        }
      }
      
      // Update POIs
      import('mapbox-gl').then((mapboxgl) => {
        if (mapInstanceRef.current) {
          updatePOIs(lat, lng, mapboxgl, mapInstanceRef.current)
        }
      })

      lastLatRef.current = lat
      lastLngRef.current = lng
    }
  }, [lat, lng, updatePOIs])

  return (
    <div
      ref={mapRef}
      style={{
        width: "100%",
        height: "100%",
        position: "absolute",
        top: 0,
        left: 0,
        borderRadius: "50%",
        overflow: "hidden"
      }}
    />
  )
}

export default function PINITApp() {

  // Auth state
  const { user, loading: authLoading } = useAuth()

  // Core state
  const [currentScreen, setCurrentScreen] = useState<
    | "map"
    | "camera"
    | "platform-select"
    | "content-editor"
    | "editor"
    | "story"
    | "library"
    | "story-builder"
    | "recommendations"
    | "place-navigation"
    | "results"
    | "settings"
  >("map")
  const [cameraMode, setCameraMode] = useState<"photo" | "video">("photo")

  const [isQuickPinning, setIsQuickPinning] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [showRecommendationPopup, setShowRecommendationPopup] = useState(false)
  const [finalImageData, setFinalImageData] = useState<any>(null)
  const [quickPinSuccess, setQuickPinSuccess] = useState(false)
  const [locationName, setLocationName] = useState<string>("")

  const [showRecommendToggle, setShowRecommendToggle] = useState(false)
  const [showNearbyPins, setShowNearbyPins] = useState(false)
  const [discoveryMode, setDiscoveryMode] = useState(false)
  const [nearbyPins, setNearbyPins] = useState<PinData[]>([])
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false)
  const [pins, setPins] = useState<PinData[]>([])
  const [newPins, setNewPins] = useState<number>(0)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])

  const [locationDetails, setLocationDetails] = useState<any>(null)
  const [currentTheme, setCurrentTheme] = useState<any>(null)
  const [showStoryBuilder, setShowStoryBuilder] = useState(false)
  const [lastActivity, setLastActivity] = useState<string>("app-start")
  
  // Pin editing state
  const [editingPin, setEditingPin] = useState<PinData | null>(null)
  const [editingPinLocation, setEditingPinLocation] = useState<{lat: number, lng: number} | null>(null)
  const [originalPinLocation, setOriginalPinLocation] = useState<{lat: number, lng: number} | null>(null)
  const [isUpdatingPinLocation, setIsUpdatingPinLocation] = useState(false)
  const [isDraggingPin, setIsDraggingPin] = useState(false)

  // Add this new state for user location
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)


  // Media state
  const [capturedMedia, setCapturedMedia] = useState<{
    url: string
    type: "photo" | "video"
    location: string
    title?: string
    description?: string
    tags?: string[]
    personalThoughts?: string
    id?: string
    latitude?: number
    longitude?: number
    additionalPhotos?: Array<{ url: string; placeName: string }>
    foursquareData?: {
      placeName: string | null
      description: string | null
      latitude: number
      longitude: number
    }
  } | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<string>("")

  // Hooks
  const { location, getCurrentLocation, watchLocation, clearWatch, isLoading: locationLoading, requestPermission, permissionStatus } = useLocationServices()
  const { pins: storedPins, addPin: addPinFromStorage, removePin: removePinFromStorage, updatePin: updatePinInStorage } = usePinStorage()
  const motionData = useMotionDetection()
  
  // Request deduplication for fetchLocationPhotos
  const photoFetchControllerRef = useRef<AbortController | null>(null)
  const photoFetchCacheRef = useRef<Map<string, { data: {url: string, placeName: string, description?: string}[], timestamp: number }>>(new Map())
  // Cache for POI results to avoid redundant API calls (5 minutes)
  const poiResultCacheRef = useRef<Map<string, { hasPOI: boolean; timestamp: number }>>(new Map())
  const isFetchingPhotosRef = useRef(false)
  
  // Request deduplication for pin editing
  const pinEditControllerRef = useRef<AbortController | null>(null)
  const isUpdatingPinRef = useRef(false)

  // Add state to remember the last good location name
  const [lastGoodLocationName, setLastGoodLocationName] = useState<string>("")
  const [lastLocationCheck, setLastLocationCheck] = useState<{lat: number, lng: number} | null>(null)
  
  // Update location name with persistence - THROTTLED
  useEffect(() => {
    if (location && location.latitude && location.longitude) {
      // Only update if location changed significantly (more than 50m)
      if (lastLocationCheck) {
        const latDiff = Math.abs(location.latitude - lastLocationCheck.lat)
        const lngDiff = Math.abs(location.longitude - lastLocationCheck.lng)
        const distanceChanged = latDiff > 0.0005 || lngDiff > 0.0005 // ~50m
        
        if (!distanceChanged) {
          console.log("📍 Location hasn't changed significantly, skipping update")
          return
        }
      }
      
      console.log("📍 Getting location name for:", location.latitude, location.longitude)
      setLastLocationCheck({ lat: location.latitude, lng: location.longitude })
      
      getLocationName(location.latitude, location.longitude).then((name) => {
        console.log("📍 Location name result:", name)
        if (name && name !== "Unknown Location" && name !== "Current Location") {
          setLocationName(name)
          setLastGoodLocationName(name) // Remember the last good location
        } else if (lastGoodLocationName) {
          // Keep the last good location if current lookup fails
          setLocationName(lastGoodLocationName)
        }
      }).catch((error) => {
        console.error("📍 Location name error:", error)
        // Keep last good location on error
        if (lastGoodLocationName) {
          setLocationName(lastGoodLocationName)
        }
      })
    }
  }, [location])

  // Function to clear corrupted app state and reset to map
  const clearAppState = useCallback(() => {
    try {
      localStorage.removeItem("pinit-app-state")
      console.log("dY1 App state cleared manually")
      setCurrentScreen("map")
      setRecommendations([])
      setDiscoveryMode(false)
      setShowRecommendToggle(false)
      setLastActivity("app-reset")
    } catch (error) {
      console.error("O Failed to clear app state:", error)
    }
  }, [])

  // Removed conflicting force reset - state persistence handles initialization

  // ENHANCED STATE PERSISTENCE - Save all app state to localStorage
  useEffect(() => {
    // Load saved app state on mount
    try {
      const savedState = localStorage.getItem("pinit-app-state")
      if (savedState) {
        const parsedState = JSON.parse(savedState)
        console.log("🔄 Restoring app state from localStorage:", parsedState)
        
        // ONLY restore screen if user is authenticated, otherwise force settings
        if (authLoading) {
          // Still loading auth, wait
          return
        }
        
        if (!user) {
          // Check if user has completed initial setup
          const hasCompletedSetup = localStorage.getItem('pinit-setup-completed')
          const hasSeenWelcome = localStorage.getItem('pinit-welcome-seen')
          
          console.log("🔍 Welcome check - hasSeenWelcome:", hasSeenWelcome, "hasCompletedSetup:", hasCompletedSetup)
          
          // If user has seen welcome OR completed setup, they're a returning user
          const isReturningUser = !!(hasSeenWelcome || hasCompletedSetup)
          
          if (!isReturningUser) {
            console.log("🆕 New user, showing welcome screen")
            setCurrentScreen("settings")
          } else {
            // Returning user - always start on main map screen (don't restore other screens)
            // This prevents issues with recommendations page loading before it's ready
            setCurrentScreen("map")
            console.log("🔄 Returning user - always starting on main map screen")
          }
          return
        }
        
        // User is authenticated - always start on main map screen
        // Don't restore other screens to prevent loading issues (recommendations page, etc.)
        setCurrentScreen("map")
        console.log("🔄 Authenticated user - always starting on main map screen")
        
        // Restore recommendations
        if (parsedState.recommendations && Array.isArray(parsedState.recommendations)) {
          setRecommendations(parsedState.recommendations)
        }
        
        // Restore other important state
        if (parsedState.discoveryMode !== undefined) {
          setDiscoveryMode(parsedState.discoveryMode)
        }
        
        if (parsedState.showRecommendToggle !== undefined) {
          setShowRecommendToggle(parsedState.showRecommendToggle)
        }
        
        if (parsedState.lastActivity) {
          setLastActivity(parsedState.lastActivity)
        }
        
        console.log("o. App state restored successfully")
      } else {
        console.log("dY+ No saved state found, starting fresh")
        // Check auth state before setting screen
        if (!authLoading && !user) {
          const hasCompletedSetup = localStorage.getItem('pinit-setup-completed')
          const hasSeenWelcome = localStorage.getItem('pinit-welcome-seen')
          
          // If user has seen welcome OR completed setup, they're a returning user
          const isReturningUser = !!(hasSeenWelcome || hasCompletedSetup)
          
          if (!isReturningUser) {
            console.log("🆕 No saved state - new user, showing welcome screen")
            setCurrentScreen("settings")
          } else {
            // Returning user - always start on main map screen
            console.log("🔄 No saved state - returning user, going to map")
            setCurrentScreen("map")
          }
        } else if (!authLoading && user) {
          setCurrentScreen("map")
        }
      }
    } catch (error) {
      console.error("O Failed to restore app state:", error)
      // Clear corrupted state and start fresh
      try {
        localStorage.removeItem("pinit-app-state")
        console.log("dY1 Cleared corrupted app state")
      } catch (clearError) {
        console.error("O Failed to clear corrupted state:", clearError)
      }
      // Check auth state before setting screen
      if (!authLoading && !user) {
        const hasCompletedSetup = localStorage.getItem('pinit-setup-completed')
        const hasSeenWelcome = localStorage.getItem('pinit-welcome-seen')
        
        // If user has seen welcome OR completed setup, they're a returning user
        const isReturningUser = !!(hasSeenWelcome || hasCompletedSetup)
        
        if (!isReturningUser) {
          console.log("🆕 Error case - new user, showing welcome screen")
          setCurrentScreen("settings")
        } else {
          // Returning user - always start on main map screen
          console.log("🔄 Error case - returning user, going to map")
          setCurrentScreen("map")
        }
      } else if (!authLoading && user) {
        setCurrentScreen("map")
      }
    }
  }, [authLoading, user]) // Add authLoading and user as dependencies

  // Save app state whenever important state changes
  useEffect(() => {
    const appState = {
      currentScreen,
      recommendations,
      discoveryMode,
      showRecommendToggle,
      lastActivity,
      timestamp: Date.now()
    }
    
    try {
      localStorage.setItem("pinit-app-state", JSON.stringify(appState))
      // Also save current screen separately for pull-to-refresh restoration
      localStorage.setItem("pinit-current-screen", currentScreen)
      console.log("dY' App state saved to localStorage:", appState)
    } catch (error) {
      console.error("O Failed to save app state:", error)
    }
  }, [currentScreen, recommendations, discoveryMode, showRecommendToggle, lastActivity])

  // Initialize pins from storage
  useEffect(() => {
    if (storedPins.length > 0) {
      setPins(storedPins)
    }
  }, [storedPins])

  // Continuous location watching
  useEffect(() => {
    let watchId: number | null = null

    if (typeof window !== 'undefined' && navigator.geolocation) {
      console.log("dY? Setting up location watching...")
      
      // Start watching location continuously with better accuracy
      watchId = watchLocation({
        enableHighAccuracy: true, // Use high accuracy for real-time updates
        timeout: 15000, // Increase timeout
        maximumAge: 10000, // Reduced to 10 seconds for real-time updates
      })

      // Cleanup function
      return () => {
        if (watchId !== null) {
          clearWatch(watchId)
        }
      }
    } else {
      console.log("O Geolocation not available")
    }
  }, [watchLocation, clearWatch])

  // Update userLocation when location changes (debounced to reduce API calls)
  useEffect(() => {
    if (location) {
      setUserLocation({
        latitude: location.latitude,
        longitude: location.longitude,
      })
      
      // Location name is already updated by the throttled effect above (line 295)
      // No need to call getLocationName here again - it's already handled
    }
  }, [location])

  const addPin = useCallback((pin: PinData) => {
    // Ensure pending pins are marked as unviewed
    const pinWithViewed = pin.isPending ? { ...pin, isViewed: false } : pin
    setPins((prev: PinData[]) => [...prev, pinWithViewed])
    addPinFromStorage(pinWithViewed) // Also save to storage
  }, [addPinFromStorage])

  // Calculate unviewed pending pins count (persists across app restarts)
  const getUnviewedPendingPinsCount = useCallback(() => {
    return pins.filter(pin => pin.isPending === true && !pin.isViewed).length
  }, [pins])

  const openLibrary = useCallback(() => {
    setCurrentScreen("library")
    // Don't reset badge here - only when pin is actually viewed
  }, [setCurrentScreen])

  const [selectedPlace, setSelectedPlace] = useState<any>(null)
  const [savedForLaterPlaces, setSavedForLaterPlaces] = useState<any[]>([])
  const [currentResultPin, setCurrentResultPin] = useState<PinData | null>(null)

  // Recommendation form state
  const [showRecommendationForm, setShowRecommendationForm] = useState(false)
  const [recommendationData, setRecommendationData] = useState<{
    mediaUrl: string
    locationName: string
    platform: string
    aiTitle?: string
    aiDescription?: string
    aiTags?: string[]
    personalThoughts?: string
    pinId?: string
    latitude?: number
    longitude?: number
    additionalPhotos?: Array<{ url: string; placeName: string }>
    foursquareData?: {
      placeName: string | null
      description: string | null
      latitude: number
      longitude: number
    }
  } | null>(null)

  // Add location name resolution
  const getLocationName = async (lat: number, lng: number): Promise<string> => {
    try {
      // Use the new getRealLocationName function for better results
      return await getRealLocationName(lat, lng)
    } catch (error) {
      console.error("Failed to get location name:", error)
      // Global fallback: Create descriptive name from coordinates with region detection
      const latDir = lat >= 0 ? 'N' : 'S'
      const lngDir = lng >= 0 ? 'E' : 'W'
      const latAbs = Math.abs(lat).toFixed(2)
      const lngAbs = Math.abs(lng).toFixed(2)
      
      // Determine region based on coordinates for global users
      let region = "Unknown Region"
      
      // North America (USA, Canada, Mexico)
      if (lat >= 25 && lat <= 70 && lng >= -170 && lng <= -50) {
        region = "North America"
      }
      // South America
      else if (lat >= -60 && lat <= 15 && lng >= -90 && lng <= -30) {
        region = "South America"
      }
      // Europe
      else if (lat >= 35 && lat <= 75 && lng >= -10 && lng <= 40) {
        region = "Europe"
      }
      // Asia (including India, China, Japan, Southeast Asia)
      else if (lat >= 10 && lat <= 75 && lng >= 60 && lng <= 180) {
        region = "Asia"
      }
      // Africa
      else if (lat >= -35 && lat <= 35 && lng >= -20 && lng <= 55) {
        region = "Africa"
      }
      // Australia and Oceania
      else if (lat >= -45 && lat <= -10 && lng >= 110 && lng <= 155) {
        region = "Australia"
      }
      
      return `${region} (${latAbs}A${latDir}, ${lngAbs}A${lngDir})`
    }
  }

  // Mobile detection utility
  const isMobileDevice = () => {
    if (typeof window === 'undefined') return false
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }

  // Retry logic with exponential backoff
  const retryWithBackoff = async <T,>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> => {
    let lastError: Error
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxRetries) {
          throw lastError
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError!
  }

  // Share to social media platform
  const shareToPlatform = async (platform: string, imageUrl: string, mediaData?: any) => {
    const locationName = mediaData?.foursquareData?.placeName || mediaData?.location || mediaData?.title || "PINIT Location"
    const description = mediaData?.description || mediaData?.personalThoughts || ""
    const shareText = `${locationName}${description ? ` - ${description}` : ''}`
    
    switch (platform.toLowerCase()) {
      case 'whatsapp':
        // Try Web Share API first (works best on mobile, allows image sharing)
        if (navigator.share && imageUrl) {
          try {
            // Convert image URL to blob if it's a data URL
            let imageBlob: Blob | null = null
            if (imageUrl.startsWith('data:image')) {
              const response = await fetch(imageUrl)
              imageBlob = await response.blob()
            } else {
              const response = await fetch(imageUrl)
              imageBlob = await response.blob()
            }
            
            const imageFile = new File([imageBlob], 'pinit-share.jpg', { type: 'image/jpeg' })
            
            await navigator.share({
              title: locationName,
              text: `${shareText}\n\n📍 Shared via PINIT`,
              files: [imageFile]
            })
            console.log('📤 Shared to WhatsApp via Web Share API')
            return
          } catch (error: any) {
            // If user cancels or Web Share fails, fall through to URL method
            if (error.name !== 'AbortError') {
              console.log('📤 Web Share API failed, trying URL method:', error)
            } else {
              console.log('📤 User cancelled WhatsApp share')
              return
            }
          }
        }
        
        // Fallback: WhatsApp Web API - opens WhatsApp with message (user can attach image manually)
        // Format: https://wa.me/?text=URL_ENCODED_TEXT
        const whatsappText = encodeURIComponent(`${shareText}\n\n📍 Shared via PINIT`)
        const whatsappUrl = `https://wa.me/?text=${whatsappText}`
        window.open(whatsappUrl, '_blank')
        console.log('📤 Opening WhatsApp with message (user can attach image)')
        break
        
      case 'instagram':
        // Instagram doesn't support direct sharing via URL
        // User will need to download and share manually
        console.log('📸 Instagram sharing - user needs to download and share manually')
        // Could trigger download here
        break
        
      case 'twitter':
      case 'x':
        // Twitter/X sharing
        const twitterText = encodeURIComponent(`${shareText} #PINIT`)
        const twitterUrl = `https://twitter.com/intent/tweet?text=${twitterText}`
        window.open(twitterUrl, '_blank')
        console.log('📤 Opening Twitter/X with message')
        break
        
      case 'facebook':
        // Facebook sharing
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(shareText)}`
        window.open(facebookUrl, '_blank')
        console.log('📤 Opening Facebook with message')
        break
        
      case 'linkedin':
        // LinkedIn sharing
        const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&summary=${encodeURIComponent(shareText)}`
        window.open(linkedinUrl, '_blank')
        console.log('📤 Opening LinkedIn with message')
        break
        
      default:
        // Fallback: Use Web Share API if available
        if (navigator.share) {
          try {
            await navigator.share({
              title: locationName,
              text: shareText,
              url: imageUrl
            })
            console.log('📤 Shared via Web Share API')
          } catch (error) {
            console.error('Error sharing:', error)
          }
        } else {
          console.log(`📤 Platform ${platform} sharing not implemented`)
        }
    }
  }

  // UPDATED: Use pin-intel gateway for location name (NO MORE GOOGLE API CALLS)
  const getRealLocationName = async (lat: number, lng: number): Promise<string> => {
    const isMobile = isMobileDevice()
    
    try {
      console.log(`📍 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Getting location name via gateway...`)
      
      // Use the throttled pin-intel gateway wrapper
      const pinIntel = await maybeCallPinIntel({ lat, lng }, 5)
      
      // If throttled (returns null), fall through to coordinate fallback
      if (pinIntel && pinIntel.geocode && pinIntel.geocode.formatted) {
        const formatted = pinIntel.geocode.formatted
        console.log(`✅ [${isMobile ? 'MOBILE' : 'DESKTOP'}] Location name from gateway:`, formatted)
        
        // Don't show coordinates - if it's a coordinate string, try to get better format
        if (formatted.includes('Location (') && formatted.includes(',')) {
          // It's showing coordinates, use a better fallback
          return await getLocationFallback(lat, lng)
        }
        
        return formatted
      }
      
      // Fallback to coordinate-based detection (also used when throttled)
      if (!pinIntel) {
        console.log(`📍 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Pin-intel call throttled, using location fallback`)
      } else {
        console.log(`⚠️ [${isMobile ? 'MOBILE' : 'DESKTOP'}] Gateway returned no location, using location fallback`)
      }
    } catch (error) {
      console.log(`⚠️ [${isMobile ? 'MOBILE' : 'DESKTOP'}] Gateway error, using location fallback:`, error)
    }
    
    // Use better fallback that doesn't show coordinates
    return await getLocationFallback(lat, lng)
  }
  
  // Cache for location fallback (5 minutes)
  const locationFallbackCacheRef = useRef<Map<string, { result: string; timestamp: number }>>(new Map())
  
  // Helper function for location fallback (no coordinates shown)
  const getLocationFallback = async (lat: number, lng: number): Promise<string> => {
    // Check cache first (5 minute cache)
    const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`
    const cached = locationFallbackCacheRef.current.get(cacheKey)
    const now = Date.now()
    if (cached && (now - cached.timestamp) < 300000) {
      return cached.result
    }
    
    // Try to get location from Mapbox API directly as fallback
    // Request both address and place to get street + city information
    try {
      const response = await fetch(`/api/mapbox_geocoding?lat=${lat}&lng=${lng}&types=address,place&limit=5`)
      if (response.ok) {
        const data = await response.json()
        if (data.places && data.places.length > 0) {
          // Find address result (for street) and place result (for city/town)
          const addressResult = data.places.find((p: any) => {
            const types = Array.isArray(p.place_type) ? p.place_type : [p.place_type]
            return types.includes('address') || p.context?.street
          })
          const placeResult = data.places.find((p: any) => {
            const types = Array.isArray(p.place_type) ? p.place_type : [p.place_type]
            return types.includes('place') || p.context?.city
          }) || data.places[0]
          
          // Use address result for street, place result for city/town
          const street = addressResult?.context?.street || addressResult?.address || addressResult?.name || ""
          const neighborhood = placeResult?.context?.neighborhood || addressResult?.context?.neighborhood || ""
          const city = placeResult?.context?.city || placeResult?.name || ""
          const placeName = placeResult?.name || placeResult?.place_name || ""
          
          // Format location name according to user requirements:
          // - For rural/town: "Street Town" (e.g., "Eikenhof street Riebeek west")
          // - For city: "Street Suburb City" (e.g., "Lytton street Observatory Cape town")
          
          let result = ""
          
          if (city && neighborhood) {
            // City location: "Street Suburb City"
            const parts = []
            if (street) parts.push(street)
            if (neighborhood) parts.push(neighborhood)
            if (city) parts.push(city)
            result = parts.join(" ")
          } else if (city || placeName) {
            // Rural/town location: "Street Town"
            const parts = []
            if (street) parts.push(street)
            // Use city if available, otherwise use placeName
            const town = city || placeName
            if (town) parts.push(town)
            result = parts.join(" ")
          } else {
            // Fallback to place name
            result = placeName
          }
          
          // Ensure "street" is lowercase (as per user examples)
          result = result.replace(/\bStreet\b/g, "street")
          
          if (result) {
            locationFallbackCacheRef.current.set(cacheKey, { result, timestamp: now })
            return result
          }
        }
      }
    } catch (error) {
      console.log(`⚠️ Mapbox fallback error:`, error)
    }
    
    // Regional fallbacks (no coordinates)
    let fallbackResult = "Current Location"
    
    // Riebeek West area
    if (lat > -33.4 && lat < -33.3 && lng > 18.8 && lng < 18.9) {
      fallbackResult = "Riebeek West"
    }
    // Cape Town CBD
    else if (lat > -33.9 && lat < -33.8 && lng > 18.4 && lng < 18.5) {
      fallbackResult = "Cape Town"
    }
    // Western Cape region
    else if (lat > -34.5 && lat < -33.0 && lng > 18.0 && lng < 19.5) {
      fallbackResult = "Western Cape"
    }
    
    // Cache the fallback result too
    locationFallbackCacheRef.current.set(cacheKey, { result: fallbackResult, timestamp: now })
    return fallbackResult
  }

  // UPDATED: Use pin-intel gateway for nearby places (NO MORE GOOGLE PLACES API)
  const findNearbyPins = useCallback(async () => {
    if (!location) return

    console.log("🏪 Discovering nearby places via gateway...")
    
    try {
      // Use the throttled pin-intel gateway wrapper
      const pinIntel = await maybeCallPinIntel(
        { lat: location.latitude, lng: location.longitude },
        5
      )
      
      // If throttled (returns null), skip updating nearby pins
      if (!pinIntel) {
        console.log("📍 Nearby places lookup throttled, skipping update")
        return
      }
      
      console.log("✅ Found", pinIntel.places.length, "places via gateway")
      
      // Transform gateway results to PinData format
      const transformedPlaces: PinData[] = pinIntel.places.map((place: any) => ({
        id: place.id,
        latitude: place.lat,
        longitude: place.lng,
        locationName: place.name || "Foursquare Place", // Use Foursquare data only
        mediaUrl: null,
        mediaType: null,
        audioUrl: null,
        timestamp: new Date().toISOString(),
        title: place.name || "Nearby Place",
        description: `${place.categories?.join(", ") || "Place"} • ${place.distance_m}m away`,
        tags: place.categories || [],
        isRecommended: true,
        rating: undefined,
        types: place.categories,
        isAISuggestion: true,
      }))
      
      setNearbyPins(transformedPlaces)
      setShowNearbyPins(true)
      setLastActivity("discovery")
      
    } catch (error) {
      console.error("❌ Error fetching nearby places:", error)
      // Don't set error state, just log it
    }
  }, [location])

  // Auto-fetch nearby places when recommendations screen is opened
  useEffect(() => {
    if (currentScreen === "recommendations" && location && nearbyPins.length === 0) {
      console.log("dY-,? Recommendations screen opened, fetching nearby places...")
      findNearbyPins()
    }
    
    // Hide nearby places popup when leaving recommendations screen
    if (currentScreen !== "recommendations") {
      setShowNearbyPins(false)
    }
  }, [currentScreen, location, nearbyPins.length, findNearbyPins])

  // Debug: Monitor recommendations state changes
  useEffect(() => {
    console.log("dY- Recommendations state changed:", recommendations.length, "recommendations")
    console.log("dY- Recommendations content:", recommendations)
  }, [recommendations])

  // Handle AI recommendations - ADD TO RECOMMENDATIONS LIST
  const handleAIRecommendations = useCallback((newRecommendations: Recommendation[]) => {
    console.log("dY- AI generated recommendations:", newRecommendations)
    console.log("dY- Current recommendations count before:", recommendations.length)
    
    setRecommendations((prev) => {
      // Avoid duplicates by checking IDs
      const existingIds = new Set(prev.map((r) => r.id))
      const uniqueRecommendations = newRecommendations.filter((r) => !existingIds.has(r.id))
      
      console.log("dY- Unique new recommendations:", uniqueRecommendations.length)
      console.log("dY- Total recommendations after adding:", prev.length + uniqueRecommendations.length)
      
      return [...prev, ...uniqueRecommendations]
    })
  }, [recommendations.length])

  // Handle notification tap - GO TO RECOMMENDATIONS PAGE
  const handleNotificationTap = useCallback(() => {
    console.log("dY- Opening recommendations hub")
    setCurrentScreen("recommendations")
    // Ensure nearby places popup is hidden when opening recommendations
    setShowNearbyPins(false)
  }, [])

  // Handle recommendation actions
  const handleRecommendationAction = useCallback(
    (action: string, data?: any) => {
      console.log("dYZ_ Taking recommendation action:", action, data)
      // Go back to map after action and hide nearby places popup
      setTimeout(() => setCurrentScreen("map"), 100)
      setShowNearbyPins(false)
    },
    [],
  )

  // Handle recommendation dismiss
  const handleRecommendationDismiss = useCallback((id: string) => {
    setRecommendations((prev) => prev.filter((r) => r.id !== id))
  }, [])

  // Handle recommendation complete
  const handleRecommendationComplete = useCallback((id: string) => {
    setRecommendations((prev) => prev.map((r) => (r.id === id ? { ...r, isCompleted: true } : r)))
  }, [])

  // Handle proactive AI suggestions
  const handleProactiveSuggestion = useCallback(
    (action: string, data?: any) => {
      console.log("dY- Proactive AI suggestion:", action, data)

      switch (action) {
        case "suggest-pin":
          // Show recommendations instead of AI assistant
          setCurrentScreen("recommendations")
          break
        default:
          console.log("Unknown proactive suggestion:", action)
      }

      setLastActivity(`proactive-${action}`)
    },
    [],
  )

  // Handle platform select
  const handlePlatformSelect = useCallback((platform: string) => {
    setSelectedPlatform(platform)
    setCurrentScreen("content-editor")
  }, [])

  // Handle quick pin with speed-based location calculation
  const handleQuickPin = useCallback(async () => {
    if (isQuickPinning) return

    setIsQuickPinning(true)
    setLastActivity("quick-pin")

    try {
      const currentLocation = await getCurrentLocation()
      
      // NEW: Calculate precise location based on speed and movement
      let pinLatitude = currentLocation.latitude
      let pinLongitude = currentLocation.longitude
      let locationDescription = "Quick Pin Location"
      
      if (motionData.isMoving && motionData.speed > 5) { // Only adjust if moving faster than 5 km/h
        console.log(`🚗 Speed-based pinning: ${motionData.speed.toFixed(1)} km/h`)
        
        // Calculate where the user likely saw the place (accounting for reaction time)
        const reactionTime = 2 // 2 seconds reaction time
        const speedInMPS = motionData.speed / 3.6 // Convert km/h to m/s
        
        // Calculate distance traveled during reaction time
        const distanceTraveled = speedInMPS * reactionTime
        
        // Calculate bearing (direction of travel)
        if (motionData.lastPosition) {
          const bearing = Math.atan2(
            currentLocation.longitude - motionData.lastPosition.longitude,
            currentLocation.latitude - motionData.lastPosition.latitude
          )
          
          // Calculate the location where the user likely saw the place
          const latOffset = (distanceTraveled / 111000) * Math.cos(bearing) // 111km per degree latitude
          const lngOffset = (distanceTraveled / (111000 * Math.cos(currentLocation.latitude * Math.PI / 180))) * Math.sin(bearing)
          
          pinLatitude = currentLocation.latitude - latOffset
          pinLongitude = currentLocation.longitude - lngOffset
          
          locationDescription = `Speed-based pin (${motionData.speed.toFixed(0)} km/h)`
          
          console.log(`📍 Speed-adjusted location: ${pinLatitude.toFixed(6)}, ${pinLongitude.toFixed(6)}`)
        }
      } else {
        console.log("📍 Stationary pinning - using current location")
      }
      
      // NEW: Fetch location photos before creating the pin (includes Foursquare place data)
      console.log("📸 Fetching location photos for speed-based pin...")
      const locationPhotos = await fetchLocationPhotos(pinLatitude, pinLongitude)
      
      // Get OSM place data (prioritize over AI-generated content)
      const placeName = locationPhotos[0]?.placeName
      const placeDescription = locationPhotos[0]?.description
      
      console.log("📍 OSM (OpenStreetMap) API results:", { placeName, placeDescription, photoCount: locationPhotos.length })
      
      // Only generate AI content as fallback if OSM data is missing
      const aiGeneratedContent = generateAIContent(pinLatitude, pinLongitude, motionData, locationPhotos, placeName, placeDescription)
      
      const newPin: PinData = {
        id: Date.now().toString(),
        latitude: pinLatitude,
        longitude: pinLongitude,
        // PRIORITIZE Foursquare data over AI-generated content
        locationName: placeName || aiGeneratedContent.locationName || locationDescription,
        mediaUrl: locationPhotos[0]?.url || null, // Use the first photo as primary
        mediaType: "photo",
        audioUrl: null,
        timestamp: new Date().toISOString(),
        // Use Foursquare placeName as title first, then AI, then fallback
        title: placeName || aiGeneratedContent.title || "Untitled Location",
        // Use Foursquare description first, then AI, then fallback
        description: placeDescription || aiGeneratedContent.description || "",
        tags: aiGeneratedContent.tags,
        // NEW: Store all photos for the carousel
        additionalPhotos: locationPhotos,
        // NEW: Mark as pending - needs location confirmation via edit mode
        isPending: true
      }

      // Save pin immediately to pins array (temporary - user can save permanently, share, or discard later)
      addPin(newPin)
      console.log("📍 Quick pin created with photo:", newPin)
      console.log("💾 Pin saved to pins array - accessible in pins section")

      // Show simple "Pinned Successfully" popup instead of results page
      setSuccessMessage("Pinned Successfully!")
      setShowSuccessPopup(true)
      
      // Auto-hide popup and stay on map screen after 1.5 seconds
      setTimeout(() => {
        setShowSuccessPopup(false)
        console.log("🔄 Pin created - ready for next pin")
      }, 1500)
    } catch (error) {
      console.error("❌ Failed to create quick pin:", error)
    } finally {
      setIsQuickPinning(false)
    }
  }, [getCurrentLocation, isQuickPinning, motionData, addPin])

  // NEW: Generate intelligent AI content based on location and context
  // Prioritizes Foursquare data (title/name, description) over AI-generated content
  const generateAIContent = (lat: number, lng: number, motionData: any, locationPhotos: any[], placeName?: string, placeDescription?: string) => {
    console.log("🧠 Generating AI content for location:", { lat, lng, speed: motionData.speed, photoCount: locationPhotos.length, hasPlaceName: !!placeName, hasDescription: !!placeDescription })
    
    // Determine location type and context (needed for both title generation and tags)
    let locationType = "general"
    let context = ""
    
    // Analyze location based on coordinates
    if (lat > -34.1 && lat < -34.0 && lng > 18.8 && lng < 18.9) {
      locationType = "small-town"
      context = "Riebeek West - charming rural community"
    } else if (lat > -33.9 && lat < -33.8 && lng > 18.4 && lng < 18.5) {
      locationType = "urban-cbd"
      context = "Cape Town CBD - vibrant city center"
    } else if (lat > -34.0 && lat < -33.9 && lng > 18.4 && lng < 18.5) {
      locationType = "suburban"
      context = "Cape Town Southern Suburbs - residential area"
    } else if (lat > -33.9 && lat < -33.8 && lng > 18.4 && lng < 18.5) {
      locationType = "suburban"
      context = "Cape Town Northern Suburbs - growing community"
    } else if (lat > -33.4 && lat < -33.3 && lng > 18.8 && lng < 18.9) {
      locationType = "rural"
      context = "Riebeek West area"
    } else if (lat > -34.0 && lat < -33.5 && lng > 18.0 && lng < 19.0) {
      locationType = "provincial"
      context = "Western Cape - diverse landscapes"
    }
    
    // PRIORITY 1: Use Foursquare title/name if available
    let title = ""
    if (placeName && placeName.trim() && placeName !== "PINIT Placeholder" && placeName !== "Unknown Place") {
      title = placeName
      console.log("🧠 Using Foursquare title:", title)
    } else {
      // Fall back to AI-generated title only if no Foursquare data
      // Generate title based on location type and context
      if (motionData.isMoving && motionData.speed > 5) {
        // Speed-based pinning titles
        if (locationType === "small-town") {
          title = "🏘️ Charming Rural Discovery"
        } else if (locationType === "urban-cbd") {
          title = "🏙️ Urban Gem Spotted"
        } else if (locationType === "suburban") {
          title = "🏡 Suburban Treasure"
        } else if (locationType === "coastal") {
          title = "🌊 Coastal Beauty"
        } else if (locationType === "provincial") {
          title = "🏔️ Provincial Wonder"
        } else {
          title = "📍 Travel Discovery"
        }
      } else {
        // Stationary pinning titles
        if (locationType === "small-town") {
          title = "🏘️ Local Community Spot"
        } else if (locationType === "urban-cbd") {
          title = "🏙️ City Center Location"
        } else if (locationType === "suburban") {
          title = "🏡 Neighborhood Place"
        } else if (locationType === "coastal") {
          title = "🌊 Seaside Location"
        } else if (locationType === "rural") {
          title = "🏘️ Rural Location"
        } else if (locationType === "provincial") {
          title = "🏔️ Regional Spot"
        } else {
          title = "📍 Local Discovery"
        }
      }
    }
    
    // PRIORITY 1: Use Mapbox description if available (from placeDescription parameter)
    let description = ""
    if (placeDescription && placeDescription.trim() && placeDescription !== "undefined") {
      // Use Mapbox description if available
      description = placeDescription
      console.log("🧠 Using Mapbox description:", description.substring(0, 100))
    } else {
      // Fall back to AI-generated description only if no Mapbox data
      // But make it more location-specific using placeName if available
      if (placeName && placeName !== "Location" && placeName !== "PINIT Placeholder" && placeName !== "Unknown Place") {
        // We have a place name but no description - create a simple, location-specific description
        if (motionData.isMoving && motionData.speed > 5) {
          description = `Discovered ${placeName} while traveling at ${motionData.speed.toFixed(1)} km/h. A great spot worth remembering!`
        } else {
          description = `Found ${placeName}. A special location worth exploring and sharing.`
        }
      } else {
        // No place name either - use generic context-based description
        if (motionData.isMoving && motionData.speed > 5) {
          description = `Discovered this amazing spot while traveling ${motionData.speed.toFixed(1)} km/h! ${context} - perfect for capturing memories and sharing with friends.`
        } else {
          description = `Found this special place in ${context}. A wonderful location to remember and share with others.`
        }
      }
      console.log("🧠 No Mapbox description available, using generated description:", description.substring(0, 100))
    }
    
    // Generate smart tags based on context
    const tags = []
    if (motionData.isMoving && motionData.speed > 5) {
      tags.push("travel-discovery", "speed-pinning")
    }
    if (locationType === "small-town") {
      tags.push("rural", "community", "local")
    } else if (locationType === "urban-cbd") {
      tags.push("urban", "city", "vibrant")
    } else if (locationType === "suburban") {
      tags.push("suburban", "residential", "family")
    } else if (locationType === "coastal") {
      tags.push("coastal", "ocean", "scenic")
    } else if (locationType === "provincial") {
      tags.push("provincial", "landscape", "diverse")
    }
    tags.push("ai-generated", "pinit")
    
    // Use real location name if available from photos (Foursquare or Google)
    let locationName = context
    if (locationPhotos.length > 0 && locationPhotos[0].placeName && locationPhotos[0].placeName !== "PINIT Placeholder") {
      locationName = locationPhotos[0].placeName
      console.log("🧠 Using place name from API:", locationName)
    }
    
    console.log("🧠 AI Generated Content:", { title, description, locationName, tags })
    
    return {
      title,
      description,
      locationName,
      tags
    }
  }

  // NEW: Fetch location photos for pins (returns single best photo with aggressive filtering)
  // Includes request deduplication to prevent multiple API calls for the same location
  // Accepts optional AbortSignal for cancellation from parent requests
  // Helper function to calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000 // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c // Distance in meters
  }

  // Helper function to check if an image is likely road-facing
  // Returns true if the image should be REJECTED (road-facing)
  // Made less aggressive to allow more images through
  const isRoadFacing = (bearing: number): boolean => {
    // Normalize bearing to 0-360
    const normalizedBearing = ((bearing % 360) + 360) % 360
    
    // Road-facing images are typically taken while driving, so they align with:
    // - Cardinal directions (0°, 90°, 180°, 270°) - driving N, E, S, W
    // - Or within ~15° of cardinal directions
    // Building-facing images are usually perpendicular (45°, 135°, 225°, 315°)
    
    // Check distance from each cardinal direction
    const distancesFromCardinal = [
      Math.min(Math.abs(normalizedBearing - 0), Math.abs(normalizedBearing - 360)),
      Math.abs(normalizedBearing - 90),
      Math.abs(normalizedBearing - 180),
      Math.abs(normalizedBearing - 270)
    ]
    const minDistanceFromCardinal = Math.min(...distancesFromCardinal)
    
    // Less aggressive: only reject images within 15° of cardinal directions (very road-facing)
    // This allows more images through while still filtering obvious road-facing shots
    return minDistanceFromCardinal < 15
  }

  // Helper function to score images for building-facing preference
  // Lower score = better (prefer building-facing over road-facing)
  const getImageScore = (bearing: number, distance: number): number => {
    // Normalize bearing to 0-360
    const normalizedBearing = ((bearing % 360) + 360) % 360
    
    // Calculate how close the bearing is to a cardinal direction
    const distancesFromCardinal = [
      Math.min(Math.abs(normalizedBearing - 0), Math.abs(normalizedBearing - 360)),
      Math.abs(normalizedBearing - 90),
      Math.abs(normalizedBearing - 180),
      Math.abs(normalizedBearing - 270)
    ]
    const minDistanceFromCardinal = Math.min(...distancesFromCardinal)
    
    // Strongly penalize images close to cardinal directions (even if not rejected)
    // Images at 45° angles (building-facing) get score of 0
    // Images at 0° (road-facing) get high penalty
    const bearingPenalty = (25 - minDistanceFromCardinal) * 5 // Much steeper penalty
    
    // Prefer closer images (but bearing is more important)
    const distanceScore = distance / 20 // Less weight on distance
    
    // Total score: lower is better
    return Math.max(0, bearingPenalty) + distanceScore
  }

  const fetchLocationPhotos = async (lat: number, lng: number, externalSignal?: AbortSignal, bypassCache: boolean = false): Promise<{url: string, placeName: string, description?: string}[]> => {
    // Request deduplication: Check cache first (unless bypassing)
    // Use more precise cache key for exact location matching
    const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}` // Use full precision for exact location
    const cached = photoFetchCacheRef.current.get(cacheKey)
    const now = Date.now()
    
    // Return cached result if available and recent (within 5 minutes) - unless bypassing cache
    // Increased from 5 seconds to 5 minutes for better performance and reduced API calls
    if (!bypassCache && cached && (now - cached.timestamp) < 300000) {
      console.log("📸 Using cached photo data for location:", cacheKey)
      return cached.data
    }
    
    if (bypassCache) {
      console.log("📸 Bypassing cache - fetching fresh data for EXACT location:", { lat, lng, cacheKey })
    }
    
    // Check if external signal is already aborted
    if (externalSignal?.aborted) {
      console.log("📸 External signal already aborted, returning cached or placeholder")
      const cached = photoFetchCacheRef.current.get(cacheKey)
      if (cached) return cached.data
      return [{url: "/pinit-placeholder.jpg", placeName: "Location"}]
    }
    
    // Cancel any previous request (only if no external signal provided)
    if (!externalSignal && photoFetchControllerRef.current) {
      photoFetchControllerRef.current.abort()
    }
    
    // Prevent concurrent requests (only if no external signal provided)
    if (!externalSignal && isFetchingPhotosRef.current) {
      console.log("📸 Photo fetch already in progress, waiting...")
      // Wait for current request to complete
      await new Promise(resolve => setTimeout(resolve, 100))
      // Check cache again after waiting
      const cachedAfterWait = photoFetchCacheRef.current.get(cacheKey)
      if (cachedAfterWait && (now - cachedAfterWait.timestamp) < 300000) {
        return cachedAfterWait.data
      }
    }
    
    // Use external signal if provided, otherwise create new one
    let signal: AbortSignal
    if (externalSignal) {
      signal = externalSignal
      // Don't set isFetchingPhotosRef when using external signal (parent manages it)
    } else {
      isFetchingPhotosRef.current = true
      photoFetchControllerRef.current = new AbortController()
      signal = photoFetchControllerRef.current.signal
    }
    
    try {
      console.log("📍 Fetching location data using Mapbox APIs only...")
      
      // STEP 1: Fetch nearby POIs via Mapbox Search API FIRST (better place data with names)
      let placeName = "Location"
      let placeDescription: string | undefined = undefined
      let placeData: any = null
      
      try {
        console.log("📍 Step 1: Fetching nearby travel POIs via Mapbox Search API...")
        // Focus on travel-related categories: restaurants, cafes, monuments, museums, art galleries, churches, tourism
        const searchResponse = await fetch(`/api/mapbox/search?lat=${lat}&lng=${lng}&radius=150&limit=10&categories=restaurant,cafe,monument,museum,art_gallery,place_of_worship,tourism`, { signal })
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json()
          console.log(`📍 Mapbox Search returned ${searchData.pois?.length || 0} POIs`)
          
          if (searchData.pois && searchData.pois.length > 0) {
            // Find closest POI within 150m
            const closestPOI = searchData.pois[0]
            console.log(`✅ Found closest Mapbox POI: ${closestPOI.name} at ${closestPOI.distance.toFixed(1)}m`)
            
            if (closestPOI.distance <= 150) {
              // Use POI data (most specific and reliable)
              placeData = closestPOI
              placeName = closestPOI.name || "Location"
              
              // Build meaningful description from POI data
              if (closestPOI.description && closestPOI.description.trim()) {
                placeDescription = closestPOI.description
              } else if (closestPOI.category) {
                // Create description from category and address context
                const categoryName = closestPOI.category.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
                if (closestPOI.address) {
                  placeDescription = `${categoryName} located at ${closestPOI.address}`
                } else if (closestPOI.city) {
                  placeDescription = `${categoryName} in ${closestPOI.city}`
                } else {
                  placeDescription = `A ${categoryName.toLowerCase()} worth exploring`
                }
              }
              
              console.log(`✅ Using Mapbox Search POI data: ${placeName}`, { 
                hasDescription: !!placeDescription,
                description: placeDescription?.substring(0, 50)
              })
            }
          }
        } else {
          console.warn("⚠️ Mapbox Search API failed")
        }
      } catch (searchError: any) {
        if (searchError.name === 'AbortError') {
          console.log("📍 Search request was aborted")
          throw searchError
        }
        console.warn("⚠️ Mapbox Search API failed:", searchError.message)
      }
      
      // STEP 2: Fallback to Mapbox Geocoding if no POI found (for place names)
      if (!placeData || placeName === "Location") {
        try {
          console.log("📍 Step 2: Fallback - Fetching place name via Mapbox Geocoding API...")
          // Try POI first, then address, then place
          const geocodingResponse = await fetch(`/api/mapbox_geocoding?lat=${lat}&lng=${lng}&types=poi`, { signal })
          
          if (geocodingResponse.ok) {
            const geocodingData = await geocodingResponse.json()
            console.log(`📍 Mapbox Geocoding returned ${geocodingData.places?.length || 0} places`)
            
            if (geocodingData.places && geocodingData.places.length > 0) {
              // Find the best result (prefer POI, then address with name)
              const poiResult = geocodingData.places.find((p: any) => p.place_type === 'poi' || p.category)
              const bestPlace = poiResult || geocodingData.places[0]
              
              if (bestPlace) {
                placeData = bestPlace
                // Extract name - prefer text (short name) over place_name (full address)
                placeName = bestPlace.name || bestPlace.place_name?.split(',')[0] || "Location"
                
                // Build description from geocoding data
                if (!placeDescription) {
                  if (bestPlace.category) {
                    const categoryName = bestPlace.category.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
                    if (bestPlace.context?.city) {
                      placeDescription = `${categoryName} in ${bestPlace.context.city}`
                    } else {
                      placeDescription = `A ${categoryName.toLowerCase()} worth exploring`
                    }
                  } else if (bestPlace.context?.neighborhood) {
                    placeDescription = `Located in ${bestPlace.context.neighborhood}`
                  }
                }
                
                console.log(`✅ Using Mapbox Geocoding data: ${placeName}`, { 
                  hasDescription: !!placeDescription
                })
              }
            }
          }
        } catch (geocodingError: any) {
          if (geocodingError.name === 'AbortError') {
            console.log("📍 Geocoding request was aborted")
            throw geocodingError
          }
          console.warn("⚠️ Mapbox Geocoding API failed:", geocodingError.message)
        }
      }
      
      // STEP 3: Fetch static image via Mapbox Static Images API
      // Note: Mapbox doesn't provide true street-level photos, but streets-v12 shows buildings better than satellite
      console.log("📸 Step 3: Fetching building image via Mapbox Static Images API...")
      let imageUrl: string | null = null
      
      try {
        // Lower zoom (17) for less aerial view - Mapbox Static Images doesn't provide true street-level photos
        const staticImageResponse = await fetch(`/api/mapbox/static-image?lat=${lat}&lng=${lng}&width=800&height=600&zoom=17&style=streets-v12`, { signal })
        
        if (staticImageResponse.ok) {
          const staticImageData = await staticImageResponse.json()
          if (staticImageData.imageUrl) {
            imageUrl = staticImageData.imageUrl
            console.log(`✅ Mapbox Static Image: Generated image URL`)
          }
        } else {
          console.warn("⚠️ Mapbox Static Images API failed")
        }
      } catch (imageError: any) {
        if (imageError.name === 'AbortError') {
          console.log("📸 Static image request was aborted")
          throw imageError
        }
        console.warn("⚠️ Mapbox Static Images API failed:", imageError.message)
      }
      
      // STEP 4: Return place data with image (or placeholder if none found)
      // Always return placeName and description if we have them, even without image
      // CRITICAL: Ensure description is always meaningful, not empty or undefined
      const finalDescription = placeDescription && placeDescription.trim() ? placeDescription : undefined
      
      console.log(`📋 Final place data:`, {
        placeName,
        hasDescription: !!finalDescription,
        description: finalDescription?.substring(0, 50),
        hasImage: !!imageUrl
      })
      
      if (placeName && placeName !== "Location") {
        if (imageUrl) {
          // Use Mapbox static image
          console.log(`✅ Returning Mapbox place data with static image`)
          const result = [{
            url: imageUrl,
            placeName: placeName,
            description: finalDescription
          }]
          photoFetchCacheRef.current.set(cacheKey, { data: result, timestamp: Date.now() })
          return result
        } else {
          // No image found, but we have place data - use placeholder
          console.log(`✅ Returning Mapbox place data with placeholder (no image found)`)
          const result = [{
            url: "/pinit-placeholder.jpg",
            placeName: placeName,
            description: finalDescription
          }]
          photoFetchCacheRef.current.set(cacheKey, { data: result, timestamp: Date.now() })
          return result
        }
      }
      
      // STEP 5: Ultimate fallback - no place data available
      if (imageUrl) {
        // We have image but no place data
        console.log("⚠️ No Mapbox place data, but found image")
        const result = [{
          url: imageUrl,
          placeName: "Location"
        }]
        photoFetchCacheRef.current.set(cacheKey, { data: result, timestamp: Date.now() })
        return result
      }
      
      console.log("⚠️ No Mapbox place data and no image available")
      const finalFallback = [{url: "/pinit-placeholder.jpg", placeName: "Location"}]
      photoFetchCacheRef.current.set(cacheKey, { data: finalFallback, timestamp: Date.now() })
      return finalFallback
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log("📸 Photo fetch was aborted")
        // Return cached result if available, otherwise placeholder
        const cached = photoFetchCacheRef.current.get(cacheKey)
        if (cached) return cached.data
        return [{url: "/pinit-placeholder.jpg", placeName: "Location"}]
      }
      console.error("❌ Error fetching location photos:", error)
      const errorResult = [{url: "/pinit-placeholder.jpg", placeName: "Location"}]
      // Cache error result to prevent repeated failures
      photoFetchCacheRef.current.set(cacheKey, { data: errorResult, timestamp: Date.now() })
      return errorResult
    } finally {
      // Only reset flags if we created our own controller (not using external signal)
      if (!externalSignal) {
        isFetchingPhotosRef.current = false
        photoFetchControllerRef.current = null
      }
    }
  }

  // Request deduplication for camera capture
  const cameraFetchControllerRef = useRef<AbortController | null>(null)
  const isFetchingCameraLocationRef = useRef(false)

  // Handle camera capture
  const handleCameraCapture = useCallback(
    async (mediaUrl: string, type: "photo" | "video") => {
      if (!location) return

      // PROTECTION: Prevent duplicate requests for the same location
      if (isFetchingCameraLocationRef.current) {
        console.log("⏸️ Camera location fetch already in progress, using cached or skipping...")
        // Use cached data if available, otherwise proceed without Foursquare data
        const cacheKey = `${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`
        const cached = photoFetchCacheRef.current.get(cacheKey)
        let foursquareData = null
        
        if (cached && cached.data && cached.data.length > 0) {
          foursquareData = {
            placeName: cached.data[0]?.placeName || null,
            description: cached.data[0]?.description || null,
            latitude: location.latitude,
            longitude: location.longitude
          }
          console.log("✅ Using cached Foursquare data for camera capture")
        }
        
        setCapturedMedia({
          url: mediaUrl,
          type,
          location: "Camera Capture",
          foursquareData: foursquareData || {
            placeName: null,
            description: null,
            latitude: location.latitude,
            longitude: location.longitude
          }
        })
        setLastActivity(`camera-${type}`)
        setCurrentScreen("editor")
        return
      }

      console.log("📸 Camera capture - fetching Foursquare location data...")
      
      // Set guard to prevent duplicate requests
      isFetchingCameraLocationRef.current = true
      
      // Cancel any previous request
      if (cameraFetchControllerRef.current) {
        cameraFetchControllerRef.current.abort()
      }
      cameraFetchControllerRef.current = new AbortController()
      const signal = cameraFetchControllerRef.current.signal
      
      // Fetch Foursquare location data for the exact photo location
      // Use cache first (don't bypass) to avoid unnecessary API calls
      // Only fetch fresh if cache is empty or stale
      let foursquareData = null
      try {
        // Check cache first to avoid duplicate API calls
        const cacheKey = `${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`
        const cached = photoFetchCacheRef.current.get(cacheKey)
        const now = Date.now()
        
        // Use cached data if available and recent (within 30 seconds)
        if (cached && (now - cached.timestamp) < 30000 && cached.data && cached.data.length > 0) {
          foursquareData = {
            placeName: cached.data[0]?.placeName || null,
            description: cached.data[0]?.description || null,
            latitude: location.latitude,
            longitude: location.longitude
          }
          console.log("✅ Using cached Foursquare data (avoiding duplicate API call)")
        } else {
          // Cache is stale or empty, fetch fresh data (but use existing deduplication in fetchLocationPhotos)
          const locationPhotos = await fetchLocationPhotos(location.latitude, location.longitude, signal, false) // Use cache protection
          if (signal.aborted) {
            console.log("📸 Camera location fetch was aborted")
            return
          }
          
          if (locationPhotos && locationPhotos.length > 0) {
            foursquareData = {
              placeName: locationPhotos[0]?.placeName || null,
              description: locationPhotos[0]?.description || null,
              latitude: location.latitude,
              longitude: location.longitude
            }
            console.log("✅ Foursquare location data captured:", foursquareData)
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log("📸 Camera location fetch was aborted")
          return
        }
        console.error("❌ Failed to fetch Foursquare data for photo:", error)
      } finally {
        // Always reset guard
        isFetchingCameraLocationRef.current = false
        cameraFetchControllerRef.current = null
      }

      setCapturedMedia({
        url: mediaUrl,
        type,
        location: "Camera Capture",
        // Store Foursquare location data with the photo
        foursquareData: foursquareData || {
          placeName: null,
          description: null,
          latitude: location.latitude,
          longitude: location.longitude
        }
      })

      setLastActivity(`camera-${type}`)
      setCurrentScreen("editor")
    },
    [location, fetchLocationPhotos],
  )

  // PlaceNavigation removed - Google Maps migration to Mapbox
  const handlePlaceNavigation = (place: any) => {
    console.log("dY-,? Place navigation removed - redirecting to recommendations")
    // Navigation feature removed - redirect to recommendations
    setCurrentScreen("recommendations")
  }

  // Handle save for later
  const handleSaveForLater = (place: any) => {
    console.log("dY- Saving place for later:", place.title)
    setSavedForLaterPlaces((prev) => [...prev, { ...place, savedAt: Date.now() }])
    setCurrentScreen("recommendations")
  }

  // Handler for when pin location is updated (dragged)
  const handlePinLocationUpdate = useCallback((lat: number, lng: number) => {
    if (editingPin) {
      setEditingPinLocation({ lat, lng })
      console.log("📍 Pin location updated:", { lat, lng })
      // DON'T update originalPinLocation here - keep it as the original pin's location
      // so we can detect if the pin was moved when "Done" is clicked
    }
  }, [editingPin])
  
  // Handler for Done button - fetch new data and update pin
  const handlePinEditDone = useCallback(async () => {
    if (!editingPin || !editingPinLocation || !originalPinLocation) return
    
    // Request deduplication: Prevent multiple simultaneous calls
    if (isUpdatingPinRef.current || isUpdatingPinLocation) {
      console.log("⏸️ Pin update already in progress, skipping duplicate request")
      return
    }
    
    // Check if pin was moved (compare to the ORIGINAL pin's location, not the state)
    const originalLat = editingPin.latitude
    const originalLng = editingPin.longitude
    const latDiff = Math.abs(editingPinLocation.lat - originalLat)
    const lngDiff = Math.abs(editingPinLocation.lng - originalLng)
    const moved = latDiff > 0.00005 || lngDiff > 0.00005 // ~5.5 meters - more sensitive threshold
    console.log("📍 Pin move check:", { 
      original: { lat: originalLat, lng: originalLng },
      current: { lat: editingPinLocation.lat, lng: editingPinLocation.lng },
      diff: { lat: latDiff, lng: lngDiff },
      moved 
    })
    
    // Set flags to prevent duplicate requests
    setIsUpdatingPinLocation(true)
    isUpdatingPinRef.current = true
    
    // Cancel any previous request
    if (pinEditControllerRef.current) {
      pinEditControllerRef.current.abort()
    }
    pinEditControllerRef.current = new AbortController()
    const signal = pinEditControllerRef.current.signal
    
    try {
      let locationPhotos = editingPin.additionalPhotos || []
      let placeName = editingPin.locationName
      let placeDescription = editingPin.description
      let aiGeneratedContent = {
        title: editingPin.title,
        description: editingPin.description,
        locationName: editingPin.locationName,
        tags: editingPin.tags || []
      }
      
      // Always fetch new data when Done is clicked (even if not moved much, refresh the data)
      // This ensures we have the latest information for the current location
      // BYPASS CACHE to ensure we get fresh data for the new location
      console.log("📸 Fetching FRESH location data for NEW pin location (bypassing cache):", {
        lat: editingPinLocation.lat,
        lng: editingPinLocation.lng,
        originalLat: editingPin.latitude,
        originalLng: editingPin.longitude
      })
      
      locationPhotos = await fetchLocationPhotos(editingPinLocation.lat, editingPinLocation.lng, signal, true) // true = bypass cache
      
      // Check if request was aborted
      if (signal.aborted) {
        console.log("📸 Pin update request was aborted")
        return
      }
      
      console.log("📸 Fetched location photos:", {
        count: locationPhotos.length,
        photos: locationPhotos.map(p => ({ url: p.url?.substring(0, 50), placeName: p.placeName }))
      })
      
      // Get place name and description from Foursquare API data (prioritize over AI)
      placeName = locationPhotos[0]?.placeName || editingPin.locationName
      placeDescription = (locationPhotos[0] as any)?.description || editingPin.description
      
      console.log("📍 OSM (OpenStreetMap) API results:", { placeName, placeDescription, photoCount: locationPhotos.length })
      
      // Only generate AI content as fallback if Mapbox data is missing
      // Prioritize actual Mapbox place data over AI-generated content
      if (!placeName || placeName === "Unknown Place" || !placeDescription) {
        console.log("📸 Mapbox data incomplete, generating AI content as fallback...")
        aiGeneratedContent = generateAIContent(
          editingPinLocation.lat, 
          editingPinLocation.lng, 
          motionData, 
          locationPhotos, 
          placeName, 
          placeDescription
        )
        console.log("📸 Generated AI content as fallback:", { 
          title: aiGeneratedContent.title,
          description: aiGeneratedContent.description?.substring(0, 100),
          locationName: aiGeneratedContent.locationName
        })
      } else {
        console.log("✅ Using Foursquare API data (title and description) - skipping AI generation")
        // Use Foursquare data directly, no AI needed
        aiGeneratedContent = {
          title: placeName,
          description: placeDescription,
          locationName: placeName,
          tags: editingPin.tags || []
        }
      }
      
      // Update the pin with new location and data
      // PRIORITIZE Foursquare data over AI-generated content
      const updatedPin: PinData = {
        ...editingPin,
        latitude: editingPinLocation.lat,
        longitude: editingPinLocation.lng,
        // Use Foursquare placeName first, then AI, then fallback
        locationName: placeName || aiGeneratedContent.locationName || editingPin.locationName,
        // Use Foursquare placeName as title first, then AI, then fallback
        title: placeName || aiGeneratedContent.title || editingPin.title,
        // Use Foursquare description first, then AI, then fallback
        description: placeDescription || aiGeneratedContent.description || editingPin.description,
        mediaUrl: locationPhotos[0]?.url || editingPin.mediaUrl,
        additionalPhotos: locationPhotos.length > 0 ? locationPhotos : (editingPin.additionalPhotos || []),
        tags: aiGeneratedContent.tags || editingPin.tags || [],
        // Mark as completed (no longer pending) - user can edit again later if needed
        isPending: false
      }
      
      console.log("✅ Pin updated with new location and data:", {
        id: updatedPin.id,
        title: updatedPin.title,
        locationName: updatedPin.locationName,
        latitude: updatedPin.latitude,
        longitude: updatedPin.longitude,
        hasMediaUrl: !!updatedPin.mediaUrl,
        additionalPhotosCount: updatedPin.additionalPhotos?.length || 0,
        description: updatedPin.description?.substring(0, 100)
      })
      
      // Remove the old pending pin and add the updated completed pin
      // This ensures the pending card disappears from the library
      removePinFromStorage(editingPin.id)
      addPinFromStorage(updatedPin)
      console.log("🔄 Removed old pending pin and added completed pin to storage")
      
      // Show results page with updated pin FIRST
      setCurrentResultPin(updatedPin)
      setCurrentScreen("results")
      
      // Clear editing state after navigation (use setTimeout to ensure screen transition happens first)
      setTimeout(() => {
        setEditingPin(null)
        setEditingPinLocation(null)
        setOriginalPinLocation(null)
        setIsDraggingPin(false)
      }, 100)
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log("📸 Pin update was aborted")
        return
      }
      console.error("❌ Error updating pin location:", error)
    } finally {
      setIsUpdatingPinLocation(false)
      isUpdatingPinRef.current = false
      pinEditControllerRef.current = null
    }
  }, [editingPin, editingPinLocation, originalPinLocation, motionData, fetchLocationPhotos, generateAIContent, addPinFromStorage, setCurrentResultPin, setCurrentScreen, isUpdatingPinLocation])
  
  // Handler for Cancel button
  const handlePinEditCancel = useCallback(() => {
    console.log("❌ Pin editing cancelled")
    setEditingPin(null)
    setEditingPinLocation(null)
    setOriginalPinLocation(null)
    setCurrentScreen("library")
  }, [setCurrentScreen])

  // Handle navigation start
  const handleStartNavigation = (place: any) => {
    console.log("dY- Starting navigation to:", place.title)
    // Navigation is handled within the PlaceNavigation component
  }

  // Results page handlers
  const handleSaveFromResults = (pin: PinData) => {
    // Include personal thoughts in the saved pin and mark as completed
    const pinToSave = {
      ...pin,
      personalThoughts: pin.personalThoughts || undefined,
      isPending: false // Mark as completed when saved from results
    }
    
    // Remove the old pending pin if it exists (by ID)
    // This ensures the pending card disappears from the library
    removePinFromStorage(pin.id)
    
    // Add the completed pin
    addPin(pinToSave)
    
    console.log("💾 Pin saved from results - old pending pin removed, completed pin added:", pinToSave.id)
    
    setCurrentResultPin(null)
    setTimeout(() => setCurrentScreen("map"), 100)
    setQuickPinSuccess(true)
    setTimeout(() => setQuickPinSuccess(false), 2000)
  }

  const handleShareFromResults = (pin: PinData) => {
    // Create a comprehensive media object that captures ALL PINIT data
    const mediaData = {
      url: pin.mediaUrl || "/pinit-placeholder.jpg",
      type: "photo" as const,
      location: pin.locationName,
        title: pin.title,
      description: pin.description,
      personalThoughts: pin.personalThoughts || undefined,
      // Enhanced PINIT data
      pinId: pin.id,
      latitude: pin.latitude,
      longitude: pin.longitude,
      timestamp: pin.timestamp,
      tags: pin.tags || [],
      additionalPhotos: pin.additionalPhotos || [],
      // AI-generated content
      aiTitle: pin.title,
      aiDescription: pin.description,
      aiTags: pin.tags || []
    }
    
    // Set the captured media and go to platform selection (same flow as camera photos)
    setCapturedMedia(mediaData)
    setCurrentScreen("platform-select")
  }

  const handleEditFromResults = (pin: PinData) => {
    // For now, just go back to map - could be enhanced with an edit modal
    setCurrentResultPin(null)
    setTimeout(() => setCurrentScreen("map"), 100)
  }

  const handleBackFromResults = () => {
    setCurrentResultPin(null)
    setTimeout(() => setCurrentScreen("map"), 100)
  }

  // Recommendation form handlers
  const handleRecommendationSubmit = async (rating: number, review: string) => {
    console.log("📍 Recommendation submitted:", { rating, review })
    console.log("📍 Current recommendationData:", recommendationData)
    console.log("📍 Current userLocation:", userLocation)
    console.log("📍 RecommendationData mediaUrl:", recommendationData?.mediaUrl)
    console.log("📍 RecommendationData foursquareData:", recommendationData?.foursquareData)
    
    // Upload image to Firebase if mediaUrl is a base64 data URL
    let uploadedMediaUrl = recommendationData?.mediaUrl || null
    if (recommendationData?.mediaUrl && recommendationData.mediaUrl.startsWith('data:image')) {
      try {
        const userId = user?.uid || 'anonymous'
        const filename = generateImageFilename(userId)
        uploadedMediaUrl = await uploadImageToFirebase(recommendationData.mediaUrl, filename)
        console.log("✅ Image uploaded to Firebase:", uploadedMediaUrl)
      } catch (error) {
        console.error("❌ Failed to upload image to Firebase:", error)
        // Continue with base64 URL as fallback
      }
    } else if (recommendationData?.mediaUrl) {
      // Even if not a data URL, log it to help debug
      console.log("📍 Using existing mediaUrl (not a data URL):", recommendationData.mediaUrl.substring(0, 100))
    }
    
    // Check if this is a PINIT pin recommendation (has personalThoughts)
    if (recommendationData?.personalThoughts) {
      console.log("dYO This is a PINIT pin recommendation")
      
      // Create a new recommendation pin with ALL enhanced PINIT data
      // PRIORITIZE Foursquare data over AI-generated content
      const foursquareTitle = recommendationData?.foursquareData?.placeName || recommendationData?.aiTitle || recommendationData?.locationName || "Location"
      const foursquareDescription = recommendationData?.foursquareData?.description || recommendationData?.aiDescription || null
      
      const newRecommendation: PinData = {
        id: Date.now().toString(),
        // Use Foursquare coordinates if available, otherwise original pin coordinates, then current location
        latitude: recommendationData?.foursquareData?.latitude || recommendationData?.latitude || userLocation?.latitude || 0,
        longitude: recommendationData?.foursquareData?.longitude || recommendationData?.longitude || userLocation?.longitude || 0,
        locationName: foursquareTitle,
              mediaUrl: uploadedMediaUrl,
              mediaType: recommendationData?.mediaUrl ? (recommendationData.mediaUrl.includes('video') || recommendationData.mediaUrl.startsWith('blob:') ? "video" : "photo") : null,
        audioUrl: null,
        timestamp: new Date().toISOString(),
        // Use Foursquare place name as title, with user review
        title: `PINIT Recommendation - ${foursquareTitle}`,
        // Combine user review with Foursquare description if available
        description: foursquareDescription 
          ? `${review}\n\n${foursquareDescription}` 
          : `${review}\n\nOriginal AI Description: ${recommendationData?.aiDescription || "No description available"}`,
        personalThoughts: recommendationData.personalThoughts, // Include original user thoughts
        // Combine AI tags with recommendation tags
        tags: [
          "recommendation", 
          "user-submitted", 
          "pinit-pin", 
          recommendationData?.platform || "social",
          ...(recommendationData?.aiTags || [])
        ],
        isRecommended: true,
        rating: rating,
        types: ["recommendation", "pinit"],
        // Store reference to original pin
        originalPinId: recommendationData?.pinId,
        // Include additional photos if available
        additionalPhotos: recommendationData?.additionalPhotos || []
      }

      console.log("📍 Created enhanced PINIT recommendation pin:", newRecommendation)
      console.log("📍 Pin mediaUrl:", newRecommendation.mediaUrl)
      console.log("📍 Pin locationName:", newRecommendation.locationName)
      console.log("📍 Pin title:", newRecommendation.title)
      
      // Add the recommendation to pins
      addPin(newRecommendation)
      
      setShowRecommendationForm(false)
      setRecommendationData(null)
      setSuccessMessage("PINIT Recommendation sent!")
      setShowSuccessPopup(true)
      setTimeout(() => setShowSuccessPopup(false), 3000)
      setTimeout(() => setCurrentScreen("map"), 100)
    } else {
      // Regular photo recommendation
      // PRIORITIZE Foursquare data over generic location name
      const foursquareTitle = recommendationData?.foursquareData?.placeName || recommendationData?.locationName || "Unknown Location"
      const foursquareDescription = recommendationData?.foursquareData?.description || null
      
      const newRecommendation: PinData = {
        id: Date.now().toString(),
        // Use Foursquare coordinates if available, otherwise current location
        latitude: recommendationData?.foursquareData?.latitude || userLocation?.latitude || 0,
        longitude: recommendationData?.foursquareData?.longitude || userLocation?.longitude || 0,
        locationName: foursquareTitle,
              mediaUrl: uploadedMediaUrl,
              mediaType: recommendationData?.mediaUrl ? (recommendationData.mediaUrl.includes('video') || recommendationData.mediaUrl.startsWith('blob:') ? "video" : "photo") : null,
        audioUrl: null,
        timestamp: new Date().toISOString(),
        // Use Foursquare place name as title
        title: `Recommendation - ${foursquareTitle}`,
        // Combine user review with Foursquare description if available
        description: foursquareDescription 
          ? `${review}\n\n${foursquareDescription}` 
          : review,
        tags: ["recommendation", "user-submitted", recommendationData?.platform || "social"],
        isRecommended: true,
        rating: rating,
        types: ["recommendation"],
      }

      console.log("dYO Created regular recommendation pin:", newRecommendation)

    // Add the recommendation to pins
    addPin(newRecommendation)
    
    setShowRecommendationForm(false)
    setRecommendationData(null)
    setSuccessMessage("Recommendation sent!")
    setShowSuccessPopup(true)
    setTimeout(() => setShowSuccessPopup(false), 3000)
    setTimeout(() => setCurrentScreen("map"), 100)
    }
  }

  const handleRecommendationSkip = () => {
    console.log("-? Recommendation skipped")
    setShowRecommendationForm(false)
    setRecommendationData(null)
    setTimeout(() => setCurrentScreen("map"), 100)
  }

  // Debounce for post button to prevent multiple clicks
  const [isPosting, setIsPosting] = useState(false)

  // Handle arrival
  const handleArrival = useCallback(
    (place: any, shouldSave: boolean) => {
      console.log("dYZ_ Arrived at:", place.title, "Save:", shouldSave)

      if (shouldSave) {
        // Create a new pin from the place
        const newPin: PinData = {
          id: Date.now().toString(),
          latitude: place.latitude,
          longitude: place.longitude,
          locationName: place.title || place.name || place.vicinity || `${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}`, // Prioritize Foursquare title/name
          mediaUrl: place.mediaUrl || null,
          mediaType: place.mediaUrl ? "photo" : null,
          audioUrl: null,
          timestamp: new Date().toISOString(),
          title: place.title,
          description: place.description || `Visited ${place.title}`,
          tags: ["visited", "recommended", ...(place.types || []).slice(0, 3)],
          isRecommended: true,
          googlePlaceId: place.googlePlaceId,
          rating: place.rating,
          priceLevel: place.priceLevel,
          types: place.types,
        }

        addPin(newPin)
        console.log("dY? Place saved as pin:", newPin)
      }

      // Go back to map
      setTimeout(() => setCurrentScreen("map"), 100)
      setSelectedPlace(null)
      setLastActivity("place-visited")
    },
    [addPin],
  )

  // Show loading screen while auth is loading
  if (authLoading) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📌</div>
          <div style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "0.5rem" }}>PINIT</div>
          <div style={{ fontSize: "0.875rem", opacity: 0.8 }}>Loading...</div>
        </div>
      </div>
    )
  }

  // Screen rendering
  if (currentScreen === "camera") {
    return <ReliableCamera mode={cameraMode} onCapture={handleCameraCapture} onClose={() => setCurrentScreen("map")} />
  }

  if (currentScreen === "platform-select" && capturedMedia) {
    return (
      <SocialPlatformSelector
        mediaUrl={capturedMedia.url}
        mediaType={capturedMedia.type}
        onPlatformSelect={handlePlatformSelect}
        onBack={() => {}} // Empty function - no UI back button
      />
    )
  }

  if (currentScreen === "content-editor" && capturedMedia && selectedPlatform) {
    return (
      <ContentEditor
        mediaUrl={capturedMedia.url}
        mediaType={capturedMedia.type}
        platform={selectedPlatform}
        onBack={() => setCurrentScreen("platform-select")}
        onPost={async (contentData) => {
          // Prevent multiple rapid clicks
          if (isPosting) return
          setIsPosting(true)
          
          // Store the final image data for the recommendation popup
          setFinalImageData(contentData)
          
          // Handle posting with content data - save the pin first
          if (capturedMedia && location) {
            // PRIORITIZE Foursquare data for location name and title
            const foursquareTitle = capturedMedia.foursquareData?.placeName || locationDetails?.name
            const foursquareDescription = capturedMedia.foursquareData?.description
            const isVideo = capturedMedia.type === "video"
            
            // Create a new pin with the captured media (photo or video) and content
            const newPin: PinData = {
              id: Date.now().toString(),
              // PRIORITIZE Foursquare coordinates over location coordinates
              latitude: capturedMedia.foursquareData?.latitude || location.latitude,
              longitude: capturedMedia.foursquareData?.longitude || location.longitude,
              // PRIORITIZE Foursquare place name for locationName
              locationName: foursquareTitle || locationName || (isVideo ? "Camera Video Location" : "Camera Photo Location"),
              // For videos, use the video URL directly; for photos, use rendered image if available
              mediaUrl: isVideo ? capturedMedia.url : (contentData.finalImageUrl || capturedMedia.url),
              mediaType: capturedMedia.type,
              audioUrl: null,
              // PRIORITIZE Foursquare place name, then location details, then fallback
              title: foursquareTitle || (isVideo ? "Camera Video" : "Camera Photo"),
              // Use Foursquare description if available, otherwise default description
              description: foursquareDescription || contentData.comments || (isVideo ? "Video taken with PINIT camera" : "Photo taken with PINIT camera"),
              tags: ["camera", isVideo ? "video" : "photo", "personal"],
              personalThoughts: contentData.comments || "",
              timestamp: new Date().toISOString(),
              stickers: contentData.stickers || [],
              platform: contentData.platform || "camera"
            }
            
            // Add the pin to the collection
            addPin(newPin)
          }
          
          // Actually share to the selected platform
          try {
            await shareToPlatform(selectedPlatform, contentData.finalImageUrl || capturedMedia.url, capturedMedia)
            setSuccessMessage(`Shared to ${selectedPlatform} successfully!`)
          } catch (error) {
            console.error('Error sharing to platform:', error)
            setSuccessMessage(`Posted to ${selectedPlatform} successfully!`)
          }
          
          setShowRecommendationPopup(true) // Show recommendation popup instead of success popup
          
          // Check if this is a PINIT pin (has personalThoughts) and show recommendation form
          if (capturedMedia.personalThoughts) {
            // Show recommendation form after success message for PINIT pins
          setTimeout(() => {
            setShowRecommendationPopup(false)
            // For videos, use video URL directly; for photos, use rendered image if available
            const isVideo = capturedMedia.type === "video"
            setRecommendationData({
              mediaUrl: isVideo ? capturedMedia.url : (contentData.finalImageUrl || capturedMedia.url),
              // PRIORITIZE Foursquare place name over generic location
              locationName: capturedMedia.foursquareData?.placeName || capturedMedia.location || capturedMedia.title || "PINIT Location",
              platform: selectedPlatform,
              aiTitle: capturedMedia.title,
              aiDescription: capturedMedia.description,
              aiTags: capturedMedia.tags,
              personalThoughts: capturedMedia.personalThoughts,
              pinId: capturedMedia.id,
              // PRIORITIZE Foursquare coordinates over capturedMedia coordinates
              latitude: capturedMedia.foursquareData?.latitude || capturedMedia.latitude,
              longitude: capturedMedia.foursquareData?.longitude || capturedMedia.longitude,
              additionalPhotos: capturedMedia.additionalPhotos,
              // CRITICAL: Include Foursquare data for the recommendation
              foursquareData: capturedMedia.foursquareData
            })
            setShowRecommendationForm(true)
          }, 2000)
          } else {
            // Regular photo - just return to map
          setTimeout(() => {
            setTimeout(() => setCurrentScreen("map"), 100)
            setIsPosting(false)
          }, 2000)
          }
        }}
        onSave={(contentData) => {
          // Handle saving with content data - actually save the pin
          if (capturedMedia && location) {
            // PRIORITIZE Foursquare data for location name and title
            const foursquareTitle = capturedMedia.foursquareData?.placeName || locationDetails?.name
            const foursquareDescription = capturedMedia.foursquareData?.description
            const isVideo = capturedMedia.type === "video"
            
            // Create a new pin with the captured media (photo or video) and content
            const newPin: PinData = {
              id: Date.now().toString(),
              // PRIORITIZE Foursquare coordinates over location coordinates
              latitude: capturedMedia.foursquareData?.latitude || location.latitude,
              longitude: capturedMedia.foursquareData?.longitude || location.longitude,
              locationName: foursquareTitle || locationName || (isVideo ? "Camera Video Location" : "Camera Photo Location"), // Prioritize Foursquare
              // For videos, use the video URL directly; for photos, use rendered image if available
              mediaUrl: isVideo ? capturedMedia.url : (contentData.finalImageUrl || capturedMedia.url),
              mediaType: capturedMedia.type,
              audioUrl: null,
              // PRIORITIZE Foursquare place name, then location details, then fallback
              title: foursquareTitle || (isVideo ? "Camera Video" : "Camera Photo"), // Prioritize Foursquare
              // Use Foursquare description if available, otherwise default description
              description: foursquareDescription || contentData.comments || (isVideo ? "Video taken with PINIT camera" : "Photo taken with PINIT camera"),
              tags: ["camera", isVideo ? "video" : "photo", "personal"],
              personalThoughts: contentData.comments || "",
              timestamp: new Date().toISOString(),
              stickers: contentData.stickers || [],
              platform: contentData.platform || "camera"
            }
            
            // Add the pin to the collection
            addPin(newPin)
            
            setSuccessMessage("Saved to library successfully!")
            setShowSuccessPopup(true)
            setTimeout(() => setShowSuccessPopup(false), 2000)
            setTimeout(() => setCurrentScreen("map"), 100)
          } else {
            console.error("Missing capturedMedia or location for saving pin")
            setSuccessMessage("Unable to save photo - missing location data")
            setShowSuccessPopup(true)
            setTimeout(() => setShowSuccessPopup(false), 2000)
          }
        }}
      />
    )
  }

  if (currentScreen === "editor" && capturedMedia) {
    // Redirect to social platform selector instead of photo editor
    setCurrentScreen("platform-select")
    return null
  }



  if (currentScreen === "story") {
    return <PinStoryMode pins={pins} onBack={() => setCurrentScreen("library")} />
  }

  if (currentScreen === "story-builder") {
    return (
      <PinStoryBuilder
        pins={pins}
        onBack={() => setCurrentScreen("library")}
        onCreateStory={(selectedPins, storyTitle) => {
          console.log("Story created:", storyTitle, selectedPins)
          setCurrentScreen("library")
          setLastActivity("story-created")
        }}
      />
    )
  }

  // NEW RECOMMENDATIONS HUB SCREEN
  if (currentScreen === "recommendations") {
    console.log("dY Opening Recommendations Hub")
    console.log("dY - AI brain is learning from user behavior")
    console.log("dY - Generating personalized recommendations")
    
        return (
      <AIRecommendationsHub
        onBack={() => setCurrentScreen("map")}
        userLocation={location}
          // NEW: Pass recommendations to the component (convert to expected format)
  initialRecommendations={recommendations.map(rec => ({
    id: rec.id,
    title: rec.title,
    description: rec.description,
    category: rec.category,
    location: {
      lat: location?.latitude || -33.9,
      lng: location?.longitude || 18.4
    },
    rating: 4.0 + Math.random() * 1.0, // Generate random rating
    isAISuggestion: rec.isAISuggestion || false,
    confidence: 0.7 + Math.random() * 0.3, // Generate confidence
    reason: rec.description,
    timestamp: new Date(rec.timestamp)
  }))}
      />
    )
  }

  // PlaceNavigation removed - Google Maps migration to Mapbox
  // TODO: Re-implement with Mapbox Directions API if needed
  if (currentScreen === "place-navigation" && selectedPlace) {
    // Redirect back to recommendations instead of showing navigation
    setCurrentScreen("recommendations")
    return null
  }

  if (currentScreen === "results" && currentResultPin) {
    return (
      <PinResults
        pin={currentResultPin}
        onSave={handleSaveFromResults}
        onShare={handleShareFromResults}
        onBack={handleBackFromResults}
      />
    )
  }

  if (currentScreen === "library") {
    return (
      <PinLibrary
        pins={storedPins}
        onBack={() => setCurrentScreen("map")}
        onPinSelect={(pin: PinData) => {
          console.log("📌 Pin selected from library:", pin.title, "isPending:", pin.isPending)
          
          // If pin is pending, open map editor to allow location adjustment
          if (pin.isPending) {
            console.log("📌 Opening pending pin in map editor")
            
            // Mark pending pin as viewed when opened
            if (!pin.isViewed) {
              updatePinInStorage(pin.id, { isViewed: true })
              // Update local state
              setPins(prev => prev.map(p => 
                p.id === pin.id ? { ...p, isViewed: true } : p
              ))
              console.log("✅ Marked pending pin as viewed:", pin.id)
            }
            
            setEditingPin(pin)
            setEditingPinLocation({ lat: pin.latitude, lng: pin.longitude })
            setOriginalPinLocation({ lat: pin.latitude, lng: pin.longitude })
            setCurrentScreen("map")
          } else {
            // If pin is completed, open results page
            console.log("📌 Opening completed pin in results page")
            setCurrentResultPin(pin)
            setCurrentScreen("results")
          }
        }}
        onPinUpdate={(pinId: string, updates: any) => {
          // Handle pin updates
          const updatedPins = pins.map(pin => 
            pin.id === pinId ? { ...pin, ...updates } : pin
          )
          // Update pins state here if needed
          console.log("Pin updated:", pinId, updates)
        }}
        onPinDelete={(pinId: string) => {
          removePinFromStorage(pinId)
          console.log("🗑️ Pin deleted:", pinId)
        }}
      />
    )
  }

  if (currentScreen === "settings") {
    const hasSeenWelcome = localStorage.getItem('pinit-welcome-seen')
    const hasCompletedSetup = localStorage.getItem('pinit-setup-completed')
    const isReturningUser = !!(hasSeenWelcome || hasCompletedSetup)
    
    console.log("🔧 Settings Screen Debug:", {
      hasSeenWelcome,
      hasCompletedSetup,
      isReturningUser,
      currentScreen
    })
    
    return (
      <SettingsPage
        onBack={() => setCurrentScreen("map")}
        onComplete={() => setCurrentScreen("map")}
        isReturningUser={isReturningUser}
      />
    )
  }

  // Draggable Pin Marker Component (for edit mode)
  // Main map screen (Shazam-like interface) - ENHANCED WITH SUBTLE NOTIFICATIONS
  
  // If in pin editing mode, show full map with draggable marker
  if (editingPin && editingPinLocation) {
    return (
      <div
        style={{
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
        }}
      >
        {/* Edit Mode Header */}
        <div
          style={{
            padding: "1rem",
            background: "rgba(30, 58, 138, 0.95)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backdropFilter: "blur(15px)",
            borderBottom: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <button
            onClick={handlePinEditCancel}
            style={{
              background: "rgba(255,255,255,0.15)",
              color: "white",
              padding: "0.75rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(255,255,255,0.2)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowLeft size={20} />
          </button>
          
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.125rem", fontWeight: "600" }}>📍 Adjust Pin Location</span>
          </div>
          
          <button
            onClick={handlePinEditDone}
            disabled={isUpdatingPinLocation}
            style={{
              background: isUpdatingPinLocation ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.15)",
              color: "white",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(255,255,255,0.2)",
              cursor: isUpdatingPinLocation ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontWeight: "600",
              opacity: isUpdatingPinLocation ? 0.6 : 1,
              transition: "all 0.2s ease"
            }}
          >
            {isUpdatingPinLocation ? "⏳ Updating..." : "✅ Done"}
          </button>
        </div>
        
        {/* Full Map View - Interactive Mapbox Map */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <InteractiveMapEditor
            initialLat={editingPinLocation.lat}
            initialLng={editingPinLocation.lng}
            onLocationChange={(lat, lng) => {
              handlePinLocationUpdate(lat, lng)
              // Don't update originalPinLocation here - keep it as the original pin's location
            }}
          />
          
          {/* Instruction text */}
          <div
            style={{
              position: "absolute",
              bottom: "80px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(30, 58, 138, 0.95)",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              fontSize: "0.875rem",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.2)",
              pointerEvents: "none",
              textAlign: "center",
              maxWidth: "90%",
              zIndex: 1000
            }}
          >
            💡 Drag the pin to move it to the exact location
          </div>
        </div>
        
        {/* Edit Mode Indicator */}
        <div
          style={{
            position: "absolute",
            bottom: "1rem",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(30, 58, 138, 0.95)",
            padding: "0.75rem 1.5rem",
            borderRadius: "1rem",
            backdropFilter: "blur(15px)",
            border: "2px solid rgba(255,255,255,0.3)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            zIndex: 1001
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>✏️</span>
          <span style={{ fontWeight: "600" }}>Edit Mode - Move pin to exact location</span>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
        display: "flex",
        flexDirection: "column",
        color: "white",
        padding: "2rem",
      }}
    >
      {/* Location Permission Prompt */}
      <LocationPermissionPrompt 
        onRequestPermission={requestPermission}
        permissionStatus={permissionStatus}
      />

      {/* Success Popup - Simple "Pinned Successfully" message */}
      {showSuccessPopup && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(30, 58, 138, 0.98)",
            padding: "2rem 3rem",
            borderRadius: "1.5rem",
            border: "2px solid rgba(34, 197, 94, 0.5)",
            zIndex: 10000,
            textAlign: "center",
            minWidth: "280px",
            backdropFilter: "blur(20px)",
            boxShadow: "0 12px 48px rgba(0,0,0,0.4)",
            animation: "fadeInScale 0.3s ease-out"
          }}
        >
          <div style={{ 
            fontSize: "4rem", 
            marginBottom: "1rem",
            animation: "bounceIn 0.5s ease-out"
          }}>
            ✅
          </div>
          <div style={{ 
            fontSize: "1.5rem", 
            fontWeight: "700", 
            color: "#22C55E",
            marginBottom: "0.5rem",
            letterSpacing: "0.5px"
          }}>
            {successMessage || "Pinned Successfully!"}
          </div>
        </div>
      )}
      
      {/* Recommendation Popup */}
      {showRecommendationPopup && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
          }}
        >
          <div style={{ fontSize: "4rem", marginBottom: "2rem" }}>o.</div>
          <h3 style={{ 
            color: "white", 
            marginBottom: "1rem", 
            fontSize: "1.5rem",
            fontWeight: "bold",
            textAlign: "center"
          }}>
            {successMessage}
          </h3>
          <p style={{ 
            color: "rgba(255,255,255,0.9)", 
            marginBottom: "3rem", 
            fontSize: "1.1rem",
            textAlign: "center",
            maxWidth: "300px"
          }}>
            Would you like to recommend this place?
          </p>
          <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", width: "100%", maxWidth: "300px" }}>
            <button
              onClick={() => {
                setShowRecommendationPopup(false)
                setShowSuccessPopup(true)
                setTimeout(() => setShowSuccessPopup(false), 2000)
              }}
              style={{
                flex: 1,
                padding: "1rem 1.5rem",
                background: "rgba(255,255,255,0.1)",
                color: "white",
                border: "2px solid rgba(255,255,255,0.3)",
                borderRadius: "0.75rem",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "600",
                transition: "all 0.2s ease",
                backdropFilter: "blur(10px)",
              }}
            >
              No, Thanks
            </button>
            <button
              onClick={() => {
                setShowRecommendationPopup(false)
                setRecommendationData({
                  mediaUrl: finalImageData?.finalImageUrl || capturedMedia?.url || "",
                  locationName: capturedMedia?.foursquareData?.placeName || capturedMedia?.location || capturedMedia?.title || "PINIT Location",
                  platform: selectedPlatform,
                  aiTitle: capturedMedia?.title,
                  aiDescription: capturedMedia?.description,
                  aiTags: capturedMedia?.tags,
                  personalThoughts: capturedMedia?.personalThoughts,
                  pinId: capturedMedia?.id,
                  latitude: capturedMedia?.foursquareData?.latitude || capturedMedia?.latitude,
                  longitude: capturedMedia?.foursquareData?.longitude || capturedMedia?.longitude,
                  additionalPhotos: capturedMedia?.additionalPhotos,
                  // Include Foursquare data for the recommendation
                  foursquareData: capturedMedia?.foursquareData
                })
                setShowRecommendationForm(true) // ADDED BACK: Show the recommendations form
              }}
              style={{
                flex: 1,
                padding: "1rem 1.5rem",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                border: "2px solid rgba(255,255,255,0.4)",
                borderRadius: "0.75rem",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "600",
                transition: "all 0.2s ease",
                backdropFilter: "blur(10px)",
              }}
            >
              Yes, Recommend
            </button>
          </div>
        </div>
      )}
      
      {/* Recommendation Form */}
      {showRecommendationForm && recommendationData && (
        <RecommendationForm
          mediaUrl={recommendationData.mediaUrl}
          locationName={recommendationData.locationName}
          onRecommend={handleRecommendationSubmit}
          onSkip={handleRecommendationSkip}
          foursquareData={recommendationData.foursquareData}
        />
      )}
      
      {/* SUBTLE PROACTIVE AI NOTIFICATIONS - WhatsApp Style with DARK BLUE */}
      <ProactiveAI
        userLocation={userLocation}
        pins={pins}
        isMoving={motionData.isMoving}
        lastActivity={lastActivity}
        onSuggestionAction={handleProactiveSuggestion}
        onRecommendationGenerated={handleAIRecommendations}
        onNotificationTap={handleNotificationTap}
      />



      {/* Enhanced Location Service - Hidden but working */}
      {location && (
        <EnhancedLocationService
          latitude={location.latitude}
          longitude={location.longitude}
          onLocationEnhanced={setLocationDetails}
        />
      )}

      {/* Discovery Mode Toggle - Top Right */}
      <div
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          zIndex: 10,
          display: "flex",
          gap: "0.5rem"
        }}
      >
        {/* Settings Button */}
        <button
          onClick={() => setCurrentScreen("settings")}
          style={{
            padding: "0.5rem",
            border: "none",
            background: "transparent",
            color: "white",
            cursor: "pointer",
            borderRadius: "0.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)"
            e.currentTarget.style.transform = "scale(1.05)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent"
            e.currentTarget.style.transform = "scale(1)"
          }}
        >
          ⚙️
        </button>
      </div>



      {/* Motion Status Indicator (Hidden - functionality still works in background) */}
      {/* {motionData.isMoving && (
        <div
          style={{
            position: "absolute",
            top: "1rem",
            left: "1rem",
            background: "rgba(16,185,129,0.8)",
            padding: "0.5rem 1rem",
            borderRadius: "1rem",
            fontSize: "0.75rem",
            fontWeight: "bold",
            zIndex: 10,
          }}
        >
          dYs??T,?, Moving ({motionData.speed.toFixed(1)} km/h)
        </div>
      )} */}

      {/* SHAZAM-STYLE CIRCLE - MOVED TO TOP THIRD & PULSATING */}
      <div
        style={{
          position: "absolute",
          top: "16%",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
        }}
      >
        {/* Multiple Pulsing Glow Rings - ENHANCED VISIBILITY */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "320px",
            height: "320px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 15%, rgba(255,255,255,0.2) 35%, transparent 50%)",
            animation: "shazamPulse 1.2s ease-out infinite",
            zIndex: 1,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "360px",
            height: "360px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.5) 15%, rgba(255,255,255,0.2) 35%, transparent 50%)",
            animation: "shazamPulse 1.2s ease-out infinite 0.4s",
            zIndex: 1,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.4) 15%, rgba(255,255,255,0.1) 35%, transparent 50%)",
            animation: "shazamPulse 1.2s ease-out infinite 0.8s",
            zIndex: 1,
          }}
        />

        {/* Main Pin Button with LIVE MAPBOX MAP */}
        <button
          onClick={handleQuickPin}
          disabled={isQuickPinning}
          style={{
            width: "280px",
            height: "280px",
            borderRadius: "50%",
            border: motionData.isMoving && motionData.speed > 5 ? "4px solid #22C55E" : "4px solid rgba(255,255,255,0.95)",
            background: "rgba(255,255,255,0.05)",
            cursor: isQuickPinning ? "not-allowed" : "pointer",
            transition: "all 0.3s ease",
            boxShadow: motionData.isMoving && motionData.speed > 5 ? "0 8px 32px rgba(34, 197, 94, 0.4)" : "0 8px 32px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            color: "white",
            fontSize: "1.125rem",
            fontWeight: "bold",
            opacity: isQuickPinning ? 0.7 : 1,
            position: "relative",
            zIndex: 2,
            overflow: "hidden",
            backdropFilter: "blur(10px)",
          }}
          onMouseEnter={(e) => {
            if (!isQuickPinning) {
              e.currentTarget.style.transform = "scale(1.05)"
              e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.4)"
            }
          }}
          onMouseLeave={(e) => {
            if (!isQuickPinning) {
              e.currentTarget.style.transform = "scale(1)"
              e.currentTarget.style.boxShadow = motionData.isMoving && motionData.speed > 5 ? "0 8px 32px rgba(34, 197, 94, 0.4)" : "0 8px 32px rgba(0,0,0,0.3)"
            }
          }}
        >
          {/* INTERACTIVE MAPBOX MAP WITH POI MARKERS */}
          {(userLocation || location) && (
            <div
              style={{
                position: "absolute",
                inset: "4px",
                borderRadius: "50%",
                overflow: "hidden",
                zIndex: 1,
                background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
              }}
            >
              <InteractiveMainMap
                lat={userLocation?.latitude || location?.latitude || -25.7479}
                lng={userLocation?.longitude || location?.longitude || 28.2293}
              />

              {/* Speed-based pinning indicator */}
              {motionData.isMoving && motionData.speed > 5 && (
                <div
                  style={{
                    position: "absolute",
                    top: "10px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "rgba(34, 197, 94, 0.9)",
                    color: "white",
                    padding: "4px 8px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    zIndex: 3,
                    whiteSpace: "nowrap"
                  }}
                >
                  🚗 Speed Pinning Active
                </div>
              )}

              {/* Location indicator - positioned at top */}
              <div
                style={{
                  position: "absolute",
                  top: "10%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  color: "white",
                  fontSize: "0.6rem",
                  fontWeight: "bold",
                  textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                  padding: "0.2rem 0.4rem",
                  borderRadius: "0.2rem",
                  pointerEvents: "none",
                  zIndex: 3
                }}
              >
                📍 Live
              </div>
            </div>
          )}

          {/* Content Overlay - REMOVED DARK BACKGROUND */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isQuickPinning ? (
              <>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    border: "4px solid rgba(255,255,255,0.3)",
                    borderTop: "4px solid white",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    marginBottom: "0.5rem",
                  }}
                />
                <span
                  style={{
                    color: "white",
                    textShadow: "0 2px 4px rgba(0,0,0,0.8)",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "0.25rem",
                  }}
                >
                  Pinning...
                </span>
              </>
            ) : quickPinSuccess ? (
              <>
                <Check size={48} style={{ marginBottom: "0.5rem", color: "#10B981" }} />
                <span
                  style={{
                    color: "white",
                    textShadow: "0 2px 4px rgba(0,0,0,0.8)",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "0.25rem",
                  }}
                >
                  Pinned!
                </span>
              </>
            ) : (
              <>
                <MapPin
                  size={48}
                  style={{ marginBottom: "0.5rem", color: "white", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.8))" }}
                />
                <span
                  style={{
                    color: "white",
                    textShadow: "0 2px 4px rgba(0,0,0,0.8)",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "0.25rem",
                  }}
                >
                  Tap to PINIT!
                </span>
              </>
            )}
          </div>
        </button>
      </div>

      {/* PINIT Branding - Moved to center */}
      <div
        style={{
          position: "absolute",
          top: "55%",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "3rem",
            fontWeight: "bold",
            color: "white",
            textShadow: "0 4px 12px rgba(0,0,0,0.5)",
          }}
        >
          PINIT
        </h1>
        <p
          style={{
            margin: "0.25rem 0 0 0",
            fontSize: "1.1rem",
            opacity: 0.95,
            color: "white",
            textShadow: "0 2px 6px rgba(0,0,0,0.4)",
            fontWeight: "500",
          }}
        >
          Find It. Pin It. Share It.
        </p>
        <p
          style={{
            margin: "0.5rem 0 0 0",
            opacity: 0.95,
            fontSize: "1rem",
            color: "white",
            textShadow: "0 2px 6px rgba(0,0,0,0.4)",
          }}
        >
          📍 {motionData.isMoving ? "Driving..." : (locationName || "Getting location...")}
        </p>
      </div>

      {/* ENHANCED: Real Google Places Discovery Panel */}
      {showNearbyPins && (
        <div
          style={{
            position: "absolute",
            bottom: "8rem",
            left: "1rem",
            right: "1rem",
            background: "rgba(30, 58, 138, 0.95)",
            borderRadius: "1rem",
            padding: "1rem",
            backdropFilter: "blur(15px)",
            maxHeight: "200px",
            overflowY: "auto",
            border: "2px solid rgba(255,255,255,0.2)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "bold", color: "white" }}>
              dYO? Real Places Nearby {isLoadingPlaces && "?"}
            </h3>
            <button
              onClick={() => setShowNearbyPins(false)}
              style={{
                padding: "0.5rem",
                background: "rgba(255,255,255,0.15)",
                color: "white",
                cursor: "pointer",
                borderRadius: "0.5rem",
                transition: "all 0.2s ease",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              o
            </button>
          </div>

          <div style={{ display: "flex", gap: "1rem", overflowX: "auto" }}>
            {nearbyPins.map((pin) => (
              <div
                key={pin.id}
                style={{
                  minWidth: "160px",
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "0.75rem",
                  padding: "0.75rem",
                  color: "white",
                  cursor: "pointer",
                  border: pin.googlePlaceId ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.15)",
                  transition: "all 0.2s ease",
                  backdropFilter: "blur(10px)",
                }}
                onClick={() => {
                  // Add to user's pins
                  addPin({ ...pin, id: Date.now().toString() })
                  setShowNearbyPins(false)
                }}
              >
                {pin.mediaUrl && (
                  <img
                    src={pin.mediaUrl || "/placeholder.svg"}
                    alt={pin.title}
                    loading="lazy"
                    style={{
                      width: "100%",
                      height: "80px",
                      objectFit: "cover",
                      borderRadius: "0.25rem",
                      marginBottom: "0.5rem",
                    }}
                  />
                )}
                <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "0.75rem", fontWeight: "bold" }}>{pin.title}</h4>
                <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.625rem", opacity: 0.8 }}>{pin.description}</p>
                {pin.rating && (
                  <div style={{ fontSize: "0.625rem", color: "#F59E0B", marginBottom: "0.25rem" }}>
                    {"-".repeat(Math.floor(pin.rating))} {pin.rating}
                  </div>
                )}
                <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                  {pin.googlePlaceId && (
                    <span
                      style={{
                        fontSize: "0.5rem",
                        background: "rgba(255,255,255,0.2)",
                        padding: "0.125rem 0.25rem",
                        borderRadius: "0.25rem",
                        border: "1px solid rgba(255,255,255,0.3)",
                      }}
                    >
                      dYO? Google
                    </span>
                  )}
                  {pin.isRecommended && (
                    <span
                      style={{
                        fontSize: "0.5rem",
                        background: "rgba(255,255,255,0.2)",
                        padding: "0.125rem 0.25rem",
                        borderRadius: "0.25rem",
                        border: "1px solid rgba(255,255,255,0.3)",
                      }}
                    >
                      -? Top
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

              {/* Bottom Navigation - Photo/Video/Library/Recommendations */}
      <div
        style={{
          position: "absolute",
          bottom: "2rem",
          left: "2rem",
          right: "2rem",
          display: "flex",
          justifyContent: "space-around",
          padding: "1.5rem",
        }}
      >
        <button
          onClick={() => {
            setCameraMode("photo")
            setCurrentScreen("camera")
          }}
          style={{
            padding: "0.75rem",
            border: "none",
            background: "transparent",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "0.5rem",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)"
            e.currentTarget.style.transform = "scale(1.05)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent"
            e.currentTarget.style.transform = "scale(1)"
          }}
        >
          <Camera size={28} />
        </button>

        <button
          onClick={() => {
            setCameraMode("video")
            setCurrentScreen("camera")
          }}
          style={{
            padding: "0.75rem",
            border: "none",
            background: "transparent",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "0.5rem",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)"
            e.currentTarget.style.transform = "scale(1.05)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent"
            e.currentTarget.style.transform = "scale(1)"
          }}
        >
          <Video size={28} />
        </button>

        <button
          onClick={openLibrary}
          style={{
            padding: "0.75rem",
            border: "none",
            background: "transparent",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            borderRadius: "0.5rem",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)"
            e.currentTarget.style.transform = "scale(1.05)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent"
            e.currentTarget.style.transform = "scale(1)"
          }}
        >
          <Library size={28} style={{ color: "white" }} />
          {/* Pin Count Badge - shows unviewed pending pins */}
          {getUnviewedPendingPinsCount() > 0 && (
            <div
              style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                background: "#EF4444",
                color: "white",
                borderRadius: "50%",
                width: "20px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontWeight: "bold",
                border: "2px solid white",
              }}
            >
              {getUnviewedPendingPinsCount()}
            </div>
          )}
        </button>

        <button
          onClick={() => setCurrentScreen("recommendations")}
          style={{
            padding: "0.75rem",
            border: "none",
            background: "transparent",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            borderRadius: "0.5rem",
            transition: "all 0.2s ease",
          }}
          title="dY Recommendations"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)"
            e.currentTarget.style.transform = "scale(1.05)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent"
            e.currentTarget.style.transform = "scale(1)"
          }}
        >
          <Star size={28} style={{ color: "white" }} />
          {/* Notification Badge */}
          {recommendations.filter((r) => !r.isCompleted).length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                background: "#EF4444",
                color: "white",
                borderRadius: "50%",
                width: "20px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontWeight: "bold",
                border: "2px solid white",
              }}
            >
              {recommendations.filter((r) => !r.isCompleted).length}
            </div>
          )}
        </button>
      </div>



      <style jsx global>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        
        @keyframes bounceIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes shazamPulse {
          0% { 
            transform: translate(-50%, -50%) scale(0.7);
            opacity: 1;
          }
          20% { 
            transform: translate(-50%, -50%) scale(1.0);
            opacity: 0.9;
          }
          40% { 
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0.7;
          }
          60% { 
            transform: translate(-50%, -50%) scale(2.2);
            opacity: 0.4;
          }
          80% { 
            transform: translate(-50%, -50%) scale(2.8);
            opacity: 0.2;
          }
          100% { 
            transform: translate(-50%, -50%) scale(3.5);
            opacity: 0;
          }
        }

        @keyframes mapShimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.7; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )

  // Auth redirect removed - handled by state persistence useEffect above to prevent flicker

  // Handle Android back button navigation
  useEffect(() => {
    const handleBackButton = (event: PopStateEvent) => {
      event.preventDefault()
      
      // Navigation stack logic
      if (currentScreen === "map") {
        // FIX: Don't allow back from main map - allow app to close
        console.log("dY Back button blocked on main screen")
        return // Don't push history state, just prevent
      }
      
      // Navigate back through screens
      const screenStack = [
        "map",           // Main screen
        "settings",      // Settings
        "camera",        // Camera
        "platform-select", // Platform selection
        "content-editor", // Content editor
        "story",         // Story mode
        "library",       // Library
        "story-builder", // Story builder
        "recommendations", // Recommendations
        "place-navigation", // Place navigation
        "results"        // Results
      ]
      
      const currentIndex = screenStack.indexOf(currentScreen)
      if (currentIndex > 0) {
        setCurrentScreen(screenStack[currentIndex - 1] as any)
      } else {
        setTimeout(() => setCurrentScreen("map"), 100)
      }
    }

    // Add history state to prevent immediate back
    window.history.pushState(null, "", window.location.href)
    
    // Listen for back button
    window.addEventListener('popstate', handleBackButton)
    
    return () => {
      window.removeEventListener('popstate', handleBackButton)
    }
  }, [currentScreen])
}

// Helper function for platform dimensions
function getPlatformDimensions(platform: string) {
  const dimensions = {
    "instagram-story": { width: 1080, height: 1920 },
    "instagram-post": { width: 1080, height: 1080 },
    "facebook-post": { width: 1200, height: 630 },
    "x-post": { width: 1200, height: 675 },
    "linkedin-post": { width: 1200, height: 627 },
    tiktok: { width: 1080, height: 1920 },
    snapchat: { width: 1080, height: 1920 },
    whatsapp: { width: 1080, height: 1920 },
  }

  return dimensions[platform as keyof typeof dimensions] || { width: 1080, height: 1080 }
}

