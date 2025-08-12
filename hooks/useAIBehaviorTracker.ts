import { useState, useEffect, useCallback, useRef } from 'react'

// User behavior types
export interface UserBehavior {
  id: string
  timestamp: Date
  type: 'pin' | 'photo' | 'video' | 'social_share' | 'recommendation' | 'view'
  category: 'nature' | 'food' | 'architecture' | 'people' | 'culture' | 'adventure' | 'relaxation' | 'social' | 'other'
  location: {
    lat: number
    lng: number
    placeName: string
  }
  content?: {
    mediaUrl?: string
    caption?: string
    hashtags?: string[]
    socialPlatforms?: string[]
    editingStyle?: 'filter' | 'text' | 'sticker' | 'effect' | 'none'
  }
  engagement?: {
    likes?: number
    comments?: number
    shares?: number
    isPublic: boolean
  }
  metadata?: {
    timeOfDay: number // 0-23 hour
    dayOfWeek: number // 0-6 (Sunday = 0)
    season?: 'spring' | 'summer' | 'autumn' | 'winter'
    weather?: 'sunny' | 'cloudy' | 'rainy' | 'snowy'
  }
}

// User preference patterns
export interface UserPreferences {
  favoriteCategories: { [key: string]: number } // category -> frequency
  preferredTimes: { [key: number]: number } // hour -> frequency
  preferredDays: { [key: number]: number } // day -> frequency
  socialPlatforms: { [key: string]: number } // platform -> frequency
  contentStyles: { [key: string]: number } // style -> frequency
  locationPatterns: {
    radius: number // preferred travel radius
    favoriteAreas: Array<{ lat: number; lng: number; name: string; frequency: number }>
  }
  seasonalPreferences: { [key: string]: number } // season -> frequency
}

// AI learning insights
export interface AIInsights {
  userPersonality: {
    isAdventureSeeker: boolean
    isFoodie: boolean
    isCultureLover: boolean
    isSocialButterfly: boolean
    isNatureLover: boolean
    confidence: number // 0-1 how confident we are in these traits
  }
  recommendationPreferences: {
    similarToLikes: number // 0-1 preference for similar places
    discoveryMode: number // 0-1 preference for new experiences
    socialSharing: number // 0-1 preference for shareable content
  }
  learningProgress: {
    totalBehaviors: number
    learningStarted: Date
    lastUpdated: Date
    confidenceLevel: number // 0-1 overall confidence in recommendations
  }
}

export function useAIBehaviorTracker() {
  const [behaviors, setBehaviors] = useState<UserBehavior[]>([])
  const [preferences, setPreferences] = useState<UserPreferences>({
    favoriteCategories: {},
    preferredTimes: {},
    preferredDays: {},
    socialPlatforms: {},
    contentStyles: {},
    locationPatterns: {
      radius: 10, // Default 10km radius
      favoriteAreas: []
    },
    seasonalPreferences: {}
  })
  const [insights, setInsights] = useState<AIInsights>({
    userPersonality: {
      isAdventureSeeker: false,
      isFoodie: false,
      isCultureLover: false,
      isSocialButterfly: false,
      isNatureLover: false,
      confidence: 0
    },
    recommendationPreferences: {
      similarToLikes: 0.6, // Default 60% similar, 40% discovery
      discoveryMode: 0.4,
      socialSharing: 0.5
    },
    learningProgress: {
      totalBehaviors: 0,
      learningStarted: new Date(),
      lastUpdated: new Date(),
      confidenceLevel: 0
    }
  })
  const isInitialized = useRef(false)

  // Load saved data from localStorage on mount
  useEffect(() => {
    try {
      const savedBehaviors = localStorage.getItem('pinit_ai_behaviors')
      const savedPreferences = localStorage.getItem('pinit_ai_preferences')
      const savedInsights = localStorage.getItem('pinit_ai_insights')

      if (savedBehaviors) {
        const parsed = JSON.parse(savedBehaviors)
        setBehaviors(parsed.map((b: any) => ({ ...b, timestamp: new Date(b.timestamp) })))
      }
      if (savedPreferences) {
        const parsed = JSON.parse(savedPreferences)
        setPreferences(parsed)
      }
      if (savedInsights) {
        const parsed = JSON.parse(savedInsights)
        setInsights({
          ...parsed,
          learningProgress: {
            ...parsed.learningProgress,
            learningStarted: new Date(parsed.learningProgress.learningStarted),
            lastUpdated: new Date(parsed.learningProgress.lastUpdated)
          }
        })
      }
    } catch (error) {
      console.error('Failed to load AI behavior data:', error)
    }
    isInitialized.current = true
  }, [])

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (!isInitialized.current) return

    try {
      localStorage.setItem('pinit_ai_behaviors', JSON.stringify(behaviors))
      localStorage.setItem('pinit_ai_preferences', JSON.stringify(preferences))
      localStorage.setItem('pinit_ai_insights', JSON.stringify(insights))
    } catch (error) {
      console.error('Failed to save AI behavior data:', error)
    }
  }, [behaviors, preferences, insights])

  // Track user behavior
  const trackBehavior = useCallback((behavior: Omit<UserBehavior, 'id' | 'timestamp'>) => {
    const newBehavior: UserBehavior = {
      ...behavior,
      id: `behavior-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    }

    setBehaviors(prev => [...prev, newBehavior])
    
    // Update preferences based on new behavior
    updatePreferences(newBehavior)
    
    return newBehavior.id
  }, [])

  // Update user preferences based on behavior
  const updatePreferences = useCallback((behavior: UserBehavior) => {
    setPreferences(prev => {
      const newPrefs = { ...prev }
      
      // Update category preferences
      newPrefs.favoriteCategories[behavior.category] = 
        (newPrefs.favoriteCategories[behavior.category] || 0) + 1
      
      // Update time preferences
      if (behavior.metadata?.timeOfDay !== undefined) {
        newPrefs.preferredTimes[behavior.metadata.timeOfDay] = 
          (newPrefs.preferredTimes[behavior.metadata.timeOfDay] || 0) + 1
      }
      
      // Update day preferences
      if (behavior.metadata?.dayOfWeek !== undefined) {
        newPrefs.preferredDays[behavior.metadata.dayOfWeek] = 
          (newPrefs.preferredDays[behavior.metadata.dayOfWeek] || 0) + 1
      }
      
      // Update social platform preferences
      if (behavior.content?.socialPlatforms) {
        behavior.content.socialPlatforms.forEach(platform => {
          newPrefs.socialPlatforms[platform] = 
            (newPrefs.socialPlatforms[platform] || 0) + 1
        })
      }
      
      // Update content style preferences
      if (behavior.content?.editingStyle) {
        newPrefs.contentStyles[behavior.content.editingStyle] = 
          (newPrefs.contentStyles[behavior.content.editingStyle] || 0) + 1
      }
      
      // Update location patterns
      if (behavior.location) {
        const existingArea = newPrefs.locationPatterns.favoriteAreas.find(
          area => Math.abs(area.lat - behavior.location.lat) < 0.01 && 
                  Math.abs(area.lng - behavior.location.lng) < 0.01
        )
        
        if (existingArea) {
          existingArea.frequency += 1
        } else {
          newPrefs.locationPatterns.favoriteAreas.push({
            lat: behavior.location.lat,
            lng: behavior.location.lng,
            name: behavior.location.placeName,
            frequency: 1
          })
        }
      }
      
      // Update seasonal preferences
      if (behavior.metadata?.season) {
        newPrefs.seasonalPreferences[behavior.metadata.season] = 
          (newPrefs.seasonalPreferences[behavior.metadata.season] || 0) + 1
      }
      
      return newPrefs
    })
  }, [])

  // Analyze preferences and generate insights
  const analyzePreferences = useCallback(() => {
    if (behaviors.length < 3) return // Need more data

    const totalBehaviors = behaviors.length
    const categoryCounts = preferences.favoriteCategories
    const timeCounts = preferences.preferredTimes
    const dayCounts = preferences.preferredDays
    const socialCounts = preferences.socialPlatforms
    const styleCounts = preferences.contentStyles

    // Calculate personality traits
    const isAdventureSeeker = (categoryCounts.adventure || 0) > totalBehaviors * 0.2
    const isFoodie = (categoryCounts.food || 0) > totalBehaviors * 0.15
    const isCultureLover = (categoryCounts.culture || 0) > totalBehaviors * 0.15
    const isSocialButterfly = (categoryCounts.social || 0) > totalBehaviors * 0.2
    const isNatureLover = (categoryCounts.nature || 0) > totalBehaviors * 0.15

    // Calculate confidence based on data consistency
    const confidence = Math.min(0.9, Math.max(0.1, totalBehaviors / 20))

    // Calculate recommendation preferences
    const totalSocial = Object.values(socialCounts).reduce((sum, count) => sum + count, 0)
    const socialSharing = totalSocial > 0 ? Math.min(0.9, totalSocial / totalBehaviors) : 0.3

    const newInsights: AIInsights = {
      userPersonality: {
        isAdventureSeeker,
        isFoodie,
        isCultureLover,
        isSocialButterfly,
        isNatureLover,
        confidence
      },
      recommendationPreferences: {
        similarToLikes: 0.6, // Fixed 60/40 split as specified
        discoveryMode: 0.4,
        socialSharing: socialSharing
      },
      learningProgress: {
        totalBehaviors,
        learningStarted: insights.learningProgress.learningStarted,
        lastUpdated: new Date(),
        confidenceLevel: confidence
      }
    }
    
    setInsights(newInsights)
  }, [behaviors, preferences, insights.learningProgress.learningStarted])

  // Get personalized recommendations based on learned preferences
  const getPersonalizedRecommendations = useCallback((location: { lat: number; lng: number }, count: number = 5) => {
    if (behaviors.length < 3) {
      return [] // Not enough data yet
    }
    
    // This will be expanded with actual recommendation logic
    // For now, return basic structure
    return {
      similarToLikes: Math.floor(count * 0.6), // 60% similar
      discovery: Math.floor(count * 0.4), // 40% discovery
      confidence: insights.learningProgress.confidenceLevel,
      preferences: preferences.favoriteCategories
    }
  }, [behaviors, preferences, insights])

  // Reset AI learning (with warning)
  const resetAILearning = useCallback(() => {
    const confirmed = window.confirm(
      '⚠️ WARNING: Resetting your AI learning will ruin your personalized experience!\n\n' +
      'The AI will forget everything it has learned about you and start over.\n\n' +
      'Are you absolutely sure you want to continue?'
    )
    
    if (confirmed) {
      setBehaviors([])
      setPreferences({
        favoriteCategories: {},
        preferredTimes: {},
        preferredDays: {},
        socialPlatforms: {},
        contentStyles: {},
        locationPatterns: {
          radius: 10,
          favoriteAreas: []
        },
        seasonalPreferences: {}
      })
      setInsights({
        userPersonality: {
          isAdventureSeeker: false,
          isFoodie: false,
          isCultureLover: false,
          isSocialButterfly: false,
          isNatureLover: false,
          confidence: 0
        },
        recommendationPreferences: {
          similarToLikes: 0.6,
          discoveryMode: 0.4,
          socialSharing: 0.5
        },
        learningProgress: {
          totalBehaviors: 0,
          learningStarted: new Date(),
          lastUpdated: new Date(),
          confidenceLevel: 0
        }
      })
      
      // Clear localStorage
      localStorage.removeItem('pinit_ai_behaviors')
      localStorage.removeItem('pinit_ai_preferences')
      localStorage.removeItem('pinit_ai_insights')
    }
  }, [])

  // Get AI learning status
  const getLearningStatus = useCallback(() => {
    return {
      isLearning: behaviors.length >= 3,
      confidence: insights.learningProgress.confidenceLevel,
      totalBehaviors: insights.learningProgress.totalBehaviors,
      learningStarted: insights.learningProgress.learningStarted,
      personalityTraits: insights.userPersonality,
      favoriteCategories: preferences.favoriteCategories,
      preferredTimes: preferences.preferredTimes,
      preferredDays: preferences.preferredDays
    }
  }, [behaviors, insights, preferences])

  // Auto-analyze preferences when behaviors change
  useEffect(() => {
    if (behaviors.length > 0) {
      analyzePreferences()
    }
  }, [behaviors, analyzePreferences])

  return {
    // Core tracking
    trackBehavior,
    behaviors,
    
    // Analysis
    preferences,
    insights,
    analyzePreferences,
    
    // Recommendations
    getPersonalizedRecommendations,
    
    // Management
    resetAILearning,
    getLearningStatus,
    
    // Utility
    isInitialized: isInitialized.current
  }
} 
