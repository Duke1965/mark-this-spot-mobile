"use client"

import React, { useEffect, useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MAPBOX_API_KEY } from '@/lib/mapConfig'

/**
 * Mapbox Map Component
 * 
 * A React wrapper for Mapbox GL JS that provides:
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

export interface POI {
  id: string
  lat: number
  lng: number
  name?: string
  category?: string
}

export interface MapboxMapProps {
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
  // Optional: Show nearby POIs on the map
  showPOIs?: boolean
  onPOIClick?: (poi: POI) => void
}

export default function MapboxMap({
  center,
  zoom = 13,
  pins = [],
  onMapClick,
  onPinClick,
  interactive = true,
  className = "",
  style = {},
  draggableMarker,
  showPOIs = false,
  onPOIClick
}: MapboxMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const poiMarkersRef = useRef<Map<string, any>>(new Map())
  const draggableMarkerRef = useRef<any>(null)
  const isMapLoadedRef = useRef<boolean>(false)
  const isDraggingRef = useRef<boolean>(false)
  const lastDraggedPositionRef = useRef<{ lat: number; lng: number } | null>(null)
  const poiDataRef = useRef<POI[]>([])

  // Helper function to get POI icon based on category
  const getPOIIcon = (category: string = ''): string => {
    const cat = category.toLowerCase()
    if (cat.includes('restaurant') || cat.includes('food') || cat.includes('dining')) return '🍽️'
    if (cat.includes('cafe') || cat.includes('coffee')) return '☕'
    if (cat.includes('museum') || cat.includes('gallery') || cat.includes('art')) return '🎨'
    if (cat.includes('monument') || cat.includes('memorial') || cat.includes('landmark')) return '🏛️'
    if (cat.includes('park') || cat.includes('garden')) return '🌳'
    if (cat.includes('beach') || cat.includes('nature')) return '🏖️'
    if (cat.includes('hotel') || cat.includes('lodging')) return '🏨'
    if (cat.includes('church') || cat.includes('temple') || cat.includes('worship')) return '⛪'
    return '📍' // Default icon
  }

  // Fetch POIs from pin-intel and display them on the map
  const fetchAndDisplayPOIs = useCallback(async (map: any) => {
    if (!center.lat || !center.lng) return
    
    try {
      console.log('🏪 Fetching POIs for map display...')
      const response = await fetch('/api/pinit/pin-intel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lat: center.lat,
          lng: center.lng,
          precision: 5
        })
      })
      
      if (!response.ok) {
        console.warn('⚠️ Failed to fetch POIs:', response.status)
        return
      }
      
      const data = await response.json()
      const places = data.places || []
      
      console.log(`✅ Found ${places.length} POIs to display on map`)
      
      // Clear existing POI markers
      poiMarkersRef.current.forEach(marker => marker.remove())
      poiMarkersRef.current.clear()
      
      // Add markers for each POI
      places.slice(0, 20).forEach((place: any) => { // Limit to 20 POIs to avoid clutter
        const poi: POI = {
          id: place.id || `poi-${Math.random().toString(36).substr(2, 9)}`,
          lat: place.lat,
          lng: place.lng,
          name: place.name,
          category: place.categories?.[0] || ''
        }
        
        const icon = getPOIIcon(poi.category)
        
        // Create POI marker element
        const poiElement = document.createElement('div')
        poiElement.style.width = '28px'
        poiElement.style.height = '28px'
        poiElement.style.fontSize = '20px'
        poiElement.style.display = 'flex'
        poiElement.style.alignItems = 'center'
        poiElement.style.justifyContent = 'center'
        poiElement.style.cursor = 'pointer'
        poiElement.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
        poiElement.style.transition = 'transform 0.2s ease'
        poiElement.textContent = icon
        poiElement.title = poi.name || poi.category || 'POI'
        
        // Add hover effect
        poiElement.addEventListener('mouseenter', () => {
          poiElement.style.transform = 'scale(1.3)'
        })
        poiElement.addEventListener('mouseleave', () => {
          poiElement.style.transform = 'scale(1)'
        })
        
        // Add click handler
        if (onPOIClick) {
          poiElement.addEventListener('click', () => {
            onPOIClick(poi)
          })
        }
        
        const marker = new mapboxgl.Marker({
          element: poiElement
        })
          .setLngLat([poi.lng, poi.lat])
          .addTo(map)
        
        poiMarkersRef.current.set(poi.id, marker)
      })
      
      poiDataRef.current = places.slice(0, 20).map((place: any) => ({
        id: place.id || `poi-${Math.random().toString(36).substr(2, 9)}`,
        lat: place.lat,
        lng: place.lng,
        name: place.name,
        category: place.categories?.[0] || ''
      }))
      
    } catch (error) {
      console.error('❌ Error fetching POIs for map:', error)
    }
  }, [center.lat, center.lng, onPOIClick])

  // Helper function to add draggable marker
  const addDraggableMarker = (map: any, markerData: { lat: number; lng: number; onDragEnd: (lat: number, lng: number) => void }) => {
    try {
      // Remove existing draggable marker if it exists
      if (draggableMarkerRef.current) {
        draggableMarkerRef.current.remove()
        draggableMarkerRef.current = null
      }

      // Create draggable marker with pin icon
      const markerElement = document.createElement('div')
      markerElement.style.width = '40px'
      markerElement.style.height = '40px'
      markerElement.style.display = 'flex'
      markerElement.style.alignItems = 'center'
      markerElement.style.justifyContent = 'center'
      markerElement.style.fontSize = '32px'
      markerElement.style.cursor = 'move'
      markerElement.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
      markerElement.textContent = '📍'

      const marker = new mapboxgl.Marker({
        element: markerElement,
        draggable: true
      })
        .setLngLat([markerData.lng, markerData.lat])
        .addTo(map)

      // Listen for drag events
      marker.on('dragstart', () => {
        isDraggingRef.current = true
        console.log('📍 Drag started')
      })
      
      marker.on('dragend', () => {
        const lngLat = marker.getLngLat()
        const newPosition = { lat: lngLat.lat, lng: lngLat.lng }
        lastDraggedPositionRef.current = newPosition
        isDraggingRef.current = false
        console.log('📍 Drag ended at:', newPosition)
        markerData.onDragEnd(newPosition.lat, newPosition.lng)
      })

      draggableMarkerRef.current = marker
      console.log('📍 Draggable marker added to Mapbox map:', { lat: markerData.lat, lng: markerData.lng })
    } catch (error) {
      console.error('❌ Failed to add draggable marker:', error)
    }
  }

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return

    // Validate API key
    if (!MAPBOX_API_KEY) {
      console.error('❌ Mapbox API key is missing. Set NEXT_PUBLIC_MAPBOX_API_KEY in your environment variables.')
      return
    }

    // Set Mapbox access token
    mapboxgl.accessToken = MAPBOX_API_KEY

    console.log('🔧 Initializing Mapbox map...', {
      hasContainer: !!mapContainerRef.current,
      apiKey: MAPBOX_API_KEY ? 'present' : 'missing',
      center: [center.lng, center.lat]
    })

    try {
      // Initialize Mapbox map
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [center.lng, center.lat], // Mapbox uses [lng, lat] format
        zoom: zoom,
        interactive: interactive
      })

      mapInstanceRef.current = map

      // Wait for map to load before adding event handlers
      map.on('load', () => {
        console.log('🗺️ Mapbox map loaded successfully')
        isMapLoadedRef.current = true
        
        // Add click handler for map clicks (pin creation)
        if (onMapClick && interactive) {
          map.on('click', (e) => {
            onMapClick({
              lat: e.lngLat.lat,
              lng: e.lngLat.lng
            })
          })
        }
        
        // Add draggable marker if provided (after map is loaded)
        const currentDraggableMarker = draggableMarker
        if (currentDraggableMarker) {
          addDraggableMarker(map, currentDraggableMarker)
        }
        
        // Fetch and display POIs if enabled
        if (showPOIs) {
          fetchAndDisplayPOIs(map)
        }
      })

      map.on('error', (e) => {
        console.error('❌ Mapbox map error:', e)
      })
    } catch (error) {
      console.error('❌ Failed to initialize Mapbox map:', error)
    }

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
          console.warn('⚠️ Error removing Mapbox map:', error)
        }
        mapInstanceRef.current = null
      }
      // Clear all markers
      markersRef.current.clear()
      poiMarkersRef.current.forEach(marker => marker.remove())
      poiMarkersRef.current.clear()
    }
  }, []) // Only run once on mount

  // Update map center when center prop changes
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      try {
        mapInstanceRef.current.setCenter([center.lng, center.lat])
        
        // Refresh POIs if enabled and map is loaded
        if (showPOIs && isMapLoadedRef.current) {
          fetchAndDisplayPOIs(mapInstanceRef.current)
        }
      } catch (error) {
        console.warn('⚠️ Error updating Mapbox map center:', error)
      }
    }
  }, [center.lat, center.lng, showPOIs, fetchAndDisplayPOIs])

  // Update map zoom when zoom prop changes
  useEffect(() => {
    if (mapInstanceRef.current && zoom !== undefined) {
      try {
        mapInstanceRef.current.setZoom(zoom)
      } catch (error) {
        console.warn('⚠️ Error updating Mapbox map zoom:', error)
      }
    }
  }, [zoom])

  // Handle draggable marker (for editing use case)
  useEffect(() => {
    if (!mapInstanceRef.current || !draggableMarker) return

    // Don't update marker if we're currently dragging or if the new position matches the last dragged position
    if (isDraggingRef.current) {
      console.log('📍 Skipping marker update - drag in progress')
      return
    }

    // If the new position matches the last dragged position, it means the state update came from the drag
    if (lastDraggedPositionRef.current && 
        Math.abs(lastDraggedPositionRef.current.lat - draggableMarker.lat) < 0.0001 &&
        Math.abs(lastDraggedPositionRef.current.lng - draggableMarker.lng) < 0.0001) {
      console.log('📍 Position matches last drag - updating marker position')
      if (draggableMarkerRef.current) {
        draggableMarkerRef.current.setLngLat([draggableMarker.lng, draggableMarker.lat])
        lastDraggedPositionRef.current = null // Clear after update
        return
      }
    }

    // If map is already loaded, add or update marker
    if (isMapLoadedRef.current) {
      // If marker already exists, just update its position instead of recreating
      if (draggableMarkerRef.current) {
        const currentPos = draggableMarkerRef.current.getLngLat()
        const newPos = { lat: draggableMarker.lat, lng: draggableMarker.lng }
        // Only update if position actually changed
        if (Math.abs(currentPos.lat - newPos.lat) > 0.0001 || Math.abs(currentPos.lng - newPos.lng) > 0.0001) {
          console.log('📍 Updating existing marker position:', newPos)
          draggableMarkerRef.current.setLngLat([newPos.lng, newPos.lat])
        }
      } else {
        // Marker doesn't exist yet, create it
        addDraggableMarker(mapInstanceRef.current, draggableMarker)
      }
    } else {
      // If map is not loaded yet, wait for it to load
      console.log('⏳ Waiting for map to load before adding draggable marker...')
    }
  }, [draggableMarker?.lat, draggableMarker?.lng, draggableMarker?.onDragEnd])

  // Update markers when pins change
  useEffect(() => {
    if (!mapInstanceRef.current || draggableMarker) return // Skip if using draggable marker

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

        const marker = new mapboxgl.Marker({
          element: markerElement
        })
          .setLngLat([pin.lng, pin.lat])
          .addTo(mapInstanceRef.current!)

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
        const bounds = new mapboxgl.LngLatBounds()
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
  }, [pins, onPinClick])

  return (
    <div
      ref={mapContainerRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        touchAction: 'pan-x pan-y', // Allow map panning but prevent page scrolling
        ...style
      }}
    />
  )
}

