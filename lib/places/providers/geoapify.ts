/**
 * Geoapify Places Provider
 * - Uses Places API for nearby POI resolution
 * - Uses Geocoding API for text search (bias by proximity)
 */

import type { PlaceCandidate, PlacesProvider } from './types'

const GEOAPIFY_PLACES_BASE = 'https://api.geoapify.com/v2/places'
const GEOAPIFY_GEOCODE_SEARCH_BASE = 'https://api.geoapify.com/v1/geocode/search'
const GEOAPIFY_REVERSE_BASE = 'https://api.geoapify.com/v1/geocode/reverse'
const GEOAPIFY_PLACE_DETAILS_BASE = 'https://api.geoapify.com/v2/place-details'

function getApiKey(): string {
  const key = process.env.GEOAPIFY_API_KEY
  if (!key) {
    throw new Error('Missing GEOAPIFY_API_KEY environment variable')
  }
  return key
}

function withTimeout(ms: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), ms)
  return { signal: controller.signal, cancel: () => clearTimeout(t) }
}

function normStr(s: unknown): string {
  return typeof s === 'string' ? s.trim() : ''
}

function extractWebsite(properties: any): string | undefined {
  const direct =
    normStr(properties?.website) ||
    normStr(properties?.contact?.website) ||
    normStr(properties?.datasource?.raw?.website) ||
    normStr(properties?.datasource?.raw?.['contact:website'])

  if (!direct) return undefined

  // Normalize to a usable URL
  const withScheme = /^https?:\/\//i.test(direct) ? direct : `https://${direct}`
  try {
    const u = new URL(withScheme)
    u.hash = ''
    return u.toString()
  } catch {
    return undefined
  }
}

function extractPhone(properties: any): string | undefined {
  const p =
    normStr(properties?.phone) ||
    normStr(properties?.contact?.phone) ||
    normStr(properties?.datasource?.raw?.phone) ||
    normStr(properties?.datasource?.raw?.['contact:phone'])
  return p || undefined
}

function extractName(properties: any): string {
  const name =
    normStr(properties?.name) ||
    normStr(properties?.address_line1) ||
    normStr(properties?.formatted)
  return name || 'Unknown Place'
}

function extractCategories(properties: any): string[] {
  const cats = Array.isArray(properties?.categories) ? properties.categories : []
  return cats.filter((c: any) => typeof c === 'string' && c.trim()).map((c: string) => c.trim())
}

function buildCandidateFromFeature(feature: any): PlaceCandidate | null {
  const props = feature?.properties
  const lat = typeof props?.lat === 'number' ? props.lat : undefined
  const lon = typeof props?.lon === 'number' ? props.lon : undefined
  if (typeof lat !== 'number' || typeof lon !== 'number') return null

  const id = normStr(props?.place_id) || `${lon.toFixed(6)},${lat.toFixed(6)}`

  return {
    id,
    name: extractName(props),
    categories: extractCategories(props),
    address: normStr(props?.formatted) || undefined,
    city:
      normStr(props?.city) ||
      normStr(props?.town) ||
      normStr(props?.village) ||
      normStr(props?.municipality) ||
      normStr(props?.district) ||
      undefined,
    region: normStr(props?.state) || normStr(props?.county) || undefined,
    country: normStr(props?.country) || normStr(props?.country_code) || undefined,
    website: extractWebsite(props),
    phone: extractPhone(props),
    lat,
    lon,
    source: 'geoapify',
    raw: feature
  }
}

function looksLikeGeoapifyPlaceId(id: string): boolean {
  // Place IDs are long strings; coordinate fallback ids are "lon,lat"
  if (!id) return false
  if (id.includes(',')) return false
  return id.length > 20
}

async function enrichWithPlaceDetails(
  candidate: PlaceCandidate,
  apiKey: string,
  signal: AbortSignal
): Promise<PlaceCandidate> {
  if (!looksLikeGeoapifyPlaceId(candidate.id)) return candidate

  try {
    const url = new URL(GEOAPIFY_PLACE_DETAILS_BASE)
    url.searchParams.set('id', candidate.id)
    url.searchParams.set('features', 'details')
    url.searchParams.set('apiKey', apiKey)
    url.searchParams.set('lang', 'en')

    const resp = await fetch(url.toString(), { signal })
    if (!resp.ok) return candidate

    const data = await resp.json()
    const features = Array.isArray(data?.features) ? data.features : []
    const details =
      features.find((f: any) => f?.properties?.feature_type === 'details') ||
      features[0]

    const props = details?.properties || {}
    const website =
      extractWebsite(props) ||
      extractWebsite(props?.contact) ||
      (typeof props?.website === 'string' ? props.website : undefined)

    const phone =
      extractPhone(props) ||
      extractPhone(props?.contact) ||
      (typeof props?.contact?.phone === 'string' ? props.contact.phone : undefined)

    // Some places have a better name in details
    const name = extractName(props) || candidate.name

    return {
      ...candidate,
      name: name || candidate.name,
      website: candidate.website || website,
      phone: candidate.phone || phone,
      // Keep original raw + details raw for debugging if needed
      raw: { base: candidate.raw, details }
    }
  } catch {
    return candidate
  }
}

function isStreetyName(name: string): boolean {
  const n = name.toLowerCase()
  // Detect generic street/road/intersection-like labels
  return (
    /\b(street|st\\.?|road|rd\\.?|avenue|ave\\.?|drive|dr\\.?|lane|ln\\.?|boulevard|blvd\\.?|highway|hwy\\.?|route|junction|intersection|roundabout)\b/i.test(
      n
    ) ||
    /^\d+\s+\w+/.test(n) || // starts with house number
    n.includes(' at ') ||
    n.includes(' & ') ||
    n.includes(' and ')
  )
}

// Travel-ish categories to prioritize when scoring
const TRAVEL_CATEGORY_PREFIXES = [
  'tourism.',
  'accommodation.',
  'catering.',
  'entertainment.',
  'leisure.',
  'natural.',
  'beach.',
  'heritage.',
  'religion.place_of_worship',
  'building.tourism'
]

function scoreCandidate(c: PlaceCandidate, userHintName?: string): { score: number; reason: string } {
  let score = 0
  const reasons: string[] = []

  if (c.name && c.name !== 'Unknown Place' && !isStreetyName(c.name)) {
    score += 2
    reasons.push('has_named_place')
  } else if (c.name && c.name !== 'Unknown Place') {
    score += 0.5
    reasons.push('name_is_streety')
  }

  if (c.city) {
    score += 1
    reasons.push('has_city')
  }

  if (c.website) {
    score += 2
    reasons.push('has_website')
  }

  const catStr = (c.categories || []).join(',').toLowerCase()
  const travelHit = TRAVEL_CATEGORY_PREFIXES.some((p) => catStr.includes(p))
  if (travelHit) {
    score += 1.5
    reasons.push('travel_category')
  }

  if (userHintName) {
    const hint = userHintName.toLowerCase().trim()
    const name = c.name.toLowerCase()
    if (hint && (name === hint || name.includes(hint) || hint.includes(name))) {
      score += 1
      reasons.push('matches_hint')
    }
  }

  return { score, reason: reasons.join('+') || 'default' }
}

export const geoapifyProvider: PlacesProvider = {
  async resolvePlaceByLatLon(lat, lon, opts) {
    const apiKey = getApiKey()
    const timeoutMs = parseInt(process.env.WEBSITE_SCRAPE_TIMEOUT_MS || '3500', 10)
    const { signal, cancel } = withTimeout(Number.isFinite(timeoutMs) ? timeoutMs : 3500)

    try {
      // 1) Places API nearby search (travel categories first)
      const categories = [
        'tourism',
        'accommodation',
        'catering',
        'entertainment.museum',
        'leisure.park',
        'natural',
        'religion.place_of_worship'
      ].join(',')

      const placesUrl = new URL(GEOAPIFY_PLACES_BASE)
      placesUrl.searchParams.set('apiKey', apiKey)
      placesUrl.searchParams.set('categories', categories)
      placesUrl.searchParams.set('filter', `circle:${lon},${lat},300`)
      placesUrl.searchParams.set('bias', `proximity:${lon},${lat}`)
      placesUrl.searchParams.set('limit', '20')

      const placesResp = await fetch(placesUrl.toString(), { signal })
      let candidates: PlaceCandidate[] = []

      if (placesResp.ok) {
        const data = await placesResp.json()
        const features = Array.isArray(data?.features) ? data.features : []
        candidates = features
          .map(buildCandidateFromFeature)
          .filter((x: any) => x !== null) as PlaceCandidate[]
      }

      // 2) If no candidates, fallback to reverse geocode (address-ish)
      if (candidates.length === 0) {
        const revUrl = new URL(GEOAPIFY_REVERSE_BASE)
        revUrl.searchParams.set('apiKey', apiKey)
        revUrl.searchParams.set('lat', String(lat))
        revUrl.searchParams.set('lon', String(lon))
        revUrl.searchParams.set('format', 'json')
        revUrl.searchParams.set('lang', 'en')

        const revResp = await fetch(revUrl.toString(), { signal })
        if (revResp.ok) {
          const rev = await revResp.json()
          const result = Array.isArray(rev?.results) ? rev.results[0] : null
          if (result) {
            candidates = [
              {
                id: normStr(result.place_id) || `${lon.toFixed(6)},${lat.toFixed(6)}`,
                name: normStr(result.name) || normStr(result.address_line1) || 'Unknown Place',
                categories: [normStr(result.category)].filter(Boolean),
                address: normStr(result.formatted) || undefined,
                city:
                  normStr(result.city) ||
                  normStr(result.town) ||
                  normStr(result.village) ||
                  normStr(result.suburb) ||
                  undefined,
                region: normStr(result.state) || normStr(result.county) || undefined,
                country: normStr(result.country) || normStr(result.country_code) || undefined,
                website: undefined,
                phone: undefined,
                lat: typeof result.lat === 'number' ? result.lat : lat,
                lon: typeof result.lon === 'number' ? result.lon : lon,
                source: 'geoapify',
                raw: result
              }
            ]
          }
        }
      }

      let best: PlaceCandidate | null = null
      let bestScore = -Infinity
      let chosenReason = 'no_candidates'

      for (const c of candidates) {
        const { score, reason } = scoreCandidate(c, opts?.userHintName)
        if (score > bestScore) {
          bestScore = score
          best = c
          chosenReason = reason
        }
      }

      // Enrich best candidate with Place Details (helps get website/contact)
      if (best) {
        best = await enrichWithPlaceDetails(best, apiKey, signal)
      }

      return { place: best, candidates, chosenReason }
    } finally {
      cancel()
    }
  },

  async searchPlaceByText(query, nearLat, nearLon) {
    const apiKey = getApiKey()
    const { signal, cancel } = withTimeout(4000)
    try {
      const url = new URL(GEOAPIFY_GEOCODE_SEARCH_BASE)
      url.searchParams.set('apiKey', apiKey)
      url.searchParams.set('text', query)
      url.searchParams.set('bias', `proximity:${nearLon},${nearLat}`)
      url.searchParams.set('format', 'json')
      url.searchParams.set('limit', '10')
      url.searchParams.set('lang', 'en')

      const resp = await fetch(url.toString(), { signal })
      if (!resp.ok) return []
      const data = await resp.json()
      const results = Array.isArray(data?.results) ? data.results : []

      return results
        .map((r: any): PlaceCandidate | null => {
          const lat = typeof r?.lat === 'number' ? r.lat : undefined
          const lon = typeof r?.lon === 'number' ? r.lon : undefined
          if (typeof lat !== 'number' || typeof lon !== 'number') return null
          return {
            id: normStr(r.place_id) || `${lon.toFixed(6)},${lat.toFixed(6)}`,
            name: normStr(r.name) || normStr(r.address_line1) || normStr(r.formatted) || 'Unknown Place',
            categories: [normStr(r.category)].filter(Boolean),
            address: normStr(r.formatted) || undefined,
            city: normStr(r.city) || normStr(r.town) || normStr(r.village) || normStr(r.suburb) || undefined,
            region: normStr(r.state) || normStr(r.county) || undefined,
            country: normStr(r.country) || normStr(r.country_code) || undefined,
            website: undefined,
            phone: undefined,
            lat,
            lon,
            source: 'geoapify',
            raw: r
          }
        })
        .filter((x: any) => x !== null) as PlaceCandidate[]
    } finally {
      cancel()
    }
  }
}

