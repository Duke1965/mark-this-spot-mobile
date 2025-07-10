"use client"

import { useEffect, useState, useRef } from "react"
import React from "react"
import { useLocationServices } from "./hooks/useLocationServices"
import { reverseGeocode } from "./utils/geocoding"
import { playSound } from "./utils/audio"
import { Volume2, VolumeX, MapPin } from 'lucide-react'
import { Search, Filter, SortAsc, ArrowLeft, Eye, Trash2, Calendar } from 'lucide-react'

interface Spot {
  id: string
  latitude: number
  longitude: number
  timestamp: string
  address: string
  notes: string
  photos?: string[]
  category?: string
  photo?: string
  postcard?: any
}

interface SpotCardProps {
  spot: Spot
  index: number
  onView: () => void
  onDelete: () => void
  category: { name: string; emoji: string; color: string }
}

const SpotCardComponent = ({ spot, index, onView, onDelete, category }: SpotCardProps) => {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.1)",
        backdropFilter: "blur(10px)",
        borderRadius: "1rem",
        border: "1px solid rgba(255,255,255,0.2)",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.3s ease",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Category Tag */}
      <div
        style={{
          position: "absolute",
          top: "0.75rem",
          left: "0.75rem",
          background: `${category.color}90`,
          color: "white",
          padding: "0.25rem 0.5rem",
          borderRadius: "0.5rem",
          fontSize: "0.75rem",
          fontWeight: "bold",
          zIndex: 1,
        }}
      >
        {category.emoji} {category.name}
      </div>

      {/* Postcard/Photo Preview */}
      {(spot.postcard || spot.photo) && (
        <div style={{ marginBottom: "1rem", borderRadius: "0.75rem", overflow: "hidden" }}>
          {spot.postcard ? (
            spot.postcard.mediaType === "photo" ? (
              <img
                src={spot.postcard.mediaUrl || "/placeholder.svg?height=200&width=300&text=Postcard"}
                alt="Postcard"
                style={{ width: "100%", height: "150px", objectFit: "cover" }}
              />
            ) : (
              <video src={spot.postcard.mediaUrl} style={{ width: "100%", height: "150px", objectFit: "cover" }} />
            )
          ) : spot.photo ? (
            <img
              src={spot.photo || "/placeholder.svg?height=200&width=300&text=Photo"}
              alt="Spot photo"
              style={{ width: "100%", height: "150px", objectFit: "cover" }}
            />
          ) : null}
        </div>
      )}

      {/* Location Info */}
      <h3 style={{ fontSize: "1rem", fontWeight: "bold", color: "white", marginBottom: "0.5rem" }}>{spot.address}</h3>
      <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem", marginBottom: "0.75rem" }}>
        {new Date(spot.timestamp).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </p>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto" }}>
        <button
          onClick={onView}
          style={{
            flex: 1,
            padding: "0.5rem",
            background: "rgba(255,255,255,0.2)",
            color: "white",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            fontSize: "0.875rem",
            transition: "all 0.3s ease",
          }}
        >
          View
        </button>
        <button
          onClick={onDelete}
          style={{
            flex: 1,
            padding: "0.5rem",
            background: "rgba(220, 38, 38, 0.3)",
            color: "white",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            fontSize: "0.875rem",
            transition: "all 0.3s ease",
          }}
        >
          Delete
        </button>
      </div>
    </div>
  )
}

function LiveResultsMap({
  spot,
  onLocationUpdate,
}: {
  spot: Spot
  onLocationUpdate: (lat: number, lng: number, address: string) => void
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const streetViewRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [marker, setMarker] = useState<any>(null)
  const [streetView, setStreetView] = useState<any>(null)
  const [showStreetView, setShowStreetView] = useState(false)

  useEffect(() => {
    if ((window as any).google) {
      setIsLoaded(true)
      return
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      setLoadError("Google Maps API key not configured")
      return
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      setIsLoaded(true)
      return
    }

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initResultsMap&libraries=places&v=weekly&loading=async`
    script.async = true
    script.defer = true
    ;(window as any).initResultsMap = () => {
      console.log("🗺️ Google Maps loaded successfully")
      setIsLoaded(true)
    }

    script.onerror = () => {
      setLoadError("Failed to load Google Maps")
    }

    document.head.appendChild(script)

    return () => {
      delete (window as any).initResultsMap
    }
  }, [])

  useEffect(() => {
    if (!isLoaded || !mapRef.current || loadError || !(window as any).google) return

    try {
      const newMap = new (window as any).google.maps.Map(mapRef.current, {
        zoom: 18,
        center: { lat: spot.latitude, lng: spot.longitude },
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      })

      setTimeout(() => {
        ;(window as any).google.maps.event.trigger(newMap, "resize")

