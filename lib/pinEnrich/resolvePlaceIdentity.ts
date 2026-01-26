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

/**
 * Resolve place identity from coordinates
 */
export async function resolvePlaceIdentity(
  lat: number,
  lng: number,
  userHintName?: string
): Promise<PlaceIdentity> {
  try {
    const { id: providerId, provider } = getPlacesProvider()
    const { place, chosenReason } = await provider.resolvePlaceByLatLon(lat, lng, { userHintName })

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
