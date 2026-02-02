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
const OVERPASS_BASES = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.nchc.org.tw/api/interpreter'
]

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

function haversineDistanceMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const sinDLat = Math.sin(dLat / 2)
  const sinDLon = Math.sin(dLon / 2)
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon
  return 2 * R * Math.asin(Math.sqrt(h))
}

function normStr(s: unknown): string {
  return typeof s === 'string' ? s.trim() : ''
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeForCompare(input: string): string {
  // Lowercase + strip accents + strip non-word characters
  return (input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function similarityScore(a: string, b: string): number {
  const aa = normalizeForCompare(a)
  const bb = normalizeForCompare(b)
  if (!aa || !bb) return 0
  if (aa === bb) return 1
  if (aa.includes(bb) || bb.includes(aa)) return 0.85

  const aTokens = new Set(aa.split(' ').filter(Boolean))
  const bTokens = new Set(bb.split(' ').filter(Boolean))
  if (aTokens.size === 0 || bTokens.size === 0) return 0

  let inter = 0
  for (const t of aTokens) if (bTokens.has(t)) inter++
  const union = aTokens.size + bTokens.size - inter
  return union > 0 ? inter / union : 0
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

async function tryResolveWebsiteFromOverpass(
  name: string,
  center: { lat: number; lon: number },
  signal: AbortSignal
): Promise<string | undefined> {
  const cleaned = (name || '').trim()
  if (!cleaned) return undefined

  // Avoid noisy queries for generic/streety names
  if (isStreetyName(cleaned)) return undefined

  const radiusM = 1500

  // NEW STRATEGY:
  // - Pull any nearby objects that have website/contact:website
  // - Then score locally by (name similarity + distance)
  // This avoids exact-name-match failures (accents, punctuation, alt names).
  const query = `
    [out:json][timeout:8];
    (
      nwr(around:${radiusM},${center.lat},${center.lon})["website"];
      nwr(around:${radiusM},${center.lat},${center.lon})["contact:website"];
    );
    out tags center 80;
  `.trim()

  try {
    // Overpass can be slow/unreliable; retry multiple public instances.
    // Also ensure we abort if either the upstream signal or our timeout fires.
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    if (!signal.aborted) {
      signal.addEventListener('abort', () => controller.abort(), { once: true })
    }

    let resp: Response | null = null
    for (const base of OVERPASS_BASES) {
      try {
        const r = await fetch(base, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal
        })
        if (r.ok) {
          resp = r
          break
        }
      } catch {
        // try next base
      }
    }
    clearTimeout(timeout)

    if (!resp) return undefined

    const data = await resp.json()
    const elements = Array.isArray(data?.elements) ? data.elements : []
    if (elements.length === 0) return undefined

    let bestUrl: string | undefined
    let bestScore = -Infinity

    for (const el of elements) {
      const tags = el?.tags || {}
      // Exclude highways/roads (websites on routes/ways can be misleading)
      if (typeof tags?.highway === 'string' && tags.highway) continue

      const websiteRaw = tags.website || tags['contact:website']
      if (typeof websiteRaw !== 'string' || !websiteRaw.trim()) continue

      const label =
        (typeof tags.name === 'string' && tags.name) ||
        (typeof tags.official_name === 'string' && tags.official_name) ||
        (typeof tags.short_name === 'string' && tags.short_name) ||
        (typeof tags.alt_name === 'string' && tags.alt_name) ||
        (typeof tags.brand === 'string' && tags.brand) ||
        (typeof tags.operator === 'string' && tags.operator) ||
        ''

      const sim = similarityScore(cleaned, label)
      // Allow slightly looser matching; we already reject roads and score by distance too.
      if (!label || sim < 0.22) continue

      const coords = el.center || { lat: el.lat, lon: el.lon }
      const lat = typeof coords?.lat === 'number' ? coords.lat : undefined
      const lon = typeof coords?.lon === 'number' ? coords.lon : undefined
      if (typeof lat !== 'number' || typeof lon !== 'number') continue

      const d = haversineDistanceMeters(center, { lat, lon })
      const distanceScore = Math.max(0, 1 - d / radiusM) // 0..1
      const combined = sim * 0.7 + distanceScore * 0.3
      if (combined > bestScore) {
        bestScore = combined
        bestUrl = websiteRaw.trim()
      }
    }

    if (!bestUrl) return undefined

    // Normalize to URL
    const withScheme = /^https?:\/\//i.test(bestUrl) ? bestUrl : `https://${bestUrl}`
    try {
      const u = new URL(withScheme)
      u.hash = ''
      return u.toString()
    } catch {
      return undefined
    }
  } catch {
    return undefined
  }
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
  'production.winery',
  'commercial.shopping_mall',
  'commercial.marketplace',
  'commercial.gift_and_souvenir',
  'commercial.art',
  'tourism.sights',
  'tourism.attraction',
  'man_made.lighthouse',
  'man_made.tower',
  'man_made.bridge',
  'man_made.pier',
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
    const timeoutMs = parseInt(process.env.GEOAPIFY_RESOLVE_TIMEOUT_MS || process.env.WEBSITE_SCRAPE_TIMEOUT_MS || '6000', 10)
    const { signal, cancel } = withTimeout(Number.isFinite(timeoutMs) ? timeoutMs : 6000)

    try {
      const searchRadiusM = Number.isFinite(opts?.searchRadiusM as any) ? Number(opts!.searchRadiusM) : 300
      const maxDistanceM = Number.isFinite(opts?.maxDistanceM as any) ? Number(opts!.maxDistanceM) : Infinity

      // 1) Places API nearby search (travel/tourism categories first)
      const categories = [
        'tourism',
        'tourism.attraction',
        'tourism.sights',
        'accommodation',
        'catering',
        'entertainment.museum',
        'entertainment.culture.gallery',
        'leisure.park',
        'natural',
        'beach',
        'production.winery',
        // Shopping + local markets + art/souvenir (common “travel pin” targets)
        'commercial.shopping_mall',
        'commercial.marketplace',
        'commercial.gift_and_souvenir',
        'commercial.art',
        // Landmarks / man-made points of interest
        'man_made.lighthouse',
        'man_made.tower',
        'man_made.bridge',
        'man_made.pier',
        'heritage',
        'religion.place_of_worship'
      ].join(',')

      const placesUrl = new URL(GEOAPIFY_PLACES_BASE)
      placesUrl.searchParams.set('apiKey', apiKey)
      placesUrl.searchParams.set('categories', categories)
      placesUrl.searchParams.set('filter', `circle:${lon},${lat},${Math.max(10, Math.min(2000, searchRadiusM))}`)
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

      // Strict mode: if no POIs are within maxDistanceM, fall back to reverse geocode
      // at the exact point rather than choosing a POI that's a block away.
      if (candidates.length > 0 && Number.isFinite(maxDistanceM) && maxDistanceM < 1000) {
        const within = candidates.filter((c) => haversineDistanceMeters({ lat, lon }, { lat: c.lat, lon: c.lon }) <= maxDistanceM)
        if (within.length === 0) {
          candidates = []
        }
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
        const dist = haversineDistanceMeters({ lat, lon }, { lat: c.lat, lon: c.lon })
        if (Number.isFinite(maxDistanceM) && dist > maxDistanceM) continue

        const { score, reason } = scoreCandidate(c, opts?.userHintName)
        const distanceBonus = Number.isFinite(maxDistanceM)
          ? Math.max(0, 1 - dist / Math.max(1, maxDistanceM)) * 2.0
          : Math.max(0, 1 - dist / Math.max(1, searchRadiusM)) * 0.6
        const finalScore = score + distanceBonus

        if (finalScore > bestScore) {
          bestScore = finalScore
          best = c
          chosenReason = `${reason}+dist_${Math.round(dist)}m`
        }
      }

      // Enrich best candidate with Place Details (helps get website/contact)
      if (best) {
        best = await enrichWithPlaceDetails(best, apiKey, signal)
      }

      // If we still don't have a website, try Overpass OSM tags around the place name
      if (best && !best.website) {
        const overpassWebsite = await tryResolveWebsiteFromOverpass(best.name, { lat: best.lat, lon: best.lon }, signal)
        if (overpassWebsite) {
          best = { ...best, website: overpassWebsite }
        }
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

