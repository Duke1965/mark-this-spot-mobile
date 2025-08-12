"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAIBehaviorTracker } from '../hooks/useAIBehaviorTracker'
import { useLocationServices } from '../hooks/useLocationServices'

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
  const [viewMode, setViewMode] = useState<"map" | "list" | "insights">("map")
  const { insights, getLearningStatus, getPersonalizedRecommendations } = useAIBehaviorTracker()
  const { location, watchLocation } = useLocationServices()
  const [learningProgress, setLearningProgress] = useState<any>(null)
  
  // Map states
  const [mapInstance, setMapInstance] = useState<any>(null)
  const [mapRef, setMapRef] = useState<HTMLDivElement | null>(null)
  const [isMapLoading, setIsMapLoading] = useState(true)
  const [mapError, setMapError] = useState<string | null>(null)
  
  // AI Recommendations
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [clusteredPins, setClusteredPins] = useState<ClusteredPin[]>([])

  // Get learning status when component mounts
  useEffect(() => {
    try {
      const learningStatus = getLearningStatus()
      setLearningProgress({
        level: learningStatus.isLearning ? 'Learning' : 'Beginner',
        progress: Math.min(learningStatus.confidence * 100, 100),
        pinsAnalyzed: learningStatus.totalBehaviors,
        confidence: Math.round(learningStatus.confidence * 100)
      })
    } catch (error) {
      console.log('🧠 AI not ready yet:', error)
      setLearningProgress({
        level: 'Beginner',
        progress: 0,
        pinsAnalyzed: 0,
        confidence: 0
      })
    }
  }, [getLearningStatus])

  // Initialize location watching
  useEffect(() => {
    if (location) {
      watchLocation()
    }
  }, [location, watchLocation])

  // Generate AI recommendations when location changes
  useEffect(() => {
    if (location && insights) {
      try {
        const generateRecommendations = () => {
          const aiRecs: Recommendation[] = []
          
          // Generate AI recommendations based on user preferences
          if (insights.userPersonality && insights.userPersonality.confidence > 0.3) {
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
          const discoveryCount = Math.max(1, Math.floor(aiRecs.length * 0.4))
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
              confidence: Math.round((insights.userPersonality?.confidence || 0.5) * 60),
              reason: "Discovery mode - expanding your horizons",
              timestamp: new Date()
            })
          }
          
          setRecommendations(aiRecs)
        }
        
        generateRecommendations()
      } catch (error) {
        console.log('🧠 Error generating recommendations:', error)
        setRecommendations([])
      }
    }
  }, [location, insights])

  // Initialize Google Maps when map ref is ready
  useEffect(() => {
    if (mapRef && !mapInstance && !mapError) {
      console.log('🗺️ Map ref ready, starting initialization...')
      initializeMap()
      
      // Add timeout fallback to prevent infinite loading
      const timeoutId = setTimeout(() => {
        if (isMapLoading) {
          console.log('🗺️ Map initialization timeout, showing error...')
          setMapError('Map initialization timed out')
          setIsMapLoading(false)
        }
      }, 15000) // 15 second timeout
      
      return () => clearTimeout(timeoutId)
    }
  }, [mapRef, mapInstance, mapError])

  const initializeMap = useCallback(async () => {
    try {
      console.log('🗺️ Starting map initialization...')
      setIsMapLoading(true)
      setMapError(null)
      
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps) {
        console.log('🗺️ Google Maps already loaded, creating map instance...')
        createMapInstance()
      } else {
        console.log('🗺️ Loading Google Maps script...')
        await loadGoogleMapsScript()
        console.log('🗺️ Google Maps script loaded, creating map instance...')
        createMapInstance()
      }
    } catch (error) {
      console.error('🗺️ Failed to initialize map:', error)
      setMapError('Failed to load map')
      setIsMapLoading(false)
    }
  }, [])

  const loadGoogleMapsScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      console.log('🗺️ Setting up Google Maps script loading...')
      
      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
      if (existingScript) {
        console.log('🗺️ Google Maps script already loading, waiting...')
        existingScript.addEventListener('load', () => {
          console.log('🗺️ Existing script loaded, resolving...')
          resolve()
        })
        existingScript.addEventListener('error', reject)
        return
      }

      // Create and load new script
      console.log('🗺️ Creating new Google Maps script...')
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'DEMO_KEY'}&libraries=places`
      script.async = true
      script.onload = () => {
        console.log('🗺️ New Google Maps script loaded successfully')
        resolve()
      }
      script.onerror = (error) => {
        console.error('🗺️ Google Maps script failed to load:', error)
        reject(error)
      }
      document.head.appendChild(script)
      console.log('🗺️ Google Maps script added to document head')
    })
  }

  const createMapInstance = () => {
    try {
      console.log('🗺️ Creating map instance...')
      if (!mapRef) {
        console.log('🗺️ Map ref not ready, skipping...')
        return
      }

      // Use location or fallback - don't wait for location
      const mapLocation = location || { latitude: -33.9249, longitude: 18.4241 } // Cape Town fallback
      console.log('🗺️ Using map location:', mapLocation)
      
      if (!window.google || !window.google.maps) {
        console.error('🗺️ Google Maps not available after script load')
        setMapError('Google Maps not available')
        setIsMapLoading(false)
        return
      }

      console.log('🗺️ Creating Google Maps instance...')
      const map = new window.google.maps.Map(mapRef, {
        center: { lat: mapLocation.latitude, lng: mapLocation.longitude },
        zoom: 13,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        backgroundColor: '#000000',
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
      
      // Wait a bit longer for the map to actually render
      setTimeout(() => {
        if (mapRef && map) {
          console.log('🗺️ Triggering map resize...')
          try {
            window.google.maps.event.trigger(map, 'resize')
            console.log('🗺️ Map resize completed')
            
            // Check if map actually rendered
            const mapDiv = mapRef.querySelector('.gm-style')
            if (mapDiv) {
              console.log('🗺️ Map rendered successfully, removing loading state')
              setIsMapLoading(false)
            } else {
              console.log('🗺️ Map not rendered, triggering another resize')
              setTimeout(() => {
                window.google.maps.event.trigger(map, 'resize')
                setIsMapLoading(false)
              }, 500)
            }
          } catch (error) {
            console.error('🗺️ Error during map resize:', error)
            setIsMapLoading(false)
          }
        } else {
          console.log('🗺️ Map ref or instance not available during resize')
          setIsMapLoading(false)
        }
      }, 200)
      
    } catch (error) {
      console.error('🗺️ Failed to create map instance:', error)
      setMapError('Failed to create map')
      setIsMapLoading(false)
    }
  }

  // Add markers when map and recommendations are ready
  useEffect(() => {
    if (mapInstance && recommendations.length > 0) {
      addMarkersToMap()
    }
  }, [mapInstance, recommendations])

  const addMarkersToMap = () => {
    try {
      if (!mapInstance || !recommendations.length) return

      // Clear existing markers
      if (window.google && window.google.maps) {
        // Add markers for each recommendation
        recommendations.forEach((rec) => {
          const marker = new window.google.maps.Marker({
            position: { lat: rec.location.lat, lng: rec.location.lng },
            map: mapInstance,
            title: rec.title,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" fill="${rec.isAISuggestion ? '#3b82f6' : '#10b981'}" stroke="white" stroke-width="2"/>
                  <text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${rec.isAISuggestion ? '🤖' : '📍'}</text>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(24, 24)
            }
          })

          // Add info window
          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding: 10px; max-width: 200px;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #1f2937;">${rec.title}</h3>
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">${rec.description}</p>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="background: ${rec.isAISuggestion ? '#3b82f6' : '#10b981'}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px;">
                    ${rec.isAISuggestion ? '🤖 AI' : '👥 Community'}
                  </span>
                  <span style="font-size: 12px; color: #6b7280;">⭐ ${rec.rating.toFixed(1)}/5</span>
                </div>
              </div>
            `
          })

          marker.addListener('click', () => {
            infoWindow.open(mapInstance, marker)
          })
        })
      }
    } catch (error) {
      console.error('🗺️ Failed to add markers:', error)
    }
  }

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
          { key: "map", label: "Map", icon: "🗺️" },
          { key: "list", label: "List", icon: "📋" },
          { key: "insights", label: "Insights", icon: "🧠" }
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
              ref={(el) => {
                console.log('🗺️ Map ref callback triggered:', !!el)
                setMapRef(el)
              }}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '16px',
                minHeight: '400px',
                position: 'relative',
                zIndex: 1
              }}
            />
            
            {/* Loading overlay */}
            {isMapLoading && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '18px',
                textAlign: 'center',
                zIndex: 2
              }}>
                <div>
                  <div style={{ fontSize: '48px', marginBottom: '20px' }}>🗺️</div>
                  <div>Loading AI-powered map...</div>
                  <div style={{ 
                    marginTop: '10px', 
                    fontSize: '14px', 
                    opacity: 0.7 
                  }}>
                    {location ? 'Location detected, initializing map...' : 'Waiting for location...'}
                  </div>
                </div>
              </div>
            )}
            
            {/* Error overlay */}
            {mapError && (
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
                borderRadius: '12px',
                zIndex: 3
              }}>
                <div style={{ marginBottom: '15px' }}>⚠️</div>
                <div>{mapError}</div>
                <button
                  onClick={() => {
                    setMapError(null)
                    setMapInstance(null)
                    setIsMapLoading(true)
                    setTimeout(() => {
                      if (mapRef) {
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
            
            {/* Status indicator */}
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '500',
              zIndex: 4
            }}>
              🧠 AI: {insights ? '✅ Ready' : '⏳ Learning...'}
            </div>
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
                {insights && insights.userPersonality && insights.userPersonality.confidence > 0.2 && (
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
                {insights && insights.recommendationPreferences && (
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
          </div>
        )}
      </div>
    </div>
  )
} 
