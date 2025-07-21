"use client"

import { useState, useCallback, useEffect } from "react"

interface LocationDetails {
  name: string
  category: string
  vicinity: string
  rating?: number
  priceLevel?: number
  types: string[]
  placeId?: string
}

interface EnhancedLocationServiceProps {
  latitude: number
  longitude: number
  onLocationEnhanced: (details: LocationDetails) => void
}

export function EnhancedLocationService({ latitude, longitude, onLocationEnhanced }: EnhancedLocationServiceProps) {
  const [isLoading, setIsLoading] = useState(false)

  const enhanceLocation = useCallback(async () => {
    setIsLoading(true)

    try {
      // First try Google Places API (if available)
      if (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=50&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`,
        )

        if (response.ok) {
          const data = await response.json()
          if (data.results && data.results.length > 0) {
            const place = data.results[0]
            const details: LocationDetails = {
              name: place.name,
              category: place.types[0]?.replace(/_/g, " ") || "location",
              vicinity: place.vicinity || "",
              rating: place.rating,
              priceLevel: place.price_level,
              types: place.types,
              placeId: place.place_id,
            }
            onLocationEnhanced(details)
            setIsLoading(false)
            return
          }
        }
      }

      // Fallback to reverse geocoding
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
      )

      if (response.ok) {
        const data = await response.json()

        // Determine category based on location data
        let category = "location"
        if (data.locality?.toLowerCase().includes("beach")) category = "beach"
        else if (data.locality?.toLowerCase().includes("park")) category = "nature"
        else if (data.locality?.toLowerCase().includes("mall") || data.locality?.toLowerCase().includes("shop"))
          category = "shopping"
        else if (data.city) category = "city"

        const details: LocationDetails = {
          name: data.locality || data.city || `${data.latitude?.toFixed(4)}, ${data.longitude?.toFixed(4)}`,
          category,
          vicinity: `${data.city || ""}, ${data.countryName || ""}`.trim().replace(/^,\s*/, ""),
          types: [category],
        }

        onLocationEnhanced(details)
      }
    } catch (error) {
      console.error("Failed to enhance location:", error)
      // Fallback to basic location
      onLocationEnhanced({
        name: `Location ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        category: "location",
        vicinity: "Unknown area",
        types: ["location"],
      })
    } finally {
      setIsLoading(false)
    }
  }, [latitude, longitude, onLocationEnhanced])

  useEffect(() => {
    enhanceLocation()
  }, [enhanceLocation])

  if (isLoading) {
    return (
      <div
        style={{
          position: "absolute",
          top: "5rem",
          right: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          color: "white",
          fontSize: "0.875rem",
          background: "rgba(0,0,0,0.5)",
          padding: "0.5rem 1rem",
          borderRadius: "0.5rem",
          backdropFilter: "blur(10px)",
        }}
      >
        <div
          style={{
            width: "16px",
            height: "16px",
            border: "2px solid rgba(255,255,255,0.3)",
            borderTop: "2px solid white",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        Enhancing location...
      </div>
    )
  }

  return null
}
