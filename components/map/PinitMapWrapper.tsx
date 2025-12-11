"use client"

import React from 'react'
import { MAP_PROVIDER } from '@/lib/mapConfig'
import TomTomMap, { Pin as TomTomPin, TomTomMapProps } from './TomTomMap'

/**
 * PINIT Map Wrapper Component
 * 
 * Switches between Mapbox and TomTom map providers based on configuration.
 * This allows gradual migration from Mapbox to TomTom without breaking existing functionality.
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
  // Mapbox-specific props (for backward compatibility)
  initialLat?: number
  initialLng?: number
  onLocationChange?: (lat: number, lng: number) => void
}

/**
 * Mapbox Map Component (existing implementation)
 * This is kept for backward compatibility when MAP_PROVIDER="mapbox"
 */
function MapboxMapComponent({
  center,
  zoom = 13,
  pins = [],
  onMapClick,
  onPinClick,
  interactive = true,
  className = "",
  style = {}
}: PinitMapWrapperProps) {
  const mapRef = React.useRef<HTMLDivElement>(null)
  const mapInstanceRef = React.useRef<any>(null)
  const markersRef = React.useRef<Map<string, any>>(new Map())

  React.useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    import('mapbox-gl').then((mapboxgl) => {
      if (!mapRef.current || mapInstanceRef.current) return

      const accessToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY || ''
      if (!accessToken) {
        console.error('❌ Mapbox API key is missing')
        return
      }

      mapboxgl.default.accessToken = accessToken

      const map = new mapboxgl.default.Map({
        container: mapRef.current!,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [center.lng, center.lat],
        zoom: zoom,
        attributionControl: false,
        interactive: interactive
      })

      mapInstanceRef.current = map

      if (onMapClick && interactive) {
        map.on('click', (e: any) => {
          onMapClick({
            lat: e.lngLat.lat,
            lng: e.lngLat.lng
          })
        })
      }

      // Add markers for pins
      pins.forEach((pin) => {
        const markerElement = document.createElement('div')
        markerElement.style.width = '32px'
        markerElement.style.height = '32px'
        markerElement.style.borderRadius = '50%'
        markerElement.style.backgroundColor = pin.selected ? '#3B82F6' : '#EF4444'
        markerElement.style.border = '3px solid white'
        markerElement.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)'
        markerElement.style.cursor = 'pointer'

        const marker = new mapboxgl.default.Marker({
          element: markerElement,
          anchor: 'center'
        })
          .setLngLat([pin.lng, pin.lat])
          .addTo(map)

        if (onPinClick) {
          markerElement.addEventListener('click', () => {
            onPinClick(pin.id)
          })
        }

        markersRef.current.set(pin.id, marker)
      })

      return () => {
        markersRef.current.forEach(marker => marker.remove())
        markersRef.current.clear()
        map.remove()
      }
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Update markers when pins change
  React.useEffect(() => {
    if (!mapInstanceRef.current) return

    import('mapbox-gl').then((mapboxgl) => {
      // Remove old markers
      const currentPinIds = new Set(pins.map(p => p.id))
      markersRef.current.forEach((marker, pinId) => {
        if (!currentPinIds.has(pinId)) {
          marker.remove()
          markersRef.current.delete(pinId)
        }
      })

      // Add new markers
      pins.forEach((pin) => {
        if (!markersRef.current.has(pin.id)) {
          const markerElement = document.createElement('div')
          markerElement.style.width = '32px'
          markerElement.style.height = '32px'
          markerElement.style.borderRadius = '50%'
          markerElement.style.backgroundColor = pin.selected ? '#3B82F6' : '#EF4444'
          markerElement.style.border = '3px solid white'
          markerElement.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)'
          markerElement.style.cursor = 'pointer'

          const marker = new mapboxgl.default.Marker({
            element: markerElement,
            anchor: 'center'
          })
            .setLngLat([pin.lng, pin.lat])
            .addTo(mapInstanceRef.current)

          if (onPinClick) {
            markerElement.addEventListener('click', () => {
              onPinClick(pin.id)
            })
          }

          markersRef.current.set(pin.id, marker)
        }
      })
    })
  }, [pins, onPinClick])

  return (
    <div
      ref={mapRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        ...style
      }}
    />
  )
}

/**
 * Main Wrapper Component
 * Routes to the appropriate map provider based on configuration
 */
export default function PinitMapWrapper(props: PinitMapWrapperProps) {
  if (MAP_PROVIDER === "tomtom") {
    return <TomTomMap {...props} />
  }

  // Default to Mapbox for backward compatibility
  return <MapboxMapComponent {...props} />
}

