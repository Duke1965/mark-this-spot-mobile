"use client"

import { useEffect, useRef, useState } from "react"
import type { LocationData } from "@/hooks/useLocationServices"
import { google } from "google-maps"

interface GoogleMapsViewProps {
  location: LocationData | null
  isLoading: boolean
  error: string | null
}

export function GoogleMapsView({ location, isLoading, error }: GoogleMapsViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false)
  const lastPanRef = useRef<number>(0)

  // Load Google Maps API
  useEffect(() => {
    if (window.google && window.google.maps) {
      setIsGoogleMapsLoaded(true)
      return
    }

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => setIsGoogleMapsLoaded(true)
    script.onerror = () => console.error("Failed to load Google Maps")
    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  // Initialize map when Google Maps is loaded and location is available
  useEffect(() => {
    if (!isGoogleMapsLoaded || !mapRef.current || !location) return

    const mapOptions: google.maps.MapOptions = {
      center: { lat: location.latitude, lng: location.longitude },
      zoom: 16,
      mapTypeId: google.maps.MapTypeId.HYBRID,
      disableDefaultUI: true,
      gestureHandling: "greedy",
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "on" }],
        },
        {
          featureType: "road",
          elementType: "labels",
          stylers: [{ visibility: "simplified" }],
        },
      ],
    }

    const newMap = new google.maps.Map(mapRef.current, mapOptions)
    setMap(newMap)
  }, [isGoogleMapsLoaded, location])

  // Update map center when location changes with throttling
  useEffect(() => {
    if (!map || !location) return

    const now = Date.now()
    // throttle to ~300ms
    if (now - lastPanRef.current < 300) return
    lastPanRef.current = now

    map.panTo({ lat: location.latitude, lng: location.longitude })
  }, [map, location])

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white">
        <div className="text-center">
          <div className="text-4xl mb-2">📍</div>
          <div className="text-sm">Location Error</div>
          <div className="text-xs opacity-60 mt-1">Enable location services</div>
        </div>
      </div>
    )
  }

  if (isLoading || !location) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="text-center text-white">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2" />
          <div className="text-sm">Finding your location...</div>
        </div>
      </div>
    )
  }

  if (!isGoogleMapsLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-700 text-white">
        <div className="text-center">
          <div className="animate-pulse text-2xl mb-2">🗺️</div>
          <div className="text-sm">Loading Maps...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full" style={{ minHeight: "100%" }}>
      <div ref={mapRef} className="w-full h-full" />
      {/* Centered pin overlay */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div aria-hidden className="text-white text-2xl drop-shadow">📍</div>
      </div>
    </div>
  )
}
