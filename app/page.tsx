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
import { RecommendationsHub } from "@/components/RecommendationsHub"
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
      
      // Start watching location continuously
      watchId = watchLocation({
        enableHighAccuracy: false, // Try low accuracy first
        timeout: 15000, // Increase timeout
        maximumAge: 60000, // 1 minute - less frequent updates for smoother experience
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

  // Get real location name from Google Places API
  const getRealLocationName = async (lat: number, lng: number): Promise<string> => {
    try {
      console.log("📍 Fetching real location name...")
      
      // Use our API route instead of calling Google Maps directly
      const response = await fetch(`/api/places?lat=${lat}&lng=${lng}&radius=2000`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch location data")
      }

      const data = await response.json()

      if (data.results && data.results.length > 0) {
        // Get the closest place (first result)
        const closestPlace = data.results[0]
        const placeName = closestPlace.name
        const vicinity = closestPlace.vicinity || ""
        
        // Combine place name with vicinity for better context
        if (vicinity && !placeName.includes(vicinity)) {
          return `${placeName}, ${vicinity}`
        }
        
        return placeName
      }

      // If no places found, return a descriptive location name instead of coordinates
      console.log("📍 No places found, returning descriptive location name...")
      
      // Return a descriptive location name based on coordinates
      if (lat > -34 && lat < -33 && lng > 18 && lng < 19) {
        return "Riebeek West Area"
      } else if (lat > -34 && lat < -33) {
        return "Western Cape Region"
      } else if (lng > 18 && lng < 19) {
        return "Cape Town Area"
      } else {
        return "South Africa"
      }
    } catch (error) {
      console.error("❌ Error fetching location name:", error)
      // Return a descriptive location name instead of coordinates
      if (lat > -34 && lat < -33 && lng > 18 && lng < 19) {
        return "Riebeek West Area"
      } else if (lat > -34 && lat < -33) {
        return "Western Cape Region"
      } else if (lng > 18 && lng < 19) {
        return "Cape Town Area"
      } else {
        return "South Africa"
      }
    }
  }

  // Google Places API Integration
  const fetchNearbyPlaces = useCallback(async (lat: number, lng: number): Promise<PinData[]> => {
    try {
      setIsLoadingPlaces(true)
      console.log("🌐 Fetching real places from Google Places API...")

      // Google Places Nearby Search API
      const radius = 1000 // 1km radius
      const types = [
        "tourist_attraction",
        "restaurant",
        "cafe",
        "museum",
        "park",
        "shopping_mall",
        "art_gallery",
        "amusement_park",
        "zoo",
        "aquarium",
      ]

      const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${types.join(
        "|",
      )}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`

      // Note: In production, this should be called from a server-side API route
      // to avoid exposing the API key. For demo purposes, we'll use a proxy or mock data
      const response = await fetch(`/api/places?lat=${lat}&lng=${lng}&radius=${radius}`)

      if (!response.ok) {
        throw new Error("Failed to fetch places")
      }

      const data = await response.json()
      const places: GooglePlace[] = data.results || []

      console.log(`📍 Found ${places.length} real places nearby!`)

      // Transform Google Places to PinData format
      const transformedPins: PinData[] = places.slice(0, 6).map((place) => {
        // Generate appropriate emoji based on place type
        const getPlaceEmoji = (types: string[]): string => {
          if (types.includes("restaurant")) return "🍽️"
          if (types.includes("cafe")) return "☕"
          if (types.includes("tourist_attraction")) return "🏛️"
          if (types.includes("museum")) return "🏛️"
          if (types.includes("park")) return "🌳"
          if (types.includes("shopping_mall")) return "🛍️"
          if (types.includes("art_gallery")) return "🎨"
          if (types.includes("amusement_park")) return "🎢"
          if (types.includes("zoo")) return "🦁"
          if (types.includes("aquarium")) return "🐠"
          return "📍"
        }

        // Generate description based on rating and types
        const generateDescription = (place: GooglePlace): string => {
          const placeType = place.types[0]?.replace(/_/g, ' ') || 'amazing place'
          
          const descriptions = [
            `Scenic ${placeType} with breathtaking views. Perfect for sunset photos and worth stopping to explore this hidden gem.`,
            `Beautiful ${placeType} that's perfect for photos. Great spot to capture memories and enjoy the atmosphere.`,
            `Amazing ${placeType} with stunning surroundings. Ideal for a quick stop and definitely worth the visit.`,
            `Hidden ${placeType} gem with incredible charm. Perfect spot for photos and a memorable experience.`,
            `Stunning ${placeType} with spectacular views. Great for capturing moments and exploring the area.`,
          ]
          return descriptions[Math.floor(Math.random() * descriptions.length)]
        }

        // Generate photo URL if available
        const getPhotoUrl = (place: GooglePlace): string | null => {
          if (place.photos && place.photos.length > 0) {
            const photoRef = place.photos[0].photo_reference
            return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoRef}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
          }
          return `/placeholder.svg?height=200&width=200&text=${encodeURIComponent(place.name)}`
        }

        return {
          id: `google-${place.place_id}`,
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          locationName: place.vicinity || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          mediaUrl: getPhotoUrl(place),
          mediaType: "photo" as const,
          audioUrl: null,
          timestamp: new Date().toISOString(),
          title: `${getPlaceEmoji(place.types)} ${place.name}`,
          description: generateDescription(place),
          tags: ["google-places", "recommended", ...place.types.slice(0, 3).map((type) => type.replace(/_/g, "-"))],
          isRecommended: true,
          googlePlaceId: place.place_id,
          rating: place.rating,
          priceLevel: place.price_level,
          types: place.types,
        }
      })

      console.log("✅ Transformed places:", transformedPins)
      return transformedPins
    } catch (error) {
      console.error("❌ Failed to fetch Google Places:", error)

      // Fallback to enhanced mock data if API fails
      return [
        {
          id: "fallback-1",
          latitude: lat + 0.001,
          longitude: lng + 0.001,
          locationName: "Nearby Area",
          mediaUrl: "/placeholder.svg?height=200&width=200&text=Coffee%20Shop",
          mediaType: "photo",
          audioUrl: null,
          timestamp: new Date().toISOString(),
          title: "☕ Local Coffee Spot",
          description: "Popular local cafe with great reviews",
          tags: ["fallback", "coffee", "recommended"],
          isRecommended: true,
          rating: 4.5,
        },
        {
          id: "fallback-2",
          latitude: lat - 0.002,
          longitude: lng + 0.001,
          locationName: "Scenic Area",
          mediaUrl: "/placeholder.svg?height=200&width=200&text=Viewpoint",
          mediaType: "photo",
          audioUrl: null,
          timestamp: new Date().toISOString(),
          title: "🏔️ Beautiful Viewpoint",
          description: "Perfect spot for photos and relaxation",
          tags: ["fallback", "nature", "views", "recommended"],
          isRecommended: true,
          rating: 4.8,
        },
      ]
    } finally {
      setIsLoadingPlaces(false)
    }
  }, [])

  // Quick Pin Function (Shazam-like) - ENHANCED WITH SPEED-BASED LOCATION ADJUSTMENT
  const handleQuickPin = useCallback(async () => {
    if (isQuickPinning) return

    setIsQuickPinning(true)
    setLastActivity("quick-pin")

    try {
      const currentLocation = await getCurrentLocation()

      // 🚗 SPEED-BASED LOCATION ADJUSTMENT
      let adjustedLatitude = currentLocation.latitude
      let adjustedLongitude = currentLocation.longitude

      // If user is moving, adjust the pin location backwards
      if (motionData.isMoving && motionData.speed > 5) { // Only adjust if moving faster than 5 km/h
        console.log("🚗 User is moving at", motionData.speed.toFixed(1), "km/h - adjusting pin location...")
        
        // Estimate time passed since user noticed the spot (5-10 seconds)
        const timePassedSeconds = 7 // Average reaction time + app opening time
        const timePassedHours = timePassedSeconds / 3600
        
        // Calculate distance traveled backwards
        const distanceTraveledKm = motionData.speed * timePassedHours
        
        // Convert distance to coordinate changes (approximate)
        // 1 degree latitude ≈ 111 km
        // 1 degree longitude ≈ 111 km * cos(latitude)
        const latChange = distanceTraveledKm / 111
        const lngChange = distanceTraveledKm / (111 * Math.cos(currentLocation.latitude * Math.PI / 180))
        
        // Adjust coordinates backwards (opposite to travel direction)
        // For simplicity, we'll adjust based on the last known direction
        if (motionData.lastPosition) {
          const latDiff = currentLocation.latitude - motionData.lastPosition.latitude
          const lngDiff = currentLocation.longitude - motionData.lastPosition.longitude
          
          // Calculate direction and apply adjustment
          const direction = Math.atan2(lngDiff, latDiff)
          adjustedLatitude = currentLocation.latitude - (latChange * Math.cos(direction))
          adjustedLongitude = currentLocation.longitude - (lngChange * Math.sin(direction))
          
          console.log("📍 Adjusted pin location:", {
            original: `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`,
            adjusted: `${adjustedLatitude.toFixed(6)}, ${adjustedLongitude.toFixed(6)}`,
            distanceBack: (distanceTraveledKm * 1000).toFixed(0) + "m",
            speed: motionData.speed.toFixed(1) + " km/h"
          })
        }
      } else {
        console.log("🚶 User is stationary or moving slowly - using current location")
      }

      // Get real location name from the ADJUSTED location
      const realLocationName = await getRealLocationName(adjustedLatitude, adjustedLongitude)

      // Generate AI location name (simplified for demo)
      const locationNames = [
        "Beautiful Scenic Spot",
        "Hidden Gem Location",
        "Amazing Discovery",
        "Perfect Photo Spot",
        "Memorable Place",
        "Stunning Viewpoint",
      ]
      const aiLocationName = locationNames[Math.floor(Math.random() * locationNames.length)]

      // Fetch location photo for the ADJUSTED location
      const locationPhoto = await fetchLocationPhoto(adjustedLatitude, adjustedLongitude)

      const newPin: PinData = {
        id: Date.now().toString(),
        latitude: adjustedLatitude,  // Use adjusted coordinates
        longitude: adjustedLongitude, // Use adjusted coordinates
        locationName: realLocationName,
        mediaUrl: locationPhoto,
        mediaType: locationPhoto ? "photo" : null,
        audioUrl: null,
        timestamp: new Date().toISOString(),
        title: `📍 ${aiLocationName}`,
        description: `Amazing discovery! Perfect spot for photos and memories. Worth stopping to explore this hidden gem.`,
        tags: ["quick-pin", "ai-generated", motionData.isMoving ? "speed-adjusted" : "stationary"],
      }

      // Set the pin for results page instead of immediately adding to library
      setCurrentResultPin(newPin)
      setCurrentScreen("results")

      console.log("📍 Quick pin created with speed adjustment:", newPin)
    } catch (error) {
      console.error("❌ Failed to create quick pin:", error)
    } finally {
      setIsQuickPinning(false)
    }
  }, [getCurrentLocation, getRealLocationName, isQuickPinning, setCurrentResultPin, setCurrentScreen, motionData])

  const handleCameraCapture = useCallback(
    async (mediaUrl: string, type: "photo" | "video") => {
      if (!location) return

      // Get real location name
      const realLocationName = await getRealLocationName(location.latitude, location.longitude)

      setCapturedMedia({
        url: mediaUrl,
        type,
        location: realLocationName,
      })

      setLastActivity(`camera-${type}`)
      // Go to editor first
      setCurrentScreen("editor")
    },
    [location, getRealLocationName],
  )

  const handlePlatformSelect = useCallback((platform: string) => {
    setSelectedPlatform(platform)
    // Go to content editor for stickers and text
    setCurrentScreen("content-editor")
  }, [])

  const handleSavePin = useCallback(
    async (postcardData?: any) => {
      if (!capturedMedia || !location) return

      // Fetch location photo for the pin
      const locationPhoto = await fetchLocationPhoto(location.latitude, location.longitude)

      const newPin: PinData = {
        id: Date.now().toString(),
        latitude: location.latitude,
        longitude: location.longitude,
        locationName: capturedMedia.location,
        mediaUrl: capturedMedia.url, // Keep the captured media as primary
        mediaType: capturedMedia.type,
        audioUrl: null,
        timestamp: new Date().toISOString(),
        title: `${capturedMedia.type === "photo" ? "📸" : "🎥"} ${selectedPlatform} Post`,
        description: postcardData?.text || "",
        tags: ["social-media", selectedPlatform],
        // Store location photo as additional metadata for future use
        googlePlaceId: locationPhoto ? "location-photo" : undefined,
      }

      addPin(newPin)
      console.log("💾 Pin saved:", newPin)

      setLastActivity("pin-saved")
      // Reset state and go back to map
      setCapturedMedia(null)
      setSelectedPlatform("")
      setCurrentScreen("map")
    },
    [capturedMedia, location, selectedPlatform, addPin],
  )



  // Handle proactive AI suggestions
  const handleProactiveSuggestion = useCallback(
    (action: string, data?: any) => {
      console.log("🤖 Proactive AI suggestion:", action, data)

      switch (action) {
        case "quick-pin":
          handleQuickPin()
          break
        case "open-camera":
          setCameraMode(data?.mode || "photo")
          setCurrentScreen("camera")
          break
        case "create-story":
          setCurrentScreen("story-builder")
          break
        case "discovery-mode":
          setDiscoveryMode(true)
          findNearbyPins()
          break
        case "suggest-pin":
          // Show recommendations instead of AI assistant
          setCurrentScreen("recommendations")
          break
        default:
          console.log("Unknown proactive suggestion:", action)
      }

      setLastActivity(`proactive-${action}`)
    },
    [handleQuickPin],
  )

  // Handle AI recommendations - ADD TO RECOMMENDATIONS LIST
  const handleAIRecommendations = useCallback((newRecommendations: Recommendation[]) => {
    console.log("🤖 AI generated recommendations:", newRecommendations)
    setRecommendations((prev) => {
      // Avoid duplicates by checking IDs
      const existingIds = new Set(prev.map((r) => r.id))
      const uniqueRecommendations = newRecommendations.filter((r) => !existingIds.has(r.id))
      return [...prev, ...uniqueRecommendations]
    })
  }, [])

  // Handle notification tap - GO TO RECOMMENDATIONS PAGE
  const handleNotificationTap = useCallback(() => {
    console.log("🤖 Opening recommendations hub")
    setCurrentScreen("recommendations")
  }, [])

  // Handle recommendation actions
  const handleRecommendationAction = useCallback(
    (action: string, data?: any) => {
      console.log("🎯 Taking recommendation action:", action, data)
      handleProactiveSuggestion(action, data)
      // Go back to map after action
      setCurrentScreen("map")
    },
    [handleProactiveSuggestion],
  )

  // Handle recommendation dismiss
  const handleRecommendationDismiss = useCallback((id: string) => {
    setRecommendations((prev) => prev.filter((r) => r.id !== id))
  }, [])

  // Handle recommendation complete
  const handleRecommendationComplete = useCallback((id: string) => {
    setRecommendations((prev) => prev.map((r) => (r.id === id ? { ...r, isCompleted: true } : r)))
  }, [])

  const handleRecommendPin = useCallback(
    (pinId: string, isRecommended: boolean) => {
      const updatedPins = pins.map((pin) =>
        pin.id === pinId
          ? { ...pin, isRecommended, tags: [...(pin.tags || []), ...(isRecommended ? ["recommended"] : [])] }
          : pin,
      )
      // Update pins in storage
      localStorage.setItem("pinit-pins", JSON.stringify(updatedPins))
    },
    [pins],
  )

  const generateShareableLink = useCallback((pin: PinData) => {
    const baseUrl = window.location.origin
    const pinData = encodeURIComponent(
      JSON.stringify({
        id: pin.id,
        title: pin.title,
        lat: pin.latitude,
        lng: pin.longitude,
        locationName: pin.locationName,
      }),
    )
    return `${baseUrl}/shared-pin?data=${pinData}`
  }, [])

  // ENHANCED: Real Google Places Integration
  const findNearbyPins = useCallback(async () => {
    if (!location) return

    console.log("🌐 Discovering real nearby places...")
    const realPlaces = await fetchNearbyPlaces(location.latitude, location.longitude)
    setNearbyPins(realPlaces)
    setShowNearbyPins(true)
    setLastActivity("discovery")
  }, [location, fetchNearbyPlaces])

  // NEW: Fetch location photo for pins
  const fetchLocationPhoto = async (lat: number, lng: number): Promise<string | null> => {
    try {
      console.log("📸 Fetching location photo...")
      
      // Use our API route instead of calling Google Maps directly
      const response = await fetch(`/api/places?lat=${lat}&lng=${lng}&radius=1000`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch location data")
      }

      const data = await response.json()

      if (data.results && data.results.length > 0) {
        // Find the first place with photos
        const placeWithPhoto = data.results.find((place: any) => place.photos && place.photos.length > 0)
        
        if (placeWithPhoto && placeWithPhoto.photos && placeWithPhoto.photos.length > 0) {
          const photoRef = placeWithPhoto.photos[0].photo_reference
          const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoRef}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
          
          console.log("✅ Location photo found:", photoUrl)
          return photoUrl
        }
      }
      
      console.log("📸 No location photo found, will use PINIT placeholder")
      return "/placeholder.jpg"
    } catch (error) {
      console.error("❌ Error fetching location photo:", error)
      return "/placeholder.jpg"
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
    return (
      <RecommendationsHub
        onBack={() => setCurrentScreen("map")}
        pins={pins}
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

        {/* Discovery Mode Toggle */}
        <button
          onClick={() => {
            setDiscoveryMode(!discoveryMode)
            if (!discoveryMode) {
              findNearbyPins()
            } else {
              setShowNearbyPins(false)
            }
          }}
          style={{
            padding: "0.5rem",
            border: "none",
            background: "transparent",
            color: discoveryMode ? "#6B7280" : "white",
            cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            transition: "color 0.2s ease",
              }}
            >
          🌐
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
            border: "4px solid rgba(255,255,255,0.9)",
            background: "transparent",
            cursor: isQuickPinning ? "not-allowed" : "pointer",
            transition: "all 0.3s ease",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
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
              e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.3)"
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

      {/* Bottom Navigation - Photo/Video/Library/Recommendations */}
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
