"use client"

import { useState, useCallback, useEffect } from "react"
import { Camera, Video, Library, Sparkles, MapPin, Check, Star } from "lucide-react"
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
  additionalPhotos?: Array<{url: string, placeName: string}> // NEW: Store multiple photos for carousel
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
  const [quickPinSuccess, setQuickPinSuccess] = useState(false)
  const [locationName, setLocationName] = useState<string>("Getting location...")

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
  } | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<string>("")

  // Hooks
  const { location, getCurrentLocation, watchLocation, clearWatch, isLoading: locationLoading } = useLocationServices()
  const { pins: storedPins, addPin: addPinFromStorage } = usePinStorage()
  const motionData = useMotionDetection()

  // Function to clear corrupted app state and reset to map
  const clearAppState = useCallback(() => {
    try {
      localStorage.removeItem("pinit-app-state")
      console.log("🧹 App state cleared manually")
      setCurrentScreen("map")
      setRecommendations([])
      setDiscoveryMode(false)
      setShowRecommendToggle(false)
      setLastActivity("app-reset")
    } catch (error) {
      console.error("❌ Failed to clear app state:", error)
    }
  }, [])

  // FORCE RESET ON APP START - Clear any corrupted state
  useEffect(() => {
    console.log("🚀 PINIT App starting - clearing any corrupted state")
    try {
      // Clear any potentially corrupted state immediately
      localStorage.removeItem("pinit-app-state")
      console.log("🧹 Cleared app state on startup")
      
      // Force start on map screen
      setCurrentScreen("map")
      setLastActivity("app-start-fresh")
      
      console.log("✅ App started fresh on map screen")
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
        
        // Validate and restore current screen with fallback to map
        if (parsedState.currentScreen && 
            ["map", "camera", "platform-select", "content-editor", "editor", "story", "library", "story-builder", "recommendations", "place-navigation", "results", "settings"].includes(parsedState.currentScreen)) {
          // Only restore if it's a valid screen and not camera (to prevent camera opening on app start)
          if (parsedState.currentScreen !== "camera") {
            setCurrentScreen(parsedState.currentScreen)
            console.log("✅ Restored screen:", parsedState.currentScreen)
          } else {
            console.log("⚠️ Preventing camera from opening on app start, staying on map")
            setCurrentScreen("map")
          }
        } else {
          console.log("⚠️ Invalid screen state, defaulting to map")
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
        
        console.log("✅ App state restored successfully")
      } else {
        console.log("🆕 No saved state found, starting fresh on map")
        setCurrentScreen("map")
      }
    } catch (error) {
      console.error("❌ Failed to restore app state:", error)
      // Clear corrupted state and start fresh
      try {
        localStorage.removeItem("pinit-app-state")
        console.log("🧹 Cleared corrupted app state")
      } catch (clearError) {
        console.error("❌ Failed to clear corrupted state:", clearError)
      }
      setCurrentScreen("map")
    }
  }, [])

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
      console.log("💾 App state saved to localStorage:", appState)
    } catch (error) {
      console.error("❌ Failed to save app state:", error)
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
      console.log("📍 Setting up location watching...")
      
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
      console.log("❌ Geolocation not available")
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
  } | null>(null)

  // Add location name resolution
  const getLocationName = async (lat: number, lng: number): Promise<string> => {
    try {
      // Use the new getRealLocationName function for better results
      return await getRealLocationName(lat, lng)
    } catch (error) {
      console.error("Failed to get location name:", error)
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
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

  // Get real location name from Google Places API with mobile-robust error handling
  const getRealLocationName = async (lat: number, lng: number): Promise<string> => {
    const isMobile = isMobileDevice()
    
    try {
      console.log(`📍 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Fetching real location name...`)
      console.log(`📍 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Coordinates:`, { lat, lng })
      
      // Enhanced fetch with mobile-specific headers and retry logic
      const fetchWithRetry = async () => {
        const response = await fetch(`/api/places?lat=${lat}&lng=${lng}&radius=5000`, {
          headers: {
            'User-Agent': isMobile ? 'PINIT-Mobile-App' : 'PINIT-Web-App',
            'X-Device-Type': isMobile ? 'mobile' : 'desktop'
          }
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`📍 [${isMobile ? 'MOBILE' : 'DESKTOP'}] API Error Response:`, errorText)
          throw new Error(`Failed to fetch location data: ${response.status} ${errorText}`)
        }
        
        return response
      }
      
      // Use retry logic for mobile (3 attempts) vs desktop (1 attempt)
      const response = await retryWithBackoff(fetchWithRetry, isMobile ? 3 : 1)
      const data = await response.json()
      
      console.log(`📍 [${isMobile ? 'MOBILE' : 'DESKTOP'}] API Response status:`, response.status)
      console.log(`📍 [${isMobile ? 'MOBILE' : 'DESKTOP'}] API Response data:`, data)

      if (data.results && data.results.length > 0) {
        // Get the closest place (first result)
        const closestPlace = data.results[0]
        const placeName = closestPlace.name
        const vicinity = closestPlace.vicinity || ""
        
        console.log(`📍 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Found place:`, { placeName, vicinity })
        
        // Enhanced location formatting
        if (vicinity) {
          if (vicinity.includes("Cape Town")) {
            const suburb = vicinity.split(",")[0].trim()
            if (suburb && suburb !== "Cape Town") {
              return `Cape Town - ${suburb}`
            }
          }
          
          if (!placeName.includes(vicinity)) {
            return `${placeName}, ${vicinity}`
          }
        }
        
        return placeName
      }

      // If no places found, try alternative geocoding for mobile
      if (isMobile && data.status === 'ZERO_RESULTS') {
        console.log(`📍 [MOBILE] Places API returned no results, trying alternative geocoding...`)
        
        // Try reverse geocoding as fallback
        try {
          const geocodeResponse = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
          )
          
          if (geocodeResponse.ok) {
            const geocodeData = await geocodeResponse.json()
            if (geocodeData.results && geocodeData.results.length > 0) {
              const addressComponents = geocodeData.results[0].address_components
              
              // Extract meaningful location name from address components
              const locality = addressComponents.find((comp: any) => 
                comp.types.includes('locality') || comp.types.includes('sublocality')
              )
              
              if (locality) {
                console.log(`📍 [MOBILE] Alternative geocoding successful:`, locality.long_name)
                return locality.long_name
              }
            }
          }
        } catch (geocodeError) {
          console.log(`📍 [MOBILE] Alternative geocoding failed:`, geocodeError)
        }
      }

      // If no places found, return a descriptive location name instead of coordinates
      console.log(`📍 [${isMobile ? 'MOBILE' : 'DESKTOP'}] No places found, returning descriptive location name...`)
      console.log(`📍 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Processing coordinates: lat=${lat}, lng=${lng}`)
      
      // Enhanced fallback logic with mobile-specific ranges
      if (isMobile) {
        console.log(`📍 [MOBILE] Checking fallback ranges for coordinates: ${lat}, ${lng}`)
        // Mobile-specific coordinate ranges (more precise)
        if (lat > -33.8 && lat < -33.7 && lng > 18.9 && lng < 19.0) {
          console.log(`📍 [MOBILE] Hit Riebeek West range`)
          return "Riebeek West"
        } else if (lat > -33.9 && lat < -33.8 && lng > 18.4 && lng < 18.5) {
          console.log(`📍 [MOBILE] Hit Cape Town - CBD range`)
          return "Cape Town - CBD"
        } else if (lat > -34.0 && lat < -33.9 && lng > 18.4 && lng < 18.5) {
          console.log(`📍 [MOBILE] Hit Cape Town - Southern Suburbs range`)
          return "Cape Town - Southern Suburbs"
        } else if (lat > -33.9 && lat < -33.8 && lng > 18.4 && lng < 18.5) {
          console.log(`📍 [MOBILE] Hit Cape Town - Northern Suburbs range`)
          return "Cape Town - Northern Suburbs"
        } else if (lat > -33.4 && lat < -33.3 && lng > 18.8 && lng < 18.9) {
          console.log(`📍 [MOBILE] Hit Cape Town range`)
          return "Cape Town"
        } else if (lat > -34.0 && lat < -33.5 && lng > 18.0 && lng < 19.0) {
          console.log(`📍 [MOBILE] Hit Western Cape range`)
          return "Western Cape"
        }
      } else {
        console.log(`📍 [DESKTOP] Checking fallback ranges for coordinates: ${lat}, ${lng}`)
        // Desktop fallback logic (existing)
        if (lat > -33.8 && lat < -33.7 && lng > 18.9 && lng < 19.0) {
          console.log(`📍 [DESKTOP] Hit Riebeek West range`)
          return "Riebeek West"
        } else if (lat > -33.9 && lat < -33.8 && lng > 18.4 && lng < 18.5) {
          console.log(`📍 [DESKTOP] Hit Cape Town - CBD range`)
          return "Cape Town - CBD"
        } else if (lat > -34.0 && lat < -33.9 && lng > 18.4 && lng < 18.5) {
          console.log(`📍 [DESKTOP] Hit Cape Town - Southern Suburbs range`)
          return "Cape Town - Southern Suburbs"
        } else if (lat > -33.9 && lat < -33.8 && lng > 18.4 && lng < 18.5) {
          console.log(`📍 [DESKTOP] Hit Cape Town - Northern Suburbs range`)
          return "Cape Town - Northern Suburbs"
        } else if (lat > -33.4 && lat < -33.3 && lng > 18.8 && lng < 18.9) {
          console.log(`📍 [DESKTOP] Hit Cape Town range`)
          return "Cape Town"
        } else if (lat > -34.0 && lat < -33.5 && lng > 18.0 && lng < 19.0) {
          console.log(`📍 [DESKTOP] Hit Western Cape range`)
          return "Western Cape"
        }
      }
      
      // Ultimate fallback: precise coordinates
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      
    } catch (error) {
      console.error(`📍 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Error fetching location name:`, error)
      console.error(`📍 [${isMobile ? 'MOBILE' : 'DESKTOP'}] Error details:`, { lat, lng, error: error instanceof Error ? error.message : String(error) })
      
      // Mobile-specific error handling
      if (isMobile) {
        console.log(`📍 [MOBILE] Attempting mobile-specific fallback...`)
        
        // Try to extract location from coordinates using basic logic
        if (lat > -33.8 && lat < -33.7 && lng > 18.9 && lng < 19.0) {
          return "Riebeek West"
        } else if (lat > -33.9 && lat < -33.8 && lng > 18.4 && lng < 18.5) {
          return "Cape Town - CBD"
        } else if (lat > -34.0 && lat < -33.9 && lng > 18.4 && lng < 18.5) {
          return "Cape Town - Southern Suburbs"
        } else if (lat > -33.9 && lat < -33.8 && lng > 18.4 && lng < 18.5) {
          return "Cape Town - Northern Suburbs"
        } else if (lat > -33.4 && lat < -33.3 && lng > 18.8 && lng < 18.9) {
          return "Cape Town"
        } else if (lat > -34.0 && lat < -33.5 && lng > 18.0 && lng < 19.0) {
          return "Western Cape"
        }
      }
      
      // Desktop fallback logic (existing)
      if (lat > -33.8 && lat < -33.7 && lng > 18.9 && lng < 19.0) {
        return "Riebeek West"
      } else if (lat > -33.9 && lat < -33.8 && lng > 18.4 && lng < 18.5) {
        return "Cape Town - CBD"
      } else if (lat > -34.0 && lat < -33.9 && lng > 18.4 && lng < 18.5) {
        return "Cape Town - Southern Suburbs"
      } else if (lat > -33.9 && lat < -33.8 && lng > 18.4 && lng < 18.5) {
        return "Cape Town - Northern Suburbs"
      } else if (lat > -33.4 && lat < -33.3 && lng > 18.8 && lng < 18.9) {
        return "Cape Town"
      } else if (lat > -34.0 && lat < -33.5 && lng > 18.0 && lng < 19.0) {
        return "Western Cape"
      }
      
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    }
  }

  // ENHANCED: Real Google Places Integration
  const findNearbyPins = useCallback(async () => {
    if (!location) return

    console.log("🌐 Discovering real nearby places...")
    
    try {
      // Use our API route to avoid CORS issues
      const response = await fetch(`/api/places?lat=${location.latitude}&lng=${location.longitude}&radius=5000`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch places from API")
      }
      
      const data = await response.json()
      const realPlaces = data.results || []
      
      console.log("🌐 Found", realPlaces.length, "places via API route")
      
      // Transform API results to PinData format
      const transformedPlaces = realPlaces.map((place: any) => ({
        id: place.place_id,
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        locationName: place.vicinity || place.name,
        mediaUrl: null,
        mediaType: null,
        audioUrl: null,
        timestamp: new Date().toISOString(),
        title: place.name,
        description: `Rating: ${place.rating || "N/A"} • ${place.types?.join(", ") || "Place"}`,
        tags: place.types || [],
        isRecommended: true,
        googlePlaceId: place.place_id,
        rating: place.rating,
        priceLevel: place.price_level,
        types: place.types,
        isAISuggestion: true,
      }))
      
      setNearbyPins(transformedPlaces)
      setShowNearbyPins(true)
      setLastActivity("discovery")
      
    } catch (error) {
      console.error("🌐 Error fetching nearby places:", error)
      // Don't set error state, just log it
    }
  }, [location])

  // Auto-fetch nearby places when recommendations screen is opened
  useEffect(() => {
    if (currentScreen === "recommendations" && location && nearbyPins.length === 0) {
      console.log("🗺️ Recommendations screen opened, fetching nearby places...")
      findNearbyPins()
    }
    
    // Hide nearby places popup when leaving recommendations screen
    if (currentScreen !== "recommendations") {
      setShowNearbyPins(false)
    }
  }, [currentScreen, location, nearbyPins.length, findNearbyPins])

  // Debug: Monitor recommendations state changes
  useEffect(() => {
    console.log("🤖 Recommendations state changed:", recommendations.length, "recommendations")
    console.log("🤖 Recommendations content:", recommendations)
  }, [recommendations])

  // Handle AI recommendations - ADD TO RECOMMENDATIONS LIST
  const handleAIRecommendations = useCallback((newRecommendations: Recommendation[]) => {
    console.log("🤖 AI generated recommendations:", newRecommendations)
    console.log("🤖 Current recommendations count before:", recommendations.length)
    
    setRecommendations((prev) => {
      // Avoid duplicates by checking IDs
      const existingIds = new Set(prev.map((r) => r.id))
      const uniqueRecommendations = newRecommendations.filter((r) => !existingIds.has(r.id))
      
      console.log("🤖 Unique new recommendations:", uniqueRecommendations.length)
      console.log("🤖 Total recommendations after adding:", prev.length + uniqueRecommendations.length)
      
      return [...prev, ...uniqueRecommendations]
    })
  }, [recommendations.length])

  // Handle notification tap - GO TO RECOMMENDATIONS PAGE
  const handleNotificationTap = useCallback(() => {
    console.log("🤖 Opening recommendations hub")
    setCurrentScreen("recommendations")
    // Ensure nearby places popup is hidden when opening recommendations
    setShowNearbyPins(false)
  }, [])

  // Handle recommendation actions
  const handleRecommendationAction = useCallback(
    (action: string, data?: any) => {
      console.log("🎯 Taking recommendation action:", action, data)
      // Go back to map after action and hide nearby places popup
      setCurrentScreen("map")
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
      console.log("🤖 Proactive AI suggestion:", action, data)

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
      
      // NEW: Fetch location photos before creating the pin
      console.log("📸 Fetching location photos for speed-based pin...")
      const locationPhotos = await fetchLocationPhotos(pinLatitude, pinLongitude)
      
      // NEW: Generate intelligent AI content based on location and context
      const aiGeneratedContent = generateAIContent(pinLatitude, pinLongitude, motionData, locationPhotos)
      
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
        additionalPhotos: locationPhotos
      }

      setCurrentResultPin(newPin)
      setCurrentScreen("results")

      console.log("📍 Quick pin created with photo:", newPin)
    } catch (error) {
      console.error("❌ Failed to create quick pin:", error)
    } finally {
      setIsQuickPinning(false)
    }
  }, [getCurrentLocation, isQuickPinning, setCurrentResultPin, setCurrentScreen, motionData])

  // NEW: Generate intelligent AI content based on location and context
  const generateAIContent = (lat: number, lng: number, motionData: any, locationPhotos: any[]) => {
    console.log("🧠 Generating AI content for location:", { lat, lng, speed: motionData.speed, photoCount: locationPhotos.length })
    
    // Determine location type and context
    let locationType = "general"
    let context = ""
    
    // Analyze location based on coordinates
    if (lat > -33.8 && lat < -33.7 && lng > 18.9 && lng < 19.0) {
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
      } else if (locationType === "provincial") {
        title = "🏔️ Regional Spot"
      } else {
        title = "📍 Local Discovery"
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
    
    console.log("🧠 AI Generated Content:", { title, description, locationName, tags })
    
    return {
      title,
      description,
      locationName,
      tags
    }
  }

  // NEW: Fetch location photos for pins (returns array of photos for carousel)
  const fetchLocationPhotos = async (lat: number, lng: number): Promise<{url: string, placeName: string}[]> => {
    try {
      console.log("📸 Fetching location photos for carousel...")
      
      // Use our API route instead of calling Google Maps directly
      const photoResponse = await fetch(`/api/places?lat=${lat}&lng=${lng}&radius=5000`)
      
      if (!photoResponse.ok) {
        throw new Error("Failed to fetch location data")
      }

      const data = await photoResponse.json()
      const photos: {url: string, placeName: string}[] = []

      if (data.results && data.results.length > 0) {
        // Collect photos from multiple places
        data.results.forEach((place: any) => {
          if (place.photos && place.photos.length > 0) {
            // Get up to 3 photos per place to avoid overwhelming the carousel
            const placePhotos = place.photos.slice(0, 3).map((photo: any) => ({
              url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photo.photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`,
              placeName: place.name || "Unknown Place"
            }))
            photos.push(...placePhotos)
          }
        })
        
        // Limit total photos to 6 for carousel performance
        const limitedPhotos = photos.slice(0, 6)
        console.log(`✅ Found ${limitedPhotos.length} location photos for carousel`)
        return limitedPhotos
      }
      
      console.log("📸 No location photos found, will use PINIT placeholder")
      return [{url: "/placeholder.jpg", placeName: "PINIT Placeholder"}]
    } catch (error) {
      console.error("❌ Error fetching location photos:", error)
      return [{url: "/placeholder.jpg", placeName: "PINIT Placeholder"}]
    }
  }

  // Handle place navigation from recommendations
  const handlePlaceNavigation = (place: any) => {
    console.log("🗺️ Opening place navigation for:", place.title)
    setSelectedPlace(place)
    setCurrentScreen("place-navigation")
  }

  // Handle save for later
  const handleSaveForLater = (place: any) => {
    console.log("🔖 Saving place for later:", place.title)
    setSavedForLaterPlaces((prev) => [...prev, { ...place, savedAt: Date.now() }])
    setCurrentScreen("recommendations")
  }

  // Handle navigation start
  const handleStartNavigation = (place: any) => {
    console.log("🧭 Starting navigation to:", place.title)
    // Navigation is handled within the PlaceNavigation component
  }

  // Results page handlers
  const handleSaveFromResults = (pin: PinData) => {
    addPin(pin)
    setCurrentResultPin(null)
    setCurrentScreen("map")
    setQuickPinSuccess(true)
    setTimeout(() => setQuickPinSuccess(false), 2000)
  }

  const handleShareFromResults = (pin: PinData) => {
    const shareText = `Check out this amazing place I discovered: ${pin.title} at ${pin.locationName}! 📍`
    if (typeof window !== 'undefined' && navigator.share) {
      navigator.share({
        title: pin.title,
        text: shareText,
        url: `https://www.google.com/maps?q=${pin.latitude},${pin.longitude}`,
      })
    } else if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareText)
      alert("Pin details copied to clipboard!")
    }
  }

  const handleEditFromResults = (pin: PinData) => {
    // For now, just go back to map - could be enhanced with an edit modal
    setCurrentResultPin(null)
    setCurrentScreen("map")
  }

  const handleBackFromResults = () => {
    setCurrentResultPin(null)
    setCurrentScreen("map")
  }

  // Recommendation form handlers
  const handleRecommendationSubmit = (rating: number, review: string) => {
    console.log("⭐ Recommendation submitted:", { rating, review })
    console.log("📍 Current recommendationData:", recommendationData)
    console.log("📍 Current userLocation:", userLocation)
    
    // Create a new recommendation pin
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

    console.log("📌 Created new recommendation pin:", newRecommendation)

    // Add the recommendation to pins
    addPin(newRecommendation)
    
    setShowRecommendationForm(false)
    setRecommendationData(null)
    setSuccessMessage("Recommendation sent!")
    setShowSuccessPopup(true)
    setTimeout(() => setShowSuccessPopup(false), 3000)
    setCurrentScreen("map")
  }

  const handleRecommendationSkip = () => {
    console.log("⏭️ Recommendation skipped")
    setShowRecommendationForm(false)
    setRecommendationData(null)
    setCurrentScreen("map")
  }

  // Debounce for post button to prevent multiple clicks
  const [isPosting, setIsPosting] = useState(false)

  // Handle arrival
  const handleArrival = useCallback(
    (place: any, shouldSave: boolean) => {
      console.log("🎯 Arrived at:", place.title, "Save:", shouldSave)

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
        console.log("📍 Place saved as pin:", newPin)
      }

      // Go back to map
      setCurrentScreen("map")
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
        onBack={() => setCurrentScreen("map")}
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
          
          // Handle posting with content data
          setSuccessMessage(`Posted to ${selectedPlatform} successfully!`)
          setShowSuccessPopup(true)
          
          // Show recommendation form after success message
          setTimeout(() => {
            setShowSuccessPopup(false)
            setRecommendationData({
              mediaUrl: contentData.finalImageUrl || capturedMedia.url, // Use rendered image if available
              locationName: capturedMedia.location,
              platform: selectedPlatform
            })
            setShowRecommendationForm(true)
          }, 2000)
          
          // Return to map after showing success message
          setTimeout(() => {
            setCurrentScreen("map")
            setIsPosting(false)
          }, 2000)
        }}
        onSave={(contentData) => {
          // Handle saving with content data
          setSuccessMessage("Saved to library successfully!")
          setShowSuccessPopup(true)
          setTimeout(() => setShowSuccessPopup(false), 2000)
          setCurrentScreen("map")
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
    return <PinStoryMode pins={pins} onBack={() => setCurrentScreen("map")} />
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
    console.log("🧠 Opening AI-Powered Recommendations Hub")
    console.log("🧠 - AI brain is learning from user behavior")
    console.log("🧠 - Generating personalized recommendations")
    
    return (
      <AIRecommendationsHub 
        onBack={() => setCurrentScreen("map")} 
        userLocation={location}
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
        onEdit={handleEditFromResults}
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
        background: "linear-gradient(135deg, #87CEEB 0%, #4169E1 50%, #191970 100%)",
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
            background: "rgba(0,0,0,0.9)",
            padding: "1.5rem",
            borderRadius: "1rem",
            border: "1px solid rgba(255,255,255,0.2)",
            zIndex: 1000,
            textAlign: "center",
            minWidth: "250px",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
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
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
            borderRadius: "0.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.2s ease",
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
          🚶‍♂️ Moving ({motionData.speed.toFixed(1)} km/h)
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
            background: "radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 50%, transparent 70%)",
            animation: "shazamPulse 2s ease-in-out infinite",
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
              "radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.08) 50%, transparent 70%)",
            animation: "shazamPulse 2s ease-in-out infinite 0.7s",
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
              "radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 50%, transparent 70%)",
            animation: "shazamPulse 2s ease-in-out infinite 1.4s",
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
            border: motionData.isMoving && motionData.speed > 5 ? "4px solid #22C55E" : "4px solid rgba(255,255,255,0.9)",
            background: "transparent",
            cursor: isQuickPinning ? "not-allowed" : "pointer",
            transition: "all 0.3s ease",
            boxShadow: motionData.isMoving && motionData.speed > 5 ? "0 8px 32px rgba(34, 197, 94, 0.4)" : "0 8px 32px rgba(0,0,0,0.3)",
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
                background: "linear-gradient(135deg, #22C55E 0%, #3B82F6 50%, #10B981 100%)",
              }}
            >
              <img
                src={`https://maps.googleapis.com/maps/api/staticmap?center=${
                  userLocation?.latitude || location?.latitude || -25.7479
                },${
                  userLocation?.longitude || location?.longitude || 28.2293
                }&zoom=16&size=280x280&maptype=satellite&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}`}
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
                  // Try OpenStreetMap tile service as fallback
                  e.currentTarget.src = `https://tile.openstreetmap.org/16/${Math.floor(
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
                    if (e.currentTarget.complete && e.currentTarget.naturalHeight === 0) {
                      e.currentTarget.style.display = "none"
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
            textShadow: "0 4px 8px rgba(0,0,0,0.3)",
          }}
        >
          PINIT
        </h1>
        <p
          style={{
            margin: "0.25rem 0 0 0",
            fontSize: "1.1rem",
            opacity: 0.9,
            color: "white",
            textShadow: "0 2px 4px rgba(0,0,0,0.3)",
            fontWeight: "500",
          }}
        >
          Pin It. Find It. Share It.
        </p>
        <p
          style={{
            margin: "0.5rem 0 0 0",
            opacity: 0.9,
            fontSize: "1rem",
            color: "white",
            textShadow: "0 2px 4px rgba(0,0,0,0.3)",
          }}
        >
          📍 {locationName}
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
            background: "rgba(0,0,0,0.9)",
            borderRadius: "1rem",
            padding: "1rem",
            backdropFilter: "blur(10px)",
            maxHeight: "200px",
            overflowY: "auto",
            border: "2px solid #10B981",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "bold", color: "white" }}>
              🌐 Real Places Nearby {isLoadingPlaces && "⏳"}
            </h3>
            <button
              onClick={() => setShowNearbyPins(false)}
              style={{
                padding: "0.25rem",
                border: "none",
                background: "rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
                borderRadius: "4px",
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: "flex", gap: "1rem", overflowX: "auto" }}>
            {nearbyPins.map((pin) => (
              <div
                key={pin.id}
                style={{
                  minWidth: "160px",
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "0.5rem",
                  padding: "0.75rem",
                  color: "white",
                  cursor: "pointer",
                  border: pin.googlePlaceId ? "1px solid #10B981" : "1px solid rgba(255,255,255,0.2)",
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
                    {"⭐".repeat(Math.floor(pin.rating))} {pin.rating}
                  </div>
                )}
                <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                  {pin.googlePlaceId && (
                    <span
                      style={{
                        fontSize: "0.5rem",
                        background: "#10B981",
                        padding: "0.125rem 0.25rem",
                        borderRadius: "0.25rem",
                      }}
                    >
                      🌐 Google
                    </span>
                  )}
                  {pin.isRecommended && (
                    <span
                      style={{
                        fontSize: "0.5rem",
                        background: "#F59E0B",
                        padding: "0.125rem 0.25rem",
                        borderRadius: "0.25rem",
                      }}
                    >
                      ⭐ Top
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
          background: "transparent",
          borderRadius: "2rem",
          padding: "1.5rem",
          backdropFilter: "none",
        }}
      >
        <button
          onClick={() => {
            setCameraMode("photo")
            setCurrentScreen("camera")
          }}
          style={{
            padding: "0.5rem",
            border: "none",
            background: "transparent",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
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
            padding: "0.5rem",
            border: "none",
            background: "transparent",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Video size={28} />
        </button>

        <button
          onClick={openLibrary}
          style={{
            padding: "0.5rem",
            border: "none",
            background: "transparent",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
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
                color: "white",
                fontSize: "0.75rem",
                fontWeight: "bold",
                textShadow: "0 1px 2px rgba(0,0,0,0.8)",
              }}
            >
              {newPins}
            </div>
          )}
        </button>

        <button
          onClick={() => setCurrentScreen("recommendations")}
          style={{
            padding: "0.5rem",
            border: "none",
            background: "transparent",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
          title="🧠 AI-Powered Recommendations"
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
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0.6;
          }
          50% { 
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0.3;
          }
          100% { 
            transform: translate(-50%, -50%) scale(1.5);
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
    whatsapp: { width: 1080, height: 1080 },
  }

  return dimensions[platform as keyof typeof dimensions] || { width: 1080, height: 1080 }
}
