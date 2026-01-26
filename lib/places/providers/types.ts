/**
 * Places provider interface
 * Allows swapping place-data backends without touching UI/business logic.
 */

export type PlaceSource = 'geoapify'

export type PlaceCandidate = {
  id: string
  name: string
  categories: string[]
  address?: string
  city?: string
  region?: string
  country?: string
  website?: string
  phone?: string
  lat: number
  lon: number
  source: PlaceSource
  // Keep raw response for diagnostics/debugging (server-only)
  raw?: unknown
}

export interface PlacesProvider {
  /**
   * Resolve a real-world place near the given coordinates.
   * Returns the single best candidate, or null if none.
   */
  resolvePlaceByLatLon(
    lat: number,
    lon: number,
    opts?: { userHintName?: string }
  ): Promise<{ place: PlaceCandidate | null; candidates: PlaceCandidate[]; chosenReason: string }>

  /**
   * Search places by text, biased near a location.
   */
  searchPlaceByText(
    query: string,
    nearLat: number,
    nearLon: number
  ): Promise<PlaceCandidate[]>
}

