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
}

/**
 * Simple string similarity check
 */
function nameMatches(queryName: string, wikidataLabel: string): boolean {
  const qLower = queryName.toLowerCase().trim()
  const wLower = wikidataLabel.toLowerCase().trim()
  
  if (qLower === wLower) return true
  if (qLower.includes(wLower) || wLower.includes(qLower)) return true
  
  // Check if key words match
  const qWords = qLower.split(/\s+/).filter(w => w.length > 3)
  const wWords = wLower.split(/\s+/).filter(w => w.length > 3)
  const matches = qWords.filter(qw => wWords.some(ww => ww.includes(qw) || qw.includes(ww)))
  
  return matches.length >= Math.min(2, qWords.length)
}

/**
 * Try to match place with Wikidata and fetch description/images
 */
export async function tryWikidataMatch(place: PlaceIdentity): Promise<WikidataMatch | null> {
  try {
    // Only attempt if we have a reasonable canonical query
    if (!place.canonicalQuery || place.canonicalQuery.length < 3) {
      return null
    }
    
    // Search Wikidata
    const searchUrl = new URL(WIKIDATA_SEARCH_API)
    searchUrl.searchParams.set('action', 'wbsearchentities')
    searchUrl.searchParams.set('search', place.canonicalQuery)
    searchUrl.searchParams.set('language', 'en')
    searchUrl.searchParams.set('limit', '5')
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
    
    // Find best matching entity
    let bestEntity: any = null
    for (const entity of entities) {
      if (nameMatches(place.canonicalQuery, entity.label || '')) {
        bestEntity = entity
        break
      }
    }
    
    if (!bestEntity) {
      bestEntity = entities[0] // Use first result if no exact match
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
    
    return {
      wikidataId: entityId,
      description,
      commonsImages: images.length > 0 ? images : undefined
    }
  } catch (error) {
    console.error('❌ Error in Wikidata lookup:', error)
    return null
  }
}
