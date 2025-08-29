"use client"

/**
 * PINIT Main Application Component
 * 
 * This is the core client-side component that handles the main PINIT functionality:
 * - Location-based pin creation (like Shazam for travel)
 * - Real-time GPS tracking and speed calculation
 * - AI-powered recommendations and content generation
 * - Camera capture and media handling
 * - Social sharing and community features
 * 
 * Architecture: Client-only component (SSR disabled) to handle browser APIs
 * Performance: Lazy-loaded components, debounced updates, mobile optimizations
 */

// React core imports
import { useState, useCallback, useEffect, useMemo } from "react"
import dynamic from "next/dynamic"

// Logging and debugging
import { log } from '@/lib/logger'

// Icon imports
import { Camera, Video, Library, MapPin, Check, Star } from "lucide-react"

// Custom hooks
import { useLocationServices } from "@/hooks/useLocationServices"
import { usePinStorage } from "@/hooks/usePinStorage"
import { useMotionDetection } from "@/hooks/useMotionDetection"

// Utility functions
import { autoHealOnStartup } from "@/lib/dataHealing"
import { 
  isMobileDevice, 
  retryWithBackoff, 
  generateUniqueId,
  isValidUrl,
  debounce,
  formatTimeAgo
} from "@/lib/helpers"
import { APP_CONFIG, UI_CONFIG, API_CONFIG } from "@/lib/constants"

// UI Components (direct imports for critical path)
import { ReliableCamera } from "@/components/reliable-camera"
import { SocialPlatformSelector } from "@/components/social-platform-selector"
import { ContentEditor } from "@/components/ContentEditor"
import { SettingsPage } from "@/components/SettingsPage"
import { PinStoryMode } from "@/components/PinStoryMode"
import { ProactiveAI } from "@/components/ProactiveAI"
import { EnhancedLocationService } from "@/components/EnhancedLocationService"
import { PinStoryBuilder } from "@/components/PinStoryBuilder"

// Lazy load large components for better mobile performance
const AIRecommendationsHub = dynamic(() => import("@/components/AIRecommendationsHub"), {
  ssr: false,
  loading: () => (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white"
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: "48px",
          height: "48px",
          border: "4px solid rgba(255,255,255,0.3)",
          borderTop: "4px solid white",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          margin: "0 auto 1rem"
        }} />
        <p>Loading Recommendations...</p>
      </div>
    </div>
  )
})
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
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)

  // Media state
  const [capturedMedia, setCapturedMedia] = useState<{
    url: string
    type: "photo" | "video"
    location: string
    title?: string
    description?: string
    personalThoughts?: string
    pinId?: string
    latitude?: number
    longitude?: number
    timestamp?: string
    tags?: string[]
    additionalPhotos?: Array<{ url: string; placeName: string }>
  } | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<string>("")

  // Hooks
  const { location, getCurrentLocation, watchLocation, clearWatch, isLoading: locationLoading } = useLocationServices()
  const { pins: storedPins, addPin: addPinFromStorage } = usePinStorage()
  const motionData = useMotionDetection()

  // Additional state
  const [selectedPlace, setSelectedPlace] = useState<any>(null)
  const [savedForLaterPlaces, setSavedForLaterPlaces] = useState<any[]>([])
  const [currentResultPin, setCurrentResultPin] = useState<PinData | null>(null)
  const [showRecommendationForm, setShowRecommendationForm] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
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
  const [isPosting, setIsPosting] = useState(false)

  // Using centralized utility functions from lib/helpers

  // Location functions (defined before they are used)
  const getRealLocationName = async (lat: number, lng: number): Promise<string> => {
    const isMobile = isMobileDevice()

    try {
      console.log(`📍 [${isMobile ? "MOBILE" : "DESKTOP"}] Fetching real location name...`)
      
      const fetchWithRetry = async () => {
        const response = await fetch(`/api/places?lat=${lat}&lng=${lng}&radius=5000`, {
          headers: {
            "User-Agent": isMobile ? "PINIT-Mobile-App" : "PINIT-Web-App",
            "X-Device-Type": isMobile ? "mobile" : "desktop",
          },
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`📍 API Error Response:`, errorText)
          throw new Error(`Failed to fetch location data: ${response.status} ${errorText}`)
        }
        return response
      }

      const response = await retryWithBackoff(fetchWithRetry, isMobile ? 3 : 1)
      const data = await response.json()

      if (data.results && data.results.length > 0) {
        const closestPlace = data.results[0]
        const placeName = closestPlace.name
        const vicinity = closestPlace.vicinity || ""

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

      // Fallback logic for specific regions
      if (lat > -34.1 && lat < -34.0 && lng > 18.8 && lng < 18.9) {
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

      // Global fallback
      const latDir = lat >= 0 ? "N" : "S"
      const lngDir = lng >= 0 ? "E" : "W"
      const latAbs = Math.abs(lat).toFixed(2)
      const lngAbs = Math.abs(lng).toFixed(2)

      let region = "Unknown Region"
      if (lat >= 25 && lat <= 70 && lng >= -170 && lng <= -50) region = "North America"
      else if (lat >= -60 && lat <= 15 && lng >= -90 && lng <= -30) region = "South America"
      else if (lat >= 35 && lat <= 75 && lng >= -10 && lng <= 40) region = "Europe"
      else if (lat >= 10 && lat <= 75 && lng >= 60 && lng <= 180) region = "Asia"
      else if (lat >= -35 && lat <= 35 && lng >= -20 && lng <= 55) region = "Africa"
      else if (lat >= -45 && lat <= -10 && lng >= 110 && lng <= 155) region = "Australia"

      return `${region} (${latAbs}°${latDir}, ${lngAbs}°${lngDir})`
    } catch (error) {
      console.error("Error fetching location name:", error)
      
      // Fallback logic on error
      if (lat > -33.8 && lat < -33.7 && lng > 18.9 && lng < 19.0) {
        return "Riebeek West"
      } else if (lat > -33.9 && lat < -33.8 && lng > 18.4 && lng < 18.5) {
        return "Cape Town - CBD"
      }

      const latDir = lat >= 0 ? "N" : "S"
      const lngDir = lng >= 0 ? "E" : "W"
      const latAbs = Math.abs(lat).toFixed(2)
      const lngAbs = Math.abs(lng).toFixed(2)
      return `Location (${latAbs}°${latDir}, ${lngAbs}°${lngDir})`
    }
  }

  const getLocationName = async (lat: number, lng: number): Promise<string> => {
    try {
      return await getRealLocationName(lat, lng)
    } catch (error) {
      console.error("Failed to get location name:", error)
      const latDir = lat >= 0 ? "N" : "S"
      const lngDir = lng >= 0 ? "E" : "W"
      const latAbs = Math.abs(lat).toFixed(2)
      const lngAbs = Math.abs(lng).toFixed(2)

      let region = "Unknown Region"
      if (lat >= 25 && lat <= 70 && lng >= -170 && lng <= -50) region = "North America"
      else if (lat >= -60 && lat <= 15 && lng >= -90 && lng <= -30) region = "South America"
      else if (lat >= 35 && lat <= 75 && lng >= -10 && lng <= 40) region = "Europe"
      else if (lat >= 10 && lat <= 75 && lng >= 60 && lng <= 180) region = "Asia"
      else if (lat >= -35 && lat <= 35 && lng >= -20 && lng <= 55) region = "Africa"
      else if (lat >= -45 && lat <= -10 && lng >= 110 && lng <= 155) region = "Australia"

      return `${region} (${latAbs}°${latDir}, ${lngAbs}°${lngDir})`
    }
  }

  // AI and photo functions (defined before they are used)
  const generateAIContent = (lat: number, lng: number, motionData: any, locationPhotos: any[]) => {
    console.log("🧠 Generating AI content for location:", { lat, lng, speed: motionData.speed, photoCount: locationPhotos.length })

    let locationType = "general"
    let context = ""

    if (lat > -34.1 && lat < -34.0 && lng > 18.8 && lng < 18.9) {
      locationType = "small-town"
      context = "Riebeek West - charming rural community"
    } else if (lat > -33.9 && lat < -33.8 && lng > 18.4 && lng < 18.5) {
      locationType = "urban-cbd"
      context = "Cape Town CBD - vibrant city center"
    }

    let title = ""
    if (motionData.isMoving && motionData.speed > 5) {
      if (locationType === "small-town") {
        title = "🏘️ Charming Rural Discovery"
      } else if (locationType === "urban-cbd") {
        title = "🏙️ Urban Gem Spotted"
      } else {
        title = "📍 Travel Discovery"
      }
    } else {
      title = "📍 Local Discovery"
    }

    let description = ""
    if (motionData.isMoving && motionData.speed > 5) {
      description = `Discovered this amazing spot while traveling ${motionData.speed.toFixed(1)} km/h! ${context} - perfect for capturing memories.`
    } else {
      description = `Found this special place in ${context}. A wonderful location to remember and share.`
    }

    const tags = ["ai-generated", "pinit"]
    if (motionData.isMoving && motionData.speed > 5) {
      tags.push("travel-discovery", "speed-pinning")
    }

    let locationName = context
    if (locationPhotos.length > 0 && locationPhotos[0].placeName !== "PINIT Placeholder") {
      locationName = locationPhotos[0].placeName
    }

    return { title, description, locationName, tags }
  }

  const fetchLocationPhotos = async (lat: number, lng: number): Promise<{ url: string; placeName: string }[]> => {
    try {
      console.log("📸 Fetching location photo...")

      const photoResponse = await fetch(`/api/places?lat=${lat}&lng=${lng}&radius=5000`)

      if (!photoResponse.ok) {
        console.log(`📸 Places API returned ${photoResponse.status}, using placeholder`)
        return [{ url: "/pinit-placeholder.jpg", placeName: "PINIT Placeholder" }]
      }

      const data = await photoResponse.json()
      const photos: { url: string; placeName: string }[] = []

      if (data.results && data.results.length > 0) {
        const closestPlace = data.results[0]
        if (closestPlace.photos && closestPlace.photos.length > 0) {
          const bestPhoto = closestPlace.photos[0]
          const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
          
          if (apiKey) {
            const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${bestPhoto.photo_reference}&key=${apiKey}`

            photos.push({
              url: photoUrl,
              placeName: closestPlace.name || "Unknown Place",
            })

            console.log(`✅ Found location photo: ${closestPlace.name}`)
            return photos
          } else {
            console.log("📸 Google Maps API key not configured")
          }
        }
      }

      console.log("📸 No location photos found or API key missing, using placeholder")
      return [{ url: "/pinit-placeholder.jpg", placeName: "PINIT Placeholder" }]
    } catch (error) {
      console.error("❌ Error fetching location photos:", error)
      return [{ url: "/pinit-placeholder.jpg", placeName: "PINIT Placeholder" }]
    }
  }

  // Core app functions
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

  // Effects
  useEffect(() => {
    console.log("🚀 PINIT App starting - clearing any corrupted state")
    try {
      localStorage.removeItem("pinit-app-state")
      setCurrentScreen("map")
      setLastActivity("app-start-fresh")
      
      
      
      // Auto-heal data on startup
      log.async(() => autoHealOnStartup(), "Data healing on startup", "PINITApp")
      
      // Set up network monitoring
      setIsOnline(navigator.onLine)
      log.info("Network monitoring initialized", { online: navigator.onLine }, "PINITApp")
      
      const handleOnline = () => {
        setIsOnline(true)
        log.info("Network connection restored", undefined, "PINITApp")
      }
      
      const handleOffline = () => {
        setIsOnline(false)
        log.warn("Network connection lost - entering offline mode", undefined, "PINITApp")
      }
      
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
      
      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    } catch (error) {
      console.error("❌ Error during app startup reset:", error)
    }
  }, [])

  // Debounced app state saving for better performance
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const appState = {
        currentScreen,
        recommendations,
        discoveryMode,
        showRecommendToggle,
        lastActivity,
        timestamp: Date.now(),
      }

      try {
        localStorage.setItem("pinit-app-state", JSON.stringify(appState))
      } catch (error) {
        console.error("❌ Failed to save app state:", error)
      }
    }, 1000) // Debounce for 1 second to reduce localStorage writes

    return () => clearTimeout(timeoutId)
  }, [currentScreen, recommendations, discoveryMode, showRecommendToggle, lastActivity])

  useEffect(() => {
    if (storedPins.length > 0) {
      setPins(storedPins)
    }
  }, [storedPins])

  useEffect(() => {
    let watchId: number | null = null
    let isActive = true // Prevent memory leaks from async operations

    if (typeof window !== "undefined" && navigator.geolocation) {
      console.log("📍 Setting up location watching...")

      // Mobile-optimized location watching
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
      watchId = watchLocation({
        enableHighAccuracy: !isMobile, // Lower accuracy on mobile for battery savings
        timeout: isMobile ? 20000 : 15000, // More time for mobile GPS
        maximumAge: isMobile ? 30000 : 10000, // Cache longer on mobile
      })

      return () => {
        isActive = false
        if (watchId !== null) {
          clearWatch(watchId)
          console.log("📍 Location watching cleaned up")
        }
      }
    }
  }, [watchLocation, clearWatch])

  useEffect(() => {
    if (location) {
      setUserLocation({
        latitude: location.latitude,
        longitude: location.longitude,
      })

      // Debounce location name updates on mobile for better performance
      const isMobile = typeof window !== "undefined" && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
              const debounceTime = isMobile ? UI_CONFIG.LOCATION_NAME_DEBOUNCE_MOBILE : UI_CONFIG.LOCATION_NAME_DEBOUNCE_DESKTOP
      
      const timeoutId = setTimeout(() => {
        getLocationName(location.latitude, location.longitude).then((name) => {
          setLocationName(name)
        }).catch((error) => {
          console.log("📍 Location name update failed:", error)
        })
      }, debounceTime)

      return () => clearTimeout(timeoutId)
    }
  }, [location])

  const addPin = useCallback(
    (pin: PinData) => {
      setPins((prev: PinData[]) => [...prev, pin])
      setNewPins((prev: number) => prev + 1)
      addPinFromStorage(pin)
    },
    [addPinFromStorage],
  )

  const openLibrary = useCallback(() => {
    setCurrentScreen("library")
    setNewPins(0)
  }, [])

  const findNearbyPins = useCallback(async () => {
    if (!location || typeof window === 'undefined') return

    console.log("🌐 Discovering real nearby places...")
    setIsLoadingPlaces(true)

    try {
      // Check network connectivity
      if (!navigator.onLine) {
        console.log("🌐 Offline mode: Using cached or mock data")
        setIsLoadingPlaces(false)
        return
      }

      const response = await fetch(`/api/places?lat=${location.latitude}&lng=${location.longitude}&radius=5000`, {
        signal: AbortSignal.timeout(15000), // 15 second timeout
      })

      if (!response.ok) {
        console.log(`🌐 Places API returned ${response.status}, continuing with available data`)
        setIsLoadingPlaces(false)
        return
      }

      const data = await response.json()
      const realPlaces = data.results || []

      if (realPlaces.length === 0) {
        console.log("🌐 No nearby places found")
        setIsLoadingPlaces(false)
        return
      }

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
      console.log(`🌐 Successfully loaded ${transformedPlaces.length} nearby places`)
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        console.log("🌐 Request timeout: Network may be slow")
      } else {
        console.error("🌐 Error fetching nearby places:", error)
      }
    } finally {
      setIsLoadingPlaces(false)
    }
  }, [location])

  // Memoize location key to prevent unnecessary effect runs
  const locationKey = useMemo(() => {
    if (!location) return null
    return `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`
  }, [location])

  useEffect(() => {
    if (currentScreen === "recommendations" && locationKey && nearbyPins.length === 0) {
      findNearbyPins()
    }
    if (currentScreen !== "recommendations") {
      setShowNearbyPins(false)
    }
  }, [currentScreen, locationKey, nearbyPins.length, findNearbyPins])

  const handleQuickPin = useCallback(async () => {
    if (isQuickPinning) return

    setIsQuickPinning(true)
    setLastActivity("quick-pin")

    try {
      const currentLocation = await getCurrentLocation()

      let pinLatitude = currentLocation.latitude
      let pinLongitude = currentLocation.longitude
      let locationDescription = "Quick Pin Location"

      if (motionData.isMoving && motionData.speed > 5) {
        console.log(`🚗 Speed-based pinning: ${motionData.speed.toFixed(1)} km/h`)

        const reactionTime = 2
        const speedInMPS = motionData.speed / 3.6
        const distanceTraveled = speedInMPS * reactionTime

        if (motionData.lastPosition) {
          const bearing = Math.atan2(
            currentLocation.longitude - motionData.lastPosition.longitude,
            currentLocation.latitude - motionData.lastPosition.latitude,
          )

          const latOffset = (distanceTraveled / 111000) * Math.cos(bearing)
          const lngOffset =
            (distanceTraveled / (111000 * Math.cos((currentLocation.latitude * Math.PI) / 180))) * Math.sin(bearing)

          pinLatitude = currentLocation.latitude - latOffset
          pinLongitude = currentLocation.longitude - lngOffset

          locationDescription = `Speed-based pin (${motionData.speed.toFixed(0)} km/h)`
        }
      }

      const locationPhotos = await fetchLocationPhotos(pinLatitude, pinLongitude)
      const aiGeneratedContent = generateAIContent(pinLatitude, pinLongitude, motionData, locationPhotos)

      const newPin: PinData = {
        id: Date.now().toString(),
        latitude: pinLatitude,
        longitude: pinLongitude,
        locationName: aiGeneratedContent.locationName || locationDescription,
        mediaUrl: locationPhotos[0]?.url || null,
        mediaType: "photo",
        audioUrl: null,
        timestamp: new Date().toISOString(),
        title: aiGeneratedContent.title,
        description: aiGeneratedContent.description,
        tags: aiGeneratedContent.tags,
        additionalPhotos: locationPhotos,
      }

      setCurrentResultPin(newPin)
      setCurrentScreen("results")
    } catch (error) {
      console.error("❌ Failed to create quick pin:", error)
    } finally {
      setIsQuickPinning(false)
    }
  }, [getCurrentLocation, isQuickPinning, motionData])

  // Handler functions
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

  const handlePlatformSelect = useCallback((platform: string) => {
    setSelectedPlatform(platform)
    setCurrentScreen("content-editor")
  }, [])

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
          if (isPosting) return
          setIsPosting(true)

          setSuccessMessage(`Posted to ${selectedPlatform} successfully!`)
          setShowSuccessPopup(true)

          setTimeout(() => {
            setCurrentScreen("map")
            setIsPosting(false)
          }, 2000)
        }}
        onSave={(contentData) => {
          setSuccessMessage("Saved to library successfully!")
          setShowSuccessPopup(true)
          setTimeout(() => setShowSuccessPopup(false), 2000)
          setCurrentScreen("map")
        }}
      />
    )
  }

  if (currentScreen === "editor" && capturedMedia) {
    setCurrentScreen("platform-select")
    return null
  }

  if (currentScreen === "results" && currentResultPin) {
    return (
      <PinResults
        pin={currentResultPin}
        onSave={(pin: PinData) => {
          addPin(pin)
          setCurrentResultPin(null)
          setCurrentScreen("map")
          setQuickPinSuccess(true)
          setTimeout(() => setQuickPinSuccess(false), 2000)
        }}
        onShare={(pin: PinData) => {
          const mediaData = {
            url: pin.mediaUrl || "/pinit-placeholder.jpg",
            type: "photo" as const,
            location: pin.locationName,
            title: pin.title,
            description: pin.description,
          }
          setCapturedMedia(mediaData)
          setCurrentScreen("platform-select")
        }}
        onBack={() => {
          setCurrentResultPin(null)
          setCurrentScreen("map")
        }}
      />
    )
  }

  if (currentScreen === "library") {
    return (
      <PinLibrary
        pins={pins}
        onBack={() => setCurrentScreen("map")}
        onPinSelect={(pin: PinData) => {
          console.log("Pin selected:", pin)
        }}
        onPinUpdate={(pinId: string, updates: any) => {
          console.log("Pin updated:", pinId, updates)
        }}
      />
    )
  }

  if (currentScreen === "settings") {
    return <SettingsPage onBack={() => setCurrentScreen("map")} onComplete={() => setCurrentScreen("map")} />
  }

  if (currentScreen === "recommendations") {
    return (
      <AIRecommendationsHub
        onBack={() => setCurrentScreen("map")}
        userLocation={location}
        initialRecommendations={[
          // Include nearby pins with exact coordinates from Google Places
          ...nearbyPins.map((pin) => ({
            id: pin.id,
            title: pin.title,
            description: pin.description || `${pin.locationName} - AI Recommended`,
            category: pin.types?.[0] || pin.category || "general",
            location: {
              lat: pin.latitude, // EXACT coordinates from Google Places
              lng: pin.longitude, // EXACT coordinates from Google Places
            },
            rating: pin.rating || 4.0,
            isAISuggestion: true,
            confidence: 0.8 + Math.random() * 0.2,
            reason: `AI recommends this ${pin.types?.[0] || 'place'} based on your preferences`,
            timestamp: new Date(pin.timestamp),
          })),
          // Include user-generated recommendations
          ...recommendations.map((rec) => ({
            id: rec.id,
            title: rec.title,
            description: rec.description,
            category: rec.category,
            location: {
              lat: rec.data?.latitude || location?.latitude || -33.9,
              lng: rec.data?.longitude || location?.longitude || 18.4,
            },
            rating: 4.0 + Math.random() * 1.0,
            isAISuggestion: rec.isAISuggestion || false,
            confidence: 0.7 + Math.random() * 0.3,
            reason: rec.description,
            timestamp: new Date(rec.timestamp),
          }))
        ]}
      />
    )
  }

  // Main map screen
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
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
          <div
            style={{
              fontSize: "1.125rem",
              fontWeight: "600",
              color: "#10B981",
              marginBottom: "0.5rem",
            }}
          >
            {successMessage}
          </div>
        </div>
      )}

      {/* Settings Button */}
      <div
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          zIndex: 10,
        }}
      >
        <button
          onClick={() => setCurrentScreen("settings")}
          style={{
            padding: "0.5rem",
            border: "none",
            background: "transparent",
            color: "white",
            cursor: "pointer",
            borderRadius: "0.5rem",
            fontSize: "1.5rem",
          }}
        >
          ⚙️
        </button>
      </div>

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
          {/* Live Google Maps Background */}
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
                <span>Pinning...</span>
              </>
            ) : quickPinSuccess ? (
              <>
                <Check size={48} style={{ marginBottom: "0.5rem", color: "#10B981" }} />
                <span>Pinned!</span>
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

      {/* PINIT Branding */}
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
                          {APP_CONFIG.TAGLINE}
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
          📍 {locationName}
        </p>
      </div>

      {/* Bottom Navigation */}
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
            borderRadius: "0.5rem",
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
            borderRadius: "0.5rem",
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
            position: "relative",
            borderRadius: "0.5rem",
          }}
        >
          <Library size={28} />
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
            position: "relative",
            borderRadius: "0.5rem",
          }}
        >
          <Star size={28} />
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
} 
