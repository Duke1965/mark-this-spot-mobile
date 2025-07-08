"use client"

import { useEffect, useRef, useState } from "react"

export function SimpleMapTest() {
  const mapRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if Google Maps is already loaded
    if ((window as any).google) {
      initializeMap()
      return
    }

    // Remove any existing Google Maps scripts
    const existingScripts = document.querySelectorAll('script[src*="maps.googleapis.com"]')
    existingScripts.forEach((script) => script.remove())

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&callback=initSimpleMap&v=weekly&loading=async`
    script.async = true
    script.defer = true
    ;(window as any).initSimpleMap = () => {
      console.log("Simple Map API loaded successfully")
      setIsLoaded(true)
      initializeMap()
    }

    script.onerror = () => {
      setError("Failed to load Google Maps")
    }

    document.head.appendChild(script)

    return () => {
      delete (window as any).initSimpleMap
    }
  }, [])

  const initializeMap = () => {
    if (mapRef.current && (window as any).google) {
      try {
        ;new (window as any).google.maps.Map(mapRef.current, {
          center: { lat: -34.397, lng: 150.644 },
          zoom: 8,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
        })
        console.log("SIMPLE MAP INITIALIZED!")
      } catch (err) {
        console.error("Map initialization failed:", err)
        setError("Map initialization failed")
      }
    }
  }

  if (error) {
    return (
      <div style={{ padding: "20px", border: "2px solid red", margin: "20px" }}>
        <h2>Map Error</h2>
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>🗺️ Simple Map Test - v=weekly</h2>
      <p>Status: {isLoaded ? "✅ Loaded" : "⏳ Loading..."}</p>
      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: "400px",
          border: "3px solid red",
          backgroundColor: "#f0f0f0",
        }}
      />
    </div>
  )
}
