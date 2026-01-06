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
        // When draggable marker is present, disable map scrolling to prevent conflicts
        const map = new window.mapkit.Map(mapContainerRef.current, {
          region,
          showsUserLocation: false,
          isZoomEnabled: interactive && !draggableMarker, // Disable zoom when draggable marker exists
          isScrollEnabled: interactive && !draggableMarker, // Disable scroll when draggable marker exists
          isRotationEnabled: false
        })

        mapInstanceRef.current = map
        isInitializedRef.current = true

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

          // Track dragging state to prevent map panning during marker drag
          annotation.addEventListener('drag-start', (e: any) => {
            isDraggingMarkerRef.current = true
            setIsDragging(true) // Update state to trigger style update
            // Prevent default to stop page scrolling
            if (e && e.preventDefault) {
              e.preventDefault()
            }
            // Temporarily disable map panning while dragging marker
            if (map) {
              map.isScrollEnabled = false
              map.isZoomEnabled = false
            }
            // Immediately disable touch actions on container
            if (mapContainerRef.current) {
              mapContainerRef.current.style.touchAction = 'none'
            }
            console.log('📍 Marker drag started')
          })

          annotation.addEventListener('drag', (e: any) => {
            // Marker is being dragged
            isDraggingMarkerRef.current = true
            // Prevent default to stop page scrolling
            if (e && e.preventDefault) {
              e.preventDefault()
            }
            // Keep touch actions disabled during drag
            if (mapContainerRef.current) {
              mapContainerRef.current.style.touchAction = 'none'
            }
          })

          annotation.addEventListener('drag-end', (e: any) => {
            isDraggingMarkerRef.current = false
            setIsDragging(false) // Update state to trigger style update
            // Prevent default to stop page scrolling
            if (e && e.preventDefault) {
              e.preventDefault()
            }
            // Re-enable map panning after drag ends
            if (map) {
              map.isScrollEnabled = interactive
              map.isZoomEnabled = interactive
            }
            // Re-enable touch actions after drag ends
            if (mapContainerRef.current) {
              mapContainerRef.current.style.touchAction = draggableMarker ? 'pan-x pan-y' : (interactive ? 'pan-x pan-y' : 'none')
            }
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

  // Update container touch action based on dragging state
  useEffect(() => {
    if (mapContainerRef.current) {
      if (isDragging) {
        // Disable all touch interactions when dragging marker
        mapContainerRef.current.style.touchAction = 'none'
      } else if (draggableMarker) {
        // When draggable marker exists but not dragging, allow pan but prevent scrolling
        mapContainerRef.current.style.touchAction = 'pan-x pan-y'
      } else {
        // Normal map behavior
        mapContainerRef.current.style.touchAction = interactive ? 'pan-x pan-y' : 'none'
      }
    }
  }, [isDragging, draggableMarker, interactive])

  return (
    <div
      ref={mapContainerRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        touchAction: isDragging ? 'none' : (draggableMarker ? 'pan-x pan-y' : (interactive ? 'pan-x pan-y' : 'none')),
        WebkitTouchCallout: 'none', // Prevent iOS callout menu
        WebkitUserSelect: 'none', // Prevent text selection
        userSelect: 'none',
        ...style
      }}
      onTouchStart={(e) => {
        // If dragging marker, prevent ALL default behavior to stop map panning
        if (isDraggingMarkerRef.current || isDragging) {
          e.preventDefault()
          e.stopPropagation()
          // Update touch action immediately
          if (mapContainerRef.current) {
            mapContainerRef.current.style.touchAction = 'none'
          }
        }
      }}
      onTouchMove={(e) => {
        // If dragging marker, prevent ALL default behavior to stop map panning
        if (isDraggingMarkerRef.current || isDragging) {
          e.preventDefault()
          e.stopPropagation()
        }
      }}
    />
  )
}

