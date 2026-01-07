"use client"

import React from 'react'
import AppleMap, { AppleMapProps } from './AppleMap'

/**
 * PINIT Map Wrapper Component
 * 
 * Uses Apple MapKit JS as the only map provider
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
 * Always uses Apple MapKit JS
 */
export default function PinitMapWrapper(props: PinitMapWrapperProps) {
  // Convert legacy props to AppleMap props
  const appleMapProps: AppleMapProps = {
    center: props.center || { lat: props.initialLat || 0, lng: props.initialLng || 0 },
    zoom: props.zoom || 13,
    pins: props.pins || [],
    onMapClick: props.onMapClick,
    onPinClick: props.onPinClick,
    interactive: props.interactive !== false,
    className: props.className,
    style: props.style,
    draggableMarker: props.draggableMarker || (props.onLocationChange ? {
      lat: props.initialLat || props.center.lat,
      lng: props.initialLng || props.center.lng,
      onDragEnd: props.onLocationChange
    } : undefined)
  }

  return <AppleMap {...appleMapProps} />
}

