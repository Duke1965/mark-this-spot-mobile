"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAIBehaviorTracker } from '../hooks/useAIBehaviorTracker'
import { useLocationServices } from '../hooks/useLocationServices'
import { usePinStorage } from '../hooks/usePinStorage'

// Google Maps global declaration
declare global {
  interface Window {
    google: any
  }
}

interface Recommendation {
  id: string
  title: string
  description: string
  category: string
  location: {
    lat: number
    lng: number
  }
  rating: number
  isAISuggestion: boolean
  confidence: number
  reason: string
  timestamp: Date
}

interface ClusteredPin {
  id: string
  location: { lat: number; lng: number }
  count: number
  recommendations: Recommendation[]
  category: string
}

export default function AIRecommendationsHub() {
  const { location, watchLocation } = useLocationServices()
  const { pins } = usePinStorage()
  const { 
    insights, 
    getPersonalizedRecommendations, 
    getLearningStatus,
    resetAILearning
  } = useAIBehaviorTracker()

  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [clusteredPins, setClusteredPins] = useState<ClusteredPin[]>([])
  const [viewMode, setViewMode] = useState<"map" | "list" | "insights">("map")
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null)
  const [mapRef, setMapRef] = useState<HTMLDivElement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCluster, setSelectedCluster] = useState<ClusteredPin | null>(null)
  const [userInsights, setUserInsights] = useState<any>(null)
  const [learningProgress, setLearningProgress] = useState<any>(null)

  // Initialize location watching
  useEffect(() => {
    console.log('🧠 AIRecommendationsHub: Location effect triggered', { location })
    
    if (location) {
      console.log('🧠 AIRecommendationsHub: Location detected, starting watch')
      watchLocation()
    } else {
      console.log('🧠 AIRecommendationsHub: No location yet, requesting current location...')
      // Try to get current location if none exists
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('🧠 AIRecommendationsHub: Got current position:', position.coords)
          },
          (error) => {
            console.error('🧠 AIRecommendationsHub: Location error:', error)
          }
        )
      }
    }
  }, [location, watchLocation])

  // Get learning status when component mounts
  useEffect(() => {
    const learningStatus = getLearningStatus()
    setLearningProgress({
      level: learningStatus.isLearning ? 'Learning' : 'Beginner',
      progress: Math.min(learningStatus.confidence * 100, 100),
      pinsAnalyzed: learningStatus.totalBehaviors,
      confidence: Math.round(learningStatus.confidence * 100)
    })
  }, [getLearningStatus])

  // Generate AI recommendations when location changes
  useEffect(() => {
    if (location && insights) {
      const generateRecommendations = () => {
        const aiRecs: Recommendation[] = []
        
        // Generate AI recommendations based on user preferences
        if (insights.userPersonality.confidence > 0.3) {
          const categories = Object.entries(insights.userPersonality)
            .filter(([key, value]) => key !== 'confidence' && value === true)
            .map(([key]) => key.replace('is', '').toLowerCase())
          
          categories.forEach((category, index) => {
            aiRecs.push({
              id: `ai-${category}-${index}`,
              title: `${category.charAt(0).toUpperCase() + category.slice(1)} Discovery`,
              description: `Based on your ${category} preferences, we think you'd love this spot!`,
              category: category,
              location: {
                lat: location.latitude + (Math.random() - 0.5) * 0.01,
                lng: location.longitude + (Math.random() - 0.5) * 0.01
              },
              rating: 4 + Math.random(),
              isAISuggestion: true,
              confidence: Math.round(insights.userPersonality.confidence * 100),
              reason: `Learned from your ${category} preferences`,
              timestamp: new Date()
            })
          })
        }
        
        // Add some discovery recommendations (40% as specified)
        const discoveryCount = Math.floor(aiRecs.length * 0.4)
        for (let i = 0; i < discoveryCount; i++) {
          aiRecs.push({
            id: `discovery-${i}`,
            title: `New Adventure #${i + 1}`,
            description: "Something completely new to expand your horizons!",
            category: 'adventure',
            location: {
              lat: location.latitude + (Math.random() - 0.5) * 0.02,
              lng: location.longitude + (Math.random() - 0.5) * 0.02
            },
            rating: 3.5 + Math.random() * 1.5,
            isAISuggestion: true,
            confidence: Math.round(insights.userPersonality.confidence * 60),
            reason: "Discovery mode - expanding your horizons",
            timestamp: new Date()
          })
        }
        
        setRecommendations(aiRecs)
      }
      
      generateRecommendations()
    }
  }, [location, insights, getLearningStatus])

  // Initialize Google Maps when map ref is ready
  useEffect(() => {
    console.log('🧠 AIRecommendationsHub: Map init effect triggered', { mapRef: !!mapRef, mapInstance: !!mapInstance, location })
    
    if (mapRef && !mapInstance) {
      const initMap = async () => {
        try {
          console.log('🗺️ Starting map initialization...')
          
          // Check if Google Maps is already loaded
          if (window.google && window.google.maps) {
            console.log('🗺️ Google Maps already loaded, initializing...')
            initializeMap()
          } else {
            console.log('🗺️ Loading Google Maps script...')
            
            // Check if script is already being loaded
            const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
            if (existingScript) {
              console.log('🗺️ Google Maps script already loading, waiting...')
              existingScript.addEventListener('load', () => {
                console.log('🗺️ Google Maps script loaded, initializing...')
                initializeMap()
              })
            } else {
              // Create and load new script
              const script = document.createElement('script')
              script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'DEMO_KEY'}&libraries=places`
              script.async = true
              script.onload = () => {
                console.log('🗺️ Google Maps script loaded successfully, initializing...')
                initializeMap()
              }
              script.onerror = (error) => {
                console.error('🗺️ Failed to load Google Maps script:', error)
                setIsLoading(false)
              }
              document.head.appendChild(script)
            }
          }
        } catch (error) {
          console.error('🗺️ Failed to initialize map:', error)
          setIsLoading(false)
        }
      }
      
      initMap()
    }
  }, [mapRef, mapInstance, location, initializeMap])

  const initializeMap = useCallback(() => {
    try {
      if (!mapRef) {
        console.log('🗺️ Map initialization skipped: missing mapRef')
        return
      }

      // Use location or fallback
      const mapLocation = location || { latitude: -33.9249, longitude: 18.4241 } // Cape Town fallback
      console.log('🗺️ Creating Google Maps instance at:', mapLocation)
      
      const map = new window.google.maps.Map(mapRef, {
        center: { lat: mapLocation.latitude, lng: mapLocation.longitude },
        zoom: 13,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: 'all',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#ffffff' }]
          },
          {
            featureType: 'all',
            elementType: 'labels.text.stroke',
            stylers: [{ color: '#000000' }]
          },
          {
            featureType: 'administrative',
            elementType: 'geometry.fill',
            stylers: [{ color: '#000000' }]
          },
          {
            featureType: 'landscape',
            elementType: 'geometry',
            stylers: [{ color: '#000000' }]
          },
          {
            featureType: 'poi',
            elementType: 'geometry',
            stylers: [{ color: '#000000' }]
          },
          {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{ color: '#000000' }]
          },
          {
            featureType: 'transit',
            elementType: 'geometry',
            stylers: [{ color: '#000000' }]
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#000000' }]
          }
        ]
      })

      console.log('🗺️ Google Maps instance created successfully')
      setMapInstance(map)
      setIsLoading(false)
      
      // Add a small delay to ensure the map renders
      setTimeout(() => {
        if (mapRef && map) {
          window.google.maps.event.trigger(map, 'resize')
          console.log('🗺️ Map resize triggered')
        }
      }, 100)
      
    } catch (error) {
      console.error('🗺️ Failed to create map instance:', error)
      setIsLoading(false)
    }
  }, [mapRef, location])

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #581c87 100%)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        paddingTop: '60px',
        textAlign: 'center',
        color: 'white',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        position: 'relative'
      }}>
        <button
          onClick={() => window.history.back()}
          style={{
            position: 'absolute',
            left: '20px',
            top: '60px',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            color: 'white',
            fontSize: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ←
        </button>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
          🧠 AI Recommendations
        </h1>
        <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
          Personalized for you based on your behavior
        </p>
      </div>

      {/* View Mode Tabs */}
      <div style={{
        display: 'flex',
        padding: '0 20px',
        marginTop: '20px',
        gap: '10px'
      }}>
        {[
          { key: "map", label: "🗺️ Map", icon: "🗺️" },
          { key: "list", label: "📋 List", icon: "📋" },
          { key: "insights", label: "🧠 Insights", icon: "🧠" }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setViewMode(tab.key as any)}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: viewMode === tab.key 
                ? 'rgba(255,255,255,0.2)' 
                : 'rgba(255,255,255,0.1)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, padding: '20px', overflow: 'hidden' }}>
        {viewMode === "map" && (
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '16px',
            height: '100%',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div
              ref={(el) => setMapRef(el)}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '16px'
              }}
            />
            {!mapInstance && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: 'white',
                fontSize: '18px',
                textAlign: 'center'
              }}>
                <div style={{ marginBottom: '10px' }}>🗺️</div>
                <div>Loading AI-powered map...</div>
                <div style={{ 
                  marginTop: '10px', 
                  fontSize: '14px', 
                  opacity: 0.7,
                  maxWidth: '200px'
                }}>
                  {location ? 'Location detected, initializing map...' : 'Waiting for location...'}
                </div>
              </div>
            )}
            
            {/* Fallback if map fails to load */}
            {!isLoading && !mapInstance && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: 'white',
                fontSize: '16px',
                textAlign: 'center',
                background: 'rgba(0,0,0,0.8)',
                padding: '20px',
                borderRadius: '12px'
              }}>
                <div style={{ marginBottom: '15px' }}>⚠️</div>
                <div>Map failed to load</div>
                <button
                  onClick={() => {
                    setMapInstance(null)
                    setIsLoading(true)
                    // Retry initialization
                    setTimeout(() => {
                      if (mapRef && location) {
                        initializeMap()
                      }
                    }, 1000)
                  }}
                  style={{
                    marginTop: '15px',
                    padding: '8px 16px',
                    background: 'rgba(59, 130, 246, 0.8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  🔄 Retry
                </button>
              </div>
            )}
          </div>
        )}

        {viewMode === "list" && (
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '16px',
            height: '100%',
            padding: '20px',
            color: 'white',
            overflow: 'auto'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 'bold' }}>
              🧠 AI-Powered Recommendations
            </h3>
            
            {recommendations.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {recommendations.map((rec) => (
                  <div
                    key={rec.id}
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      padding: '15px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                        {rec.title}
                      </h4>
                      <span style={{
                        background: rec.isAISuggestion ? 'rgba(59, 130, 246, 0.8)' : 'rgba(16, 185, 129, 0.8)',
                        padding: '4px 8px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        {rec.isAISuggestion ? '🤖 AI' : '👥 Community'}
                      </span>
                    </div>
                    
                    <p style={{ margin: '0 0 10px 0', fontSize: '14px', opacity: 0.9, lineHeight: '1.4' }}>
                      {rec.description}
                    </p>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        background: 'rgba(255,255,255,0.1)',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}>
                        {rec.category}
                      </span>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', opacity: 0.8 }}>
                          ⭐ {rec.rating.toFixed(1)}/5
                        </span>
                        {rec.isAISuggestion && (
                          <span style={{ fontSize: '12px', opacity: 0.8 }}>
                            🎯 {rec.confidence}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '40px 20px',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>🧠</div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
                  No AI Recommendations Yet
                </h4>
                <p style={{ margin: 0, opacity: 0.8, fontSize: '14px' }}>
                  Start pinning places and the AI will learn your preferences!
                </p>
              </div>
            )}
          </div>
        )}

        {viewMode === "insights" && (
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '16px',
            height: '100%',
            padding: '20px',
            color: 'white',
            overflow: 'auto'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 'bold' }}>
              🧠 Your AI Learning Progress
            </h3>
            
            {learningProgress ? (
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.1)',
                  padding: '15px',
                  borderRadius: '12px',
                  marginBottom: '15px'
                }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
                    📊 Learning Level: {learningProgress.level}
                  </h4>
                  <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    height: '8px',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${learningProgress.progress}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #10b981, #3b82f6)',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.8 }}>
                    {learningProgress.pinsAnalyzed} pins analyzed • {learningProgress.confidence}% confidence
                  </p>
                </div>

                {/* AI Personality Insights */}
                {insights && insights.userPersonality.confidence > 0.2 && (
                  <div style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: '15px',
                    borderRadius: '12px',
                    marginBottom: '15px'
                  }}>
                    <h4 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>
                      🎭 Your AI Personality
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {Object.entries(insights.userPersonality)
                        .filter(([key, value]) => key !== 'confidence' && value === true)
                        .map(([key, value]) => (
                          <span key={key} style={{
                            background: 'rgba(59, 130, 246, 0.8)',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            {key.replace('is', '').replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        ))}
                    </div>
                    <p style={{ margin: '10px 0 0 0', fontSize: '12px', opacity: 0.7 }}>
                      AI Confidence: {Math.round(insights.userPersonality.confidence * 100)}%
                    </p>
                  </div>
                )}

                {/* Recommendation Preferences */}
                {insights && (
                  <div style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: '15px',
                    borderRadius: '12px',
                    marginBottom: '15px'
                  }}>
                    <h4 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>
                      🎯 Recommendation Style
                    </h4>
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontSize: '14px' }}>Similar to what you love</span>
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>
                          {Math.round(insights.recommendationPreferences.similarToLikes * 100)}%
                        </span>
                      </div>
                      <div style={{
                        background: 'rgba(0,0,0,0.3)',
                        height: '6px',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${insights.recommendationPreferences.similarToLikes * 100}%`,
                          height: '100%',
                          background: '#10b981',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontSize: '14px' }}>Discovery & new experiences</span>
                        <span style={{ fontSize: '14px', fontWeight: '600' }}>
                          {Math.round(insights.recommendationPreferences.discoveryMode * 100)}%
                        </span>
                      </div>
                      <div style={{
                        background: 'rgba(0,0,0,0.3)',
                        height: '6px',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${insights.recommendationPreferences.discoveryMode * 100}%`,
                          height: '100%',
                          background: '#3b82f6',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: 'rgba(255,255,255,0.1)',
                padding: '20px',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <p style={{ margin: 0, opacity: 0.8 }}>
                  Start pinning places to see your AI insights!
                </p>
              </div>
            )}

            <button
              onClick={() => {
                if (confirm("⚠️ This will reset all AI learning. Your recommendations will become less personalized. Continue?")) {
                  resetAILearning()
                }
              }}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(239, 68, 68, 0.8)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                cursor: 'pointer',
                marginTop: '20px'
              }}
            >
              🔄 Reset AI Learning
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 
