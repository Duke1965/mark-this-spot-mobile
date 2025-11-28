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
import { PlaceNavigation } from "@/components/PlaceNavigation"
import { PinLibrary } from "@/components/PinLibrary"
import { PinResults } from "@/components/PinResults"
import { useAuth } from "@/hooks/useAuth"
import { PinData } from "@/lib/types"

import { healPinData, checkDataIntegrity, autoHealOnStartup } from "@/lib/dataHealing"
import { DataSyncManager, dataSyncManager } from "@/lib/dataSync"
import { performNightlyMaintenance } from "@/lib/nightlyMaintenance"
import { decay, computeTrendingScore, daysAgo, getEventWeight } from "@/lib/trending"
import { postPinIntel, cancelPinIntel, maybeCallPinIntel } from "@/lib/pinIntelApi"
import { uploadImageToFirebase, generateImageFilename } from "@/lib/imageUpload"



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

// Interactive Map Editor Component with Draggable Marker
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
    if (!mapRef.current || !(window as any).google) return

    // Initialize map
    const map = new (window as any).google.maps.Map(mapRef.current, {
      center: { lat: initialLat, lng: initialLng },
      zoom: 17,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      gestureHandling: 'greedy'
    })

    mapInstanceRef.current = map

    // Create draggable marker
    const marker = new (window as any).google.maps.Marker({
      position: { lat: initialLat, lng: initialLng },
      map: map,
      draggable: true,
      animation: (window as any).google.maps.Animation.DROP,
      title: "Drag to move pin"
    })

    markerRef.current = marker

    // Listen for marker drag events
    marker.addListener('dragend', (e: any) => {
      const newLat = e.latLng.lat()
      const newLng = e.latLng.lng()
      console.log("📍 Marker dragged to:", { lat: newLat, lng: newLng })
      // Only update the location, don't update originalPinLocation here
      onLocationChange(newLat, newLng)
    })

    // Update marker position when initial location changes
    return () => {
      if (marker) {
        (window as any).google.maps.event.clearInstanceListeners(marker)
      }
    }
  }, []) // Only run once on mount

  // Update marker position when initial location changes (but not during drag)
  useEffect(() => {
    if (markerRef.current && mapInstanceRef.current) {
      const newPosition = { lat: initialLat, lng: initialLng }
      markerRef.current.setPosition(newPosition)
      mapInstanceRef.current.setCenter(newPosition)
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
  const [mapsLoaded, setMapsLoaded] = useState(false)

  // Add this new state for user location
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)

  // Load Google Maps JavaScript API
  useEffect(() => {
    if (typeof window !== 'undefined' && !mapsLoaded) {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = () => {
        setMapsLoaded(true)
        console.log("🗺️ Google Maps JavaScript API loaded")
      }
      script.onerror = () => {
        console.error("❌ Failed to load Google Maps JavaScript API")
      }
      document.head.appendChild(script)
      
      return () => {
        // Cleanup on unmount
        const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`)
        if (existingScript) {
          document.head.removeChild(existingScript)
        }
      }
    }
  }, [mapsLoaded])

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
  } | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<string>("")

  // Hooks
  const { location, getCurrentLocation, watchLocation, clearWatch, isLoading: locationLoading } = useLocationServices()
  const { pins: storedPins, addPin: addPinFromStorage } = usePinStorage()
  const motionData = useMotionDetection()
  
  // Request deduplication for fetchLocationPhotos
  const photoFetchControllerRef = useRef<AbortController | null>(null)
  const photoFetchCacheRef = useRef<Map<string, { data: {url: string, placeName: string, description?: string}[], timestamp: number }>>(new Map())
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
            // Returning user - ALWAYS try to restore their last screen first
            if (parsedState.currentScreen && 
                ["map", "camera", "platform-select", "content-editor", "editor", "story", "library", "story-builder", "recommendations", "place-navigation", "results"].includes(parsedState.currentScreen)) {
              // Restore their last screen (but not camera)
              if (parsedState.currentScreen !== "camera") {
                setCurrentScreen(parsedState.currentScreen)
                console.log("🔄 Returning user - restored screen:", parsedState.currentScreen)
              } else {
                setCurrentScreen("map")
                console.log("🔄 Returning user - prevented camera, going to map")
              }
            } else {
              // No saved screen - check if we have a current screen in memory
              const currentScreenFromMemory = localStorage.getItem('pinit-current-screen')
              if (currentScreenFromMemory && 
                  ["map", "library", "story-builder", "recommendations", "place-navigation", "results"].includes(currentScreenFromMemory)) {
                setCurrentScreen(currentScreenFromMemory as any)
                console.log("🔄 Returning user - restored from memory:", currentScreenFromMemory)
              } else {
                setCurrentScreen("map")
                console.log("🔄 Returning user - no saved screen, going to map")
              }
            }
          }
          return
        }
        
        // User is authenticated, restore screen if valid
        if (parsedState.currentScreen && 
            ["map", "camera", "platform-select", "content-editor", "editor", "story", "library", "story-builder", "recommendations", "place-navigation", "results", "settings"].includes(parsedState.currentScreen)) {
          // Only restore if it's a valid screen and not camera (to prevent camera opening on app start)
          if (parsedState.currentScreen !== "camera") {
            setCurrentScreen(parsedState.currentScreen)
            console.log("o. Restored screen:", parsedState.currentScreen)
          } else {
            console.log("s,? Preventing camera from opening on app start, staying on map")
            setCurrentScreen("map")
          }
        } else {
          console.log("s,? Invalid screen state, defaulting to map")
          setCurrentScreen("map")
        }
        
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
            // Returning user - check if we have a current screen in memory
            const currentScreenFromMemory = localStorage.getItem('pinit-current-screen')
            if (currentScreenFromMemory && 
                ["map", "library", "story-builder", "recommendations", "place-navigation", "results"].includes(currentScreenFromMemory)) {
              setCurrentScreen(currentScreenFromMemory as any)
              console.log("🔄 No saved state - returning user restored from memory:", currentScreenFromMemory)
            } else {
              console.log("🔄 No saved state - returning user, going to map")
              setCurrentScreen("map")
            }
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
          // Returning user - check if we have a current screen in memory
          const currentScreenFromMemory = localStorage.getItem('pinit-current-screen')
          if (currentScreenFromMemory && 
              ["map", "library", "story-builder", "recommendations", "place-navigation", "results"].includes(currentScreenFromMemory)) {
            setCurrentScreen(currentScreenFromMemory as any)
            console.log("🔄 Error case - returning user restored from memory:", currentScreenFromMemory)
          } else {
            console.log("🔄 Error case - returning user, going to map")
            setCurrentScreen("map")
          }
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

  // Update userLocation when location changes
  useEffect(() => {
    if (location) {
      setUserLocation({
        latitude: location.latitude,
        longitude: location.longitude,
      })
      
      // Update location name when location changes
      getLocationName(location.latitude, location.longitude).then((name) => {
        setLocationName(name)
      })
    }
  }, [location])

  const addPin = useCallback((pin: PinData) => {
    setPins((prev: PinData[]) => [...prev, pin])
    setNewPins((prev: number) => prev + 1)
    addPinFromStorage(pin) // Also save to storage
  }, [addPinFromStorage])

  const openLibrary = useCallback(() => {
    setCurrentScreen("library")
    setNewPins(0) // Reset new pins count when Library is opened
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

  // UPDATED: Use pin-intel gateway for location name (NO MORE GOOGLE API CALLS)
  const getRealLocationName = async (lat: number, lng: number): Promise<string> => {
    const isMobile = isMobileDevice()
    
    try {
      console.log(`📍 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Getting location name via gateway...`)
      
      // Use the throttled pin-intel gateway wrapper
      const pinIntel = await maybeCallPinIntel({ lat, lng }, 5)
      
      // If throttled (returns null), fall through to coordinate fallback
      if (pinIntel && pinIntel.geocode && pinIntel.geocode.formatted) {
        console.log(`✅ [${isMobile ? 'MOBILE' : 'DESKTOP'}] Location name from gateway:`, pinIntel.geocode.formatted)
        return pinIntel.geocode.formatted
      }
      
      // Fallback to coordinate-based detection (also used when throttled)
      if (!pinIntel) {
        console.log(`📍 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Pin-intel call throttled, using coordinate fallback`)
      } else {
        console.log(`⚠️ [${isMobile ? 'MOBILE' : 'DESKTOP'}] Gateway returned no location, using coordinate fallback`)
      }
    } catch (error) {
      console.log(`⚠️ [${isMobile ? 'MOBILE' : 'DESKTOP'}] Gateway error, using coordinate fallback:`, error)
    }
    
    // COORDINATE-BASED FALLBACK (no API calls)
    console.log(`📍 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Using coordinate fallback...`)
    
    // Riebeek West area - expanded range
    if (lat > -33.4 && lat < -33.3 && lng > 18.8 && lng < 18.9) {
      return "Riebeek West"
    }
    
    // Cape Town CBD
    if (lat > -33.9 && lat < -33.8 && lng > 18.4 && lng < 18.5) {
      return "Cape Town"
    }
    
    // Western Cape region (broader fallback)
    if (lat > -34.5 && lat < -33.0 && lng > 18.0 && lng < 19.5) {
      return "Western Cape"
    }
    
    // Final fallback
    return `Current Location`
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
        locationName: place.name || pinIntel.geocode.formatted,
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

  // Handle camera capture
  const handleCameraCapture = useCallback(
    async (mediaUrl: string, type: "photo" | "video") => {
      if (!location) return

      setCapturedMedia({
        url: mediaUrl,
        type,
        location: "Camera Capture",
      })

      setLastActivity(`camera-${type}`)
      setCurrentScreen("editor")
    },
    [location],
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
      
      // NEW: Generate intelligent AI content based on location and context
      // Pass Foursquare data if available (title/name, description)
      const placeName = locationPhotos[0]?.placeName
      const placeDescription = locationPhotos[0]?.description
      const aiGeneratedContent = generateAIContent(pinLatitude, pinLongitude, motionData, locationPhotos, placeName, placeDescription)
      
      const newPin: PinData = {
        id: Date.now().toString(),
        latitude: pinLatitude,
        longitude: pinLongitude,
        locationName: aiGeneratedContent.locationName || locationDescription,
        mediaUrl: locationPhotos[0]?.url || null, // Use the first photo as primary
        mediaType: "photo",
        audioUrl: null,
        timestamp: new Date().toISOString(),
        title: aiGeneratedContent.title,
        description: aiGeneratedContent.description,
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
    
    // PRIORITY 1: Use Foursquare description if available
    let description = ""
    if (placeDescription && placeDescription.trim()) {
      // Use Foursquare description if available
      description = placeDescription
      console.log("🧠 Using Foursquare description:", description)
    } else {
      // Fall back to AI-generated description only if no Foursquare data
      if (motionData.isMoving && motionData.speed > 5) {
        description = `Discovered this amazing spot while traveling ${motionData.speed.toFixed(1)} km/h! ${context} - perfect for capturing memories and sharing with friends.`
      } else {
        description = `Found this special place in ${context}. A wonderful location to remember and share with others.`
      }
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
  const fetchLocationPhotos = async (lat: number, lng: number, externalSignal?: AbortSignal): Promise<{url: string, placeName: string, description?: string}[]> => {
    // Request deduplication: Check cache first
    const cacheKey = `${Math.round(lat * 1000) / 1000},${Math.round(lng * 1000) / 1000}` // Round to ~100m precision
    const cached = photoFetchCacheRef.current.get(cacheKey)
    const now = Date.now()
    
    // Return cached result if available and recent (within 5 seconds)
    if (cached && (now - cached.timestamp) < 5000) {
      console.log("📸 Using cached photo data for location:", cacheKey)
      return cached.data
    }
    
    // Check if external signal is already aborted
    if (externalSignal?.aborted) {
      console.log("📸 External signal already aborted, returning cached or placeholder")
      const cached = photoFetchCacheRef.current.get(cacheKey)
      if (cached) return cached.data
      return [{url: "/pinit-placeholder.jpg", placeName: "PINIT Placeholder"}]
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
      if (cachedAfterWait && (now - cachedAfterWait.timestamp) < 5000) {
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
      console.log("📸 Fetching location photo with aggressive filtering...")
      
      // NEW: Try Foursquare API first for better photos and place data
      let photoResponse: Response | null = null
      let data: any = null
      
      try {
        console.log("📸 Trying Foursquare API for place data and photos...")
        // Use small radius (500m) for speed-based pinning - pin location is calculated precisely
        // This finds the exact place the user passed, not places far away
        photoResponse = await fetch(`/api/foursquare-places?lat=${lat}&lng=${lng}&radius=500&limit=5`, { signal })
        console.log(`📸 Foursquare API response status: ${photoResponse.status}`)
        
        if (photoResponse.ok) {
          data = await photoResponse.json()
          console.log(`📸 Foursquare API returned ${data.items?.length || 0} places`)
          
          // Convert Foursquare format to expected format
          if (data.items && data.items.length > 0) {
            const photos: {url: string, placeName: string, description?: string}[] = []
            
            // Find closest place (first one should be closest)
            const closestPlace = data.items[0]
            
            if (closestPlace.photoUrl) {
              photos.push({
                url: closestPlace.photoUrl,
                placeName: closestPlace.title || closestPlace.name || "Unknown Place",
                description: closestPlace.description
              })
              
              console.log(`✅ Found Foursquare photo for: ${closestPlace.title}`, closestPlace.photoUrl)
              
              // Cache the result
              photoFetchCacheRef.current.set(cacheKey, { data: photos, timestamp: Date.now() })
              
              // Return early with Foursquare data
              return photos
            }
            
            // Note: If no photoUrl, we skip trying legacy /api/fsq/photos endpoint
            // The new Places API should return photos in the initial response
            
            // If we have place data but no photos, return the place name and description at least
            if (closestPlace.title || closestPlace.name) {
              console.log(`⚠️ Foursquare place found but no photos: ${closestPlace.title}`)
              // Return place data even without photos so title/description can be used
              const placeData = [{
                url: "/pinit-placeholder.jpg",
                placeName: closestPlace.title || closestPlace.name || "Unknown Place",
                description: closestPlace.description
              }]
              // Cache the result
              photoFetchCacheRef.current.set(cacheKey, { data: placeData, timestamp: Date.now() })
              return placeData
            }
          }
        }
      } catch (fsqError: any) {
        if (fsqError.name === 'AbortError') {
          console.log("📸 Foursquare request was aborted")
          throw fsqError // Re-throw to be handled by outer catch
        }
        console.warn("⚠️ Foursquare API failed, falling back to /api/places:", fsqError)
      }
      
      // Fallback to /api/places if Foursquare didn't work or returned no results
      if (!data || !data.items || data.items.length === 0) {
        console.log("📸 Falling back to /api/places endpoint...")
        photoResponse = await fetch(`/api/places?lat=${lat}&lng=${lng}&radius=5000`, { signal })
        console.log(`📸 API response status: ${photoResponse.status}`)
        
        if (!photoResponse.ok) {
          console.error(`❌ API failed with status: ${photoResponse.status}`)
          throw new Error("Failed to fetch location data")
        }

        data = await photoResponse.json()
        console.log(`📸 API returned ${data.results?.length || 0} results, source: ${data.source}`)
      }
      
      const photos: {url: string, placeName: string, description?: string}[] = []

      // Handle both Foursquare format (data.items) and Google format (data.results)
      const results = data.items || data.results || []
      
      if (results.length > 0) {
        // Get the closest place
        const closestPlace = results[0]
        
        // Handle Foursquare format
        if (closestPlace.photoUrl) {
          photos.push({
            url: closestPlace.photoUrl,
            placeName: closestPlace.title || closestPlace.name || "Unknown Place",
            description: closestPlace.description
          })
          console.log(`✅ Found Foursquare photo: ${closestPlace.title}`)
          
          // Cache the result
          photoFetchCacheRef.current.set(cacheKey, { data: photos, timestamp: Date.now() })
          
          return photos
        }
        
        // Handle Google format (existing code)
        if (closestPlace.photos && closestPlace.photos.length > 0) {
          // More aggressive filtering to exclude logos, clipart, and non-location photos
          const filteredPhotos = closestPlace.photos.filter((photo: any) => {
            // Skip photos that are likely logos, clipart, or non-location photos
            if (photo.width && photo.height) {
              const aspectRatio = photo.width / photo.height
              const isSquareish = aspectRatio >= 0.8 && aspectRatio <= 1.2
              const isTooSmall = photo.width < 300 || photo.height < 300
              const isTooLarge = photo.width > 2000 || photo.height > 2000
              const isPortrait = aspectRatio < 0.5 // Very tall photos are often signs
              const isLandscape = aspectRatio > 2.5 // Very wide photos are often banners
              
              // Log what we're filtering out
              if (isSquareish || isTooSmall || isTooLarge || isPortrait || isLandscape) {
                console.log("📸 Filtering out photo:", {
                  dimensions: `${photo.width}x${photo.height}`,
                  aspectRatio: aspectRatio.toFixed(2),
                  reason: isSquareish ? "squareish (likely logo)" : 
                          isTooSmall ? "too small" :
                          isTooLarge ? "too large" :
                          isPortrait ? "too tall (likely sign)" :
                          isLandscape ? "too wide (likely banner)" : "unknown"
                })
                return false
              }
            }
            return true
          })
          
          if (filteredPhotos.length > 0) {
            // Get the best filtered photo (prefer landscape photos for location views)
            const bestPhoto = filteredPhotos.reduce((best: any, current: any) => {
              if (current.width && current.height && best.width && best.height) {
                const currentRatio = current.width / current.height
                const bestRatio = best.width / best.height
                
                // Prefer photos closer to 16:9 ratio (typical landscape)
                const currentScore = Math.abs(currentRatio - 1.78)
                const bestScore = Math.abs(bestRatio - 1.78)
                
                return currentScore < bestScore ? current : best
              }
              return best
            })
            
            // Handle both Foursquare URLs and Google photo references
            let photoUrl: string
            if (bestPhoto.photo_reference.startsWith('http')) {
              // It's a Foursquare URL
              photoUrl = bestPhoto.photo_reference
            } else {
              // It's a Google photo reference
              photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${bestPhoto.photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
            }
            
            photos.push({
              url: photoUrl,
              placeName: closestPlace.name || "Unknown Place",
              description: closestPlace.description // Include description if available (from Foursquare converted format)
            })
            
            console.log(`✅ Found best filtered location photo: ${closestPlace.name} (${bestPhoto.width}x${bestPhoto.height})`)
            
            // Cache the result
            photoFetchCacheRef.current.set(cacheKey, { data: photos, timestamp: Date.now() })
            
            return photos
          } else {
            // If all photos were filtered out, try to get any photo but log it
            console.log("⚠️ All photos filtered out, using fallback photo")
            const fallbackPhoto = closestPlace.photos[0]
            // Handle both Foursquare URLs and Google photo references
            let photoUrl: string
            if (fallbackPhoto.photo_reference.startsWith('http')) {
              // It's a Foursquare URL
              photoUrl = fallbackPhoto.photo_reference
            } else {
              // It's a Google photo reference
              photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${fallbackPhoto.photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
            }
            
            photos.push({
              url: photoUrl,
              placeName: closestPlace.name || "Unknown Place",
              description: closestPlace.description // Include description if available
            })
            
            // Cache the result
            photoFetchCacheRef.current.set(cacheKey, { data: photos, timestamp: Date.now() })
            
            return photos
          }
        }
      }
      
      console.log("📸 No location photos found, will use PINIT placeholder")
      const placeholderResult = [{url: "/pinit-placeholder.jpg", placeName: "PINIT Placeholder"}]
      
      // Cache the result (even if it's a placeholder)
      photoFetchCacheRef.current.set(cacheKey, { data: placeholderResult, timestamp: Date.now() })
      
      return placeholderResult
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log("📸 Photo fetch was aborted")
        // Return cached result if available, otherwise placeholder
        const cached = photoFetchCacheRef.current.get(cacheKey)
        if (cached) return cached.data
        return [{url: "/pinit-placeholder.jpg", placeName: "PINIT Placeholder"}]
      }
      console.error("❌ Error fetching location photos:", error)
      const errorResult = [{url: "/pinit-placeholder.jpg", placeName: "PINIT Placeholder"}]
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

  // Handle place navigation from recommendations
  const handlePlaceNavigation = (place: any) => {
    console.log("dY-,? Opening place navigation for:", place.title)
    setSelectedPlace(place)
    setCurrentScreen("place-navigation")
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
      console.log("📸 Fetching location data for pin location...")
      locationPhotos = await fetchLocationPhotos(editingPinLocation.lat, editingPinLocation.lng, signal)
      
      // Check if request was aborted
      if (signal.aborted) {
        console.log("📸 Pin update request was aborted")
        return
      }
      
      // Get place name and description from photos
      placeName = locationPhotos[0]?.placeName || editingPin.locationName
      placeDescription = (locationPhotos[0] as any)?.description || editingPin.description
      
      // Generate AI content with new location
      aiGeneratedContent = generateAIContent(
        editingPinLocation.lat, 
        editingPinLocation.lng, 
        motionData, 
        locationPhotos, 
        placeName, 
        placeDescription
      )
      
      console.log("📸 Fetched new location data:", { 
        photosCount: locationPhotos.length, 
        placeName, 
        title: aiGeneratedContent.title 
      })
      
      // Update the pin with new location and data
      const updatedPin: PinData = {
        ...editingPin,
        latitude: editingPinLocation.lat,
        longitude: editingPinLocation.lng,
        locationName: aiGeneratedContent.locationName || editingPin.locationName,
        title: aiGeneratedContent.title,
        description: aiGeneratedContent.description,
        mediaUrl: locationPhotos[0]?.url || editingPin.mediaUrl,
        additionalPhotos: locationPhotos.length > 0 ? locationPhotos : editingPin.additionalPhotos,
        tags: aiGeneratedContent.tags,
        // Mark as completed (no longer pending) - user can edit again later if needed
        isPending: false
      }
      
      // Update pin in storage
      addPinFromStorage(updatedPin)
      
      console.log("✅ Pin updated with new location and data:", updatedPin)
      
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
    addPin(pinToSave)
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
    console.log("-? Recommendation submitted:", { rating, review })
    console.log("dY? Current recommendationData:", recommendationData)
    console.log("dY? Current userLocation:", userLocation)
    
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
    }
    
    // Check if this is a PINIT pin recommendation (has personalThoughts)
    if (recommendationData?.personalThoughts) {
      console.log("dYO This is a PINIT pin recommendation")
      
      // Create a new recommendation pin with ALL enhanced PINIT data
      const newRecommendation: PinData = {
        id: Date.now().toString(),
        // Use original pin coordinates if available, otherwise current location
        latitude: recommendationData?.latitude || userLocation?.latitude || 0,
        longitude: recommendationData?.longitude || userLocation?.longitude || 0,
        locationName: recommendationData?.locationName || "Unknown Location",
        mediaUrl: uploadedMediaUrl,
        mediaType: recommendationData?.mediaUrl ? "photo" : null,
        audioUrl: null,
        timestamp: new Date().toISOString(),
        title: `PINIT Recommendation - ${recommendationData?.aiTitle || recommendationData?.locationName || "Location"}`,
        description: `${review}\n\nOriginal AI Description: ${recommendationData?.aiDescription || "No AI description available"}`,
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

      console.log("dYO Created enhanced PINIT recommendation pin:", newRecommendation)
      
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
    const newRecommendation: PinData = {
      id: Date.now().toString(),
      latitude: userLocation?.latitude || 0,
      longitude: userLocation?.longitude || 0,
      locationName: recommendationData?.locationName || "Unknown Location",
      mediaUrl: uploadedMediaUrl,
      mediaType: recommendationData?.mediaUrl ? "photo" : null,
      audioUrl: null,
      timestamp: new Date().toISOString(),
      title: `Recommendation - ${recommendationData?.locationName || "Location"}`,
      description: review,
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
          locationName: place.vicinity || `${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}`,
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
        onPost={(contentData) => {
          // Prevent multiple rapid clicks
          if (isPosting) return
          setIsPosting(true)
          
          // Store the final image data for the recommendation popup
          setFinalImageData(contentData)
          
          // Handle posting with content data - save the pin first
          if (capturedMedia && location) {
            // Create a new pin with the captured photo and content
            const newPin: PinData = {
              id: Date.now().toString(),
              latitude: location.latitude,
              longitude: location.longitude,
              mediaUrl: contentData.finalImageUrl || capturedMedia.url, // Use rendered image if available
              mediaType: capturedMedia.type,
              title: locationDetails?.name || "Camera Photo",
              description: contentData.comments || "Photo taken with PINIT camera",
              tags: ["camera", "photo", "personal"],
              personalThoughts: contentData.comments || "",
              timestamp: new Date().toISOString(),
              stickers: contentData.stickers || [],
              platform: contentData.platform || "camera"
            } as PinData
            
            // Add the pin to the collection
            addPin(newPin)
          }
          
          setSuccessMessage(`Posted to ${selectedPlatform} successfully!`)
          setShowRecommendationPopup(true) // Show recommendation popup instead of success popup
          
          // Check if this is a PINIT pin (has personalThoughts) and show recommendation form
          if (capturedMedia.personalThoughts) {
            // Show recommendation form after success message for PINIT pins
          setTimeout(() => {
            setShowRecommendationPopup(false)
            setRecommendationData({
              mediaUrl: contentData.finalImageUrl || capturedMedia.url, // Use rendered image if available
                locationName: capturedMedia.location || capturedMedia.title || "PINIT Location",
              platform: selectedPlatform,
              aiTitle: capturedMedia.title,
              aiDescription: capturedMedia.description,
              aiTags: capturedMedia.tags,
              personalThoughts: capturedMedia.personalThoughts,
              pinId: capturedMedia.id,
              latitude: capturedMedia.latitude,
              longitude: capturedMedia.longitude,
              additionalPhotos: capturedMedia.additionalPhotos
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
            // Create a new pin with the captured photo and content
            const newPin: PinData = {
              id: Date.now().toString(),
              latitude: location.latitude,
              longitude: location.longitude,
              locationName: locationName || "Camera Photo Location",
              mediaUrl: contentData.finalImageUrl || capturedMedia.url, // Use rendered image if available
              mediaType: capturedMedia.type,
              title: locationDetails?.name || "Camera Photo",
              description: contentData.comments || "Photo taken with PINIT camera",
              tags: ["camera", "photo", "personal"],
              personalThoughts: contentData.comments || "",
              timestamp: new Date().toISOString(),
              stickers: contentData.stickers || [],
              platform: contentData.platform || "camera"
            } as PinData
            
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
    console.log("dY Opening AI-Powered Recommendations Hub")
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

  // NEW PLACE NAVIGATION SCREEN
  if (currentScreen === "place-navigation" && selectedPlace) {
    return (
      <PlaceNavigation
        place={selectedPlace}
        userLocation={userLocation}
        onBack={() => setCurrentScreen("recommendations")}
        onSaveForLater={handleSaveForLater}
        onNavigate={handleStartNavigation}
        onArrived={handleArrival}
      />
    )
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
          // Navigate to map with pin editing mode
          console.log("📌 Pin selected from library - entering edit mode:", pin)
          setEditingPin(pin)
          setEditingPinLocation({ lat: pin.latitude, lng: pin.longitude })
          setOriginalPinLocation({ lat: pin.latitude, lng: pin.longitude })
          setCurrentScreen("map")
        }}
        onPinUpdate={(pinId: string, updates: any) => {
          // Handle pin updates
          const updatedPins = pins.map(pin => 
            pin.id === pinId ? { ...pin, ...updates } : pin
          )
          // Update pins state here if needed
          console.log("Pin updated:", pinId, updates)
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
        
        {/* Full Map View - Interactive Google Maps */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {mapsLoaded && typeof window !== 'undefined' && (window as any).google ? (
            <InteractiveMapEditor
              initialLat={editingPinLocation.lat}
              initialLng={editingPinLocation.lng}
              onLocationChange={(lat, lng) => {
                handlePinLocationUpdate(lat, lng)
                // Don't update originalPinLocation here - keep it as the original pin's location
              }}
            />
          ) : (
            <div style={{ 
              width: "100%", 
              height: "100%", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              background: "rgba(30, 58, 138, 0.5)"
            }}>
              <div style={{ textAlign: "center", color: "white" }}>
                <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🗺️</div>
                <div>Loading map...</div>
              </div>
            </div>
          )}
          
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
                  locationName: capturedMedia?.location || capturedMedia?.title || "PINIT Location",
                  platform: selectedPlatform,
                  aiTitle: capturedMedia?.title,
                  aiDescription: capturedMedia?.description,
                  aiTags: capturedMedia?.tags,
                  personalThoughts: capturedMedia?.personalThoughts,
                  pinId: capturedMedia?.id,
                  latitude: capturedMedia?.latitude,
                  longitude: capturedMedia?.longitude,
                  additionalPhotos: capturedMedia?.additionalPhotos
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

        {/* Main Pin Button with LIVE GOOGLE MAPS */}
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
          {/* LIVE GOOGLE MAPS BACKGROUND */}
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
              <img
                src={`https://maps.googleapis.com/maps/api/staticmap?center=${
                  userLocation?.latitude || location?.latitude || -25.7479
                },${
                  userLocation?.longitude || location?.longitude || 28.2293
                }&zoom=16&size=280x280&maptype=roadmap&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}`}
                alt="Live Map"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "contrast(1.1) saturate(1.2)",
                }}
                onLoad={(e) => {
                  console.log("Map loaded successfully")
                }}
                onError={(e) => {
                  console.log("Google Maps failed, trying alternative...")
                  const imgElement = e.currentTarget
                  if (!imgElement) return
                  
                  // Try OpenStreetMap tile service as fallback
                  imgElement.src = `https://tile.openstreetmap.org/16/${Math.floor(
                    (((userLocation?.longitude || location?.longitude || 28.2293) + 180) / 360) * Math.pow(2, 16),
                  )}/${Math.floor(
                    ((1 -
                      Math.log(
                        Math.tan(((userLocation?.latitude || location?.latitude || -25.7479) * Math.PI) / 180) +
                          1 / Math.cos(((userLocation?.latitude || location?.latitude || -25.7479) * Math.PI) / 180),
                      ) /
                        Math.PI) /
                      2) *
                      Math.pow(2, 16),
                  )}.png`

                  // If that also fails, show a nice gradient background
                  setTimeout(() => {
                    if (imgElement && imgElement.complete && imgElement.naturalHeight === 0) {
                      imgElement.style.display = "none"
                    }
                  }, 2000)
                }}
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

              {/* Bottom Navigation - Photo/Video/Library/AI-Powered Recommendations */}
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
          {/* Pin Count Badge */}
          {newPins > 0 && (
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
              {newPins}
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
          title="dY AI-Powered Recommendations"
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



      <style jsx>{`
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

