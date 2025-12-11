"use client"

import React, { useEffect, useRef, useCallback } from 'react'
import { TOMTOM_API_KEY } from '@/lib/mapConfig'

/**
 * TomTom Map Component
 * 
 * A React wrapper for TomTom Maps Web SDK that provides:
 * - Map initialization with configurable center and zoom
 * - Pin/marker rendering with click handlers
 * - Map click events for pin creation
 * - Proper cleanup on unmount
 */

export interface Pin {
  id: string
  lat: number
  lng: number
  selected?: boolean
  title?: string
  category?: string
  draggable?: boolean
  onDragEnd?: (lat: number, lng: number) => void
}

export interface TomTomMapProps {
  center: { lat: number; lng: number }
  zoom?: number
  pins?: Pin[]
  onMapClick?: (coords: { lat: number; lng: number }) => void
  onPinClick?: (pinId: string) => void
  interactive?: boolean
  className?: string
  style?: React.CSSProperties
  // For draggable marker (single marker editing use case)
  draggableMarker?: {
    lat: number
    lng: number
    onDragEnd: (lat: number, lng: number) => void
  }
}

export default function TomTomMap({
  center,
  zoom = 13,
  pins = [],
  onMapClick,
  onPinClick,
  interactive = true,
  className = "",
  style = {},
  draggableMarker
}: TomTomMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const draggableMarkerRef = useRef<any>(null)

  // Initialize TomTom map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return

    // Validate API key
    if (!TOMTOM_API_KEY) {
      console.error('❌ TomTom API key is missing. Set NEXT_PUBLIC_TOMTOM_API_KEY in your environment variables.')
      return
    }

    // Dynamically import TomTom Maps SDK
    import('@tomtom-international/web-sdk-maps').then((tt) => {
      if (!mapContainerRef.current || mapInstanceRef.current) return

      try {
        // Initialize TomTom map
        const map = tt.default.map({
          key: TOMTOM_API_KEY,
          container: mapContainerRef.current,
          center: [center.lng, center.lat], // TomTom uses [lng, lat] format
          zoom: zoom,
          style: 'main', // TomTom's main style (similar to streets-v12)
          interactive: interactive
        })

        mapInstanceRef.current = map

        // Add click handler for map clicks (pin creation)
        if (onMapClick && interactive) {
          map.on('click', (e: any) => {
            const coords = e.lngLat
            onMapClick({
              lat: coords.lat,
              lng: coords.lng
            })
          })
        }

        console.log('🗺️ TomTom map initialized successfully')
      } catch (error) {
        console.error('❌ Failed to initialize TomTom map:', error)
      }
    }).catch((error) => {
      console.error('❌ Failed to load TomTom Maps SDK:', error)
    })

    // Cleanup on unmount
    return () => {
      if (draggableMarkerRef.current) {
        try {
          draggableMarkerRef.current.remove()
        } catch (error) {
          console.warn('⚠️ Error removing draggable marker:', error)
        }
        draggableMarkerRef.current = null
      }
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove()
        } catch (error) {
          console.warn('⚠️ Error removing TomTom map:', error)
        }
        mapInstanceRef.current = null
      }
      // Clear all markers
      markersRef.current.clear()
    }
  }, []) // Only run once on mount

  // Update map center when center prop changes
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      try {
        mapInstanceRef.current.setCenter([center.lng, center.lat])
      } catch (error) {
        console.warn('⚠️ Error updating TomTom map center:', error)
      }
    }
  }, [center.lat, center.lng])

  // Update map zoom when zoom prop changes
  useEffect(() => {
    if (mapInstanceRef.current && zoom !== undefined) {
      try {
        mapInstanceRef.current.setZoom(zoom)
      } catch (error) {
        console.warn('⚠️ Error updating TomTom map zoom:', error)
      }
    }
  }, [zoom])

  // Handle draggable marker (for editing use case)
  useEffect(() => {
    if (!mapInstanceRef.current || !draggableMarker) return

    import('@tomtom-international/web-sdk-maps').then((tt) => {
      // Remove existing draggable marker if it exists
      if (draggableMarkerRef.current) {
        draggableMarkerRef.current.remove()
        draggableMarkerRef.current = null
      }

      // Create draggable marker
      const markerElement = document.createElement('div')
      markerElement.style.width = '32px'
      markerElement.style.height = '32px'
      markerElement.style.borderRadius = '50%'
      markerElement.style.backgroundColor = '#3B82F6'
      markerElement.style.border = '3px solid white'
      markerElement.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)'
      markerElement.style.cursor = 'move'

      const marker = new tt.default.Marker({
        element: markerElement,
        anchor: 'center',
        draggable: true
      })
        .setLngLat([draggableMarker.lng, draggableMarker.lat])
        .addTo(mapInstanceRef.current)

      // Listen for drag end event
      marker.on('dragend', () => {
        const lngLat = marker.getLngLat()
        draggableMarker.onDragEnd(lngLat.lat, lngLat.lng)
      })

      draggableMarkerRef.current = marker
    }).catch((error) => {
      console.error('❌ Failed to load TomTom SDK for draggable marker:', error)
    })
  }, [draggableMarker?.lat, draggableMarker?.lng])

  // Update markers when pins change
  useEffect(() => {
    if (!mapInstanceRef.current || draggableMarker) return // Skip if using draggable marker

    import('@tomtom-international/web-sdk-maps').then((tt) => {
      // Remove old markers that are no longer in the pins array
      const currentPinIds = new Set(pins.map(pin => pin.id))
      markersRef.current.forEach((marker, pinId) => {
        if (!currentPinIds.has(pinId)) {
          marker.remove()
          markersRef.current.delete(pinId)
        }
      })

      // Add or update markers for current pins
      pins.forEach((pin) => {
        const existingMarker = markersRef.current.get(pin.id)

        if (existingMarker) {
          // Update existing marker position if it changed
          existingMarker.setLngLat([pin.lng, pin.lat])
          
          // Update marker style if selection changed
          if (pin.selected !== undefined) {
            // You can customize marker appearance based on selection
            // For now, we'll keep it simple
          }
        } else {
          // Create new marker
          const markerElement = document.createElement('div')
          markerElement.style.width = '32px'
          markerElement.style.height = '32px'
          markerElement.style.borderRadius = '50%'
          markerElement.style.backgroundColor = pin.selected ? '#3B82F6' : '#EF4444'
          markerElement.style.border = '3px solid white'
          markerElement.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)'
          markerElement.style.cursor = 'pointer'
          markerElement.style.display = 'flex'
          markerElement.style.alignItems = 'center'
          markerElement.style.justifyContent = 'center'
          markerElement.textContent = '📍'

          const marker = new tt.default.Marker({
            element: markerElement,
            anchor: 'center'
          })
            .setLngLat([pin.lng, pin.lat])
            .addTo(mapInstanceRef.current)

          // Add click handler for marker
          if (onPinClick) {
            markerElement.addEventListener('click', () => {
              onPinClick(pin.id)
            })
          }

          markersRef.current.set(pin.id, marker)
        }
      })

      // Fit bounds to show all pins if there are any
      if (pins.length > 0 && mapInstanceRef.current) {
        try {
          const bounds = new tt.default.LngLatBounds()
          pins.forEach(pin => {
            bounds.extend([pin.lng, pin.lat])
          })
          mapInstanceRef.current.fitBounds(bounds, {
            padding: 50,
            duration: 300
          })
        } catch (error) {
          console.warn('⚠️ Error fitting bounds:', error)
        }
      }
    }).catch((error) => {
      console.error('❌ Failed to load TomTom SDK for markers:', error)
    })
  }, [pins, onPinClick])

  return (
    <div
      ref={mapContainerRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        ...style
      }}
    />
  )
}

