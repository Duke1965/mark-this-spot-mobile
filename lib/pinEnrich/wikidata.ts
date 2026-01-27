/**
 * PINIT Wikidata/Wikimedia Integration
 * Minimal integration for fetching descriptions and images from Wikidata/Wikimedia
 */

import type { PlaceIdentity } from './types'

const WIKIDATA_SEARCH_API = 'https://www.wikidata.org/w/api.php'
const WIKIMEDIA_COMMONS_API = 'https://commons.wikimedia.org/w/api.php'

export interface WikidataMatch {
  wikidataId?: string
  description?: string
  commonsImages?: string[]
  officialWebsite?: string
}

/**
 * Check if a name looks like a road/highway identifier
 */
function isRoadLikeName(name: string): boolean {
  const trimmed = name.trim()
  const upper = trimmed.toUpperCase()
  
  // Road number patterns: R44, N1, M3, etc.
  if (/^[RNM]\d{1,4}$/.test(upper)) {
    return true
  }
  
  // Edge case: very short numeric-only with optional prefix
  if (/^[A-Z]?\d{1,4}$/.test(upper) && trimmed.length <= 6) {
    return true
  }
  
  // Check for road-related keywords (case-insensitive)
  const lower = trimmed.toLowerCase()
  const roadKeywords = ['road', 'rd', 'highway', 'hwy', 'street', 'st', 'avenue', 'ave']
  if (roadKeywords.some(keyword => lower.includes(keyword))) {
    return true
  }
  
  return false
}

/**
 * Determine if we should attempt Wikidata lookup
 */
export function shouldAttemptWikidata(place: PlaceIdentity): boolean {
  // Skip if confidence is too low
  if (place.confidence < 0.7) {
    return false
  }
  
  // Skip if name is road-like
  if (isRoadLikeName(place.name)) {
    return false
  }
  
  // Skip if canonicalQuery is basically just coordinates
  if (place.canonicalQuery && /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(place.canonicalQuery.trim())) {
    return false
  }
  
  return true
}

/**
 * Calculate similarity between two strings (0-1)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()
  
  if (s1 === s2) return 1.0
  if (s1.includes(s2) || s2.includes(s1)) return 0.9
  
  // Token-based similarity
  const tokens1 = s1.split(/\s+/).filter(t => t.length > 2 && !['the', 'and', 'farm', 'restaurant', 'hotel', 'inn'].includes(t))
  const tokens2 = s2.split(/\s+/).filter(t => t.length > 2 && !['the', 'and', 'farm', 'restaurant', 'hotel', 'inn'].includes(t))
  
  if (tokens1.length === 0 || tokens2.length === 0) return 0
  
  const matches = tokens1.filter(t1 => tokens2.some(t2 => t1 === t2 || t1.includes(t2) || t2.includes(t1)))
  return matches.length / Math.max(tokens1.length, tokens2.length)
}

/**
 * Simple string similarity check
 */
function nameMatches(queryName: string, wikidataLabel: string): boolean {
  return calculateSimilarity(queryName, wikidataLabel) >= 0.75
}

/**
 * Check if entity description contains rejection keywords
 */
function shouldRejectEntity(entity: any): boolean {
  const desc = (entity.description || '').toLowerCase()
  const rejectionKeywords = ['helicopter', 'aircraft', 'person', 'band', 'song', 'album', 'company', 'model']
  return rejectionKeywords.some(keyword => desc.includes(keyword))
}

/**
 * Check if entity description contains preferred keywords (optional boost)
 */
function isPreferredEntity(entity: any): boolean {
  const desc = (entity.description || '').toLowerCase()
  const preferredKeywords = [
    'farm', 'restaurant', 'winery', 'market', 'museum', 'park',
    'nature reserve', 'mountain', 'beach', 'tourist attraction', 'building',
    'hotel', 'inn', 'lodge', 'resort', 'vineyard', 'shop', 'store'
  ]
  return preferredKeywords.some(keyword => desc.includes(keyword))
}

/**
 * Try to match place with Wikidata and fetch description/images
 * STRICT MATCHING: Only returns results for strong matches, never falls back to entities[0]
 */
export async function tryWikidataMatch(place: PlaceIdentity): Promise<WikidataMatch | null> {
  try {
    // Only attempt if we have a reasonable name
    if (!place.name || place.name.length < 3) {
      return null
    }
    
    // Build search query: prefer place.name, optionally add locality
    let searchQuery = place.name
    if (place.locality && !isRoadLikeName(place.name)) {
      searchQuery = `${place.name} ${place.locality}`
    }
    // Avoid adding region unless absolutely needed (too broad)
    
    // Search Wikidata
    const searchUrl = new URL(WIKIDATA_SEARCH_API)
    searchUrl.searchParams.set('action', 'wbsearchentities')
    searchUrl.searchParams.set('search', searchQuery)
    searchUrl.searchParams.set('language', 'en')
    searchUrl.searchParams.set('limit', '10') // Check more candidates for better filtering
    searchUrl.searchParams.set('format', 'json')
    searchUrl.searchParams.set('origin', '*')
    
    const searchResponse = await fetch(searchUrl.toString(), {
      next: { revalidate: 86400 } // Cache for 24 hours
    })
    
    if (!searchResponse.ok) {
      return null
    }
    
    const searchData = await searchResponse.json()
    const entities = searchData.search || []
    
    if (entities.length === 0) {
      return null
    }
    
    // Find best matching entity with STRICT criteria
    let bestEntity: any = null
    let bestScore = 0
    
    for (const entity of entities) {
      // Check if entity should be rejected
      if (shouldRejectEntity(entity)) {
        continue
      }
      
      // Calculate similarity score against place.name (NOT canonicalQuery)
      const similarity = calculateSimilarity(place.name, entity.label || '')
      
      // Must meet minimum threshold
      if (similarity < 0.75) {
        continue
      }
      
      // Boost score for preferred entities
      let score = similarity
      if (isPreferredEntity(entity)) {
        score += 0.1
      }
      
      // Track best match
      if (score > bestScore) {
        bestScore = score
        bestEntity = entity
      }
    }
    
    // STRICT: Only return if we found a strong match
    if (!bestEntity || bestScore < 0.75) {
      return null
    }
    
    const entityId = bestEntity.id
    if (!entityId) {
      return null
    }
    
    // Fetch entity data
    const entityUrl = new URL(WIKIDATA_SEARCH_API)
    entityUrl.searchParams.set('action', 'wbgetentities')
    entityUrl.searchParams.set('ids', entityId)
    entityUrl.searchParams.set('props', 'descriptions|claims')
    entityUrl.searchParams.set('languages', 'en')
    entityUrl.searchParams.set('format', 'json')
    entityUrl.searchParams.set('origin', '*')
    
    const entityResponse = await fetch(entityUrl.toString(), {
      next: { revalidate: 86400 } // Cache for 24 hours
    })
    
    if (!entityResponse.ok) {
      return { wikidataId: entityId } // Return ID even if we can't fetch details
    }
    
    const entityData = await entityResponse.json()
    const entity = entityData.entities?.[entityId]
    
    if (!entity) {
      return { wikidataId: entityId }
    }
    
    // Extract description
    const description = entity.descriptions?.en?.value || undefined
    
    // Extract image (P18 property)
    const imageClaims = entity.claims?.P18 || []
    const images: string[] = []
    
    for (const claim of imageClaims.slice(0, 3)) {
      const imageName = claim.mainsnak?.datavalue?.value
      if (imageName) {
        // Convert to Wikimedia Commons URL
        const encodedName = encodeURIComponent(imageName.replace(/ /g, '_'))
        images.push(`https://commons.wikimedia.org/wiki/Special:FilePath/${encodedName}`)
      }
    }

    // Extract official website (P856)
    let officialWebsite: string | undefined
    const websiteClaims = entity.claims?.P856 || []
    for (const claim of websiteClaims) {
      const url = claim?.mainsnak?.datavalue?.value
      if (typeof url === 'string' && url.trim()) {
        try {
          const u = new URL(url.trim())
          u.hash = ''
          officialWebsite = u.toString()
          break
        } catch {
          // skip invalid url
        }
      }
    }
    
    return {
      wikidataId: entityId,
      description,
      commonsImages: images.length > 0 ? images : undefined,
      officialWebsite
    }
  } catch (error) {
    console.error('❌ Error in Wikidata lookup:', error)
    return null
  }
}
