"use client"

import { useState, useEffect, useCallback } from "react"
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

interface MapPin {
  id: string
  lat: number
  lng: number
  type: "ai" | "community"
  data: Recommendation
}

export function RecommendationsHub({ onBack }: { onBack: () => void }) {
  const [viewMode, setViewMode] = useState<"map" | "list">("map")
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [selectedPin, setSelectedPin] = useState<Recommendation | null>(null)
  const [mapZoom, setMapZoom] = useState(14)
  const [isLoading, setIsLoading] = useState(true)
  const [mapError, setMapError] = useState(false)

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
        name: "Sarah's Secret Garden",
        description: "Beautiful hidden garden discovered by Sarah",
        location: { lat: lat + 0.004, lng: lng - 0.001 },
        rating: 4.8,
        type: "community",
        distance: 0.7,
        photo: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400&h=300&fit=crop",
        pinnedBy: "Sarah"
      },
      {
        id: "community-2",
        name: "Mike's Mountain View",
        description: "Incredible sunset spot shared by Mike",
        location: { lat: lat - 0.004, lng: lng + 0.004 },
        rating: 4.9,
        type: "community", 
        distance: 0.8,
        photo: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
        pinnedBy: "Mike"
      },
      {
        id: "community-3",
        name: "Emma's Coffee Corner",
        description: "Best latte in town - Emma's favorite",
        location: { lat: lat + 0.002, lng: lng + 0.004 },
        rating: 4.6,
        type: "community",
        distance: 0.4,
        photo: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop",
        pinnedBy: "Emma"
      },
      {
        id: "community-4",
        name: "David's Street Art",
        description: "Amazing murals discovered by David",
        location: { lat: lat - 0.002, lng: lng - 0.004 },
        rating: 4.7,
        type: "community",
        distance: 0.5,
        photo: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=300&fit=crop",
        pinnedBy: "David"
      },
      {
        id: "community-5",
        name: "Lisa's Local Market",
        description: "Fresh produce and friendly vendors - Lisa's pick",
        location: { lat: lat + 0.005, lng: lng + 0.002 },
        rating: 4.5,
        type: "community",
        distance: 0.9,
        photo: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop",
        pinnedBy: "Lisa"
      }
    ]
    return communityRecommendations
  }, [])

  // Get user location and generate recommendations
  useEffect(() => {
    const initializeRecommendations = async () => {
      setIsLoading(true)
      
      // Get user location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords
            setUserLocation({ lat: latitude, lng: longitude })
            
            // Generate recommendations
            const aiRecs = generateAIRecommendations(latitude, longitude)
            const communityRecs = generateCommunityRecommendations(latitude, longitude)
            
            setRecommendations([...aiRecs, ...communityRecs])
            setIsLoading(false)
          },
          (error) => {
            console.error("Location error:", error)
            // Fallback to default location (Cape Town area)
            const defaultLocation = { lat: -33.8788, lng: 18.6188 }
            setUserLocation(defaultLocation)
            
            const aiRecs = generateAIRecommendations(defaultLocation.lat, defaultLocation.lng)
            const communityRecs = generateCommunityRecommendations(defaultLocation.lat, defaultLocation.lng)
            
            setRecommendations([...aiRecs, ...communityRecs])
            setIsLoading(false)
          }
        )
      } else {
        // Fallback for browsers without geolocation
        const defaultLocation = { lat: -33.8788, lng: 18.6188 }
        setUserLocation(defaultLocation)
        
        const aiRecs = generateAIRecommendations(defaultLocation.lat, defaultLocation.lng)
        const communityRecs = generateCommunityRecommendations(defaultLocation.lat, defaultLocation.lng)
        
        setRecommendations([...aiRecs, ...communityRecs])
        setIsLoading(false)
      }
    }

    initializeRecommendations()
  }, [generateAIRecommendations, generateCommunityRecommendations])

  // Generate map pins with clustering
  const generateMapPins = (): MapPin[] => {
    return recommendations.map(rec => ({
      id: rec.id,
      lat: rec.location.lat,
      lng: rec.location.lng,
      type: rec.type,
      data: rec
    }))
  }

  const handlePinClick = (recommendation: Recommendation) => {
    setSelectedPin(recommendation)
  }

  const closePinDetails = () => {
    setSelectedPin(null)
  }

  const getMapUrl = () => {
    if (!userLocation) {
      console.log("🗺️ No user location available")
      return ""
    }
    
    const pins = generateMapPins()
    console.log("🗺️ Generated pins:", pins)
    
    // Simplify the markers - just use basic format
    const markers = pins.map(pin => 
      `markers=color:${pin.type === "ai" ? "red" : "blue"}|${pin.lat},${pin.lng}`
    ).join("&")
    
    const center = `${userLocation.lat},${userLocation.lng}`
    const size = "600x400"
    const zoom = mapZoom
    const maptype = "roadmap"
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
    
    console.log("🗺️ API Key available:", !!apiKey)
    console.log("🗺️ Center:", center)
    console.log("🗺️ Markers:", markers)
    
    // Try with markers first, fallback to basic map
    const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${center}&zoom=${zoom}&size=${size}&maptype=${maptype}&${markers}&key=${apiKey}`
    
    console.log("🗺️ Generated map URL:", mapUrl)
    
    // Test the URL to see what error we get
    fetch(mapUrl)
      .then(response => {
        if (!response.ok) {
          console.log("🗺️ Map API Error:", response.status, response.statusText)
          return response.text()
        }
        console.log("🗺️ Map API Success!")
        return null
      })
      .then(errorText => {
        if (errorText) {
          console.log("🗺️ Map API Error Details:", errorText)
        }
      })
      .catch(error => {
        console.log("🗺️ Map API Fetch Error:", error)
      })
    
    return mapUrl
  }

  const getBasicMapUrl = () => {
    if (!userLocation) return ""
    
    const center = `${userLocation.lat},${userLocation.lng}`
    const size = "600x400"
    const zoom = mapZoom
    const maptype = "roadmap"
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
    
    const basicUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${center}&zoom=${zoom}&size=${size}&maptype=${maptype}&key=${apiKey}`
    console.log("🗺️ Basic map URL:", basicUrl)
    
    return basicUrl
  }

  const getTestMapUrl = () => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
    return `https://maps.googleapis.com/maps/api/staticmap?center=New+York&zoom=10&size=600x400&maptype=roadmap&key=${apiKey}`
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
          flexDirection: "column",
          gap: "1rem"
        }}>
          <div style={{ fontSize: "3rem" }}>🗺️</div>
          <div style={{ fontSize: "1.2rem", textAlign: "center" }}>
            Loading your personalized recommendations...
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
        <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>Discover</h1>
        <button
          onClick={() => setViewMode(viewMode === "map" ? "list" : "map")}
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
          {viewMode === "map" ? <List size={24} /> : <Map size={24} />}
        </button>
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
          {/* Live Map */}
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
            background: mapError ? "linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #581c87 100%)" : "transparent",
          }}>
            {!mapError ? (
              <img
                src={getMapUrl()}
                alt="Live Recommendations Map"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
                onLoad={(e) => {
                  console.log("🗺️ Map loaded successfully")
                }}
                onError={(e) => {
                  console.log("🗺️ Map with markers failed, trying basic map...")
                  // Try basic map without markers
                  const basicMapUrl = getBasicMapUrl()
                  if (basicMapUrl) {
                    e.currentTarget.src = basicMapUrl
                    e.currentTarget.onerror = () => {
                      console.log("🗺️ Basic map also failed, trying test map...")
                      // Try a simple test map
                      const testMapUrl = getTestMapUrl()
                      e.currentTarget.src = testMapUrl
                      e.currentTarget.onerror = () => {
                        console.log("🗺️ Test map also failed, showing fallback")
                        setMapError(true)
                      }
                    }
                  } else {
                    setMapError(true)
                  }
                }}
              />
            ) : (
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                color: "white",
                textAlign: "center",
                fontSize: "1.2rem",
                opacity: 0.8,
              }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🗺️</div>
                <div>Map loading...</div>
                <div style={{ fontSize: "0.875rem", marginTop: "0.5rem", opacity: 0.7 }}>
                  Pins are interactive below
                </div>
              </div>
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
                onClick={() => setMapZoom(Math.min(20, mapZoom + 1))}
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
                onClick={() => setMapZoom(Math.max(10, mapZoom - 1))}
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
              fontSize: "0.875rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "red" }}></div>
                <span>AI Recommendations</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "blue" }}></div>
                <span>Community Pins</span>
              </div>
            </div>
          </div>

          {/* Interactive Pins Overlay */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: "none",
          }}>
            {generateMapPins().map((pin) => (
              <button
                key={pin.id}
                onClick={() => handlePinClick(pin.data)}
                style={{
                  position: "absolute",
                  left: `${((pin.lng - (userLocation?.lng || 0)) / 0.01) * 50 + 50}%`,
                  top: `${((pin.lat - (userLocation?.lat || 0)) / 0.01) * 50 + 50}%`,
                  transform: "translate(-50%, -50%)",
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  border: "2px solid white",
                  background: pin.type === "ai" ? "red" : "blue",
                  cursor: "pointer",
                  pointerEvents: "auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  color: "white",
                  fontWeight: "bold",
                }}
              >
                {pin.type === "ai" ? "🤖" : "👥"}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* LIST VIEW */
        <div style={{
          flex: 1,
          padding: "1rem",
          overflowY: "auto",
        }}>
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}>
            {recommendations.map((recommendation) => (
              <div
                key={recommendation.id}
                onClick={() => handlePinClick(recommendation)}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: "1rem",
                  padding: "1rem",
                  cursor: "pointer",
                  border: "1px solid rgba(255,255,255,0.2)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.2)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)"
                }}
              >
                <div style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "1rem",
                }}>
                  {recommendation.photo && (
                    <img
                      src={recommendation.photo}
                      alt={recommendation.name}
                      style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "0.5rem",
                        objectFit: "cover",
                      }}
                    />
                  )}
                  
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.5rem",
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        fontSize: "0.875rem",
                        opacity: 0.8,
                      }}>
                        {recommendation.type === "ai" ? (
                          <>
                            <Sparkles size={16} />
                            AI Recommended
                          </>
                        ) : (
                          <>
                            <Users size={16} />
                            {recommendation.pinnedBy}'s Pick
                          </>
                        )}
                      </div>
                      
                      {recommendation.rating && (
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          fontSize: "0.875rem",
                          opacity: 0.8,
                        }}>
                          ⭐ {recommendation.rating}
                        </div>
                      )}
                    </div>
                    
                    <h3 style={{
                      margin: "0 0 0.5rem 0",
                      fontSize: "1.1rem",
                      fontWeight: "bold",
                    }}>
                      {recommendation.name}
                    </h3>
                    
                    <p style={{
                      margin: "0 0 0.5rem 0",
                      fontSize: "0.875rem",
                      opacity: 0.8,
                      lineHeight: "1.4",
                    }}>
                      {recommendation.description}
                    </p>
                    
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      fontSize: "0.75rem",
                      opacity: 0.7,
                    }}>
                      <MapPin size={14} />
                      {recommendation.distance}km away
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
            position: "relative",
          }}>
            <button
              onClick={closePinDetails}
              style={{
                position: "absolute",
                top: "1rem",
                right: "1rem",
                background: "rgba(255,255,255,0.2)",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ×
            </button>
            
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
            
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.5rem",
            }}>
              {selectedPin.type === "ai" ? (
                <>
                  <Sparkles size={20} />
                  <span style={{ fontSize: "0.875rem", opacity: 0.8 }}>AI Recommended</span>
                </>
              ) : (
                <>
                  <Users size={20} />
                  <span style={{ fontSize: "0.875rem", opacity: 0.8 }}>{selectedPin.pinnedBy}'s Pick</span>
                </>
              )}
            </div>
            
            <h2 style={{
              margin: "0 0 0.5rem 0",
              fontSize: "1.5rem",
              fontWeight: "bold",
            }}>
              {selectedPin.name}
            </h2>
            
            <p style={{
              margin: "0 0 1rem 0",
              fontSize: "1rem",
              lineHeight: "1.5",
              opacity: 0.9,
            }}>
              {selectedPin.description}
            </p>
            
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.875rem",
                opacity: 0.8,
              }}>
                <MapPin size={16} />
                {selectedPin.distance}km away
              </div>
              
              {selectedPin.rating && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  fontSize: "0.875rem",
                }}>
                  ⭐ {selectedPin.rating}
                </div>
              )}
            </div>
            
            <div style={{
              display: "flex",
              gap: "0.5rem",
              marginTop: "1rem",
            }}>
              <button
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
                Save to Library
              </button>
              <button
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: "none",
                  background: "#10B981",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: "bold",
                }}
              >
                Get Directions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
