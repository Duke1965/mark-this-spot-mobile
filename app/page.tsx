"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Camera, Video, Library, Star, MapPin, Check, X, Settings, RefreshCw } from "lucide-react"
import dynamic from "next/dynamic"
import { useLocationServices } from "@/hooks/useLocationServices"
import { useMotionDetection } from "@/hooks/useMotionDetection"
import { usePinStorage } from "@/hooks/usePinStorage"
import { usePinManagement } from "@/hooks/usePinManagement"
import { useAuth } from "@/hooks/useAuth"
import { useAIBehaviorTracker } from "@/hooks/useAIBehaviorTracker"
import { usePinLifecycle } from "@/lib/pinLifecycle"
import { useDataHealing } from "@/lib/dataHealing"
import { useDataSync } from "@/lib/dataSync"
import { useNightlyMaintenance } from "@/lib/nightlyMaintenance"
import { useTrending } from "@/lib/trending"
import { useScoringEngine } from "@/lib/scoringEngine"
import { useMapLifecycle } from "@/lib/mapLifecycle"
import { usePinMigration } from "@/lib/pinMigration"
import { useReverseGeocode } from "@/lib/reverseGeocode"
import { useValidation } from "@/lib/validation"
import { useLogger } from "@/lib/logger"
import { useFirebase } from "@/lib/firebase"
import { useTypes } from "@/lib/types"
import { useUtils } from "@/lib/utils"
import { useSystemHealthCheck } from "@/components/SystemHealthCheck"
import { useErrorBoundary } from "@/components/ErrorBoundary"
import { useContentEditor } from "@/components/ContentEditor"
import { useEnhancedLocationService } from "@/components/EnhancedLocationService"
import { useMapTabs } from "@/components/MapTabs"
import { usePinLibrary } from "@/components/PinLibrary"
import { usePinResults } from "@/components/PinResults"
import { usePinStoryBuilder } from "@/components/PinStoryBuilder"
import { usePinStoryMode } from "@/components/PinStoryMode"
import { usePlaceNavigation } from "@/components/PlaceNavigation"
import { useProactiveAI } from "@/components/ProactiveAI"
import { useRecommendationForm } from "@/components/RecommendationForm"
import { useReliableCamera } from "@/components/reliable-camera"
import { useSettingsPage } from "@/components/SettingsPage"
import { useSocialPlatformSelector } from "@/components/social-platform-selector"
import { useAIRecommendationsHub } from "@/components/AIRecommendationsHub"

// Dynamic imports for performance
const AIRecommendationsHub = dynamic(() => import("@/components/AIRecommendationsHub"), {
  loading: () => <div style={{ color: "white", textAlign: "center", padding: "2rem" }}>Loading AI Recommendations...</div>
})

const PinLibrary = dynamic(() => import("@/components/PinLibrary"), {
  loading: () => <div style={{ color: "white", textAlign: "center", padding: "2rem" }}>Loading Pin Library...</div>
})

const PinResults = dynamic(() => import("@/components/PinResults"), {
  loading: () => <div style={{ color: "white", textAlign: "center", padding: "2rem" }}>Loading Pin Results...</div>
})

const ProactiveAI = dynamic(() => import("@/components/ProactiveAI"), {
  loading: () => <div style={{ color: "white", textAlign: "center", padding: "2rem" }}>Loading AI...</div>
})

const EnhancedLocationService = dynamic(() => import("@/components/EnhancedLocationService"), {
  loading: () => <div style={{ color: "white", textAlign: "center", padding: "2rem" }}>Loading Location Service...</div>
})

const SettingsPage = dynamic(() => import("@/components/SettingsPage"), {
  loading: () => <div style={{ color: "white", textAlign: "center", padding: "2rem" }}>Loading Settings...</div>
})

export default function HomePage() {
  // ... rest of the existing code ...

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Your existing component content */}
      
      <style jsx>{`
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
