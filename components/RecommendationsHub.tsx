"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { MapPin, Users, Sparkles, ArrowLeft, List, Map } from "lucide-react"

interface Recommendation {
  id: string
  name: string
  description: string
  location: {
    lat: number
    lng: number
  }
  rating?: number
  type: "ai" | "community"
  distance?: number
  photo?: string
  pinnedBy?: string
}

interface ClusteredPin {
  id: string
  location: {
    lat: number
    lng: number
  }
  recommendations: Recommendation[]
  count: number
  averageRating: number
  type: "ai" | "community" | "mixed"
}

interface PinData {
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

export function RecommendationsHub({ onBack, pins = [] }: { onBack: () => void; pins?: PinData[] }) {
  console.log("🗺️ RecommendationsHub component loaded!")
  
  const [viewMode, setViewMode] = useState<"map" | "list">("map")
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [selectedPin, setSelectedPin] = useState<Recommendation | null>(null)
  const [mapZoom, setMapZoom] = useState(14)
  const [isLoading, setIsLoading] = useState(true)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  
  // Clustering state
  const [clusteredPins, setClusteredPins] = useState<ClusteredPin[]>([])
  const [selectedCluster, setSelectedCluster] = useState<ClusteredPin | null>(null)
  const [showClusterDetails, setShowClusterDetails] = useState(false)
  
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  // Clustering logic - group recommendations by location
  const clusterRecommendations = useCallback((recommendations: Recommendation[]): ClusteredPin[] => {
    const clusters: ClusteredPin[] = []
    const CLUSTER_RADIUS = 0.001 // Very small radius for clustering (about 100m)
    
    recommendations.forEach((rec) => {
      let addedToCluster = false
      
      // Check if this recommendation should be added to an existing cluster
      for (const cluster of clusters) {
        const distance = Math.sqrt(
          Math.pow(rec.location.lat - cluster.location.lat, 2) +
          Math.pow(rec.location.lng - cluster.location.lng, 2)
        )
        
        if (distance <= CLUSTER_RADIUS) {
          // Add to existing cluster
          cluster.recommendations.push(rec)
          cluster.count++
          
          // Update average rating
          const totalRating = cluster.recommendations.reduce((sum, r) => sum + (r.rating || 0), 0)
          cluster.averageRating = totalRating / cluster.recommendations.length
          
          // Update type (mixed if different types)
          if (cluster.type !== rec.type) {
            cluster.type = "mixed"
          }
          
          addedToCluster = true
          break
        }
      }
      
      // Create new cluster if not added to existing one
      if (!addedToCluster) {
        const newCluster: ClusteredPin = {
          id: `cluster-${Date.now()}-${Math.random()}`,
          location: rec.location,
          recommendations: [rec],
          count: 1,
          averageRating: rec.rating || 0,
          type: rec.type
        }
        clusters.push(newCluster)
      }
    })
    
    return clusters
  }, [])

  // Generate AI recommendations based on user's pin history
  const generateAIRecommendations = useCallback((lat: number, lng: number): Recommendation[] => {
    const aiRecommendations: Recommendation[] = [
      {
        id: "ai-1",
        name: "Hidden Gem Café",
        description: "Cozy spot perfect for your coffee-loving style",
        location: { lat: lat + 0.002, lng: lng + 0.001 },
        rating: 4.7,
        type: "ai",
        distance: 0.3,
        photo: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop"
      },
      {
        id: "ai-2", 
        name: "Scenic Overlook",
        description: "Perfect sunset spot based on your nature pins",
        location: { lat: lat - 0.003, lng: lng + 0.002 },
        rating: 4.9,
        type: "ai",
        distance: 0.5,
        photo: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop"
      },
      {
        id: "ai-3",
        name: "Artisan Market",
        description: "Local crafts and food - matches your cultural interests",
        location: { lat: lat + 0.001, lng: lng - 0.002 },
        rating: 4.5,
        type: "ai",
        distance: 0.2,
        photo: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop"
      },
      {
        id: "ai-4",
        name: "Historic Walking Trail",
        description: "Perfect for your adventure-seeking style",
        location: { lat: lat - 0.001, lng: lng - 0.003 },
        rating: 4.6,
        type: "ai",
        distance: 0.4,
        photo: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=300&fit=crop"
      },
      {
        id: "ai-5",
        name: "Local Brewery",
        description: "Craft beers and atmosphere you'll love",
        location: { lat: lat + 0.003, lng: lng + 0.003 },
        rating: 4.4,
        type: "ai",
        distance: 0.6,
        photo: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop"
      }
    ]
    return aiRecommendations
  }, [])

  // Generate community recommendations (simulated from other PINIT users)
  const generateCommunityRecommendations = useCallback((lat: number, lng: number): Recommendation[] => {
    const communityRecommendations: Recommendation[] = [
      {
        id: "community-1",
        name: "Local Favorites Spot",
        description: "Recommended by Sarah M. - amazing atmosphere!",
        location: { lat: lat + 0.004, lng: lng - 0.001 },
        rating: 4.8,
        type: "community",
        distance: 0.7,
        photo: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
        pinnedBy: "Sarah M."
      },
      {
        id: "community-2",
        name: "Hidden Garden",
        description: "Mike says: Perfect for quiet moments",
        location: { lat: lat - 0.002, lng: lng + 0.004 },
        rating: 4.6,
        type: "community",
        distance: 0.8,
        photo: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop",
        pinnedBy: "Mike"
      },
      {
        id: "community-3",
        name: "Street Art Corner",
        description: "Emma's pick: Instagram-worthy murals everywhere",
        location: { lat: lat + 0.001, lng: lng + 0.005 },
        rating: 4.3,
        type: "community",
        distance: 0.9,
        photo: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=300&fit=crop",
        pinnedBy: "Emma"
      },
      {
        id: "community-4",
        name: "Sunset Beach Walk",
        description: "David's discovery: Best sunset views in the area",
        location: { lat: lat - 0.005, lng: lng - 0.002 },
        rating: 4.9,
        type: "community",
        distance: 1.1,
        photo: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
        pinnedBy: "David"
      },
      {
        id: "community-5",
        name: "Local Craft Market",
        description: "Lisa's find: Unique handmade souvenirs",
        location: { lat: lat + 0.003, lng: lng - 0.004 },
        rating: 4.4,
        type: "community",
        distance: 1.2,
        photo: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop",
        pinnedBy: "Lisa"
      }
    ]
    return communityRecommendations
  }, [])

  // Initialize recommendations and user location
  useEffect(() => {
    const initializeRecommendations = async () => {
      try {
        // Get user location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords
              console.log("🗺️ User location:", latitude, longitude)
              
              setUserLocation({ lat: latitude, lng: longitude })
              
              // Convert pins to recommendations
              const pinRecommendations = pins
                .filter(pin => pin.isRecommended)
                .map(pin => ({
                  id: pin.id,
                  name: pin.title,
                  description: pin.description || `Recommendation for ${pin.locationName}`,
                  location: {
                    lat: pin.latitude,
                    lng: pin.longitude
                  },
                  rating: pin.rating,
                  type: pin.isAISuggestion ? "ai" : "community" as "ai" | "community",
                  distance: Math.sqrt(
                    Math.pow(latitude - pin.latitude, 2) +
                    Math.pow(longitude - pin.longitude, 2)
                  ),
                  photo: pin.mediaUrl || undefined,
                  pinnedBy: "user"
                }))
              
              // Generate additional AI recommendations based on location
              const aiRecs = generateAIRecommendations(latitude, longitude)
              const communityRecs = generateCommunityRecommendations(latitude, longitude)
              
              setRecommendations([...pinRecommendations, ...aiRecs, ...communityRecs])
              setIsLoading(false)
            },
            (error) => {
              console.error("🗺️ Location error:", error)
              // Fallback to Cape Town coordinates
              const fallbackLat = -33.8788
              const fallbackLng = 18.6188
              
              setUserLocation({ lat: fallbackLat, lng: fallbackLng })
              
              // Convert pins to recommendations
              const pinRecommendations = pins
                .filter(pin => pin.isRecommended)
                .map(pin => ({
                  id: pin.id,
                  name: pin.title,
                  description: pin.description || `Recommendation for ${pin.locationName}`,
                  location: {
                    lat: pin.latitude,
                    lng: pin.longitude
                  },
                  rating: pin.rating,
                  type: pin.isAISuggestion ? "ai" : "community" as "ai" | "community",
                  distance: Math.sqrt(
                    Math.pow(fallbackLat - pin.latitude, 2) +
                    Math.pow(fallbackLng - pin.longitude, 2)
                  ),
                  photo: pin.mediaUrl || undefined,
                  pinnedBy: "user"
                }))
              
              const aiRecs = generateAIRecommendations(fallbackLat, fallbackLng)
              const communityRecs = generateCommunityRecommendations(fallbackLat, fallbackLng)
              
              setRecommendations([...pinRecommendations, ...aiRecs, ...communityRecs])
              setIsLoading(false)
            },
            {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 60000
            }
          )
        } else {
          console.error("🗺️ Geolocation not supported")
          setMapError("Location services not available")
          setIsLoading(false)
        }
      } catch (error) {
        console.error("🗺️ Error initializing recommendations:", error)
        setMapError("Failed to load recommendations")
        setIsLoading(false)
      }
    }

    initializeRecommendations()
  }, [generateAIRecommendations, generateCommunityRecommendations, pins])

  // Apply clustering when recommendations change
  useEffect(() => {
    if (recommendations.length > 0) {
      const clusters = clusterRecommendations(recommendations)
      setClusteredPins(clusters)
      console.log(`🗺️ Clustered ${recommendations.length} recommendations into ${clusters.length} clusters`)
    }
  }, [recommendations, clusterRecommendations])

  // Load Google Maps API
  useEffect(() => {
    if (!userLocation || !mapRef.current) return

    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        initializeMap()
        return
      }

      const script = document.createElement("script")
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = () => {
        console.log("🗺️ Google Maps API loaded successfully!")
        initializeMap()
      }
      script.onerror = () => {
        console.error("🗺️ Failed to load Google Maps API")
        showBeautifulFallback()
      }
      document.head.appendChild(script)
    }

    const initializeMap = () => {
      if (!mapRef.current || !userLocation) return

      try {
        const mapOptions = {
          center: { lat: userLocation.lat, lng: userLocation.lng },
          zoom: mapZoom,
          mapTypeId: "roadmap",
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "on" }]
            }
          ] as google.maps.MapTypeStyle[]
        }

        const map = new window.google.maps.Map(mapRef.current, mapOptions)
        mapInstanceRef.current = map
        setMapLoaded(true)

        // Add user location marker
        new window.google.maps.Marker({
          position: { lat: userLocation.lat, lng: userLocation.lng },
          map: map,
          title: "Your Location",
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#3B82F6",
            fillOpacity: 1,
            strokeColor: "#FFFFFF",
            strokeWeight: 2
          }
        })

        // Add recommendation markers
        addRecommendationMarkers(map)

      } catch (error) {
        console.error("🗺️ Error initializing map:", error)
        showBeautifulFallback()
      }
    }

    const addRecommendationMarkers = (map: any) => {
      try {
        // Clear existing markers
        markersRef.current.forEach(marker => marker.setMap(null))
        markersRef.current = []

        recommendations.forEach((rec: Recommendation) => {
          const marker = new window.google.maps.Marker({
            position: { lat: rec.location.lat, lng: rec.location.lng },
            map: map,
            title: rec.name,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: rec.type === "ai" ? "#EF4444" : "#3B82F6",
              fillOpacity: 1,
              strokeColor: "#FFFFFF",
              strokeWeight: 2
            }
          })

          // Add click listener
          marker.addListener("click", () => {
            handlePinClick(rec)
          })

          markersRef.current.push(marker)
        })
      } catch (error) {
        console.error("🗺️ Error adding markers:", error)
        showBeautifulFallback()
      }
    }

    const showBeautifulFallback = () => {
      console.log("🗺️ Creating beautiful interactive fallback map")
      console.log("🗺️ Recommendations count:", recommendations.length)
      
      // Create a beautiful interactive fallback map
      if (mapRef.current) {
        mapRef.current.innerHTML = `
          <div style="
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #581c87 100%);
            position: relative;
            border-radius: 0.5rem;
            overflow: hidden;
          ">
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              text-align: center;
              color: white;
              z-index: 10;
            ">
              <div style="font-size: 3rem; margin-bottom: 1rem;">🗺️</div>
              <div style="font-size: 1.2rem; margin-bottom: 0.5rem;">Interactive Recommendations</div>
              <div style="font-size: 0.875rem; opacity: 0.8;">Tap pins below to explore</div>
              <div style="font-size: 0.75rem; opacity: 0.6; margin-top: 0.5rem;">Found ${recommendations.length} places near you</div>
            </div>
            
            <!-- Interactive Pins Overlay -->
            <div style="
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              pointer-events: none;
            ">
              ${clusteredPins.length > 0 ? clusteredPins.map((cluster, index) => {
                const angle = (index / clusteredPins.length) * 2 * Math.PI
                const radius = 30 // Reduced from 120 to 30 for visible area
                const centerX = 50
                const centerY = 50
                const x = centerX + radius * Math.cos(angle)
                const y = centerY + radius * Math.sin(angle)
                
                // Determine color based on average rating
                const getClusterColor = (rating: number) => {
                  if (rating >= 4.5) return "#10B981" // Green for high rating
                  if (rating >= 4.0) return "#F59E0B" // Yellow for good rating
                  if (rating >= 3.5) return "#EF4444" // Red for average rating
                  return "#6B7280" // Gray for low rating
                }
                
                const clusterColor = getClusterColor(cluster.averageRating)
                const clusterIcon = cluster.type === "ai" ? "🤖" : cluster.type === "community" ? "👥" : "🌟"
                
                console.log(`🗺️ Creating clustered pin ${index + 1}: ${cluster.count} recommendations at position (${x.toFixed(1)}%, ${y.toFixed(1)}%)`)
                
                return `
                  <button
                    onclick="window.handleClusterClick('${cluster.id}')"
                    style="
                      position: absolute;
                      left: ${x}%;
                      top: ${y}%;
                      transform: translate(-50%, -50%);
                      width: 60px;
                      height: 60px;
                      border-radius: 50%;
                      border: 4px solid white;
                      background: ${clusterColor};
                      cursor: pointer;
                      pointer-events: auto;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 16px;
                      color: white;
                      font-weight: bold;
                      box-shadow: 0 6px 16px rgba(0,0,0,0.4);
                      transition: all 0.2s ease;
                      z-index: 1000;
                      position: relative;
                    "
                    onmouseover="this.style.transform='translate(-50%, -50%) scale(1.3)'"
                    onmouseout="this.style.transform='translate(-50%, -50%) scale(1)'"
                    title="${cluster.count} recommendations (${cluster.averageRating.toFixed(1)}★ avg)"
                  >
                    ${clusterIcon}
                    <div style="
                      position: absolute;
                      top: -8px;
                      right: -8px;
                      background: white;
                      color: #1F2937;
                      border-radius: 50%;
                      width: 24px;
                      height: 24px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 12px;
                      font-weight: bold;
                      border: 2px solid ${clusterColor};
                  ">
                    ${cluster.count}
                  </div>
                </button>
              `
            }).join('') : `
                <div style="
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  text-align: center;
                  color: white;
                  font-size: 0.875rem;
                  opacity: 0.7;
                ">
                  Loading recommendations...
                </div>
              `}
            </div>
            
            <!-- Animated Background -->
            <div style="
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: radial-gradient(circle at 30% 70%, rgba(59, 130, 246, 0.3) 0%, transparent 50%),
                          radial-gradient(circle at 70% 30%, rgba(239, 68, 68, 0.3) 0%, transparent 50%);
              animation: pulse 4s ease-in-out infinite;
            "></div>
          </div>
        `
        
        // Add global click handler
        ;(window as any).handlePinClick = (recId: string) => {
          const rec = recommendations.find(r => r.id === recId)
          if (rec) {
            handlePinClick(rec)
          }
        }
        
        ;(window as any).handleClusterClick = (clusterId: string) => {
          handleClusterClick(clusterId)
        }
        
        // Add CSS animation
        const style = document.createElement('style')
        style.textContent = `
          @keyframes pulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.6; }
          }
        `
        document.head.appendChild(style)
        
        setMapLoaded(true)
        setMapError(null) // Clear any previous errors
      }
    }

    // Try Google Maps first, fallback to beautiful gradient if it fails
    console.log("🗺️ Loading Google Maps with real pins...")
    loadGoogleMaps()
  }, [userLocation, recommendations, mapZoom, clusteredPins])

  const handlePinClick = (rec: Recommendation) => {
    console.log("🎯 Pin clicked:", rec)
    setSelectedPin(rec)
  }

  const handleClusterClick = (clusterId: string) => {
    const cluster = clusteredPins.find(c => c.id === clusterId)
    if (cluster) {
      setSelectedCluster(cluster)
      setShowClusterDetails(true)
    }
  }

  const handleViewModeChange = (newMode: "map" | "list") => {
    setViewMode(newMode)
  }

  const closePinDetails = () => {
    setSelectedPin(null)
  }

  const closeClusterDetails = () => {
    setSelectedCluster(null)
    setShowClusterDetails(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Recommendations</h1>
            <div className="w-20"></div>
          </div>
          
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading recommendations...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (mapError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Recommendations</h1>
            <div className="w-20"></div>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">Map Error</h3>
            <p className="text-red-600">{mapError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          
          <h1 className="text-2xl font-bold text-gray-800">Recommendations</h1>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleViewModeChange("map")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "map" 
                  ? "bg-blue-100 text-blue-700" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Map className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleViewModeChange("list")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "list" 
                  ? "bg-blue-100 text-blue-700" 
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Mode Content */}
        {viewMode === "map" ? (
          <div className="space-y-4">
            {/* Map Container */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div 
                ref={mapRef}
                className="w-full h-96 bg-gray-100"
                style={{ minHeight: "400px" }}
              />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-gray-800">AI Suggestions</span>
                </div>
                <p className="text-2xl font-bold text-purple-600">
                  {recommendations.filter(r => r.type === "ai").length}
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-gray-800">Community</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {recommendations.filter(r => r.type === "community").length}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* List View */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">
                  All Recommendations ({recommendations.length})
                </h2>
              </div>
              
              <div className="divide-y divide-gray-200">
                {recommendations.map((rec) => (
                  <div 
                    key={rec.id}
                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handlePinClick(rec)}
                  >
                    <div className="flex items-start space-x-4">
                      {rec.photo && (
                        <img 
                          src={rec.photo} 
                          alt={rec.name}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-gray-800 truncate">
                            {rec.name}
                          </h3>
                          {rec.type === "ai" ? (
                            <Sparkles className="w-4 h-4 text-purple-600" />
                          ) : (
                            <Users className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {rec.description}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          {rec.rating && (
                            <span className="flex items-center space-x-1">
                              <span>⭐</span>
                              <span>{rec.rating}</span>
                            </span>
                          )}
                          
                          {rec.distance && (
                            <span>📍 {rec.distance.toFixed(1)}km away</span>
                          )}
                          
                          {rec.pinnedBy && (
                            <span>👤 {rec.pinnedBy}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pin Details Modal */}
        {selectedPin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {selectedPin.name}
                  </h3>
                  <button
                    onClick={closePinDetails}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                
                {selectedPin.photo && (
                  <img 
                    src={selectedPin.photo} 
                    alt={selectedPin.name}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                )}
                
                <p className="text-gray-600 mb-4">{selectedPin.description}</p>
                
                <div className="space-y-2 text-sm text-gray-500">
                  {selectedPin.rating && (
                    <div className="flex items-center space-x-2">
                      <span>⭐ Rating:</span>
                      <span>{selectedPin.rating}</span>
                    </div>
                  )}
                  
                  {selectedPin.distance && (
                    <div className="flex items-center space-x-2">
                      <span>📍 Distance:</span>
                      <span>{selectedPin.distance.toFixed(1)}km</span>
                    </div>
                  )}
                  
                  {selectedPin.pinnedBy && (
                    <div className="flex items-center space-x-2">
                      <span>👤 Pinned by:</span>
                      <span>{selectedPin.pinnedBy}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cluster Details Modal */}
        {showClusterDetails && selectedCluster && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {selectedCluster.count} Recommendations
                  </h3>
                  <button
                    onClick={closeClusterDetails}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-3">
                  {selectedCluster.recommendations.map((rec) => (
                    <div 
                      key={rec.id}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedPin(rec)
                        closeClusterDetails()
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        {rec.type === "ai" ? (
                          <Sparkles className="w-4 h-4 text-purple-600" />
                        ) : (
                          <Users className="w-4 h-4 text-blue-600" />
                        )}
                        <span className="font-medium text-gray-800">{rec.name}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {rec.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
