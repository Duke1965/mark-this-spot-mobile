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
        // Enable scrolling by default - we'll disable it only during marker drag
        const map = new window.mapkit.Map(mapContainerRef.current, {
          region,
          showsUserLocation: false,
          isZoomEnabled: interactive, // Enable zoom for pinch gestures
          isScrollEnabled: interactive, // Enable scrolling - disable only during marker drag
          isRotationEnabled: false,
          mapType: mapType === 'hybrid' ? window.mapkit.Map.MapTypes.Hybrid : 
                   mapType === 'satellite' ? window.mapkit.Map.MapTypes.Satellite :
                   window.mapkit.Map.MapTypes.Standard,
          pointOfInterestFilter: poiFilter
        })

        mapInstanceRef.current = map
        isInitializedRef.current = true

        // Store original region and zoom to prevent map panning during marker drag
        let lockedRegion: any = null
        let regionResetInterval: NodeJS.Timeout | null = null

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



          // Track dragging state and lock map region during drag
          annotation.addEventListener('drag-start', (e: any) => {
            isDraggingMarkerRef.current = true
            setIsDragging(true)
            
            // Lock the current map center to prevent panning (but allow zoom)
            lockedRegion = map.region
            const lockedCenter = lockedRegion.center
            
            // Disable map scrolling while dragging marker (but keep zoom enabled for pinch-to-zoom)
            map.isScrollEnabled = false
            map.isZoomEnabled = true // Keep zoom enabled for pinch-to-zoom
            
            // Continuously reset map center to locked position during drag
            // This prevents the map from panning while allowing zoom via pinch
            regionResetInterval = setInterval(() => {
              if (lockedRegion && isDraggingMarkerRef.current) {
                // Only reset center, preserve span (zoom level can change via pinch)
                const currentSpan = map.region.span
                map.region = new window.mapkit.CoordinateRegion(lockedCenter, currentSpan)
              }
            }, 16) // ~60fps for smooth locking
            
            console.log('📍 Marker drag started - map center locked (zoom allowed)', {
              center: { lat: lockedCenter.latitude, lng: lockedCenter.longitude }
            })
          })

          annotation.addEventListener('drag', (e: any) => {
            isDraggingMarkerRef.current = true
            // Keep scrolling disabled during drag (zoom remains enabled)
            map.isScrollEnabled = false
            // Don't change zoom setting during drag - keep it enabled
          })

          annotation.addEventListener('drag-end', (e: any) => {
            isDraggingMarkerRef.current = false
            setIsDragging(false)
            
            // Stop the region reset interval
            if (regionResetInterval) {
              clearInterval(regionResetInterval)
              regionResetInterval = null
            }
            
            // Re-enable scrolling and zoom after drag ends
            map.isScrollEnabled = interactive
            map.isZoomEnabled = interactive
            
            // Clear locked region
            lockedRegion = null
            
            const coord = annotation.coordinate
            console.log('📍 Marker drag ended at:', { lat: coord.latitude, lng: coord.longitude })
            if (draggableMarker.onDragEnd) {
              draggableMarker.onDragEnd(coord.latitude, coord.longitude)
            }
          })
          
          // Also listen for select event to prepare for potential drag
          // This helps us catch the interaction earlier
          annotation.addEventListener('select', () => {
            // Pre-emptively prepare for drag by locking region
            if (!isDraggingMarkerRef.current) {
              lockedRegion = map.region
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
        touchAction: 'auto', // Allow MapKit to handle all touch events
        WebkitTouchCallout: 'none', // Prevent iOS callout menu
        WebkitUserSelect: 'none', // Prevent text selection
        userSelect: 'none',
        ...style
      }}
    />
  )
}

