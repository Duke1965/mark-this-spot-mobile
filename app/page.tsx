"use client"

import { useState, useCallback, useEffect } from "react"
import { Camera, Video, Library, Sparkles, MapPin, Check } from "lucide-react"
import { useLocationServices } from "@/hooks/useLocationServices"
import { usePinStorage } from "@/hooks/usePinStorage"
import { useMotionDetection } from "@/hooks/useMotionDetection"
import { ReliableCamera } from "@/components/reliable-camera"
import { SocialPlatformSelector } from "@/components/social-platform-selector"
import { MobilePostcardEditor } from "@/components/mobile-postcard-editor"
import { PinStoryMode } from "@/components/PinStoryMode"
import { AIAssistant } from "@/components/AIAssistant"
import { ProactiveAI } from "@/components/ProactiveAI"
import { EnhancedLocationService } from "@/components/EnhancedLocationService"
import { PinStoryBuilder } from "@/components/PinStoryBuilder"
import { RecommendationsHub } from "@/components/RecommendationsHub"
import { PlaceNavigation } from "@/components/PlaceNavigation"
import PinLibrary from "@/components/PinLibrary"

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
  // Core state
  const [currentScreen, setCurrentScreen] = useState<
    | "map"
    | "camera"
    | "platform-select"
    | "editor"
    | "story"
    | "library"
    | "story-builder"
    | "recommendations"
    | "place-navigation"
  >("map")
  const [cameraMode, setCameraMode] = useState<"photo" | "video">("photo")
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [isQuickPinning, setIsQuickPinning] = useState(false)
  const [quickPinSuccess, setQuickPinSuccess] = useState(false)
  const [locationName, setLocationName] = useState<string>("Getting location...")

  const [showRecommendToggle, setShowRecommendToggle] = useState(false)
  const [showNearbyPins, setShowNearbyPins] = useState(false)
  const [discoveryMode, setDiscoveryMode] = useState(false)
  const [nearbyPins, setNearbyPins] = useState<PinData[]>([])
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false)
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
  const { location, getCurrentLocation, isLoading: locationLoading } = useLocationServices()
  const { pins, addPin } = usePinStorage()
  const motionData = useMotionDetection()

  const [selectedPlace, setSelectedPlace] = useState<any>(null)
  const [savedForLaterPlaces, setSavedForLaterPlaces] = useState<any[]>([])

  // Add location name resolution
  const getLocationName = useCallback(async (lat: number, lng: number): Promise<string> => {
    try {
      // Using a simple reverse geocoding approach
      // In production, you'd use Google Maps API or similar
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      )
      const data = await response.json()

      if (data.city && data.countryName) {
        return `${data.city}, ${data.countryName}`
      } else if (data.locality && data.countryName) {
        return `${data.locality}, ${data.countryName}`
      } else if (data.countryName) {
        return data.countryName
      }

      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    } catch (error) {
      console.error("Failed to get location name:", error)
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    }
  }, [])

  // Get current location on mount and resolve name
  useEffect(() => {
    getCurrentLocation().then(async (loc) => {
      if (loc) {
        const name = await getLocationName(loc.latitude, loc.longitude)
        setLocationName(name)
      }
    })
  }, [getCurrentLocation, getLocationName])

  // Add this useEffect right after the existing useEffect for location name
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        })
      },
      (err) => {
        console.error("Failed to get location:", err)
      },
    )
  }, [])

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
          const rating = place.rating ? `${place.rating}⭐` : ""
          const priceLevel = place.price_level ? "💰".repeat(place.price_level) : ""
          const type = place.types[0]?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) || "Place"

          return `${type} ${rating} ${priceLevel}`.trim()
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

  // Helper to fetch Google Street View or fallback to static map
  async function getLocationImageUrl(lat: number, lng: number): Promise<string> {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
    
    // Try Street View first - use a more reliable URL format
    const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=400x400&location=${lat},${lng}&fov=80&heading=70&pitch=0&key=${apiKey}`
    
    // For now, return the Street View URL - the component will handle fallback if it fails
    return streetViewUrl
  }

  // Quick Pin Function (Shazam-like)
  const handleQuickPin = useCallback(async () => {
    if (isQuickPinning) return

    setIsQuickPinning(true)
    setLastActivity("quick-pin")

    try {
      const currentLocation = await getCurrentLocation()

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

      // Fetch Street View image for the pin
      const imageUrl = await getLocationImageUrl(currentLocation.latitude, currentLocation.longitude)

      const newPin: PinData = {
        id: Date.now().toString(),
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        locationName: `${aiLocationName} (${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)})`,
        mediaUrl: imageUrl,
        mediaType: "photo",
        audioUrl: null,
        timestamp: new Date().toISOString(),
        title: `📍 ${aiLocationName}`,
        description: `Quick pin created at ${new Date().toLocaleTimeString()}`,
        tags: ["quick-pin", "ai-generated"],
      }

      addPin(newPin)

      // Show success feedback
      setQuickPinSuccess(true)

      // Auto-hide success after 2 seconds
      setTimeout(() => {
        setQuickPinSuccess(false)
      }, 2000)

      console.log("📍 Quick pin created:", newPin)
    } catch (error) {
      console.error("❌ Failed to create quick pin:", error)
    } finally {
      setIsQuickPinning(false)
    }
  }, [getCurrentLocation, addPin, isQuickPinning])

  const handleCameraCapture = useCallback(
    (mediaUrl: string, type: "photo" | "video") => {
      if (!location) return

      const locationName = `Location ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`

      setCapturedMedia({
        url: mediaUrl,
        type,
        location: locationName,
      })

      setLastActivity(`camera-${type}`)
      // Go to platform selection
      setCurrentScreen("platform-select")
    },
    [location],
  )

  const handlePlatformSelect = useCallback((platform: string) => {
    setSelectedPlatform(platform)
    setCurrentScreen("editor")
  }, [])

  const handleSavePin = useCallback(
    async (postcardData?: any) => {
      if (!capturedMedia || !location) return

      let mediaUrl = capturedMedia.url
      let mediaType = capturedMedia.type

      // If no photo/video, fetch Street View image
      if (!mediaUrl) {
        mediaUrl = await getLocationImageUrl(location.latitude, location.longitude)
        mediaType = "photo"
      }

      const newPin: PinData = {
        id: Date.now().toString(),
        latitude: location.latitude,
        longitude: location.longitude,
        locationName: capturedMedia.location,
        mediaUrl,
        mediaType,
        audioUrl: null,
        timestamp: new Date().toISOString(),
        title: `${mediaType === "photo" ? "📸" : "🎥"} ${selectedPlatform} Post`,
        description: postcardData?.text || "",
        tags: ["social-media", selectedPlatform],
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

  const handleAICommand = useCallback(
    (command: string) => {
      const lowerCommand = command.toLowerCase()

      if (lowerCommand.includes("pin") || lowerCommand.includes("mark")) {
        handleQuickPin()
      } else if (lowerCommand.includes("photo")) {
        setCameraMode("photo")
        setCurrentScreen("camera")
      } else if (lowerCommand.includes("video")) {
        setCameraMode("video")
        setCurrentScreen("camera")
      } else if (lowerCommand.includes("story")) {
        setCurrentScreen("story")
      } else if (lowerCommand.includes("library")) {
        setCurrentScreen("library")
      }

      setShowAIAssistant(false)
      setLastActivity("ai-command")
    },
    [handleQuickPin],
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
          // Show AI assistant with pin suggestion
          setShowAIAssistant(true)
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

  // Handle place navigation from recommendations
  const handlePlaceNavigation = useCallback((place: any) => {
    console.log("🗺️ Opening place navigation for:", place.title)
    setSelectedPlace(place)
    setCurrentScreen("place-navigation")
  }, [])

  // Handle save for later
  const handleSaveForLater = useCallback((place: any) => {
    console.log("🔖 Saving place for later:", place.title)
    setSavedForLaterPlaces((prev) => [...prev, { ...place, savedAt: Date.now() }])
    setCurrentScreen("recommendations")
  }, [])

  // Handle navigation start
  const handleStartNavigation = useCallback((place: any) => {
    console.log("🧭 Starting navigation to:", place.title)
    // Navigation is handled within the PlaceNavigation component
  }, [])

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

  if (currentScreen === "editor" && capturedMedia && selectedPlatform) {
    return (
      <MobilePostcardEditor
        mediaUrl={capturedMedia.url}
        mediaType={capturedMedia.type}
        platform={selectedPlatform}
        dimensions={getPlatformDimensions(selectedPlatform)}
        locationName={capturedMedia.location}
        onSave={handleSavePin}
        onClose={() => setCurrentScreen("map")}
        locationDetails={locationDetails}
        currentTheme={currentTheme}
      />
    )
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
        recommendations={recommendations}
        onBack={() => setCurrentScreen("map")}
        onActionTaken={handleRecommendationAction}
        onRecommendationDismiss={handleRecommendationDismiss}
        onRecommendationComplete={handleRecommendationComplete}
        onPlaceNavigation={handlePlaceNavigation}
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

  if (currentScreen === "library") {
    return (
      <PinLibrary
        pins={pins}
        onBack={() => setCurrentScreen("map")}
        onPinSelect={() => {}}
        onPinUpdate={() => {}}
      />
    )
  }

  // Main map screen (Shazam-like interface) - ENHANCED WITH SUBTLE NOTIFICATIONS
  return (
    <div
      className="pinit-full-bg"
      style={{
        display: "flex",
        flexDirection: "column",
        color: "white",
        padding: "2rem",
      }}
    >
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

      {/* AI Assistant Button - Top Right */}
      <div
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          zIndex: 10,
        }}
      >
        <button
          onClick={() => setShowAIAssistant(true)}
          style={{
            padding: "0.75rem",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
            borderRadius: "12px",
            backdropFilter: "blur(10px)",
          }}
        >
          <Sparkles size={24} />
        </button>
      </div>

      {/* Enhanced Location Service - Hidden but working */}
      {location && (
        <EnhancedLocationService
          latitude={location.latitude}
          longitude={location.longitude}
          onLocationEnhanced={setLocationDetails}
        />
      )}

      {/* Discovery Mode Toggle - Next to AI Assistant */}
      <div
        style={{
          position: "absolute",
          top: "1rem",
          right: "5rem",
          zIndex: 10,
        }}
      >
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
            padding: "0.75rem",
            border: "none",
            background: discoveryMode ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
            borderRadius: "12px",
            backdropFilter: "blur(10px)",
            border: discoveryMode ? "2px solid #10B981" : "none",
          }}
        >
          🌐
        </button>
      </div>

      {/* NEW: Recommendations Button - Next to Discovery */}
      <div
        style={{
          position: "absolute",
          top: "1rem",
          right: "9rem",
          zIndex: 10,
        }}
      >
        <button
          onClick={() => setCurrentScreen("recommendations")}
          style={{
            padding: "0.75rem",
            border: "none",
            background:
              recommendations.filter((r) => !r.isCompleted).length > 0
                ? "rgba(30,58,138,0.8)"
                : "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
            borderRadius: "12px",
            backdropFilter: "blur(10px)",
            position: "relative",
          }}
        >
          🤖{/* Notification Badge */}
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

      {/* Motion Status Indicator (Debug) */}
      {motionData.isMoving && (
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
      )}

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
            background: "radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.3) 50%, transparent 70%)",
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
              "radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 50%, transparent 70%)",
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
              "radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.15) 50%, transparent 70%)",
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
          {/* LIVE GOOGLE MAPS BACKGROUND - CLEAN VERSION */}
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
            margin: "0.5rem 0 0 0",
            opacity: 0.9,
            fontSize: "1rem",
            color: "white",
            textShadow: "0 2px 4px rgba(0,0,0,0.3)",
          }}
        >
          📍 {locationName}
        </p>
        <p
          style={{
            margin: "0.25rem 0 0 0",
            fontSize: "0.875rem",
            opacity: 0.7,
            color: "white",
            textShadow: "0 1px 2px rgba(0,0,0,0.5)",
          }}
        >
          {pins.length} pins created
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

      {/* Bottom Navigation - Photo/Video/Library */}
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
          onClick={() => setCurrentScreen("library")}
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
          <Library size={28} />
        </button>
      </div>

      {/* AI Assistant Modal */}
      {showAIAssistant && <AIAssistant onCommand={handleAICommand} onClose={() => setShowAIAssistant(false)} />}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes shazamPulse {
          0% { 
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0.8;
          }
          50% { 
            transform: translate(-50%, -50%) scale(1.3);
            opacity: 0.5;
          }
          100% { 
            transform: translate(-50%, -50%) scale(1.6);
            opacity: 0;
          }
        }

        @keyframes mapShimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
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
    "twitter-post": { width: 1200, height: 675 },
    "linkedin-post": { width: 1200, height: 627 },
    tiktok: { width: 1080, height: 1920 },
    snapchat: { width: 1080, height: 1920 },
    whatsapp: { width: 1080, height: 1080 },
  }

  return dimensions[platform as keyof typeof dimensions] || { width: 1080, height: 1080 }
}
