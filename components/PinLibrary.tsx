"use client"

import React, { useState, useCallback, useEffect } from "react"
import { MapPin, Camera, Library, Settings, ArrowLeft, Edit3, Share2, Navigation, Calendar } from "lucide-react"
import PinLibrary from "@/components/PinLibrary"
import { usePinStorage } from "@/hooks/usePinStorage"
import { useLocationServices } from "@/hooks/useLocationServices"
import { useMotionDetection } from "@/hooks/useMotionDetection"
import ProactiveAI from "@/components/ProactiveAI"
import CameraCapture from "@/components/CameraCapture"
import PhotoEditor from "@/components/PhotoEditor"
import SocialShare from "@/components/SocialShare"
import RecommendationsHub from "@/components/RecommendationsHub"
import PinStoryBuilder from "@/components/PinStoryBuilder"
import SmartThemeSelector from "@/components/SmartThemeSelector"
import AudioRecorder from "@/components/AudioRecorder"
import AutoTitleGenerator from "@/components/AutoTitleGenerator"
import AIAssistant from "@/components/AIAssistant"
import PlaceNavigation from "@/components/PlaceNavigation"
import LocationDisplay from "@/components/LocationDisplay"
import GoogleMapsView from "@/components/GoogleMapsView"
import EnhancedLocationService from "@/components/EnhancedLocationService"
import PinManager from "@/components/PinManager"
import PinStoryMode from "@/components/PinStoryMode"
import StoryMode from "@/components/StoryMode"
import SocialPlatformSelector from "@/components/social-platform-selector"
import MobilePostcardEditor from "@/components/mobile-postcard-editor"
import EnhancedAudio from "@/components/enhanced-audio"
import ReliableCamera from "@/components/reliable-camera"
import SimpleCamera from "@/components/simple-camera"
import AdvancedEditor from "@/components/AdvancedEditor"

interface PinData {
  id: string
  title: string
  description?: string
  latitude: number
  longitude: number
  locationName: string
  timestamp: string
  tags?: string[]
  mediaUrl?: string | null
  mediaType?: 'photo' | 'video' | null
  isRecommended?: boolean
  types?: string[]
  isAISuggestion?: boolean

}

type Screen = "map" | "camera" | "library" | "editor" | "share" | "story" | "settings" | "recommendations" | "navigation" | "audio" | "advanced-editor"

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("map")
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [pins, setPins] = useState<PinData[]>([])
  const [capturedMedia, setCapturedMedia] = useState<{ url: string | null; type: 'photo' | 'video' | null }>({ url: null, type: null })
  const [selectedPlatform, setSelectedPlatform] = useState<string>("instagram")
  const [postcardData, setPostcardData] = useState<any>(null)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [motionData, setMotionData] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [navigationData, setNavigationData] = useState<any>(null)
  const [audioData, setAudioData] = useState<any>(null)
  const [advancedEditorData, setAdvancedEditorData] = useState<any>(null)

  const { loadPins, savePin } = usePinStorage()
  const { getCurrentLocation, getLocationName } = useLocationServices()
  const { startMotionDetection, stopMotionDetection } = useMotionDetection()

  // Helper to fetch Google Street View or fallback to static map
  async function getLocationImageUrl(lat: number, lng: number): Promise<string> {
    // Return placeholder image instead of Street View
    return '/placeholder.jpg'
  }

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const location = await getCurrentLocation()
        setCurrentLocation(location)
        
        const loadedPins = await loadPins()
        setPins(loadedPins)
        
        // Start motion detection for AI suggestions
        startMotionDetection((data) => {
          setMotionData(data)
          console.log("‍♂️ Motion Analysis:", data)
        })
        
        // Generate initial AI recommendations
        generateAIRecommendations(location)
      } catch (error) {
        console.error("Failed to initialize app:", error)
      }
    }
    
    initializeApp()
    
    return () => {
      stopMotionDetection()
    }
  }, [])

  const generateAIRecommendations = useCallback(async (location: { latitude: number; longitude: number }) => {
    try {
      const locationName = await getLocationName(location.latitude, location.longitude)
      const suggestions = [
        `Based on your location near ${locationName}, you might enjoy exploring the local cafes`,
        `I notice you're in a historic area - perfect for cultural discoveries!`,
        `Great spot for sunset photos! Consider capturing the golden hour`,
        `This area is known for its local cuisine - try the recommended restaurants`
      ]
      setAiSuggestions(suggestions)
      console.log("🤖 AI generated recommendations:", suggestions)
    } catch (error) {
      console.error("Failed to generate AI recommendations:", error)
    }
  }, [getLocationName])

  const handleQuickPin = useCallback(async () => {
    if (!currentLocation) return
    
    try {
      const locationName = await getLocationName(currentLocation.latitude, currentLocation.longitude)
      const imageUrl = await getLocationImageUrl(currentLocation.latitude, currentLocation.longitude)
      
      const newPin: PinData = {
        id: Date.now().toString(),
        title: `Quick Pin at ${locationName}`,
        description: `Quick pin created at ${new Date().toLocaleTimeString()}`,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        locationName,
        timestamp: new Date().toISOString(),
        mediaUrl: imageUrl,
        mediaType: "photo",
        tags: ["quick-pin", "ai-generated"],
      }
      
      setPins(prev => [...prev, newPin])
      await savePin(newPin)
      console.log("📍 Quick pin created:", newPin)
      
      // Generate new AI recommendations
      generateAIRecommendations(currentLocation)
    } catch (error) {
      console.error("Failed to create quick pin:", error)
    }
  }, [currentLocation, getLocationName, savePin, generateAIRecommendations])

  const handleCameraCapture = useCallback((media: { url: string; type: 'photo' | 'video' }) => {
    setCapturedMedia(media)
    setCurrentScreen("editor")
  }, [])

  const handleSavePin = useCallback(async (location: { latitude: number; longitude: number }) => {
    try {
      const locationName = await getLocationName(location.latitude, location.longitude)
      
      let mediaUrl = capturedMedia.url
      let mediaType = capturedMedia.type
      if (!mediaUrl) {
        mediaUrl = await getLocationImageUrl(location.latitude, location.longitude)
        mediaType = "photo"
      }
      
      const newPin: PinData = {
        id: Date.now().toString(),
        title: postcardData?.title || `Discovery at ${locationName}`,
        description: postcardData?.text || "",
        latitude: location.latitude,
        longitude: location.longitude,
        locationName,
        timestamp: new Date().toISOString(),
        mediaUrl,
        mediaType,
        tags: ["social-media", selectedPlatform],
      }
      
      setPins(prev => [...prev, newPin])
      await savePin(newPin)
      console.log("💾 Pin saved:", newPin)
      
      setCurrentScreen("map")
      setCapturedMedia({ url: null, type: null })
      setPostcardData(null)
    } catch (error) {
      console.error("Failed to save pin:", error)
    }
  }, [capturedMedia, postcardData, selectedPlatform, getLocationName, savePin])

  const handlePinUpdate = useCallback((pinId: string, updates: Partial<PinData>) => {
    setPins(prev => prev.map(pin => pin.id === pinId ? { ...pin, ...updates } : pin))
  }, [])

  const handlePinSelect = useCallback((pin: PinData) => {
    // Handle pin selection - could open details or start navigation
    console.log("Selected pin:", pin)
  }, [])

  const handleRecommendationSelect = useCallback((recommendation: any) => {
    setRecommendations(prev => [...prev, recommendation])
    setCurrentScreen("map")
  }, [])

  const handleNavigationStart = useCallback((destination: any) => {
    setNavigationData(destination)
    setCurrentScreen("navigation")
  }, [])

  const handleAudioRecord = useCallback((audio: any) => {
    setAudioData(audio)
    setCurrentScreen("map")
  }, [])

  const handleAdvancedEditorComplete = useCallback((data: any) => {
    setAdvancedEditorData(data)
    setCurrentScreen("map")
  }, [])

  // Screen rendering logic
  if (currentScreen === "camera") {
    return (
      <CameraCapture
        onCapture={handleCameraCapture}
        onBack={() => setCurrentScreen("map")}
        location={currentLocation}
      />
    )
  }

  if (currentScreen === "editor") {
    return (
      <PhotoEditor
        media={capturedMedia}
        onSave={handleSavePin}
        onBack={() => setCurrentScreen("camera")}
        location={currentLocation}
      />
    )
  }

  if (currentScreen === "share") {
    return (
      <SocialShare
        pin={pins[pins.length - 1]}
        onBack={() => setCurrentScreen("map")}
        platform={selectedPlatform}
      />
    )
  }

  if (currentScreen === "story") {
    return (
      <PinStoryBuilder
        pins={pins}
        onBack={() => setCurrentScreen("map")}
        onComplete={(story) => console.log("Story created:", story)}
      />
    )
  }

  if (currentScreen === "recommendations") {
    return (
      <RecommendationsHub
        recommendations={recommendations}
        onSelect={handleRecommendationSelect}
        onBack={() => setCurrentScreen("map")}
      />
    )
  }

  if (currentScreen === "navigation") {
    return (
      <PlaceNavigation
        destination={navigationData}
        onBack={() => setCurrentScreen("map")}
        onArrive={() => console.log("Arrived at destination")}
      />
    )
  }

  if (currentScreen === "audio") {
    return (
      <AudioRecorder
        onRecord={handleAudioRecord}
        onBack={() => setCurrentScreen("map")}
        location={currentLocation}
      />
    )
  }

  if (currentScreen === "advanced-editor") {
    return (
      <AdvancedEditor
        onComplete={handleAdvancedEditorComplete}
        onBack={() => setCurrentScreen("map")}
        data={advancedEditorData}
      />
    )
  }

  if (currentScreen === "library") {
    return (
      <PinLibrary
        pins={pins}
        onBack={() => setCurrentScreen("map")}
        onPinSelect={handlePinSelect}
        onPinUpdate={handlePinUpdate}
      />
    )
  }

  // Main map screen
  return (
    <div className="pinit-full-bg" style={{ display: "flex", flexDirection: "column", color: "white", padding: "2rem" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <MapPin size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">PINIT</h1>
            <p className="text-white/70 text-sm">Shazam for Travel</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentScreen("settings")}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* AI Suggestions */}
      <ProactiveAI
        suggestions={aiSuggestions}
        motionData={motionData}
        onSuggestionClick={(suggestion) => console.log("AI suggestion clicked:", suggestion)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        {/* Map View */}
        <div className="w-full h-64 bg-white/10 rounded-2xl mb-6 relative overflow-hidden">
          <GoogleMapsView
            location={currentLocation}
            pins={pins}
            onPinClick={handlePinSelect}
          />
        </div>

        {/* Location Display */}
        {currentLocation && (
          <LocationDisplay
            latitude={currentLocation.latitude}
            longitude={currentLocation.longitude}
            onNavigate={() => setCurrentScreen("navigation")}
          />
        )}

        {/* Main Action Button */}
        <div className="relative">
          <button
            onClick={handleQuickPin}
            className="w-24 h-24 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110"
            style={{
              boxShadow: "0 0 30px rgba(239, 68, 68, 0.5)"
            }}
          >
            <MapPin size={32} />
          </button>
          
          {/* Pulsating effect */}
          <div
            className="absolute inset-0 w-24 h-24 bg-red-500 rounded-full animate-pulse"
            style={{
              animation: "shazamPulse 2s infinite"
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={() => setCurrentScreen("camera")}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
          >
            <Camera size={20} />
            Capture
          </button>
          
          <button
            onClick={() => setCurrentScreen("audio")}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
          >
            <Calendar size={20} />
            Voice Note
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="flex justify-around items-center mt-6">
        <button
          onClick={() => setCurrentScreen("library")}
          className="flex flex-col items-center gap-1 p-3 hover:bg-white/10 rounded-lg transition-colors"
        >
          <Library size={24} />
          <span className="text-xs">Library</span>
        </button>
        
        <button
          onClick={() => setCurrentScreen("story")}
          className="flex flex-col items-center gap-1 p-3 hover:bg-white/10 rounded-lg transition-colors"
        >
          <Edit3 size={24} />
          <span className="text-xs">Story</span>
        </button>
        
        <button
          onClick={() => setCurrentScreen("recommendations")}
          className="flex flex-col items-center gap-1 p-3 hover:bg-white/10 rounded-lg transition-colors"
        >
          <Navigation size={24} />
          <span className="text-xs">Discover</span>
        </button>
      </div>
    </div>
  )
}
