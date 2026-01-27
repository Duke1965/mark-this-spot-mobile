import type { PinData } from '@/lib/types'

export interface ClusterPin {
  id: string
  latitude: number
  longitude: number
  count: number
  pins: PinData[]
  bounds: {
    north: number
    south: number
    east: number
    west: number
  }
}

export interface ClusteringOptions {
  maxZoom: number
  minZoom: number
  radius: number // pixels
  minPoints: number
}

const DEFAULT_OPTIONS: ClusteringOptions = {
  maxZoom: 14,
  minZoom: 1,
  radius: 50,
  minPoints: 2
}

export function clusterPins(
  pins: PinData[],
  zoom: number,
  bounds: { north: number; south: number; east: number; west: number },
  options: Partial<ClusteringOptions> = {}
): ClusterPin[] {
  const opts: ClusteringOptions = { ...DEFAULT_OPTIONS, ...options }

  // If zoom is too high, return individual pins
  if (zoom > opts.maxZoom) {
    return pins.map((pin) => ({
      id: pin.id,
      latitude: pin.latitude,
      longitude: pin.longitude,
      count: 1,
      pins: [pin],
      bounds: {
        north: pin.latitude + 0.001,
        south: pin.latitude - 0.001,
        east: pin.longitude + 0.001,
        west: pin.longitude - 0.001
      }
    }))
  }

  // If zoom is too low, return one big cluster
  if (zoom < opts.minZoom) {
    return [
      {
        id: 'global-cluster',
        latitude: (bounds.north + bounds.south) / 2,
        longitude: (bounds.east + bounds.west) / 2,
        count: pins.length,
        pins,
        bounds
      }
    ]
  }

  const clusters: ClusterPin[] = []
  const processed = new Set<string>()

  for (const pin of pins) {
    if (processed.has(pin.id)) continue

    const cluster: ClusterPin = {
      id: `cluster-${pin.id}`,
      latitude: pin.latitude,
      longitude: pin.longitude,
      count: 1,
      pins: [pin],
      bounds: {
        north: pin.latitude + 0.001,
        south: pin.latitude - 0.001,
        east: pin.longitude + 0.001,
        west: pin.longitude - 0.001
      }
    }

    // Find nearby pins to cluster
    for (const otherPin of pins) {
      if (otherPin.id === pin.id || processed.has(otherPin.id)) continue

      const distanceKm = calculateDistance(pin.latitude, pin.longitude, otherPin.latitude, otherPin.longitude)
      // Convert km-distance to pixel distance (approx, good enough for UI clustering)
      const pixelDistance = distanceKm * Math.pow(2, zoom) * 256 / 360

      if (pixelDistance <= opts.radius) {
        cluster.pins.push(otherPin)
        cluster.count++
        processed.add(otherPin.id)

        // Update cluster center (average)
        cluster.latitude = cluster.pins.reduce((sum, p) => sum + p.latitude, 0) / cluster.pins.length
        cluster.longitude = cluster.pins.reduce((sum, p) => sum + p.longitude, 0) / cluster.pins.length

        // Update bounds
        cluster.bounds = {
          north: Math.max(...cluster.pins.map((p) => p.latitude)),
          south: Math.min(...cluster.pins.map((p) => p.latitude)),
          east: Math.max(...cluster.pins.map((p) => p.longitude)),
          west: Math.min(...cluster.pins.map((p) => p.longitude))
        }
      }
    }

    processed.add(pin.id)

    // Only create cluster if it has enough points or is a single important pin
    if (cluster.count >= opts.minPoints || isImportantPin(pin)) {
      clusters.push(cluster)
    }
  }

  return clusters
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function isImportantPin(pin: PinData): boolean {
  return (
    (typeof (pin as any).rating === 'number' && (pin as any).rating >= 4.5) ||
    (typeof (pin as any).totalEndorsements === 'number' && (pin as any).totalEndorsements >= 10) ||
    (Array.isArray(pin.tags) && pin.tags.includes('trending')) ||
    (pin as any).isRecommended === true
  )
}

export function getClusterColor(count: number): string {
  if (count >= 20) return '#ef4444' // red
  if (count >= 10) return '#f97316' // orange
  if (count >= 5) return '#eab308' // yellow
  if (count >= 2) return '#22c55e' // green
  return '#3b82f6' // blue
}

export function getClusterSize(count: number): number {
  if (count >= 20) return 40
  if (count >= 10) return 35
  if (count >= 5) return 30
  if (count >= 2) return 25
  return 20
}

