/**
 * PINIT Place Identity Resolver
 * Resolves place identity using TomTom APIs
 */

import type { PlaceIdentity } from './types'

const TOMTOM_REVERSE_GEOCODE_BASE = 'https://api.tomtom.com/search/2/reverseGeocode'
const TOMTOM_NEARBY_SEARCH_BASE = 'https://api.tomtom.com/search/2/nearbySearch/.json'

/**
 * Simple string similarity (Levenshtein-like)
 */
function simpleSimilarity(a: string, b: string): number {
  const aLower = a.toLowerCase()
  const bLower = b.toLowerCase()
  
  if (aLower === bLower) return 1.0
  if (aLower.includes(bLower) || bLower.includes(aLower)) return 0.8
  
  // Simple character overlap
  const aChars = new Set(aLower.split(''))
  const bChars = new Set(bLower.split(''))
  const intersection = new Set([...aChars].filter(x => bChars.has(x)))
  const union = new Set([...aChars, ...bChars])
  
  return intersection.size / union.size
}

/**
 * Calculate distance in meters between two coordinates
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Score a candidate place
 */
function scoreCandidate(
  candidate: any,
  lat: number,
  lng: number,
  userHintName?: string
): number {
  let score = 0.5 // Base score
  
  // Distance score (closer = higher)
  const distance = haversineDistance(
    lat,
    lng,
    candidate.position?.lat || candidate.lat || lat,
    candidate.position?.lon || candidate.lng || lng
  )
  const distanceScore = Math.max(0, 1 - distance / 150) // Normalize to 150m
  score += distanceScore * 0.3
  
  // Name similarity boost if user hint provided
  if (userHintName) {
    const name = candidate.poi?.name || candidate.name || ''
    const similarity = simpleSimilarity(name, userHintName)
    score += similarity * 0.2
  }
  
  // Presence of website/phone/categories boost
  if (candidate.poi?.phone || candidate.phone) score += 0.1
  if (candidate.poi?.urls || candidate.website) score += 0.1
  if (candidate.poi?.categories?.length > 0 || candidate.category) score += 0.1
  
  return Math.min(1.0, score)
}

/**
 * Resolve place identity from coordinates
 */
export async function resolvePlaceIdentity(
  lat: number,
  lng: number,
  userHintName?: string
): Promise<PlaceIdentity> {
  const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY || process.env.NEXT_PUBLIC_TOMTOM_API_KEY
  
  if (!TOMTOM_API_KEY) {
    throw new Error('TOMTOM_API_KEY or NEXT_PUBLIC_TOMTOM_API_KEY environment variable is required')
  }
  
  try {
    // Step 1: Reverse geocode to get address components
    const reverseUrl = new URL(`${TOMTOM_REVERSE_GEOCODE_BASE}/${lat},${lng}.json`)
    reverseUrl.searchParams.set('key', TOMTOM_API_KEY)
    reverseUrl.searchParams.set('radius', '100')
    
    const reverseResponse = await fetch(reverseUrl.toString(), {
      next: { revalidate: 3600 } // Cache for 1 hour
    })
    
    if (!reverseResponse.ok) {
      throw new Error(`TomTom reverse geocode failed: ${reverseResponse.status}`)
    }
    
    const reverseData = await reverseResponse.json()
    const address = reverseData.addresses?.[0]?.address || {}
    
    // Extract address components
    const locality = address.municipality || address.municipalitySubdivision || ''
    const region = address.countrySubdivision || ''
    const country = address.countryCode || ''
    const addressText = address.freeformAddress || ''
    
    // Step 2: Nearby search for POIs
    const nearbyUrl = new URL(TOMTOM_NEARBY_SEARCH_BASE)
    nearbyUrl.searchParams.set('lat', lat.toString())
    nearbyUrl.searchParams.set('lon', lng.toString())
    nearbyUrl.searchParams.set('radius', '150')
    nearbyUrl.searchParams.set('limit', '5')
    nearbyUrl.searchParams.set('key', TOMTOM_API_KEY)
    
    const nearbyResponse = await fetch(nearbyUrl.toString(), {
      next: { revalidate: 300 } // Cache for 5 minutes
    })
    
    let bestCandidate: any = null
    let bestScore = 0.55 // Threshold
    
    if (nearbyResponse.ok) {
      const nearbyData = await nearbyResponse.json()
      const results = nearbyData.results || []
      
      // Score and find best candidate
      for (const result of results) {
        const score = scoreCandidate(result, lat, lng, userHintName)
        if (score > bestScore) {
          bestScore = score
          bestCandidate = result
        }
      }
    }
    
    // Build PlaceIdentity
    let name: string
    let category: string | undefined
    let website: string | undefined
    let phone: string | undefined
    let sourceId: string | undefined
    let confidence = 0.5
    
    if (bestCandidate) {
      name = bestCandidate.poi?.name || addressText || 'Unknown Location'
      category = bestCandidate.poi?.categories?.[0] || bestCandidate.poi?.categorySet?.[0]?.name
      website = bestCandidate.poi?.urls?.[0] || undefined
      phone = bestCandidate.poi?.phone || undefined
      sourceId = bestCandidate.id
      confidence = bestScore
    } else {
      // Fallback to reverse geocode label
      name = addressText || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
      confidence = 0.3
    }
    
    // Build canonical query
    const canonicalQuery = [name, locality, region].filter(Boolean).join(' ').trim()
    
    return {
      lat,
      lng,
      name,
      category,
      address: addressText,
      locality,
      region,
      country,
      website,
      phone,
      source: 'tomtom',
      sourceId,
      confidence,
      canonicalQuery
    }
  } catch (error) {
    console.error('❌ Error resolving place identity:', error)
    
    // Fallback identity
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
