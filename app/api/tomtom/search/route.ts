import { type NextRequest, NextResponse } from 'next/server'

/**
 * Legacy route name: `/api/tomtom/search`
 *
 * This endpoint now uses **Geoapify Places API** for nearby POIs.
 * We keep the route path stable so the UI doesn’t need to change.
 */

const GEOAPIFY_PLACES_BASE = 'https://api.geoapify.com/v2/places'

// In-memory cache to prevent duplicate requests (5 minutes)
const searchCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 300000

function getApiKey(): string | null {
  return process.env.GEOAPIFY_API_KEY || null
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function mapRequestedToGeoapifyCategories(categories: string): string[] {
  const map: Record<string, string[]> = {
    restaurant: ['catering.restaurant'],
    cafe: ['catering.cafe'],
    bar: ['catering.bar', 'catering.pub'],
    museum: ['entertainment.museum'],
    art_gallery: ['entertainment.culture.gallery'],
    place_of_worship: ['religion.place_of_worship'],
    tourism: ['tourism.attraction', 'tourism.sights'],
    attraction: ['tourism.attraction', 'tourism.sights'],
    landmark: ['tourism.sights'],
    monument: ['tourism.sights', 'heritage'],
    historic: ['heritage', 'tourism.sights'],
    park: ['leisure.park'],
    nature: ['natural']
  }

  const requested = (categories || '')
    .split(',')
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean)

  const out = new Set<string>()
  for (const r of requested) {
    const mapped = map[r]
    if (mapped) mapped.forEach((m) => out.add(m))
  }

  // Default to travel categories if none mapped
  if (out.size === 0) {
    ;['tourism', 'accommodation', 'catering', 'entertainment.museum', 'leisure.park'].forEach((c) => out.add(c))
  }

  return Array.from(out)
}

function pickString(v: any): string {
  return typeof v === 'string' ? v.trim() : ''
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng') || searchParams.get('lon')
  const radius = searchParams.get('radius') || '200'
  const limit = searchParams.get('limit') || '20'
  const categories =
    searchParams.get('categories') ||
    'restaurant,cafe,monument,museum,art_gallery,place_of_worship,tourism,historic,landmark,attraction'

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Missing lat/lng parameters' }, { status: 400 })
  }

  const latNum = parseFloat(lat)
  const lngNum = parseFloat(lng)

  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    return NextResponse.json({ error: 'Invalid lat/lng values' }, { status: 400 })
  }
  if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
    return NextResponse.json({ error: 'Coordinates out of valid range' }, { status: 400 })
  }

  const apiKey = getApiKey()
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing GEOAPIFY_API_KEY env var' }, { status: 500 })
  }

  const cacheKey = `${latNum.toFixed(6)},${lngNum.toFixed(6)},${radius},${limit},${categories}`
  const cached = searchCache.get(cacheKey)
  const now = Date.now()
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'HIT'
      }
    })
  }

  try {
    const geoCategories = mapRequestedToGeoapifyCategories(categories)
    const placesUrl = new URL(GEOAPIFY_PLACES_BASE)
    placesUrl.searchParams.set('apiKey', apiKey)
    placesUrl.searchParams.set('categories', geoCategories.join(','))
    placesUrl.searchParams.set('filter', `circle:${lngNum},${latNum},${Math.max(50, parseInt(radius, 10) || 200)}`)
    placesUrl.searchParams.set('bias', `proximity:${lngNum},${latNum}`)
    placesUrl.searchParams.set('limit', String(Math.min(50, Math.max(1, parseInt(limit, 10) || 20))))

    const response = await fetch(placesUrl.toString(), { next: { revalidate: 300 } })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      return NextResponse.json(
        {
          pois: [],
          status: 'ERROR',
          source: 'geoapify',
          error: `Geoapify Places API error: ${response.status} ${errorText.substring(0, 200)}`
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    const features = Array.isArray(data?.features) ? data.features : []

    const pois = features
      .map((f: any) => {
        const p = f?.properties || {}
        const poiLat = typeof p.lat === 'number' ? p.lat : undefined
        const poiLng = typeof p.lon === 'number' ? p.lon : undefined
        if (typeof poiLat !== 'number' || typeof poiLng !== 'number') return null

        const distance =
          typeof p.distance === 'number' ? p.distance : calculateDistance(latNum, lngNum, poiLat, poiLng)

        const cats = Array.isArray(p.categories) ? p.categories : []
        const catStr = cats.find((c: any) => typeof c === 'string') || 'place'

        return {
          id: pickString(p.place_id) || `${poiLat},${poiLng}`,
          name: pickString(p.name) || pickString(p.address_line1) || pickString(p.formatted) || 'Unknown Place',
          category: catStr,
          description: pickString(p.address_line2) || pickString(p.formatted) || undefined,
          location: { lat: poiLat, lng: poiLng },
          address: pickString(p.formatted),
          city: pickString(p.city) || pickString(p.town) || pickString(p.village) || '',
          region: pickString(p.state) || pickString(p.county) || '',
          country: pickString(p.country) || '',
          distance,
          source: 'geoapify'
        }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.distance - b.distance)

    const result = { pois, status: 'OK', source: 'geoapify', count: pois.length }

    searchCache.set(cacheKey, { data: result, timestamp: now })
    if (searchCache.size > 100) {
      const entries = Array.from(searchCache.entries())
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp)
      searchCache.clear()
      entries.slice(0, 100).forEach(([k, v]) => searchCache.set(k, v))
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'MISS'
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        pois: [],
        status: 'ERROR',
        source: 'geoapify',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

