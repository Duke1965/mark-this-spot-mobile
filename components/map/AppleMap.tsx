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
  // Callback when map is ready (for custom overlay implementations)
  onMapReady?: (map: any) => void
  // Point of Interest filtering
  // Options: "Restaurant", "Cafe", "Hotel", "Store", "Museum", "Park", "Bakery", "Brewery", "Winery", etc.
  // Default: all POIs shown
  pointOfInterestFilter?: string[] | 'all' | 'none'
  // Map type: "standard" (default), "hybrid" (satellite with labels), "satellite"
  mapType?: 'standard' | 'hybrid' | 'satellite'
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
  onPinClick,
  onMapReady,
  pointOfInterestFilter = 'all',
  mapType = 'standard'
}: AppleMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const draggableMarkerRef = useRef<any>(null)
  const isInitializedRef = useRef(false)
  const isDraggingMarkerRef = useRef(false)
  const isUserInteractingRef = useRef(false)
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

        // Create POI filter
        let poiFilter = null
        if (pointOfInterestFilter === 'none') {
          // Exclude all POIs
          poiFilter = window.mapkit.PointOfInterestFilter.excludingAll()
        } else if (Array.isArray(pointOfInterestFilter) && pointOfInterestFilter.length > 0) {
          // Include specific POI categories
          poiFilter = window.mapkit.PointOfInterestFilter.including(pointOfInterestFilter)
        }
        // If 'all' or undefined, show all POIs (default behavior)

        // Create map
        // Always allow scrolling and zooming for normal map interaction
        const map = new window.mapkit.Map(mapContainerRef.current, {
          region,
          showsUserLocation: false,
          isZoomEnabled: interactive,
          isScrollEnabled: interactive, // Always allow scrolling
          isRotationEnabled: false,
          mapType: mapType === 'hybrid' ? window.mapkit.Map.MapTypes.Hybrid : 
                   mapType === 'satellite' ? window.mapkit.Map.MapTypes.Satellite :
                   window.mapkit.Map.MapTypes.Standard,
          pointOfInterestFilter: poiFilter
        })

        mapInstanceRef.current = map
        isInitializedRef.current = true

        // Track user interaction to prevent region updates from overriding user panning
        let userInteractionTimeout: NodeJS.Timeout | null = null

        // Listen for user interactions with the map
        map.addEventListener('region-change-start', () => {
          isUserInteractingRef.current = true
          // Clear any existing timeout
          if (userInteractionTimeout) {
            clearTimeout(userInteractionTimeout)
          }
          // Reset flag after interaction ends (user releases)
          userInteractionTimeout = setTimeout(() => {
            isUserInteractingRef.current = false
          }, 500)
        })

        console.log('✅ Apple Map initialized successfully', {
          center: { lat: center.lat, lng: center.lng },
          zoom
        })

        // Notify parent that map is ready
        if (onMapReady) {
          onMapReady(map)
        }

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
            title: 'Drag me',
            color: '#3B82F6', // Blue pin color
            glyphText: '📍' // Pin emoji
          })

          // Don't prevent map clicks when dragging is enabled - allow both map clicks and drag
          // MapKit will handle the distinction between clicking map vs clicking marker



          // Simple drag event handlers - no region locking
          annotation.addEventListener('drag-start', (e: any) => {
            console.log('📍 Marker drag started!')
            isDraggingMarkerRef.current = true
            setIsDragging(true)
            isUserInteractingRef.current = true // Mark as user interaction
          })

          annotation.addEventListener('drag', (e: any) => {
            isDraggingMarkerRef.current = true
          })

          annotation.addEventListener('drag-end', (e: any) => {
            console.log('📍 Marker drag ended!')
            isDraggingMarkerRef.current = false
            setIsDragging(false)
            
            const coord = annotation.coordinate
            console.log('📍 Marker drag ended at:', { lat: coord.latitude, lng: coord.longitude })
            if (draggableMarker.onDragEnd) {
              draggableMarker.onDragEnd(coord.latitude, coord.longitude)
            }
            
            // Reset user interaction flag after drag
            setTimeout(() => {
              isUserInteractingRef.current = false
            }, 500)
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
  // BUT only if user is not actively interacting (panning/dragging)
  useEffect(() => {
    if (!mapInstanceRef.current || !window.mapkit) return
    
    // Don't override region if user is actively interacting with the map
    if (isUserInteractingRef.current) {
      console.log('⏸️ Skipping region update - user is interacting')
      return
    }

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
        touchAction: 'auto', // Allow MapKit to handle all touch events
        WebkitTouchCallout: 'none', // Prevent iOS callout menu
        WebkitUserSelect: 'none', // Prevent text selection
        userSelect: 'none',
        ...style
      }}
    />
  )
}

