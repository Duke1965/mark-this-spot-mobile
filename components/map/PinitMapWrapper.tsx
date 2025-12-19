"use client"

import React from 'react'
import MapboxMap, { Pin as MapboxPin, MapboxMapProps } from './MapboxMap'

/**
 * PINIT Map Wrapper Component
 * 
 * Uses Mapbox as the map provider (TomTom has been removed)
 */

// Re-export Mapbox types for convenience
export type { MapboxPin as Pin }

export interface PinitMapWrapperProps {
  center: { lat: number; lng: number }
  zoom?: number
  pins?: MapboxPin[]
  onMapClick?: (coords: { lat: number; lng: number }) => void
  onPinClick?: (pinId: string) => void
  interactive?: boolean
  className?: string
  style?: React.CSSProperties
  // Legacy props (for backward compatibility)
  initialLat?: number
  initialLng?: number
  onLocationChange?: (lat: number, lng: number) => void
}

/**
 * Main Wrapper Component
 * Always uses Mapbox (TomTom has been removed)
 */
export default function PinitMapWrapper(props: PinitMapWrapperProps) {
  return <MapboxMap {...props} />
}

