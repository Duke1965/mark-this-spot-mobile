import type { PlacesProvider } from './types'
import { geoapifyProvider } from './geoapify'

export type PlacesProviderId = 'geoapify'

export function getPlacesProvider(): { id: PlacesProviderId; provider: PlacesProvider } {
  const raw = (process.env.NEXT_PUBLIC_PLACES_PROVIDER || 'geoapify').toLowerCase().trim()

  if (raw === 'geoapify') {
    return { id: 'geoapify', provider: geoapifyProvider }
  }

  // Default/fallback
  return { id: 'geoapify', provider: geoapifyProvider }
}

