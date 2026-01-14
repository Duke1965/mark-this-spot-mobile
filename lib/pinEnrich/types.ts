/**
 * PINIT Pin Enrichment Types
 * Data models for the hybrid pin enrichment pipeline
 */

export type PlaceIdentity = {
  lat: number
  lng: number
  name: string
  category?: string
  address?: string
  locality?: string
  region?: string
  country?: string
  website?: string
  phone?: string
  source: "tomtom" | "geoapify" | "sygic" | "unknown"
  sourceId?: string
  confidence: number // 0..1
  canonicalQuery: string // e.g. "Spier Wine Farm Stellenbosch"
  wikidataId?: string // Q-id if found
}

export type EnrichedPin = {
  place: PlaceIdentity
  description?: string
  images: Array<{
    url: string // our hosted URL
    source: "wikimedia" | "website" | "stock"
    sourceUrl?: string // original source page/image
    fetchedAt: string // ISO
  }>
  debug?: any // only in non-prod
}
