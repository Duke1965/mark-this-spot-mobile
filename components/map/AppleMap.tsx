"use client"

import React, { useEffect, useRef, useState } from 'react'
import { loadMapkit } from '@/lib/mapkit/loadMapkit'

declare global {
  interface Window {
    mapkit?: any
  }
}

export interface AppleMapProps {
  center: { lat: number; lng: number }
  zoom?: number
  className?: string
  style?: React.CSSProperties
  interactive?: boolean
  // For draggable marker (single marker editing use case)
  draggableMarker?: {
    lat: number
    lng: number
    onDragEnd: (lat: number, lng: number) => void
  }
  // Pins support (basic for now)
  pins?: Array<{
    id: string
    lat: number
    lng: number
    title?: string
  }>
  onMapClick?: (coords: { lat: number; lng: number }) => void
  onPinClick?: (pinId: string) => void
}

export default function AppleMap({
  center,
  zoom = 13,
  className = "",
  style = {},
  interactive = true,
  draggableMarker,
  pins = [],
  onMapClick,
  onPinClick
}: AppleMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const draggableMarkerRef = useRef<any>(null)
  const isInitializedRef = useRef(false)
  const isDraggingMarkerRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function initializeMap() {
      if (!mapContainerRef.current || isInitializedRef.current) return

      try {
        // Load MapKit JS
        await loadMapkit()

        if (!isMounted || !window.mapkit) return

        // Fetch token from our API
        const tokenResponse = await fetch('/api/mapkit-token')
        if (!tokenResponse.ok) {
          throw new Error('Failed to fetch MapKit token')
        }

        const { token } = await tokenResponse.json()

        // Initialize MapKit with authorization callback
        window.mapkit.init({
          authorizationCallback: (done: (token: string) => void) => {
            done(token)
          }
        })

        // Create map coordinate
        const coordinate = new window.mapkit.Coordinate(center.lat, center.lng)

        // Create map region (zoom level)
        const span = new window.mapkit.CoordinateSpan(
          360 / Math.pow(2, zoom) * 0.5,
          360 / Math.pow(2, zoom) * 0.5
        )
        const region = new window.mapkit.CoordinateRegion(coordinate, span)

        // Create map
        // Enable scrolling so MapKit can detect drag gestures
        // We'll prevent map panning via event listeners
        const map = new window.mapkit.Map(mapContainerRef.current, {
          region,
          showsUserLocation: false,
          isZoomEnabled: false, // Disable zoom in edit mode
          isScrollEnabled: true, // Enable for drag detection
          isRotationEnabled: false
        })

        mapInstanceRef.current = map
        isInitializedRef.current = true

        // Store original region to prevent map panning
        const originalRegion = region

        console.log('✅ Apple Map initialized successfully', {
          center: { lat: center.lat, lng: center.lng },
          zoom
        })

        // Handle map clicks
        if (onMapClick) {
          map.addEventListener('single-tap', (e: any) => {
            if (e.coordinate) {
              onMapClick({
                lat: e.coordinate.latitude,
                lng: e.coordinate.longitude
              })
            }
          })
        }

        // Add draggable marker if provided
        if (draggableMarker) {
          const markerCoordinate = new window.mapkit.Coordinate(
            draggableMarker.lat,
            draggableMarker.lng
          )

          const annotation = new window.mapkit.MarkerAnnotation(markerCoordinate, {
            draggable: true,
            title: 'Drag me'
          })

          // Prevent map region changes while dragging
          map.addEventListener('region-change-start', () => {
            if (isDraggingMarkerRef.current) {
              // Disable scrolling to prevent region change
              map.isScrollEnabled = false
            }
          })

          // Track dragging state and prevent map panning
          annotation.addEventListener('drag-start', (e: any) => {
            isDraggingMarkerRef.current = true
            setIsDragging(true)
            // Immediately disable scrolling when drag starts
            map.isScrollEnabled = false
            console.log('📍 Marker drag started - disabled map scrolling')
          })

          annotation.addEventListener('drag', (e: any) => {
            isDraggingMarkerRef.current = true
            // Keep scrolling disabled and reset region if it changed
            map.isScrollEnabled = false
            // Reset map to original region if it moved
            try {
              const currentRegion = map.region
              const centerMoved = Math.abs(currentRegion.center.latitude - originalRegion.center.latitude) +
                                  Math.abs(currentRegion.center.longitude - originalRegion.center.longitude)
              if (centerMoved > 0.00001) {
                map.region = originalRegion
              }
            } catch (err) {
              // Ignore errors
            }
          })

          annotation.addEventListener('drag-end', (e: any) => {
            isDraggingMarkerRef.current = false
            setIsDragging(false)
            // Re-enable scrolling for next drag attempt
            map.isScrollEnabled = true
            const coord = annotation.coordinate
            console.log('📍 Marker drag ended at:', { lat: coord.latitude, lng: coord.longitude })
            if (draggableMarker.onDragEnd) {
              draggableMarker.onDragEnd(coord.latitude, coord.longitude)
            }
          })

          map.addAnnotation(annotation)
          draggableMarkerRef.current = annotation
        }

        // Add pins
        pins.forEach((pin) => {
          const pinCoordinate = new window.mapkit.Coordinate(pin.lat, pin.lng)
          const annotation = new window.mapkit.MarkerAnnotation(pinCoordinate, {
            title: pin.title || 'Pin',
            draggable: false
          })

          annotation.addEventListener('select', () => {
            if (onPinClick) {
              onPinClick(pin.id)
            }
          })

          map.addAnnotation(annotation)
          markersRef.current.set(pin.id, annotation)
        })

      } catch (error) {
        console.error('❌ Apple Map initialization error:', error)
      }
    }

    initializeMap()

    return () => {
      isMounted = false
      // Cleanup will be handled by MapKit when component unmounts
    }
  }, []) // Only run once on mount

  // Update map center and zoom when props change
  useEffect(() => {
    if (!mapInstanceRef.current || !window.mapkit) return

    const coordinate = new window.mapkit.Coordinate(center.lat, center.lng)
    const span = new window.mapkit.CoordinateSpan(
      360 / Math.pow(2, zoom) * 0.5,
      360 / Math.pow(2, zoom) * 0.5
    )
    const region = new window.mapkit.CoordinateRegion(coordinate, span)

    mapInstanceRef.current.region = region
  }, [center.lat, center.lng, zoom])

  // Update draggable marker position
  useEffect(() => {
    if (!draggableMarkerRef.current || !draggableMarker) return

    const coordinate = new window.mapkit.Coordinate(
      draggableMarker.lat,
      draggableMarker.lng
    )
    draggableMarkerRef.current.coordinate = coordinate
  }, [draggableMarker?.lat, draggableMarker?.lng])

  // Update pins
  useEffect(() => {
    if (!mapInstanceRef.current || !window.mapkit) return

    // Remove old pins
    markersRef.current.forEach((annotation) => {
      mapInstanceRef.current.removeAnnotation(annotation)
    })
    markersRef.current.clear()

    // Add new pins
    pins.forEach((pin) => {
      const pinCoordinate = new window.mapkit.Coordinate(pin.lat, pin.lng)
      const annotation = new window.mapkit.MarkerAnnotation(pinCoordinate, {
        title: pin.title || 'Pin',
        draggable: false
      })

      annotation.addEventListener('select', () => {
        if (onPinClick) {
          onPinClick(pin.id)
        }
      })

      mapInstanceRef.current.addAnnotation(annotation)
      markersRef.current.set(pin.id, annotation)
    })
  }, [pins, onPinClick])

  return (
    <div
      ref={mapContainerRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        // Allow touch events for MapKit marker dragging
        // Map scrolling disabled via isScrollEnabled: false
        touchAction: 'auto', // Allow MapKit to handle all touch events
        WebkitTouchCallout: 'none', // Prevent iOS callout menu
        WebkitUserSelect: 'none', // Prevent text selection
        userSelect: 'none',
        ...style
      }}
    />
  )
}

