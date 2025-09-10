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
import { reverseGeocode } from "@/lib/reverseGeocode"
import { getRealLocationName } from "@/lib/reverseGeocode"
import { validatePinData } from "@/lib/validation"
import { logger } from "@/lib/logger"
import { PinLifecycleManager } from "@/lib/pinLifecycle"
import { NightlyMaintenance } from "@/lib/nightlyMaintenance"
import { DataHealing } from "@/lib/dataHealing"
import { DataSync } from "@/lib/dataSync"
import { MapLifecycleManager } from "@/lib/mapLifecycle"
import { TrendingEngine } from "@/lib/trending"
import { ScoringEngine } from "@/lib/scoringEngine"
import { PinMigration } from "@/lib/pinMigration"
import { SystemHealthCheck } from "@/components/SystemHealthCheck"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { ContentEditor } from "@/components/ContentEditor"
import { MapTabs } from "@/components/MapTabs"
import SocialPlatformSelector from "@/components/SocialPlatformSelector"
import { RecommendationForm } from "@/components/RecommendationForm"

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
