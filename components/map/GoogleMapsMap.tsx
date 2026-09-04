"use client"

import React, { useEffect, useRef, useState } from 'react'

/**
 * Adjust Pin Location editor map (Google Maps JavaScript API).
 * Supports only the InteractiveMapEditor contract. Do not pass LatLng objects out.
 */

export interface GoogleMapsMapProps {
  center: { lat: number; lng: number }
  zoom?: number
  interactive?: boolean
  className?: string
  style?: React.CSSProperties
  draggableMarker?: {
    lat: number
    lng: number
    onDragEnd: (lat: number, lng: number) => void
  }
}

type GoogleMapsNs = {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => GoogleMapInstance
  Marker: new (opts: Record<string, unknown>) => GoogleMarkerInstance
  event: { clearInstanceListeners: (instance: unknown) => void }
}

type GoogleMapInstance = {
  setCenter: (pos: { lat: number; lng: number }) => void
  setZoom: (zoom: number) => void
  setOptions: (opts: Record<string, unknown>) => void
}

type GoogleMarkerInstance = {
  setPosition: (pos: { lat: number; lng: number }) => void
  getPosition: () => { lat: () => number; lng: () => number } | null
  setMap: (map: GoogleMapInstance | null) => void
  addListener: (event: string, handler: () => void) => unknown
}

const SCRIPT_ATTR = 'data-mappo-google-maps'
let googleMapsLoadPromise: Promise<GoogleMapsNs> | null = null

function getGoogleMaps(): GoogleMapsNs | null {
  if (typeof window === 'undefined') return null
  const maps = (window as unknown as { google?: { maps?: GoogleMapsNs } }).google?.maps
  if (!maps?.Map || !maps?.Marker || !maps?.event) return null
  return maps
}

function loadGoogleMapsJs(apiKey: string): Promise<GoogleMapsNs> {
  const existing = getGoogleMaps()
  if (existing) return Promise.resolve(existing)
  if (googleMapsLoadPromise) return googleMapsLoadPromise

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    const already = document.querySelector(`script[${SCRIPT_ATTR}]`) as HTMLScriptElement | null
    const onReady = () => {
      const maps = getGoogleMaps()
      if (maps) resolve(maps)
      else reject(new Error('Google Maps loaded but API is unavailable'))
    }

    if (already) {
      already.addEventListener('load', onReady)
      already.addEventListener('error', () => reject(new Error('Failed to load Google Maps')))
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`
    script.async = true
    script.defer = true
    script.setAttribute(SCRIPT_ATTR, 'true')
    script.onload = onReady
    script.onerror = () => {
      googleMapsLoadPromise = null
      reject(new Error('Failed to load Google Maps'))
    }
    document.head.appendChild(script)
  })

  return googleMapsLoadPromise
}

function sameCoords(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
  epsilon = 0.0001
): boolean {
  return Math.abs(a.lat - b.lat) < epsilon && Math.abs(a.lng - b.lng) < epsilon
}

export default function GoogleMapsMap({
  center,
  zoom = 13,
  interactive = true,
  className = '',
  style = {},
  draggableMarker,
}: GoogleMapsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<GoogleMapInstance | null>(null)
  const markerRef = useRef<GoogleMarkerInstance | null>(null)
  const mapsRef = useRef<GoogleMapsNs | null>(null)
  const isDraggingRef = useRef(false)
  const lastDraggedPositionRef = useRef<{ lat: number; lng: number } | null>(null)
  const onDragEndRef = useRef(draggableMarker?.onDragEnd)
  const centerRef = useRef(center)
  const zoomRef = useRef(zoom)
  const markerCoordsRef = useRef(
    draggableMarker ? { lat: draggableMarker.lat, lng: draggableMarker.lng } : null
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  onDragEndRef.current = draggableMarker?.onDragEnd
  centerRef.current = center
  zoomRef.current = zoom
  markerCoordsRef.current = draggableMarker
    ? { lat: draggableMarker.lat, lng: draggableMarker.lng }
    : null

  useEffect(() => {
    const apiKey = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '').trim()
    if (!apiKey) {
      setErrorMessage('Google Maps is unavailable. Missing browser map key.')
      return
    }
    if (!containerRef.current) return

    let cancelled = false

    loadGoogleMapsJs(apiKey)
      .then((maps) => {
        if (cancelled || !containerRef.current) return
        mapsRef.current = maps

        const latestCenter = centerRef.current
        const latestZoom = zoomRef.current
        const map = new maps.Map(containerRef.current, {
          center: { lat: latestCenter.lat, lng: latestCenter.lng },
          zoom: latestZoom,
          gestureHandling: interactive ? 'greedy' : 'none',
          draggable: interactive,
          disableDoubleClickZoom: !interactive,
          scrollwheel: interactive,
          keyboardShortcuts: interactive,
        })
        mapRef.current = map

        const markerCoords = markerCoordsRef.current
        if (markerCoords) {
          const marker = new maps.Marker({
            position: { lat: markerCoords.lat, lng: markerCoords.lng },
            map,
            draggable: true,
            title: 'Adjust pin location',
          })
          marker.addListener('dragstart', () => {
            isDraggingRef.current = true
          })
          marker.addListener('dragend', () => {
            const pos = marker.getPosition()
            const lat = pos ? pos.lat() : markerCoordsRef.current?.lat ?? markerCoords.lat
            const lng = pos ? pos.lng() : markerCoordsRef.current?.lng ?? markerCoords.lng
            const next = { lat: Number(lat), lng: Number(lng) }
            lastDraggedPositionRef.current = next
            isDraggingRef.current = false
            onDragEndRef.current?.(next.lat, next.lng)
          })
          markerRef.current = marker
        }

        setErrorMessage(null)
      })
      .catch(() => {
        if (!cancelled) {
          setErrorMessage('Google Maps failed to load.')
        }
      })

    return () => {
      cancelled = true
      const maps = mapsRef.current
      if (maps) {
        if (markerRef.current) {
          maps.event.clearInstanceListeners(markerRef.current)
          markerRef.current.setMap(null)
        }
        if (mapRef.current) {
          maps.event.clearInstanceListeners(mapRef.current)
        }
      }
      markerRef.current = null
      mapRef.current = null
    }
    // Initialize once; center/zoom/marker updates are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || isDraggingRef.current) return
    map.setCenter({ lat: center.lat, lng: center.lng })
  }, [center.lat, center.lng])

  useEffect(() => {
    const map = mapRef.current
    if (!map || zoom === undefined) return
    map.setZoom(zoom)
  }, [zoom])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.setOptions({
      gestureHandling: interactive ? 'greedy' : 'none',
      draggable: interactive,
      disableDoubleClickZoom: !interactive,
      scrollwheel: interactive,
      keyboardShortcuts: interactive,
    })
  }, [interactive])

  useEffect(() => {
    const marker = markerRef.current
    if (!marker || !draggableMarker) return
    if (isDraggingRef.current) return

    const next = { lat: draggableMarker.lat, lng: draggableMarker.lng }
    if (
      lastDraggedPositionRef.current &&
      sameCoords(lastDraggedPositionRef.current, next)
    ) {
      marker.setPosition(next)
      lastDraggedPositionRef.current = null
      return
    }

    marker.setPosition(next)
  }, [draggableMarker?.lat, draggableMarker?.lng])

  if (errorMessage) {
    return (
      <div
        className={className}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          textAlign: 'center',
          color: '#3a2e1e',
          background: 'rgba(244, 239, 230, 0.95)',
          ...style,
        }}
      >
        {errorMessage}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        ...style,
      }}
    />
  )
}
