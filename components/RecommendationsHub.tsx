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

interface MapPin {
  id: string
  lat: number
  lng: number
  type: "ai" | "community"
  data: Recommendation
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

export function RecommendationsHub({ 
  onBack, 
  pins = [], 
  aiRecommendations = [] 
}: { 
  onBack: () => void; 
  pins?: PinData[];
  aiRecommendations?: any[];
}) {
  console.log("🗺️ RecommendationsHub component loaded!")
  console.log("🗺️ Received pins:", pins.length)
  console.log("🗺️ Received AI recommendations:", aiRecommendations.length)
  
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
  
  // Map persistence state
  const [mapInitialized, setMapInitialized] = useState(false)
  
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const mapContainerRef = useRef<HTMLDivElement>(null)

  // Clustering logic - group recommendations by location
  const clusterRecommendations = useCallback((recommendations: Recommendation[]): ClusteredPin[] => {
    const clusters: ClusteredPin[] = []
    const CLUSTER_RADIUS = 0.01 // Increased from 0.001 to 0.01 (about 1km instead of 100m)
    
    console.log("🗺️ Clustering recommendations with radius:", CLUSTER_RADIUS, "degrees (about 1km)")
    console.log("🗺️ Total recommendations to cluster:", recommendations.length)
    
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
          
          // Update type if mixed
          if (cluster.type !== rec.type) {
            cluster.type = "mixed"
          }
          
          console.log("🗺️ Added to existing cluster:", rec.name, "distance:", distance.toFixed(4), "cluster count:", cluster.count)
          addedToCluster = true
          break
        }
      }
      
      if (!addedToCluster) {
        // Create new cluster
        const newCluster = {
          id: `cluster-${clusters.length}`,
          location: { lat: rec.location.lat, lng: rec.location.lng },
          recommendations: [rec],
          count: 1,
          averageRating: rec.rating || 0,
          type: rec.type
        }
        clusters.push(newCluster)
        console.log("🗺️ Created new cluster:", rec.name, "at", rec.location.lat.toFixed(4), rec.location.lng.toFixed(4))
      }
    })
    
    console.log("🗺️ Final clustering result:", clusters.length, "clusters created")
    clusters.forEach((cluster, index) => {
      console.log(`🗺️ Cluster ${index + 1}:`, cluster.count, "pins, type:", cluster.type, "at", cluster.location.lat.toFixed(4), cluster.location.lng.toFixed(4))
    })
    
    return clusters
  }, [])

  // REMOVED: generateAIRecommendations and generateCommunityRecommendations functions
  // Now only real user pins are used

  // Initialize recommendations and user location
  useEffect(() => {
    const initializeRecommendations = async () => {
      try {
        // DEBUG: Log all received data
        console.log("🗺️ RecommendationsHub - All pins received:", pins)
        console.log("🗺️ RecommendationsHub - AI recommendations received:", aiRecommendations)
        console.log("🗺️ RecommendationsHub - Pins with isRecommended:", pins.filter(pin => pin.isRecommended))
        console.log("🗺️ RecommendationsHub - Pins with isAISuggestion:", pins.filter(pin => pin.isAISuggestion))
        console.log("🗺️ RecommendationsHub - Total pins count:", pins.length)
        
        // Get user location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords
              console.log("🗺️ User location:", latitude, longitude)
              
              setUserLocation({ lat: latitude, lng: longitude })
              
              // Convert pins to recommendations - REAL USER PINS
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
              
              // Convert AI recommendations to the same format
              const aiRecommendationsFormatted = aiRecommendations
                .filter(rec => rec.isAISuggestion)
                .map(rec => ({
                  id: rec.id,
                  name: rec.title,
                  description: rec.description,
                  location: {
                    lat: rec.latitude, // Use actual coordinates from nearbyPins instead of user location
                    lng: rec.longitude  // Use actual coordinates from nearbyPins instead of user location
                  },
                  rating: rec.rating || 4.5, // Use actual rating if available
                  type: "ai" as "ai",
                  distance: Math.sqrt(
                    Math.pow(latitude - rec.latitude, 2) +
                    Math.pow(longitude - rec.longitude, 2)
                  ), // Calculate actual distance
                  photo: rec.mediaUrl || undefined,
                  pinnedBy: "AI Assistant"
                }))
              
              // Combine both types of recommendations
              const allRecommendations = [...pinRecommendations, ...aiRecommendationsFormatted]
              
              // DEBUG: Log the conversion process
              console.log("🗺️ Pin recommendations created:", pinRecommendations)
              console.log("🗺️ AI recommendations formatted:", aiRecommendationsFormatted)
              console.log("🗺️ All recommendations combined:", allRecommendations)
              console.log("🗺️ AI recommendations count:", allRecommendations.filter(r => r.type === "ai").length)
              console.log("🗺️ Community recommendations count:", allRecommendations.filter(r => r.type === "community").length)
              
              console.log(`🗺️ Loaded ${allRecommendations.length} total recommendations`)
              setRecommendations(allRecommendations)
              setIsLoading(false)
            },
            (error) => {
              console.error("🗺️ Location error:", error)
              // Fallback to Cape Town coordinates
              const fallbackLat = -33.8788
              const fallbackLng = 18.6188
              
              setUserLocation({ lat: fallbackLat, lng: fallbackLng })
              
              // Convert pins to recommendations - REAL USER PINS
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
              
              // Convert AI recommendations to the same format
              const aiRecommendationsFormatted = aiRecommendations
                .filter(rec => rec.isAISuggestion)
                .map(rec => ({
                  id: rec.id,
                  name: rec.title,
                  description: rec.description,
                  location: {
                    lat: userLocation?.lat || fallbackLat,
                    lng: userLocation?.lng || fallbackLng
                  },
                  rating: 4.5, // Default rating for AI recommendations
                  type: "ai" as "ai",
                  distance: 0.1, // Close to user
                  photo: undefined,
                  pinnedBy: "AI Assistant"
                }))
              
              // Combine both types of recommendations
              const allRecommendations = [...pinRecommendations, ...aiRecommendationsFormatted]
              
              // DEBUG: Log the conversion process
              console.log("🗺️ Pin recommendations created (fallback):", pinRecommendations)
              console.log("🗺️ AI recommendations formatted (fallback):", aiRecommendationsFormatted)
              console.log("🗺️ All recommendations combined (fallback):", allRecommendations)
              console.log("🗺️ AI recommendations count (fallback):", allRecommendations.filter(r => r.type === "ai").length)
              console.log("🗺️ Community recommendations count (fallback):", allRecommendations.filter(r => r.type === "community").length)
              
              console.log(`🗺️ Loaded ${allRecommendations.length} total recommendations (fallback location)`)
              setRecommendations(allRecommendations)
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
  }, [pins, aiRecommendations]) // Added aiRecommendations to dependencies

  // Apply clustering when recommendations change
  useEffect(() => {
    if (recommendations.length > 0) {
      const clusters = clusterRecommendations(recommendations)
      setClusteredPins(clusters)
      console.log(`🗺️ Clustered ${recommendations.length} recommendations into ${clusters.length} clusters`)
    }
  }, [recommendations, clusterRecommendations])

  // Preserve map when switching views
  useEffect(() => {
    if (viewMode === "map" && mapInitialized && mapInstanceRef.current) {
      console.log("🗺️ Map view selected, ensuring map is visible")
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        if (mapRef.current && mapInstanceRef.current) {
          mapInstanceRef.current.setMap(mapRef.current)
        }
      }, 100)
    }
  }, [viewMode, mapInitialized])

  // Stronger map preservation - prevent map destruction
  useEffect(() => {
    if (viewMode === "map" && mapInitialized && mapInstanceRef.current) {
      console.log("🗺️ Ensuring map container is preserved")
      // Force map to stay attached to container
      if (mapRef.current && mapInstanceRef.current) {
        try {
          mapInstanceRef.current.setMap(mapRef.current)
          // Trigger a resize event to ensure map renders properly
          setTimeout(() => {
            if (window.google && window.google.maps && mapInstanceRef.current) {
              window.google.maps.event.trigger(mapInstanceRef.current, 'resize')
            }
          }, 200)
        } catch (error) {
          console.log("🗺️ Map preservation error:", error)
        }
      }
    }
  }, [viewMode, mapInitialized])

  // Function to add recommendation markers to the map
  const addRecommendationMarkers = (map: any) => {
    try {
      console.log("🗺️ Adding markers to map, clustered pins:", clusteredPins)
      
      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null))
      markersRef.current = []

      // Use clustered pins instead of individual recommendations
      clusteredPins.forEach((cluster) => {
        console.log("🗺️ Processing cluster:", cluster)
        
        if (cluster.count === 1) {
          // Single pin - show individual marker
          const rec = cluster.recommendations[0]
          console.log("🗺️ Creating single pin marker for:", rec.name, "at", cluster.location)
          
          const marker = new window.google.maps.Marker({
            position: { lat: cluster.location.lat, lng: cluster.location.lng },
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
            console.log("🎯 Pin clicked:", rec)
            handlePinClick(rec)
          })

          markersRef.current.push(marker)
          console.log("🗺️ Single pin marker added successfully")
        } else {
          // Multiple pins - show cluster marker with count
          console.log("🗺️ Creating cluster marker for", cluster.count, "pins at", cluster.location)
          
          const marker = new window.google.maps.Marker({
            position: { lat: cluster.location.lat, lng: cluster.location.lng },
            map: map,
            title: `${cluster.count} recommendations`,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 12, // Slightly larger for clusters
              fillColor: cluster.type === "ai" ? "#EF4444" : cluster.type === "community" ? "#3B82F6" : "#8B5CF6",
              fillOpacity: 1,
              strokeColor: "#FFFFFF",
              strokeWeight: 3
            }
          })

          // Add click listener for cluster
          marker.addListener("click", () => {
            console.log("🎯 Cluster clicked:", cluster)
            handleClusterClick(cluster.id)
          })

          markersRef.current.push(marker)

          // Add count label on top of cluster marker
          const countLabel = new window.google.maps.Marker({
            position: { lat: cluster.location.lat, lng: cluster.location.lng },
            map: map,
            title: `${cluster.count} recommendations`,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#FFFFFF",
              fillOpacity: 1,
              strokeColor: cluster.type === "ai" ? "#EF4444" : cluster.type === "community" ? "#3B82F6" : "#8B5CF6",
              strokeWeight: 2
            },
            label: {
              text: cluster.count.toString(),
              color: "#1F2937",
              fontSize: "12px",
              fontWeight: "bold"
            }
          })

          markersRef.current.push(countLabel)
          console.log("🗺️ Cluster marker added successfully")
        }
      })
      
      console.log("🗺️ Total markers added:", markersRef.current.length)
    } catch (error) {
      console.error("🗺️ Error adding markers:", error)
      // Log error but don't call fallback function from this scope
      setMapError("Failed to add map markers")
    }
  }

  // Update map markers when clustered pins change
  useEffect(() => {
    if (mapInstanceRef.current && clusteredPins.length > 0) {
      console.log("🗺️ Updating map markers with clustered pins:", clusteredPins.length)
      addRecommendationMarkers(mapInstanceRef.current)
    }
  }, [clusteredPins])

  // Prevent map marker clearing during view changes
  useEffect(() => {
    if (viewMode === "map" && mapInitialized && mapInstanceRef.current && clusteredPins.length > 0) {
      console.log("🗺️ View changed to map, preserving existing markers")
      // Don't clear markers, just ensure they're visible
      setTimeout(() => {
        if (mapInstanceRef.current && markersRef.current.length > 0) {
          console.log("🗺️ Ensuring markers remain visible")
        }
      }, 100)
    }
  }, [viewMode, mapInitialized, clusteredPins])

  // Load Google Maps API
  useEffect(() => {
    if (!userLocation || !mapRef.current) return

    // Don't reinitialize if map is already working
    if (mapInitialized && mapInstanceRef.current) {
      console.log("🗺️ Map already initialized, skipping reinitialization")
      return
    }

    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        console.log("🗺️ Google Maps already loaded, initializing...")
        initializeMap()
        return
      }

      console.log("🗺️ Loading Google Maps API...")
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
        setMapError("Failed to load Google Maps")
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
        setMapInitialized(true) // Mark map as initialized

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
        // If Google Maps fails, show beautiful fallback
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

  const handlePinClick = (recommendation: Recommendation) => {
    console.log("🎯 handlePinClick called with:", recommendation)
    setSelectedPin(recommendation)
  }

  const closePinDetails = () => {
    setSelectedPin(null)
  }

  // Handle cluster clicks
  const handleClusterClick = (clusterId: string) => {
    const cluster = clusteredPins.find(c => c.id === clusterId)
    if (cluster) {
      setSelectedCluster(cluster)
      setShowClusterDetails(true)
    }
  }

  const closeClusterDetails = () => {
    setSelectedCluster(null)
    setShowClusterDetails(false)
  }

  if (isLoading) {
    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #581c87 100%)",
        display: "flex",
        flexDirection: "column",
        color: "white",
      }}>
        <div style={{
          padding: "1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(0,0,0,0.2)",
        }}>
          <button
            onClick={onBack}
            style={{
              padding: "0.75rem",
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowLeft size={24} />
          </button>
          <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>Recommendations</h1>
          <div style={{ width: "48px" }} />
        </div>
        
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🗺️</div>
            <div style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>Loading Recommendations...</div>
            <div style={{ fontSize: "0.875rem", opacity: 0.7 }}>Finding places near you</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #581c87 100%)",
      display: "flex",
      flexDirection: "column",
      color: "white",
    }}>
      {/* Header */}
      <div style={{
        padding: "1rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(0,0,0,0.2)",
      }}>
        <button
          onClick={onBack}
          style={{
            padding: "0.75rem",
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>Recommendations</h1>
        <div style={{ width: "48px" }} />
      </div>

      {/* View Mode Toggle */}
      <div style={{
        padding: "0.5rem 1rem",
        display: "flex",
        gap: "0.5rem",
        background: "rgba(0,0,0,0.1)",
      }}>
        <button
          onClick={() => setViewMode("map")}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "none",
            background: viewMode === "map" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
            color: "white",
            cursor: "pointer",
            fontSize: "0.875rem",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
          }}
        >
          <Map size={16} />
          Map View
        </button>
        <button
          onClick={() => setViewMode("list")}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "none",
            background: viewMode === "list" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
            color: "white",
            cursor: "pointer",
            fontSize: "0.875rem",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
          }}
        >
          <List size={16} />
          List View
        </button>
      </div>

      {viewMode === "map" ? (
        /* MAP VIEW */
        <div style={{ flex: 1, position: "relative" }}>
          {/* Live Google Map */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: "1rem",
            margin: "1rem",
            overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.2)",
            background: "transparent",
          }}>
            {mapError ? (
              <div style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #581c87 100%)",
                color: "white",
                textAlign: "center",
                fontSize: "1.2rem",
              }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🗺️</div>
                <div>Map Unavailable</div>
                <div style={{ fontSize: "0.875rem", marginTop: "0.5rem", opacity: 0.7 }}>
                  {mapError}
                </div>
              </div>
            ) : (
              <div 
                ref={mapRef} 
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "0.5rem",
                }}
              />
            )}
            
            {/* Map Overlay Controls */}
            <div style={{
              position: "absolute",
              top: "1rem",
              right: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}>
              <button
                onClick={() => {
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.setZoom(mapInstanceRef.current.getZoom() + 1)
                  }
                }}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  border: "none",
                  background: "rgba(0,0,0,0.7)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                }}
              >
                +
              </button>
              <button
                onClick={() => {
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.setZoom(mapInstanceRef.current.getZoom() - 1)
                  }
                }}
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  border: "none",
                  background: "rgba(0,0,0,0.7)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                }}
              >
                −
              </button>
            </div>

            {/* Legend */}
            <div style={{
              position: "absolute",
              bottom: "1rem",
              left: "1rem",
              background: "rgba(0,0,0,0.8)",
              padding: "0.75rem",
              borderRadius: "0.5rem",
              fontSize: "0.75rem",
            }}>
              <div style={{ marginBottom: "0.5rem", fontWeight: "bold" }}>Legend</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#EF4444" }}></div>
                <span>AI Recommendations</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3B82F6" }}></div>
                <span>Community Pins</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* LIST VIEW */
        <div style={{ flex: 1, padding: "1rem", overflowY: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                onClick={() => handlePinClick(rec)}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "1rem",
                  padding: "1rem",
                  cursor: "pointer",
                  border: "1px solid rgba(255,255,255,0.2)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.15)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)"
                }}
              >
                <div style={{ display: "flex", gap: "1rem" }}>
                  {rec.photo && (
                    <img
                      src={rec.photo}
                      alt={rec.name}
                      style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "0.5rem",
                        objectFit: "cover",
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                      <span style={{ fontSize: "1.1rem", fontWeight: "bold" }}>{rec.name}</span>
                      {rec.type === "ai" ? (
                        <Sparkles size={16} style={{ color: "#EF4444" }} />
                      ) : (
                        <Users size={16} style={{ color: "#3B82F6" }} />
                      )}
                    </div>
                    <p style={{ fontSize: "0.875rem", opacity: 0.8, marginBottom: "0.5rem" }}>
                      {rec.description}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.75rem", opacity: 0.7 }}>
                      {rec.rating && (
                        <span>⭐ {rec.rating}</span>
                      )}
                      {rec.distance && (
                        <span>📍 {rec.distance}km away</span>
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
      )}

      {/* Pin Details Modal */}
      {selectedPin && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "1rem",
        }}>
          <div style={{
            background: "linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #581c87 100%)",
            borderRadius: "1rem",
            padding: "1.5rem",
            maxWidth: "400px",
            width: "100%",
            color: "white",
            border: "2px solid rgba(255,255,255,0.2)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              {selectedPin.type === "ai" ? (
                <Sparkles size={24} style={{ color: "#EF4444" }} />
              ) : (
                <Users size={24} style={{ color: "#3B82F6" }} />
              )}
              <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>{selectedPin.name}</h2>
            </div>
            
            {selectedPin.photo && (
              <img
                src={selectedPin.photo}
                alt={selectedPin.name}
                style={{
                  width: "100%",
                  height: "200px",
                  borderRadius: "0.5rem",
                  objectFit: "cover",
                  marginBottom: "1rem",
                }}
              />
            )}
            
            <p style={{ marginBottom: "1rem", opacity: 0.9 }}>{selectedPin.description}</p>
            
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem", fontSize: "0.875rem", opacity: 0.8 }}>
              {selectedPin.rating && (
                <span>⭐ {selectedPin.rating}</span>
              )}
              {selectedPin.distance && (
                <span>📍 {selectedPin.distance}km away</span>
              )}
              {selectedPin.pinnedBy && (
                <span>👤 {selectedPin.pinnedBy}</span>
              )}
            </div>
            
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={closePinDetails}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  // TODO: Implement navigation
                  closePinDetails()
                }}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: "bold",
                }}
              >
                Navigate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cluster Details Modal */}
      {showClusterDetails && selectedCluster && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "1rem",
        }}>
          <div style={{
            background: "linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #581c87 100%)",
            borderRadius: "1rem",
            padding: "1.5rem",
            maxWidth: "500px",
            width: "100%",
            color: "white",
            border: "2px solid rgba(255,255,255,0.2)",
            maxHeight: "80vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: selectedCluster.type === "ai" ? "#EF4444" : selectedCluster.type === "community" ? "#3B82F6" : "#10B981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.2rem",
                }}>
                  {selectedCluster.type === "ai" ? "🤖" : selectedCluster.type === "community" ? "👥" : "🌟"}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>
                    {selectedCluster.count} Recommendations
                  </h2>
                  <div style={{ fontSize: "0.875rem", opacity: 0.8 }}>
                    ⭐ {selectedCluster.averageRating.toFixed(1)} average rating
                  </div>
                </div>
              </div>
              <button
                onClick={closeClusterDetails}
                style={{
                  padding: "0.5rem",
                  border: "none",
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                }}
              >
                ×
              </button>
            </div>

            {/* Recommendations List */}
            <div style={{ flex: 1, overflowY: "auto", marginBottom: "1rem" }}>
              {selectedCluster.recommendations.map((rec, index) => (
                <div
                  key={rec.id}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: "0.5rem",
                    padding: "1rem",
                    marginBottom: "0.5rem",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "1.2rem" }}>
                        {rec.type === "ai" ? "🤖" : "👥"}
                      </span>
                      <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "600" }}>
                        {rec.name}
                      </h3>
                    </div>
                    {rec.rating && (
                      <span style={{ fontSize: "0.875rem", opacity: 0.8 }}>
                        ⭐ {rec.rating}
                      </span>
                    )}
                  </div>
                  
                  <p style={{ margin: 0, fontSize: "0.875rem", opacity: 0.9, lineHeight: "1.4" }}>
                    {rec.description}
                  </p>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.5rem", fontSize: "0.75rem", opacity: 0.7 }}>
                    {rec.distance && (
                      <span>📍 {rec.distance}km away</span>
                    )}
                    {rec.pinnedBy && (
                      <span>👤 {rec.pinnedBy}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={closeClusterDetails}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  // TODO: Implement navigation to this cluster location
                  closeClusterDetails()
                }}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: "bold",
                }}
              >
                Navigate Here
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
