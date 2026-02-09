/**
 * Server-only Google Places client (Pin-time only).
 * Uses a server key via GOOGLE_MAPS_API_KEY.
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

async function fetchJsonWithTimeout(url: string, timeoutMs: number): Promise<any> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const resp = await fetch(url, { signal: controller.signal })
    const text = await resp.text()
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    return text ? JSON.parse(text) : null
  } finally {
    clearTimeout(t)
  }
}

async function fetchBytesWithTimeout(
  url: string,
  timeoutMs: number
): Promise<{ buffer: Buffer; contentType: string }> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const resp = await fetch(url, { signal: controller.signal, redirect: 'follow' })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const contentType = resp.headers.get('content-type') || 'image/jpeg'
    const arrayBuffer = await resp.arrayBuffer()
    return { buffer: Buffer.from(arrayBuffer), contentType }
  } finally {
    clearTimeout(t)
  }
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

export async function nearbySearch(input: {
  lat: number
  lon: number
  radiusMeters?: number
  term?: string
  maxDistanceMeters?: number
  maxDistanceMetersChain?: number
}): Promise<GoogleNearbySelection> {
  const key = requireApiKey()
  const radius = Math.max(10, Math.min(250, input.radiusMeters ?? envInt('GOOGLE_PIN_INTEL_RADIUS_METERS', 80)))

  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json')
  url.searchParams.set('key', key)
  url.searchParams.set('location', `${input.lat},${input.lon}`)
  url.searchParams.set('radius', String(radius))
  url.searchParams.set('language', 'en')
  url.searchParams.set('region', 'za')

  // Bias the search toward the user hint (reduces "wrong POI next door" picks).
  const term = String(input.term || '').trim()
  if (term.length >= 3 && term.length <= 80 && !/^[-+]?\d+\.\d+/.test(term)) {
    url.searchParams.set('keyword', term)
  }

  const timeoutMs = envInt('WEBSITE_SCRAPE_TIMEOUT_MS', 3500)
  const data = await fetchJsonWithTimeout(url.toString(), timeoutMs)
  const status = String(data?.status || '')
  if (status !== 'OK') {
    return {
      selected: null,
      candidates: [],
      thresholdUsed: input.maxDistanceMeters ?? envInt('GOOGLE_PIN_INTEL_MAX_DISTANCE_METERS', 250),
      reasonIfNotUsed: `google_nearby_status:${status}`
    }
  }

  const results = Array.isArray(data?.results) ? data.results : []
  const mapped: GoogleNearbyCandidateWithDistance[] = results
    .map((r: any) => {
      const placeId = r?.place_id ? String(r.place_id) : ''
      const loc = r?.geometry?.location
      const lat = Number(loc?.lat)
      const lon = Number(loc?.lng)
      if (!placeId || !Number.isFinite(lat) || !Number.isFinite(lon)) return null

      const name = typeof r?.name === 'string' ? r.name : undefined
      const types = Array.isArray(r?.types) ? r.types.map(String) : undefined
      const distanceMeters = haversineDistanceMeters({ lat: input.lat, lon: input.lon }, { lat, lon })
      const vicinity = typeof r?.vicinity === 'string' ? r.vicinity : undefined
      const isChain = isLikelyChain(name, types)
      return { placeId, name, types, location: { lat, lon }, distanceMeters, vicinity, isChain }
    })
    .filter(Boolean) as GoogleNearbyCandidateWithDistance[]

  // Drop clearly address-only results unless we have nothing else.
  const nonAddress = mapped.filter((c) => !looksLikeAddressOnly(c.types))
  const usable = nonAddress.length ? nonAddress : mapped

  // Thresholds (meters)
  const thresh = input.maxDistanceMeters ?? envInt('GOOGLE_PIN_INTEL_MAX_DISTANCE_METERS', 250)
  const threshChain = input.maxDistanceMetersChain ?? envInt('GOOGLE_PIN_INTEL_MAX_DISTANCE_METERS_CHAIN', 100)

  // Prefer hint matches when present.
  const hint = String(input.term || '').trim()
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

  const selected = pool.slice().sort((a, b) => a.distanceMeters - b.distanceMeters)[0]!
  const thresholdUsed = selected.isChain ? threshChain : thresh

  // Return top 3 candidates for diagnostics (sorted by distance)
  const top = usable
    .slice()
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 3)
    .map((c) => ({ ...c, selected: c.placeId === selected.placeId }))

  // Log per candidate for server debugging.
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
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  url.searchParams.set('key', key)
  url.searchParams.set('place_id', placeId)
  url.searchParams.set(
    'fields',
    [
      'place_id',
      'name',
      'formatted_address',
      'website',
      'types',
      'photos',
      'formatted_phone_number',
      'geometry/location'
    ].join(',')
  )
  url.searchParams.set('language', 'en')
  url.searchParams.set('region', 'za')

  const timeoutMs = envInt('WEBSITE_SCRAPE_TIMEOUT_MS', 3500)
  const data = await fetchJsonWithTimeout(url.toString(), timeoutMs)
  const status = String(data?.status || '')
  if (status !== 'OK') return null

  const r = data?.result
  if (!r?.place_id) return null

  return {
    placeId: String(r.place_id),
    name: typeof r?.name === 'string' ? r.name : undefined,
    formattedAddress: typeof r?.formatted_address === 'string' ? r.formatted_address : undefined,
    website: typeof r?.website === 'string' ? r.website : undefined,
    types: Array.isArray(r?.types) ? r.types.map(String) : undefined,
    phone: typeof r?.formatted_phone_number === 'string' ? r.formatted_phone_number : undefined,
    location:
      r?.geometry?.location && Number.isFinite(Number(r.geometry.location.lat)) && Number.isFinite(Number(r.geometry.location.lng))
        ? { lat: Number(r.geometry.location.lat), lon: Number(r.geometry.location.lng) }
        : undefined,
    photos: Array.isArray(r?.photos)
      ? r.photos
          .map((p: any) => ({
            photoReference: typeof p?.photo_reference === 'string' ? p.photo_reference : '',
            width: Number.isFinite(Number(p?.width)) ? Number(p.width) : undefined,
            height: Number.isFinite(Number(p?.height)) ? Number(p.height) : undefined
          }))
          .filter((p: any) => p.photoReference)
      : []
  }
}

export async function fetchPhoto(photoRef: string, maxWidth: number): Promise<{ buffer: Buffer; contentType: string }> {
  const key = requireApiKey()
  const maxW = Math.max(400, Math.min(1600, Math.floor(maxWidth || 1200)))
  const url = new URL('https://maps.googleapis.com/maps/api/place/photo')
  url.searchParams.set('key', key)
  url.searchParams.set('maxwidth', String(maxW))
  url.searchParams.set('photoreference', photoRef)

  const timeoutMs = envInt('WEBSITE_SCRAPE_TIMEOUT_MS', 3500)
  return await fetchBytesWithTimeout(url.toString(), timeoutMs)
}

export function hashPhotoRef(photoRef: string): string {
  return createHash('md5').update(photoRef).digest('hex').slice(0, 10)
}

