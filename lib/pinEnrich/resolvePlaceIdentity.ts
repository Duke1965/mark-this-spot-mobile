/**
 * PINIT Place Identity Resolver
 * Resolves place identity using Geoapify (no TomTom).
 */

import type { PlaceIdentity } from './types'
import { getPlacesProvider } from '@/lib/places/providers'

function safeJoin(parts: Array<string | undefined>): string {
  return parts
    .map((p) => (p || '').trim())
    .filter(Boolean)
    .join(' ')
    .trim()
}

function normalizeForCompare(input: string): string {
  return (input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isUsefulHint(hint: string | undefined): boolean {
  const h = (hint || '').trim()
  if (!h) return false
  const lower = h.toLowerCase()
  if (lower === 'location' || lower.startsWith('place near ') || lower.startsWith('place in ')) return false
  if (/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(h)) return false
  if (/^[-+]?\d+\.\d+/.test(h)) return false
  return h.length >= 3
}

function hintMatchesName(hint: string, name: string): boolean {
  const a = normalizeForCompare(hint)
  const b = normalizeForCompare(name)
  if (!a || !b) return false
  if (a === b) return true
  if (a.includes(b) || b.includes(a)) return true

  const aTokens = new Set(a.split(' ').filter(Boolean))
  const bTokens = new Set(b.split(' ').filter(Boolean))
  let inter = 0
  for (const t of aTokens) if (bTokens.has(t)) inter++
  const union = aTokens.size + bTokens.size - inter
  const j = union > 0 ? inter / union : 0
  return j >= 0.6
}

function haversineDistanceMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371000
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/**
 * Resolve place identity from coordinates
 */
export async function resolvePlaceIdentity(
  lat: number,
  lng: number,
  userHintName?: string,
  opts?: { searchRadiusM?: number; maxDistanceM?: number }
): Promise<PlaceIdentity> {
  try {
    const { id: providerId, provider } = getPlacesProvider()
    const { place: resolved } = await provider.resolvePlaceByLatLon(lat, lng, {
      userHintName,
      searchRadiusM: opts?.searchRadiusM,
      maxDistanceM: opts?.maxDistanceM
    })

    let place = resolved

    // If the user provided a specific name hint and the nearby resolver didn't pick something
    // that matches it, do a conservative text search near the point and prefer a matching result.
    if (place && isUsefulHint(userHintName) && !hintMatchesName(userHintName!, place.name || '')) {
      try {
        const candidates = await provider.searchPlaceByText(userHintName!, lat, lng)
        const maxD = Number.isFinite(opts?.maxDistanceM as any) ? Number(opts!.maxDistanceM) : 350

        let best: any = null
        let bestDist = Infinity
        for (const c of (candidates || []).slice(0, 8)) {
          if (!c?.name) continue
          if (!hintMatchesName(userHintName!, c.name)) continue
          const d = haversineDistanceMeters({ lat, lon: lng }, { lat: c.lat, lon: c.lon })
          if (d > maxD) continue
          if (d < bestDist) {
            best = c
            bestDist = d
          }
        }

        if (best) {
          place = best
        }
      } catch {
        // ignore search fallback errors
      }
    }

    if (place) {
      const canonicalQuery = safeJoin([place.name, place.city, place.region])

      return {
        lat,
        lng,
        name: place.name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        category: place.categories?.[0],
        address: place.address,
        locality: place.city,
        region: place.region,
        country: place.country,
        website: place.website,
        phone: place.phone,
        source: providerId,
        sourceId: place.id,
        // Simple confidence mapping: we picked the best from candidates; reward website and non-streety naming.
        confidence: place.website ? 0.85 : 0.7,
        canonicalQuery: canonicalQuery || place.name
      }
    }

    // No place candidate found - fallback identity
    return {
      lat,
      lng,
      name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      source: 'unknown',
      confidence: 0.2,
      canonicalQuery: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    }
  } catch (error) {
    console.error('❌ Error resolving place identity:', error)
    return {
      lat,
      lng,
      name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      source: 'unknown',
      confidence: 0.1,
      canonicalQuery: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    }
  }
}
