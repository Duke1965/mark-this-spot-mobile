"use client"

import { useEffect, useRef } from "react"

export function SimpleMapTest() {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&callback=initMap`
    script.async = true
    ;(window as any).initMap = () => {
      if (mapRef.current) {
        ;new (window as any).google.maps.Map(mapRef.current, {
          center: { lat: -34.397, lng: 150.644 },
          zoom: 8,
        })
        console.log("SIMPLE MAP LOADED!")
      }
    }

    document.head.appendChild(script)
  }, [])

  return (
    <div>
      <h2>Simple Map Test</h2>
      <div ref={mapRef} style={{ width: "100%", height: "400px", border: "1px solid red" }} />
    </div>
  )
}
