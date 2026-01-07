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
        // Enable scrolling and zooming so MapKit can detect drag gestures and allow pinch zoom
        // We'll prevent map panning via continuous region reset during drag
        const map = new window.mapkit.Map(mapContainerRef.current, {
          region,
          showsUserLocation: false,
          isZoomEnabled: true, // Enable zoom for pinch gestures
          isScrollEnabled: true, // Enable for drag detection
          isRotationEnabled: false
        })

        mapInstanceRef.current = map
        isInitializedRef.current = true

        // Store original region and zoom to prevent map panning
        let originalRegion = region
        let regionResetInterval: NodeJS.Timeout | null = null

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
            title: 'Drag me',
            color: '#3B82F6', // Blue pin color
            glyphText: '📍' // Pin emoji
          })

          // Listen to region changes and IMMEDIATELY cancel them during drag
          map.addEventListener('region-change-start', () => {
            if (isDraggingMarkerRef.current && map) {
              // Cancel the region change immediately
              map.region = originalRegion
            }
          })

          // Also listen to region-change events during drag
          map.addEventListener('region-change', () => {
            if (isDraggingMarkerRef.current && map) {
              // Reset region immediately if it changed
              const currentRegion = map.region
              const centerMoved = Math.abs(currentRegion.center.latitude - originalRegion.center.latitude) +
                                  Math.abs(currentRegion.center.longitude - originalRegion.center.longitude)
              if (centerMoved > 0.000001) {
                // Reset center but keep zoom
                const resetRegion = new window.mapkit.CoordinateRegion(
                  originalRegion.center,
                  currentRegion.span
                )
                map.region = resetRegion
              }
            }
          })


          // Track dragging state and prevent map panning
          annotation.addEventListener('drag-start', (e: any) => {
            isDraggingMarkerRef.current = true
            setIsDragging(true)
            // Store the current region as the original (lock map position)
            originalRegion = map.region
            // Disable scrolling immediately
            map.isScrollEnabled = false
            // Start continuously resetting map region to prevent panning
            regionResetInterval = setInterval(() => {
              if (isDraggingMarkerRef.current && map) {
                try {
                  const currentRegion = map.region
                  // Only reset center (latitude/longitude), allow zoom changes
                  const centerMoved = Math.abs(currentRegion.center.latitude - originalRegion.center.latitude) +
                                      Math.abs(currentRegion.center.longitude - originalRegion.center.longitude)
                  if (centerMoved > 0.000001) {
                    // Reset center but keep current zoom
                    const resetRegion = new window.mapkit.CoordinateRegion(
                      originalRegion.center,
                      currentRegion.span // Keep current zoom level
                    )
                    map.region = resetRegion
                  }
                } catch (err) {
                  // Ignore errors
                }
              }
            }, 16) // ~60fps to keep map locked
            console.log('📍 Marker drag started - locking map position')
          })

          annotation.addEventListener('drag', (e: any) => {
            isDraggingMarkerRef.current = true
          })

          annotation.addEventListener('drag-end', (e: any) => {
            isDraggingMarkerRef.current = false
            setIsDragging(false)
            // Stop the region reset interval
            if (regionResetInterval) {
              clearInterval(regionResetInterval)
              regionResetInterval = null
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
      onTouchStart={(e) => {
        // If we have a draggable marker, disable map scrolling immediately on touch
        // This prevents map from panning before drag-start fires
        if (draggableMarker && mapInstanceRef.current) {
          mapInstanceRef.current.isScrollEnabled = false
          console.log('👆 Touch detected - disabled map scrolling preemptively')
        }
      }}
      onTouchEnd={(e) => {
        // Re-enable scrolling after touch ends (for next drag attempt)
        if (draggableMarker && mapInstanceRef.current && !isDraggingMarkerRef.current) {
          mapInstanceRef.current.isScrollEnabled = true
        }
      }}
    />
  )
}

