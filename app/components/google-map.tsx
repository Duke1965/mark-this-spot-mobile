"use client"

import { useEffect, useRef, useState } from "react"

interface Spot {
  id: string
  latitude: number
  longitude: number
  timestamp: string
  address: string
  notes: string
  photos?: string[]
}

interface GoogleMapProps {
  spots: Spot[]
  onSpotClick?: (spot: Spot) => void
  center?: { lat: number; lng: number }
  zoom?: number
  onMapClick?: (lat: number, lng: number) => void
  selectedMarker?: string
}

declare global {
  interface Window {
    google: any
    initGoogleMap: () => void
  }
}

export function GoogleMap({
  spots,
  onSpotClick,
  center,
  zoom = 13,
  onMapClick,
  selectedMarker = "pin",
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const markersRef = useRef<any[]>([])

  // Load Google Maps API with better error handling
  useEffect(() => {
    if (window.google) {
      setIsLoaded(true)
      return
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      console.error("Google Maps API key missing")
      setLoadError("Google Maps API key not configured. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to environment variables.")
      return
    }

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      setIsLoaded(true)
      return
    }

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMap&libraries=places&v=weekly&loading=async`
    script.async = true
    script.defer = true

    window.initGoogleMap = () => {
      console.log("Google Maps loaded successfully")
      setIsLoaded(true)
    }

    script.onerror = (error) => {
      console.error("Google Maps failed to load:", error)
      setLoadError("Failed to load Google Maps. Check your API key and internet connection.")
    }

    document.head.appendChild(script)

    return () => {
      // Cleanup
      delete window.initGoogleMap
    }
  }, [])

  // Initialize map with better error handling
  useEffect(() => {
    if (!isLoaded || !mapRef.current || loadError || !window.google) return

    try {
      const defaultCenter = center || { lat: 37.7749, lng: -122.4194 }

      const newMap = new window.google.maps.Map(mapRef.current, {
        zoom,
        center: defaultCenter,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
      })

      // Add click listener for adding new spots
      if (onMapClick) {
        newMap.addListener("click", (event: any) => {
          const lat = event.latLng.lat()
          const lng = event.latLng.lng()
          console.log("Map clicked:", lat, lng)
          onMapClick(lat, lng)
        })
      }

      console.log("Map initialized successfully")
      setMap(newMap)
    } catch (error) {
      console.error("Map initialization failed:", error)
      setLoadError("Failed to initialize Google Maps")
    }
  }, [isLoaded, center, zoom, onMapClick, loadError])

  // Enhanced marker creation with proper 3D styles
  const createCustomMarker = (markerType: string) => {
    switch (markerType) {
      case "diamond":
        return {
          path: "M 0,-20 L 15,-5 L 0,20 L -15,-5 Z",
          scale: 1.2,
          fillColor: "#8B5CF6",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 3,
          anchor: new window.google.maps.Point(0, 0),
        }
      case "star":
        return {
          path: "M 0,-24 6,-7 24,-7 10,3 15,21 0,11 -15,21 -10,3 -24,-7 -6,-7 z",
          scale: 1,
          fillColor: "#F59E0B",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
          anchor: new window.google.maps.Point(0, 0),
        }
      case "flag":
        return {
          path: "M 0,0 L 0,-30 L 20,-25 L 20,-10 L 0,-5 Z",
          scale: 1.2,
          fillColor: "#EF4444",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
          anchor: new window.google.maps.Point(0, 0),
        }
      case "post":
        return {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 15,
          fillColor: "#10B981",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 4,
        }
      default: // pin
        return {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: "#3B82F6",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 3,
        }
    }
  }

  // Add markers with enhanced styling
  useEffect(() => {
    if (!map || !window.google || loadError) return

    console.log(`Adding ${spots.length} markers with style: ${selectedMarker}`)

    // Clear existing markers
    markersRef.current.forEach((marker) => {
      marker.setMap(null)
    })
    markersRef.current = []

    // Add new markers with custom styling
    spots.forEach((spot, index) => {
      try {
        const markerIcon = createCustomMarker(selectedMarker)

        const marker = new window.google.maps.Marker({
          position: { lat: spot.latitude, lng: spot.longitude },
          map,
          title: spot.address,
          icon: markerIcon,
          animation: index === 0 ? window.google.maps.Animation.BOUNCE : null,
          optimized: false, // Better for custom icons
        })

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 16px; max-width: 280px; font-family: system-ui;">
              <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 18px; font-weight: bold;">${spot.address}</h3>
              <div style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
                📅 ${new Date(spot.timestamp).toLocaleDateString()} at ${new Date(spot.timestamp).toLocaleTimeString()}
              </div>
              <div style="margin: 0 0 12px 0; color: #9ca3af; font-size: 12px; font-family: monospace; background: #f3f4f6; padding: 8px; border-radius: 4px;">
                📍 ${spot.latitude.toFixed(6)}, ${spot.longitude.toFixed(6)}
              </div>
              <button 
                onclick="window.playSpotFart && window.playSpotFart('${spot.id}')"
                style="
                  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                  color: white;
                  border: none;
                  padding: 12px 20px;
                  border-radius: 8px;
                  cursor: pointer;
                  font-weight: bold;
                  font-size: 14px;
                  width: 100%;
                "
              >
                💨 REPLAY EPIC FART!
              </button>
            </div>
          `,
        })

        marker.addListener("click", () => {
          // Close other info windows
          markersRef.current.forEach((m) => {
            if (m.infoWindow) {
              m.infoWindow.close()
            }
          })

          infoWindow.open(map, marker)
          marker.infoWindow = infoWindow

          console.log("Marker clicked:", spot.address)

          if (onSpotClick) {
            onSpotClick(spot)
          }
        })

        markersRef.current.push(marker)
        console.log(`Added marker ${index + 1}: ${spot.address}`)
      } catch (error) {
        console.error(`Failed to create marker for spot ${index}:`, error)
      }
    })

    // Auto-fit map to show all markers
    if (spots.length > 1) {
      try {
        const bounds = new window.google.maps.LatLngBounds()
        spots.forEach((spot) => {
          bounds.extend({ lat: spot.latitude, lng: spot.longitude })
        })
        map.fitBounds(bounds)
        console.log("Map bounds adjusted for all markers")
      } catch (error) {
        console.error("Failed to fit bounds:", error)
      }
    } else if (spots.length === 1) {
      map.setCenter({ lat: spots[0].latitude, lng: spots[0].longitude })
      map.setZoom(15)
    }
  }, [map, spots, onSpotClick, loadError, selectedMarker])

  if (loadError) {
    return (
      <div className="w-full h-80 bg-red-50 rounded-xl border-2 border-red-200 flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-red-800 mb-3">Google Maps Error</h3>
          <p className="text-red-600 text-sm">{loadError}</p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-80 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700 font-semibold">Loading Google Maps...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-80 rounded-xl border-2 border-gray-200 overflow-hidden shadow-xl bg-white">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  )
}
