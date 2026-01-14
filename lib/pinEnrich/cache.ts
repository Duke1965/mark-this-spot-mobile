/**
 * PINIT Pin Enrichment Cache
 * Caches enriched pin data using geohash-based keys
 */

import type { EnrichedPin } from './types'

export interface CacheEntry {
  key: string
  createdAt: string
  updatedAt: string
  data: EnrichedPin
  expiresAt: string
}

// In-memory cache (can be enhanced with Firestore later)
const cache = new Map<string, CacheEntry>()

/**
 * Generate cache key from coordinates
 * Uses rounded coordinates for ~11m precision
 */
export function getCacheKey(lat: number, lng: number): string {
  return `pin:${lat.toFixed(4)}:${lng.toFixed(4)}`
}

/**
 * Determine TTL in days based on place category
 */
export function getTTLDays(category?: string): number {
  if (!category) return 90 // default

  const businessCategories = [
    'restaurant', 'cafe', 'bar', 'hotel', 'shop', 'store', 
    'winery', 'brewery', 'business', 'store', 'retail'
  ]
  
  const landmarkCategories = [
    'monument', 'museum', 'landmark', 'historic', 'attraction',
    'tourism', 'nature', 'park', 'beach', 'mountain'
  ]

  const catLower = category.toLowerCase()
  
  if (businessCategories.some(bc => catLower.includes(bc))) {
    return 45 // Business: 45 days
  }
  
  if (landmarkCategories.some(lc => catLower.includes(lc))) {
    return 180 // Landmark: 180 days
  }
  
  return 90 // Default: 90 days
}

/**
 * Get cached enrichment data if valid
 */
export function getCached(key: string): EnrichedPin | null {
  const entry = cache.get(key)
  if (!entry) return null
  
  const now = new Date()
  const expiresAt = new Date(entry.expiresAt)
  
  if (now > expiresAt) {
    cache.delete(key) // Expired, remove from cache
    return null
  }
  
  return entry.data
}

/**
 * Set cached enrichment data
 */
export function setCached(key: string, data: EnrichedPin, ttlDays?: number): void {
  const now = new Date()
  const ttl = ttlDays ?? getTTLDays(data.place.category)
  const expiresAt = new Date(now.getTime() + ttl * 24 * 60 * 60 * 1000)
  
  const entry: CacheEntry = {
    key,
    createdAt: cache.has(key) ? cache.get(key)!.createdAt : now.toISOString(),
    updatedAt: now.toISOString(),
    data,
    expiresAt: expiresAt.toISOString()
  }
  
  cache.set(key, entry)
}

/**
 * Clear expired cache entries (cleanup utility)
 */
export function clearExpiredCache(): number {
  const now = new Date()
  let cleared = 0
  
  for (const [key, entry] of cache.entries()) {
    if (new Date(entry.expiresAt) < now) {
      cache.delete(key)
      cleared++
    }
  }
  
  return cleared
}
