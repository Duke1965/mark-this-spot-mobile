/**
 * Server-only Google Places client (Pin-time only).
 * Places API (New) via GOOGLE_MAPS_API_KEY. Never use NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
 */

import { createHash } from 'crypto'

export type GoogleNearbyCandidate = {
  placeId: string
  name?: string
  types?: string[]
  location: { lat: number; lon: number }
}

export type GoogleNearbyCandidateWithDistance = GoogleNearbyCandidate & {
  distanceMeters: number
  vicinity?: string
  isChain: boolean
}

export type GoogleNearbySelection = {
  selected: GoogleNearbyCandidateWithDistance | null
  candidates: Array<GoogleNearbyCandidateWithDistance & { selected: boolean }>
  thresholdUsed: number
  reasonIfNotUsed?: string
}

export type GooglePlaceDetails = {
  placeId: string
  name?: string
  formattedAddress?: string
  website?: string
  types?: string[]
  phone?: string
  location?: { lat: number; lon: number }
  photos?: Array<{ photoReference: string; width?: number; height?: number }>
}

const NEARBY_FIELD_MASK = 'places.id,places.displayName,places.location,places.types'
const DETAILS_FIELD_MASK =
  'id,displayName,formattedAddress,websiteUri,types,nationalPhoneNumber,location,photos'

function requireApiKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) throw new Error('Missing GOOGLE_MAPS_API_KEY')
  return key
}

function envInt(name: string, def: number): number {
  const raw = process.env[name]
  if (!raw) return def
  const n = Number(raw)
  return Number.isFinite(n) ? Math.floor(n) : def
}

function placesHeaders(apiKey: string, fieldMask?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Goog-Api-Key': apiKey
  }
  if (fieldMask) headers['X-Goog-FieldMask'] = fieldMask
  return headers
}

function googleErrorStatus(httpStatus: number, body: any): string {
  const status = typeof body?.error?.status === 'string' ? body.error.status : ''
  if (status) return status
  return `HTTP_${httpStatus}`
}

async function fetchPlacesJson(input: {
  url: string
  method: 'GET' | 'POST'
  apiKey: string
  fieldMask: string
  timeoutMs: number
  body?: unknown
}): Promise<{ ok: true; data: any } | { ok: false; status: string }> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), input.timeoutMs)
  try {
    const headers: Record<string, string> = {
      ...placesHeaders(input.apiKey, input.fieldMask)
    }
    if (input.method === 'POST') headers['Content-Type'] = 'application/json'

    const resp = await fetch(input.url, {
      method: input.method,
      headers,
      body: input.method === 'POST' ? JSON.stringify(input.body ?? {}) : undefined,
      signal: controller.signal
    })
    const text = await resp.text()
    let data: any = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = null
      }
    }
    if (!resp.ok) {
      return { ok: false, status: googleErrorStatus(resp.status, data) }
    }
    return { ok: true, data }
  } finally {
    clearTimeout(t)
  }
}

async function fetchPhotoBytes(input: {
  url: string
  apiKey: string
  timeoutMs: number
}): Promise<{ buffer: Buffer; contentType: string }> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), input.timeoutMs)
  try {
    const resp = await fetch(input.url, {
      method: 'GET',
      headers: placesHeaders(input.apiKey),
      signal: controller.signal,
      redirect: 'follow'
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const contentType = resp.headers.get('content-type') || 'image/jpeg'
    if (contentType.toLowerCase().includes('application/json')) {
      throw new Error(`HTTP ${resp.status}`)
    }
    const arrayBuffer = await resp.arrayBuffer()
    return { buffer: Buffer.from(arrayBuffer), contentType }
  } finally {
    clearTimeout(t)
  }
}

function toPlaceId(raw: unknown): string {
  const s = String(raw || '').trim()
  if (!s) return ''
  return s.startsWith('places/') ? s.slice('places/'.length) : s
}

function displayNameText(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (value && typeof value === 'object' && typeof (value as any).text === 'string') {
    const t = String((value as any).text).trim()
    return t || undefined
  }
  return undefined
}

function sanitizePhotoResourceName(name: string): string | null {
  const n = String(name || '').trim()
  if (!n.startsWith('places/')) return null
  if (n.includes('://') || n.includes('..') || n.includes('?') || n.includes('#')) return null
  if (!n.includes('/photos/')) return null
  return n
}

function looksLikeAddressOnly(types: string[] | undefined): boolean {
  const t = (types || []).map((s) => String(s || '').toLowerCase())
  if (t.includes('route') || t.includes('street_address') || t.includes('intersection')) return true
  return false
}

function normalizeName(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const CHAIN_NAMES = [
  'wimpy',
  'kfc',
  'mcdonald',
  "mcdonald's",
  'engen',
  'shell',
  'bp',
  'spar',
  'pick n pay',
  'woolworths',
  'checkers'
].map(normalizeName)

function isLikelyChain(name: string | undefined, types: string[] | undefined): boolean {
  const n = normalizeName(name || '')
  if (!n) return false
  if (CHAIN_NAMES.some((c) => n === c || n.startsWith(`${c} `) || n.includes(` ${c} `))) return true

  // Heuristic: short/common names + retail/food types -> likely chain.
  const t = (types || []).map((s) => String(s || '').toLowerCase())
  const retailish = t.includes('restaurant') || t.includes('food') || t.includes('store') || t.includes('gas_station')
  if (retailish && n.length <= 6) return true
  return false
}

function haversineDistanceMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371000
  const toRad = (x: number) => (x * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function hintMatches(hint: string | undefined, candidateName: string | undefined): boolean {
  const h = normalizeName(hint || '')
  const n = normalizeName(candidateName || '')
  if (!h || !n) return false
  if (h === n) return true
  if (n.includes(h) || h.includes(n)) return true
  return false
}

function preferenceScore(types: string[] | undefined): number {
  const t = (types || []).map((s) => String(s || '').toLowerCase())
  let score = 0

  // Prefer travel/food/visitor POIs
  const preferred = [
    'restaurant',
    'cafe',
    'bar',
    'tourist_attraction',
    'museum',
    'art_gallery',
    'park',
    'lodging',
    'winery'
  ]
  for (const p of preferred) if (t.includes(p)) score += 2

  // Deprioritize util/vehicle POIs that frequently “steal” pins near mixed buildings.
  const deprioritized = ['car_wash', 'car_repair', 'gas_station']
  for (const d of deprioritized) if (t.includes(d)) score -= 3

  // Mild reward for "point_of_interest"
  if (t.includes('point_of_interest')) score += 1
  return score
}

export async function nearbySearch(input: {
  lat: number
  lon: number
  radiusMeters?: number
  term?: string
  maxDistanceMeters?: number
  maxDistanceMetersChain?: number
  /** Adjust Pin: rank Google by distance and pick the closest candidate. Quick Pin omits this. */
  rankByDistance?: boolean
}): Promise<GoogleNearbySelection> {
  const key = requireApiKey()
  const rankByDistance = !!input.rankByDistance
  // Places API (New) circle radius must be > 0 and <= 50000 m.
  const radius = Math.max(
    1,
    Math.min(50000, input.radiusMeters ?? envInt('GOOGLE_PIN_INTEL_RADIUS_METERS', 80))
  )
  const thresh = input.maxDistanceMeters ?? envInt('GOOGLE_PIN_INTEL_MAX_DISTANCE_METERS', 250)
  const empty = (reasonIfNotUsed: string): GoogleNearbySelection => ({
    selected: null,
    candidates: [],
    thresholdUsed: thresh,
    reasonIfNotUsed
  })

  const timeoutMs = envInt('WEBSITE_SCRAPE_TIMEOUT_MS', 3500)
  const body: Record<string, unknown> = {
    languageCode: 'en',
    regionCode: 'ZA',
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: input.lat, longitude: input.lon },
        radius
      }
    }
  }
  if (rankByDistance) {
    body.rankPreference = 'DISTANCE'
  }

  const result = await fetchPlacesJson({
    url: 'https://places.googleapis.com/v1/places:searchNearby',
    method: 'POST',
    apiKey: key,
    fieldMask: NEARBY_FIELD_MASK,
    timeoutMs,
    body
  })

  if (!result.ok) {
    return empty(`google_nearby_status:${result.status}`)
  }

  const results = Array.isArray(result.data?.places) ? result.data.places : []
  if (results.length === 0) {
    return empty('google_nearby_status:ZERO_RESULTS')
  }

  const mapped: GoogleNearbyCandidateWithDistance[] = results
    .map((r: any) => {
      const placeId = toPlaceId(r?.id || r?.name)
      const lat = Number(r?.location?.latitude)
      const lon = Number(r?.location?.longitude)
      if (!placeId || !Number.isFinite(lat) || !Number.isFinite(lon)) return null

      const name = displayNameText(r?.displayName)
      const types = Array.isArray(r?.types) ? r.types.map(String) : undefined
      const distanceMeters = haversineDistanceMeters({ lat: input.lat, lon: input.lon }, { lat, lon })
      const isChain = isLikelyChain(name, types)
      return { placeId, name, types, location: { lat, lon }, distanceMeters, isChain }
    })
    .filter(Boolean) as GoogleNearbyCandidateWithDistance[]

  // Drop clearly address-only results unless we have nothing else.
  const nonAddress = mapped.filter((c) => !looksLikeAddressOnly(c.types))
  const usable = nonAddress.length ? nonAddress : mapped

  const threshChain = input.maxDistanceMetersChain ?? envInt('GOOGLE_PIN_INTEL_MAX_DISTANCE_METERS_CHAIN', 100)

  // Prefer hint matches when present. Nearby Search (New) has no keyword param;
  // matching stays client-side so pin-intel ranking behaviour is unchanged.
  // Adjust Pin must not lock onto a Mapbox-derived name; marker position wins.
  const hint = rankByDistance ? '' : String(input.term || '').trim()
  const within = usable.filter((c) => c.distanceMeters <= (c.isChain ? threshChain : thresh))
  const hintMatchesWithin = hint ? within.filter((c) => hintMatches(hint, c.name)) : []
  const pool = hintMatchesWithin.length ? hintMatchesWithin : within

  if (pool.length === 0) {
    return {
      selected: null,
      candidates: usable
        .slice(0, 3)
        .map((c) => ({ ...c, selected: false }))
        .sort((a, b) => a.distanceMeters - b.distanceMeters),
      thresholdUsed: thresh,
      reasonIfNotUsed: 'google_no_candidate_within_threshold'
    }
  }

  // Quick Pin: preferred type then distance. Adjust Pin: closest first, type as tie-break.
  const selected = pool
    .slice()
    .sort((a, b) => {
      if (rankByDistance) {
        const dd = a.distanceMeters - b.distanceMeters
        if (dd !== 0) return dd
        return preferenceScore(b.types) - preferenceScore(a.types)
      }
      const ps = preferenceScore(a.types) - preferenceScore(b.types)
      if (ps !== 0) return -ps
      return a.distanceMeters - b.distanceMeters
    })[0]!
  const thresholdUsed = selected.isChain ? threshChain : thresh

  // Return top 3 candidates for diagnostics (sorted by distance)
  const top = usable
    .slice()
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 3)
    .map((c) => ({ ...c, selected: c.placeId === selected.placeId }))

  try {
    console.log('📍 Google Nearby candidates:', {
      pin: { lat: input.lat, lon: input.lon },
      thresholdUsed,
      hint: hint || undefined,
      candidates: top.map((c) => ({
        name: c.name,
        placeId: c.placeId,
        distanceMeters: Math.round(c.distanceMeters),
        vicinity: c.vicinity,
        types: c.types?.slice(0, 6),
        isChain: c.isChain,
        selected: c.selected
      }))
    })
  } catch {
    // ignore
  }

  return { selected, candidates: top, thresholdUsed }
}

export async function placeDetails(placeId: string): Promise<GooglePlaceDetails | null> {
  const key = requireApiKey()
  const id = toPlaceId(placeId)
  if (!id) return null

  const timeoutMs = envInt('WEBSITE_SCRAPE_TIMEOUT_MS', 3500)
  const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`)
  url.searchParams.set('languageCode', 'en')
  url.searchParams.set('regionCode', 'ZA')

  const result = await fetchPlacesJson({
    url: url.toString(),
    method: 'GET',
    apiKey: key,
    fieldMask: DETAILS_FIELD_MASK,
    timeoutMs
  })
  if (!result.ok) return null

  const r = result.data
  const resolvedId = toPlaceId(r?.id || r?.name || id)
  if (!resolvedId) return null

  const lat = Number(r?.location?.latitude)
  const lon = Number(r?.location?.longitude)

  return {
    placeId: resolvedId,
    name: displayNameText(r?.displayName),
    formattedAddress: typeof r?.formattedAddress === 'string' ? r.formattedAddress : undefined,
    website: typeof r?.websiteUri === 'string' ? r.websiteUri : undefined,
    types: Array.isArray(r?.types) ? r.types.map(String) : undefined,
    phone: typeof r?.nationalPhoneNumber === 'string' ? r.nationalPhoneNumber : undefined,
    location: Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : undefined,
    photos: Array.isArray(r?.photos)
      ? r.photos
          .map((p: any) => ({
            photoReference: sanitizePhotoResourceName(String(p?.name || '')) || '',
            width: Number.isFinite(Number(p?.widthPx)) ? Number(p.widthPx) : undefined,
            height: Number.isFinite(Number(p?.heightPx)) ? Number(p.heightPx) : undefined
          }))
          .filter((p: any) => p.photoReference)
      : []
  }
}

export async function fetchPhoto(photoRef: string, maxWidth: number): Promise<{ buffer: Buffer; contentType: string }> {
  const key = requireApiKey()
  const resourceName = sanitizePhotoResourceName(photoRef)
  if (!resourceName) throw new Error('Invalid photo resource')

  const maxW = Math.max(400, Math.min(1600, Math.floor(maxWidth || 1200)))
  const url = `https://places.googleapis.com/v1/${resourceName}/media?maxWidthPx=${maxW}`
  const timeoutMs = envInt('WEBSITE_SCRAPE_TIMEOUT_MS', 3500)
  return await fetchPhotoBytes({ url, apiKey: key, timeoutMs })
}

export function hashPhotoRef(photoRef: string): string {
  return createHash('md5').update(photoRef).digest('hex').slice(0, 10)
}
