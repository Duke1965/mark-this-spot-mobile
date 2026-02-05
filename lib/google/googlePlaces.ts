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

function pickBestCandidate(results: any[]): any | null {
  if (!Array.isArray(results) || results.length === 0) return null

  // Prefer non-address-like candidates, keep first otherwise.
  for (const r of results) {
    const types = Array.isArray(r?.types) ? r.types : []
    if (!looksLikeAddressOnly(types)) return r
  }
  return results[0] || null
}

export async function nearbySearch(input: {
  lat: number
  lon: number
  radiusMeters?: number
  term?: string
}): Promise<GoogleNearbyCandidate | null> {
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
  if (status !== 'OK') return null

  const best = pickBestCandidate(Array.isArray(data?.results) ? data.results : [])
  if (!best?.place_id || !best?.geometry?.location) return null

  return {
    placeId: String(best.place_id),
    name: typeof best?.name === 'string' ? best.name : undefined,
    types: Array.isArray(best?.types) ? best.types.map(String) : undefined,
    location: { lat: Number(best.geometry.location.lat), lon: Number(best.geometry.location.lng) }
  }
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

