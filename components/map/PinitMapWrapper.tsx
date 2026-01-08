"use client"

import React from 'react'
import MapboxMap, { Pin as MapboxPin } from './MapboxMap'

/**
 * PINIT Map Wrapper Component
 * 
 * Uses Mapbox GL JS as the map provider
 * TomTom API is used for search/POI lookup
 */

// Pin type for compatibility
export interface Pin {
  id: string
  lat: number
  lng: number
  title?: string
}

export interface PinitMapWrapperProps {
  center: { lat: number; lng: number }
  zoom?: number
  pins?: Pin[]
  onMapClick?: (coords: { lat: number; lng: number }) => void
  onPinClick?: (pinId: string) => void
  interactive?: boolean
  className?: string
  style?: React.CSSProperties
  // Legacy props (for backward compatibility)
  initialLat?: number
  initialLng?: number
  onLocationChange?: (lat: number, lng: number) => void
  // Draggable marker support
  draggableMarker?: {
    lat: number
    lng: number
    onDragEnd: (lat: number, lng: number) => void
  }
}

/**
 * Main Wrapper Component
 * Always uses Mapbox GL JS
 */
export default function PinitMapWrapper(props: PinitMapWrapperProps) {
  // Convert pins to MapboxMap format
  const mapboxPins: MapboxPin[] = (props.pins || []).map(pin => ({
    id: pin.id,
    lat: pin.lat,
    lng: pin.lng,
    title: pin.title
  }))

  return (
    <MapboxMap
      center={props.center || { lat: props.initialLat || 0, lng: props.initialLng || 0 }}
      zoom={props.zoom || 13}
      pins={mapboxPins}
      onMapClick={props.onMapClick}
      onPinClick={props.onPinClick}
      interactive={props.interactive !== false}
      className={props.className}
      style={props.style}
      draggableMarker={props.draggableMarker || (props.onLocationChange ? {
        lat: props.initialLat || props.center.lat,
        lng: props.initialLng || props.center.lng,
        onDragEnd: props.onLocationChange
      } : undefined)}
    />
  )
}

