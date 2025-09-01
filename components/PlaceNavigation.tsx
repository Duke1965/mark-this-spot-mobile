"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ArrowLeft, Navigation, Bookmark, Star, Phone, Globe } from "lucide-react"

interface PlaceNavigationProps {
  place: {
    id: string
    title: string
    description?: string
    latitude: number
    longitude: number
    rating?: number
    priceLevel?: number
    types?: string[]
    googlePlaceId?: string
    mediaUrl?: string | null
    vicinity?: string
    phoneNumber?: string
    website?: string
    openingHours?: string[]
  }
  userLocation: { latitude: number; longitude: number } | null
  onBack: () => void
  onSaveForLater: (place: any) => void
  onNavigate: (place: any) => void
  onArrived: (place: any, shouldSave: boolean) => void
}

export function PlaceNavigation({
  place,
  userLocation,
  onBack,
  onSaveForLater,
  onNavigate,
  onArrived,
}: PlaceNavigationProps) {
  const [isNavigating, setIsNavigating] = useState(false)
  const [hasArrived, setHasArrived] = useState(false)
  const [distance, setDistance] = useState<number | null>(null)
  const [estimatedTime, setEstimatedTime] = useState<string | null>(null)
  const [showArrivalPrompt, setShowArrivalPrompt] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [directionsService, setDirectionsService] = useState<any>(null)
  const [directionsRenderer, setDirectionsRenderer] = useState<any>(null)

  // Calculate distance and estimated time
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }, [])

  // Initialize Google Maps
  useEffect(() => {
    if (!mapRef.current || !userLocation) return

    const initMap = () => {
      const mapOptions = {
        center: { lat: place.latitude, lng: place.longitude },
        zoom: 15,
        mapTypeId: "roadmap",
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: true,
        fullscreenControl: false,
      }

      const newMap = new (window as any).google.maps.Map(mapRef.current!, mapOptions)
      setMap(newMap)

      // Add marker for destination
      ;new (window as any).google.maps.Marker({
        position: { lat: place.latitude, lng: place.longitude },
        map: newMap,
        title: place.title,
        icon: {
          path: (window as any).google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#EF4444",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
        },
      })

      // Add marker for user location
      ;new (window as any).google.maps.Marker({
        position: { lat: userLocation.latitude, lng: userLocation.longitude },
        map: newMap,
        title: "Your Location",
        icon: {
          path: (window as any).google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#3B82F6",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
        },
      })

      // Initialize directions service and renderer
      const directionsService = new (window as any).google.maps.DirectionsService()
      const directionsRenderer = new (window as any).google.maps.DirectionsRenderer({
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: "#3B82F6",
          strokeWeight: 4,
        },
      })

      setDirectionsService(directionsService)
      setDirectionsRenderer(directionsRenderer)
    }

    if ((window as any).google && (window as any).google.maps) {
      initMap()
    } else {
      const script = document.createElement("script")
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
      script.async = true
      script.defer = true
      script.onload = initMap
      document.head.appendChild(script)
    }
  }, [place, userLocation])

  // Calculate initial distance and time
  useEffect(() => {
    if (userLocation) {
      const dist = calculateDistance(userLocation.latitude, userLocation.longitude, place.latitude, place.longitude)
      setDistance(dist)

      // Estimate time (assuming average speed of 30 km/h in city)
      const timeInHours = dist / 30
      const timeInMinutes = Math.round(timeInHours * 60)
      setEstimatedTime(`${timeInMinutes} min`)
    }
  }, [userLocation, place, calculateDistance])

  // Start navigation
  const handleStartNavigation = useCallback(() => {
    if (!map || !directionsService || !directionsRenderer || !userLocation) return

    setIsNavigating(true)
    onNavigate(place)

    // Get directions
    directionsService.route(
      {
        origin: { lat: userLocation.latitude, lng: userLocation.longitude },
        destination: { lat: place.latitude, lng: place.longitude },
        travelMode: (window as any).google.maps.TravelMode.DRIVING,
      },
      (result: any, status: any) => {
        if (status === (window as any).google.maps.DirectionsStatus.OK && result) {
          directionsRenderer.setDirections(result)
          directionsRenderer.setMap(map)

          // Update estimated time from Google's calculation
          const route = result.routes[0]
          if (route && route.legs[0]) {
            setEstimatedTime(route.legs[0].duration?.text || null)
            setDistance(route.legs[0].distance?.value ? route.legs[0].distance.value / 1000 : null)
          }
        } else {
          console.error("Directions request failed:", status)
          // Fallback: open in Google Maps app
          const url = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`
          window.open(url, "_blank")
        }
      },
    )

    // Start monitoring arrival
    startArrivalMonitoring()
  }, [map, directionsService, directionsRenderer, userLocation, place, onNavigate])

  // Monitor arrival
  const startArrivalMonitoring = useCallback(() => {
    const checkArrival = () => {
      if (!userLocation) return

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentDistance = calculateDistance(
            position.coords.latitude,
            position.coords.longitude,
            place.latitude,
            place.longitude,
          )

          // Consider arrived if within 100 meters
          if (currentDistance < 0.1 && !hasArrived) {
            setHasArrived(true)
            setShowArrivalPrompt(true)
            setIsNavigating(false)
          }
        },
        (error) => {
          console.error("Error getting current position:", error)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        },
      )
    }

    // Check every 30 seconds during navigation
    const interval = setInterval(checkArrival, 30000)

    // Cleanup interval when component unmounts or navigation stops
    return () => clearInterval(interval)
  }, [userLocation, place, calculateDistance, hasArrived])

  const handleSavePlace = useCallback(() => {
    onArrived(place, true)
    setShowArrivalPrompt(false)
  }, [place, onArrived])

  const handleDiscardPlace = useCallback(() => {
    onArrived(place, false)
    setShowArrivalPrompt(false)
  }, [place, onArrived])

  const formatPriceLevel = (level?: number): string => {
    if (!level) return ""
    return "💰".repeat(level)
  }

  const formatTypes = (types?: string[]): string => {
    if (!types || types.length === 0) return ""
    return types
      .slice(0, 3)
      .map((type) => type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()))
      .join(" • ")
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1rem",
          background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "0.75rem",
            padding: "0.75rem",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
            backdropFilter: "blur(10px)",
          }}
        >
          <ArrowLeft size={20} />
        </button>

        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>{place.title}</h1>
          {place.vicinity && <p style={{ margin: 0, fontSize: "0.875rem", opacity: 0.8 }}>{place.vicinity}</p>}
        </div>

        {distance && (
          <div style={{ textAlign: "right", fontSize: "0.875rem" }}>
            <div style={{ fontWeight: "bold" }}>{distance.toFixed(1)} km</div>
            {estimatedTime && <div style={{ opacity: 0.8 }}>{estimatedTime}</div>}
          </div>
        )}
      </div>

      {/* Place Details */}
      <div style={{ padding: "1rem", background: "#F8FAFC" }}>
        {place.mediaUrl && (
          <img
            src={place.mediaUrl || "/placeholder.svg"}
            alt={place.title}
            style={{
              width: "100%",
              height: "200px",
              objectFit: "cover",
              borderRadius: "0.5rem",
              marginBottom: "1rem",
            }}
          />
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
          {place.rating && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <Star size={16} style={{ color: "#F59E0B" }} />
              <span style={{ fontWeight: "bold" }}>{place.rating}</span>
            </div>
          )}

          {place.priceLevel && (
            <div style={{ color: "#10B981", fontWeight: "bold" }}>{formatPriceLevel(place.priceLevel)}</div>
          )}

          {place.types && <div style={{ fontSize: "0.875rem", color: "#6B7280" }}>{formatTypes(place.types)}</div>}
        </div>

        {place.description && (
          <p style={{ margin: "0 0 1rem 0", color: "#374151", lineHeight: 1.5 }}>{place.description}</p>
        )}

        {/* Contact Info */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          {place.phoneNumber && (
            <a
              href={`tel:${place.phoneNumber}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "#3B82F6",
                textDecoration: "none",
                fontSize: "0.875rem",
              }}
            >
              <Phone size={16} />
              Call
            </a>
          )}

          {place.website && (
            <a
              href={place.website}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "#3B82F6",
                textDecoration: "none",
                fontSize: "0.875rem",
              }}
            >
              <Globe size={16} />
              Website
            </a>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={() => onSaveForLater(place)}
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "0.75rem",
              padding: "0.75rem 1rem",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              fontWeight: "500",
              transition: "all 0.2s ease",
              backdropFilter: "blur(10px)",
            }}
          >
            <Bookmark size={18} />
            Save for Later
          </button>

          <button
            onClick={handleStartNavigation}
            disabled={isNavigating}
            style={{
              flex: 1,
              background: isNavigating ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "0.75rem",
              padding: "0.75rem 1rem",
              color: "white",
              cursor: isNavigating ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              fontWeight: "bold",
              transition: "all 0.2s ease",
              backdropFilter: "blur(10px)",
            }}
          >
            <Navigation size={18} />
            {isNavigating ? "Navigating..." : "Go There Now"}
          </button>
        </div>
      </div>

      {/* Google Maps */}
      <div style={{ flex: 1, position: "relative" }}>
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />

        {/* Navigation Status */}
        {isNavigating && (
          <div
            style={{
              position: "absolute",
              top: "1rem",
              left: "1rem",
              right: "1rem",
              background: "rgba(59, 130, 246, 0.95)",
              color: "white",
              padding: "1rem",
              borderRadius: "0.5rem",
              textAlign: "center",
              backdropFilter: "blur(10px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
              <Navigation size={20} />
              <span style={{ fontWeight: "bold" }}>Navigating to {place.title}</span>
            </div>
            {estimatedTime && (
              <div style={{ fontSize: "0.875rem", opacity: 0.9, marginTop: "0.25rem" }}>ETA: {estimatedTime}</div>
            )}
          </div>
        )}
      </div>

      {/* Arrival Prompt */}
      {showArrivalPrompt && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "1rem",
              padding: "2rem",
              margin: "1rem",
              textAlign: "center",
              maxWidth: "400px",
              width: "100%",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
            <h2 style={{ margin: "0 0 1rem 0", fontSize: "1.5rem", fontWeight: "bold", color: "#1F2937" }}>
              You've Arrived!
            </h2>
            <p style={{ margin: "0 0 2rem 0", color: "#6B7280", lineHeight: 1.5 }}>
              You've reached <strong>{place.title}</strong>. Would you like to save this location to your pins or
              discard it?
            </p>

            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                onClick={handleDiscardPlace}
                style={{
                  flex: 1,
                  background: "#F3F4F6",
                  border: "1px solid #D1D5DB",
                  borderRadius: "0.5rem",
                  padding: "0.75rem 1rem",
                  color: "#374151",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                Discard
              </button>

              <button
                onClick={handleSavePlace}
                style={{
                  flex: 1,
                  background: "#10B981",
                  border: "none",
                  borderRadius: "0.5rem",
                  padding: "0.75rem 1rem",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Save Pin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
