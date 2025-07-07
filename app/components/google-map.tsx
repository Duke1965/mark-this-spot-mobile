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
}

declare global {
  interface Window {
    google: any
    initGoogleMap: () => void
  }
}

export function GoogleMap({ spots, onSpotClick, center, zoom = 13, onMapClick }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const markersRef = useRef<any[]>([])

  // Load Google Maps API
  useEffect(() => {
    if (window.google) {
      setIsLoaded(true)
      return
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      setLoadError("Google Maps API key not found. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file")
      return
    }

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMap&libraries=places`
    script.async = true
    script.defer = true

    window.initGoogleMap = () => {
      setIsLoaded(true)
    }

    script.onerror = () => {
      setLoadError("Failed to load Google Maps. Please check your API key and internet connection.")
    }

    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || loadError) return

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
    })

    // Add click listener for adding new spots
    if (onMapClick) {
      newMap.addListener("click", (event: any) => {
        const lat = event.latLng.lat()
        const lng = event.latLng.lng()
        onMapClick(lat, lng)
      })
    }

    setMap(newMap)
  }, [isLoaded, center, zoom, onMapClick, loadError])

  // Add markers for spots
  useEffect(() => {
    if (!map || !window.google || loadError) return

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []

    // Add new markers
    spots.forEach((spot, index) => {
      const marker = new window.google.maps.Marker({
        position: { lat: spot.latitude, lng: spot.longitude },
        map,
        title: spot.address,
        animation: index === 0 ? window.google.maps.Animation.BOUNCE : null, // Animate newest spot
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: "#3B82F6",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 3,
        },
      })

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; max-width: 250px; font-family: system-ui;">
            <h3 style="margin: 0 0 8px 0; color: #1f2937; font-size: 16px;">${spot.address}</h3>
            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
              📅 ${new Date(spot.timestamp).toLocaleDateString()} at ${new Date(spot.timestamp).toLocaleTimeString()}
            </p>
            <p style="margin: 0 0 12px 0; color: #9ca3af; font-size: 12px; font-family: monospace;">
              📍 ${spot.latitude.toFixed(6)}, ${spot.longitude.toFixed(6)}
            </p>
            <button 
              onclick="window.playSpotFart && window.playSpotFart('${spot.id}')"
              style="
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
                font-size: 12px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              "
              onmouseover="this.style.transform='scale(1.05)'"
              onmouseout="this.style.transform='scale(1)'"
            >
              💨 REPLAY FART!
            </button>
          </div>
        `,
      })

      marker.addListener("click", () => {
        // Close other info windows
        markersRef.current.forEach((m) => m.infoWindow?.close())

        infoWindow.open(map, marker)
        marker.infoWindow = infoWindow

        if (onSpotClick) {
          onSpotClick(spot)
        }
      })

      markersRef.current.push(marker)
    })

    // Auto-fit map to show all markers
    if (spots.length > 1) {
      const bounds = new window.google.maps.LatLngBounds()
      spots.forEach((spot) => {
        bounds.extend({ lat: spot.latitude, lng: spot.longitude })
      })
      map.fitBounds(bounds)
    }
  }, [map, spots, onSpotClick, loadError])

  if (loadError) {
    return (
      <div className="w-full h-64 bg-red-50 rounded-lg border-2 border-red-200 flex items-center justify-center">
        <div className="text-center p-6">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Google Maps Error</h3>
          <p className="text-red-600 text-sm mb-4">{loadError}</p>
          <div className="bg-red-100 p-3 rounded text-xs text-left">
            <strong>Setup Instructions:</strong>
            <br />
            1. Create .env.local file in your project root
            <br />
            2. Add: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
            <br />
            3. Restart your development server
          </div>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Google Maps...</p>
          <p className="text-xs text-gray-500 mt-2">Connecting to Google Maps API</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-64 rounded-lg border border-gray-200 overflow-hidden shadow-lg">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  )
}
