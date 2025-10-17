"use client"

import { useState, useCallback, useEffect } from "react"
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

import { healPinData, checkDataIntegrity, autoHealOnStartup } from "@/lib/dataHealing"
import { DataSyncManager, dataSyncManager } from "@/lib/dataSync"
import { performNightlyMaintenance } from "@/lib/nightlyMaintenance"
import { decay, computeTrendingScore, daysAgo, getEventWeight } from "@/lib/trending"
import { postPinIntel, cancelPinIntel } from "@/lib/pinIntelApi"


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
  additionalPhotos?: Array<{url: string, placeName: string}> // Store location photos
  personalThoughts?: string // NEW: User's personal thoughts about the place
  originalPinId?: string // NEW: Reference to original PINIT pin
  
  // NEW: Pin Management System Fields
  placeId?: string // Reference to aggregated Place
  totalEndorsements?: number // All-time unique user recommendations
  recentEndorsements?: number // Endorsements within RECENT_WINDOW_DAYS
  lastEndorsedAt?: string // ISO timestamp of last endorsement/renewal
  score?: number // Trending score for sorting
  downvotes?: number // Community downvotes
  isHidden?: boolean // Soft hide if downvotes exceed threshold
  category?: string // Place category (e.g., 'coffee', 'museum', etc.)
}

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
  } | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<string>("")

  // Hooks
  const { location, getCurrentLocation, watchLocation, clearWatch, isLoading: locationLoading } = useLocationServices()
  const { pins: storedPins, addPin: addPinFromStorage } = usePinStorage()
  const motionData = useMotionDetection()

  // Add state to remember the last good location name
  const [lastGoodLocationName, setLastGoodLocationName] = useState<string>("")
  
  // Update location name with persistence
  useEffect(() => {
    if (location && location.latitude && location.longitude) {
      console.log("📍 Getting location name for:", location.latitude, location.longitude)
      getLocationName(location.latitude, location.longitude).then((name) => {
        console.log("📍 Location name result:", name)
        if (name && name !== "Unknown Location") {
          setLocationName(name)
          setLastGoodLocationName(name) // Remember the last good location
        } else if (lastGoodLocationName) {
          // Keep the last good location if current lookup fails
          setLocationName(lastGoodLocationName)
        } else {
          // If no good location name, show coordinates
          setLocationName(`${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`)
        }
      }).catch((error) => {
        console.error("📍 Location name error:", error)
        // Show coordinates as fallback
        setLocationName(`${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`)
      })
    }
  }, [location, lastGoodLocationName])

  // Function to clear corrupted app state and reset to map
  const clearAppState = useCallback(() => {
    try {
      localStorage.removeItem("pinit-app-state")
      console.log("dY1 App state cleared manually")
      setTimeout(() => setCurrentScreen("map"), 100)
      setRecommendations([])
      setDiscoveryMode(false)
      setShowRecommendToggle(false)
      setLastActivity("app-reset")
    } catch (error) {
      console.error("O Failed to clear app state:", error)
    }
  }, [])

  // FORCE RESET ON APP START - Clear any corrupted state
  useEffect(() => {
    console.log("dYs PINIT App starting - clearing any corrupted state")
    try {
      // Clear any potentially corrupted state immediately
      localStorage.removeItem("pinit-app-state")
      console.log("dY1 Cleared app state on startup")
      
      // Force start on map screen
      setTimeout(() => setCurrentScreen("map"), 100)
      setLastActivity("app-start-fresh")
      
      console.log("o. App started fresh on map screen")
    } catch (error) {
      console.error("❌ Error during app startup reset:", error)
    }
  }, [])

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
          // No user, force settings screen
          console.log(" No authenticated user, forcing settings screen")
          setCurrentScreen("settings")
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
            setTimeout(() => setCurrentScreen("map"), 100)
          }
        } else {
          console.log("s,? Invalid screen state, defaulting to map")
          setTimeout(() => setCurrentScreen("map"), 100)
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
          setCurrentScreen("settings")
        } else if (!authLoading && user) {
          setTimeout(() => setCurrentScreen("map"), 100)
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
        setCurrentScreen("settings")
      } else if (!authLoading && user) {
        setTimeout(() => setCurrentScreen("map"), 100)
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
      
      // Use the new pin-intel gateway (one-shot call)
      const pinIntel = await postPinIntel(lat, lng, 5)
      
      if (pinIntel && pinIntel.geocode && pinIntel.geocode.formatted) {
        console.log(`✅ [${isMobile ? 'MOBILE' : 'DESKTOP'}] Location name from gateway:`, pinIntel.geocode.formatted)
        return pinIntel.geocode.formatted
      }
      
      // Fallback to coordinate-based detection
      console.log(`⚠️ [${isMobile ? 'MOBILE' : 'DESKTOP'}] Gateway returned no location, using coordinate fallback`)
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
      // Use the new pin-intel gateway (one-shot call)
      const pinIntel = await postPinIntel(location.latitude, location.longitude, 5)
      
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

  // Handle quick pin with speed-based location calculation - UPDATED TO USE NEW GATEWAY
  const handleQuickPin = useCallback(async () => {
    if (isQuickPinning) return

    setIsQuickPinning(true)
    setLastActivity("quick-pin")

    try {
      const currentLocation = await getCurrentLocation()
      
      // Calculate precise location based on speed and movement
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
      
      // NEW: Use pin-intel gateway for one-shot location enrichment
      console.log("📡 Fetching location intelligence from gateway...")
      const pinIntel = await postPinIntel(pinLatitude, pinLongitude, 5, user?.uid)
      
      console.log("✅ Pin intel received:", pinIntel)
      console.log("📍 Location:", pinIntel.geocode.formatted)
      console.log("🏪 Nearby places:", pinIntel.places.length)
      
      // Use gateway data for location name
      const locationName = pinIntel.geocode.formatted || locationDescription
      
      // Generate AI content based on location and context
      const aiGeneratedContent = generateAIContent(pinLatitude, pinLongitude, motionData, [])
      
      // Use imagery from gateway if available, otherwise use PINIT placeholder
      const mediaUrl = pinIntel.imagery?.image_url || "/pinit-placeholder.jpg"
      const additionalPhotos = pinIntel.imagery ? [
        { url: pinIntel.imagery.image_url, placeName: locationName }
      ] : [
        { url: "/pinit-placeholder.jpg", placeName: "PINIT Placeholder" }
      ]
      
      const newPin: PinData = {
        id: Date.now().toString(),
        latitude: pinLatitude,
        longitude: pinLongitude,
        locationName: locationName,
        mediaUrl: mediaUrl,
        mediaType: "photo",
        audioUrl: null,
        timestamp: new Date().toISOString(),
        title: aiGeneratedContent.title,
        description: aiGeneratedContent.description,
        tags: aiGeneratedContent.tags,
        additionalPhotos: additionalPhotos
      }

      setCurrentResultPin(newPin)
      setCurrentScreen("results")

      console.log("✅ Quick pin created with gateway data:", newPin)
    } catch (error) {
      console.error("❌ Failed to create quick pin:", error)
      
      // Show user-friendly error
      if (error instanceof Error && error.message === 'Already captured - please wait') {
        console.log("⏳ Debounce: User tapped too quickly")
      }
    } finally {
      setIsQuickPinning(false)
    }
  }, [getCurrentLocation, isQuickPinning, setCurrentResultPin, setCurrentScreen, motionData, user])

  // NEW: Generate intelligent AI content based on location and context
  const generateAIContent = (lat: number, lng: number, motionData: any, locationPhotos: any[]) => {
    console.log("dY Generating AI content for location:", { lat, lng, speed: motionData.speed, photoCount: locationPhotos.length })
    
    // Determine location type and context
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
      locationType = "coastal"
      context = "Cape Town - beautiful coastal city"
    } else if (lat > -34.0 && lat < -33.5 && lng > 18.0 && lng < 19.0) {
      locationType = "provincial"
      context = "Western Cape - diverse landscapes"
    }
    
    // Generate title based on location type and context
    let title = ""
    if (motionData.isMoving && motionData.speed > 5) {
      // Speed-based pinning titles
      if (locationType === "small-town") {
        title = "dY~,? Charming Rural Discovery"
      } else if (locationType === "urban-cbd") {
        title = "dYT,? Urban Gem Spotted"
      } else if (locationType === "suburban") {
        title = "dY Suburban Treasure"
      } else if (locationType === "coastal") {
        title = "dYOS Coastal Beauty"
      } else if (locationType === "provincial") {
        title = "dY?,? Provincial Wonder"
      } else {
        title = "dY? Travel Discovery"
      }
    } else {
      // Stationary pinning titles
      if (locationType === "small-town") {
        title = "dY~,? Local Community Spot"
      } else if (locationType === "urban-cbd") {
        title = "dYT,? City Center Location"
      } else if (locationType === "suburban") {
        title = "dY Neighborhood Place"
      } else if (locationType === "coastal") {
        title = "dYOS Seaside Location"
      } else if (locationType === "provincial") {
        title = "dY?,? Regional Spot"
      } else {
        title = "dY? Local Discovery"
      }
    }
    
    // Generate intelligent description
    let description = ""
    if (motionData.isMoving && motionData.speed > 5) {
      description = `Discovered this amazing spot while traveling ${motionData.speed.toFixed(1)} km/h! ${context} - perfect for capturing memories and sharing with friends.`
    } else {
      description = `Found this special place in ${context}. A wonderful location to remember and share with others.`
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
    
    // Use real location name if available from photos
    let locationName = context
    if (locationPhotos.length > 0 && locationPhotos[0].placeName !== "PINIT Placeholder") {
      locationName = locationPhotos[0].placeName
    }
    
    console.log("dY AI Generated Content:", { title, description, locationName, tags })
    
    return {
      title,
      description,
      locationName,
      tags
    }
  }

  // REMOVED: Old fetchLocationPhotos function - now using pin-intel gateway

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

  // Handle navigation start
  const handleStartNavigation = (place: any) => {
    console.log("dY- Starting navigation to:", place.title)
    // Navigation is handled within the PlaceNavigation component
  }

  // Results page handlers
  const handleSaveFromResults = (pin: PinData) => {
    // Include personal thoughts in the saved pin
    const pinToSave = {
      ...pin,
      personalThoughts: pin.personalThoughts || undefined
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
  const handleRecommendationSubmit = (rating: number, review: string) => {
    console.log("-? Recommendation submitted:", { rating, review })
    console.log("dY? Current recommendationData:", recommendationData)
    console.log("dY? Current userLocation:", userLocation)
    
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
        mediaUrl: recommendationData?.mediaUrl || null,
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
      mediaUrl: recommendationData?.mediaUrl || null,
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
          
          // Handle posting with content data
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
          // Handle saving with content data
          setSuccessMessage("Saved to library successfully!")
          setShowSuccessPopup(true)
          setTimeout(() => setShowSuccessPopup(false), 2000)
          setTimeout(() => setCurrentScreen("map"), 100)
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
        pins={pins}
        onBack={() => setCurrentScreen("map")}
        onPinSelect={(pin: PinData) => {
          // Handle pin selection
          console.log("Pin selected:", pin)
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
    return (
      <SettingsPage
        onBack={() => setCurrentScreen("map")}
        onComplete={() => setCurrentScreen("map")}
      />
    )
  }

  // Main map screen (Shazam-like interface) - ENHANCED WITH SUBTLE NOTIFICATIONS

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
      {/* Success Popup */}
      {showSuccessPopup && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "rgba(30, 58, 138, 0.95)",
            padding: "1.5rem",
            borderRadius: "1rem",
            border: "1px solid rgba(255,255,255,0.2)",
            zIndex: 1000,
            textAlign: "center",
            minWidth: "250px",
            backdropFilter: "blur(15px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>o.</div>
          <div style={{ 
            fontSize: "1.125rem", 
            fontWeight: "600", 
            color: "#10B981",
            marginBottom: "0.5rem"
          }}>
            {successMessage}
          </div>
          <div style={{ 
            fontSize: "0.875rem", 
            opacity: 0.8 
          }}>
            Your content has been processed successfully
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
          {/* LIVE GOOGLE MAPS BACKGROUND - WORKING VERSION */}
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
                  console.log("🗺️ Static map loaded successfully")
                  console.log("🗺️ Static map URL:", e.currentTarget.src)
                }}
                onError={(e) => {
                  console.log("🗺️ Static map failed, using fallback...")
                  console.log("🗺️ Static map URL that failed:", e.currentTarget.src)
                  console.log("🗺️ API Key in URL:", e.currentTarget.src.includes('key='))
                  console.log("🗺️ Error details:", e)
                  e.currentTarget.style.display = "none"
                  // Don't modify parentElement.innerHTML - just keep the background
                  if (e.currentTarget.parentElement) {
                    e.currentTarget.parentElement.style.background = "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)"
                  }
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
                dYs- Speed Pinning Active
              </div>
            )}

            {/* Minimal location overlay - positioned at top */}
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

  // Auto-redirect to settings if not authenticated - CONSOLIDATED LOGIC
  useEffect(() => {
    console.log("dY? Auth state:", { user, authLoading })
    
    // Wait for auth to finish loading - but don't show splash screen
    if (authLoading) {
      console.log("dY? Still loading auth, waiting...")
      // Don't set screen here - let it stay on current screen
      return
    }
    
    // Check if user is authenticated
    if (!user) {
      console.log("dY? No user, redirecting to settings")
      setCurrentScreen("settings")
      return
    }
    
    // User is authenticated - check if this is a page refresh
    const savedState = localStorage.getItem("pinit-app-state")
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState)
        console.log("🔄 Page refreshed - restoring last screen:", parsedState.currentScreen)
        
        // Restore the user's last screen if it's valid and not camera
        if (parsedState.currentScreen && 
            ["map", "camera", "platform-select", "content-editor", "editor", "story", "library", "story-builder", "recommendations", "place-navigation", "results", "settings"].includes(parsedState.currentScreen)) {
          if (parsedState.currentScreen !== "camera") {
            setCurrentScreen(parsedState.currentScreen)
            console.log("o. Restored screen after refresh:", parsedState.currentScreen)
            return
          }
        }
      } catch (error) {
        console.error("O Failed to restore screen after refresh:", error)
      }
    }
    
    // Default to map for authenticated users (only if no saved state)
    console.log("dY? User authenticated, going to main screen")
    setTimeout(() => setCurrentScreen("map"), 100)
  }, [user, authLoading])

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
