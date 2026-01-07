"use client"

import React, { useState, useEffect } from 'react'
import AppleMap from './AppleMap'

interface PinAdjustEditorProps {
  initialLat: number
  initialLng: number
  onPinDragEnd: (lat: number, lng: number) => void
}

/**
 * Pin Adjust Editor Component
 * Uses MapKit native draggable MarkerAnnotation (not pixel overlay)
 * Pin stays anchored to coordinates - panning map doesn't move the pin location
 * Only dragging the marker changes the coordinate
 */
export default function PinAdjustEditor({
  initialLat,
  initialLng,
  onPinDragEnd
}: PinAdjustEditorProps) {
  const [pinLocation, setPinLocation] = useState({ lat: initialLat, lng: initialLng })

  // Update pin location when initial props change
  useEffect(() => {
    setPinLocation({ lat: initialLat, lng: initialLng })
  }, [initialLat, initialLng])

  // Handle marker drag end - update local state and notify parent
  const handleDragEnd = (lat: number, lng: number) => {
    console.log('📍 Pin dragged to:', { lat, lng })
    setPinLocation({ lat, lng })
    onPinDragEnd(lat, lng)
  }

  return (
    <AppleMap
      center={{ lat: pinLocation.lat, lng: pinLocation.lng }}
      zoom={16}
      interactive={true}
      style={{ width: '100%', height: '100%' }}
      draggableMarker={{
        lat: pinLocation.lat,
        lng: pinLocation.lng,
        onDragEnd: handleDragEnd
      }}
      pointOfInterestFilter={[
        'Restaurant',
        'Cafe',
        'Bakery',
        'FoodMarket',
        'Store',
        'Museum',
        'Park',
        'Hotel',
        'Brewery',
        'Winery'
      ]}
      mapType="standard"
    />
  )
}

