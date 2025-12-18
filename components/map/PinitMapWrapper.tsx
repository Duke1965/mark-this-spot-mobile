"use client"

import React from 'react'
import TomTomMap, { Pin as TomTomPin, TomTomMapProps } from './TomTomMap'

/**
 * PINIT Map Wrapper Component
 * 
 * Uses TomTom as the map provider (Mapbox has been removed)
 */

// Re-export TomTom types for convenience
export type { TomTomPin as Pin }

export interface PinitMapWrapperProps {
  center: { lat: number; lng: number }
  zoom?: number
  pins?: TomTomPin[]
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
 * Always uses TomTom (Mapbox has been removed)
 */
export default function PinitMapWrapper(props: PinitMapWrapperProps) {
  return <TomTomMap {...props} />
}

