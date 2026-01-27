import { type NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Point = { lat: number; lon: number }
type PointWithMeta = Point & { id?: string; title?: string; timestamp?: string }

function parsePointsParam(raw: string | null): Point[] {
  if (!raw) return []
  // Format: "lat,lon;lat,lon"
  return raw
    .split(';')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [latS, lonS] = pair.split(',').map((s) => s.trim())
      const lat = Number(latS)
      const lon = Number(lonS)
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
      return { lat, lon }
    })
    .filter(Boolean) as Point[]
}

const DEFAULT_POINTS: Point[] = [
  { lat: -33.9068, lon: 18.4201 }, // V&A Waterfront, Cape Town
  { lat: -33.9631, lon: 18.4039 }, // Table Mountain Cableway
  { lat: 48.85837, lon: 2.294481 }, // Eiffel Tower
  { lat: 41.8902, lon: 12.4922 }, // Colosseum
  { lat: 40.7580, lon: -73.9855 } // Times Square
]

function summarize(results: any[]) {
  const total = results.length
  const okCount = results.filter((r) => r.ok).length
  const withTitle = results.filter((r) => r.ok && r.title && String(r.title).trim() && r.title !== 'Location').length
  const withDescription = results.filter((r) => r.ok && r.hasDescription).length
  const withWebsite = results.filter((r) => r.ok && r.hasWebsite).length
  const withWebsiteImages = results.filter((r) => r.ok && (r.websiteImages || 0) > 0).length

  return {
    timestamp: new Date().toISOString(),
    total,
    ok: okCount,
    hit_rate: {
      title: total ? withTitle / total : 0,
      description: total ? withDescription / total : 0,
      website: total ? withWebsite / total : 0,
      website_images: total ? withWebsiteImages / total : 0
    },
    counts: { withTitle, withDescription, withWebsite, withWebsiteImages }
  }
}

async function runForPoints(request: NextRequest, points: Array<Point | PointWithMeta>) {
  const origin = request.nextUrl.origin

  // Safety caps (avoids hammering APIs)
  const MAX_POINTS = 30
  const limited = points.slice(0, MAX_POINTS)

  const results: Array<{
    point: Point
    meta?: { id?: string; title?: string; timestamp?: string }
    ok: boolean
    title?: string
    hasDescription?: boolean
    hasWebsite?: boolean
    websiteImages?: number
    provider?: string
    website?: string
    placeName?: string
    fallbacksUsed?: string[]
    error?: string
  }> = []

  for (const p of limited as any[]) {
    try {
      const url = new URL(`${origin}/api/pin-intel`)
      url.searchParams.set('lat', String(p.lat))
      url.searchParams.set('lon', String(p.lon))
      if (typeof p?.title === 'string' && p.title.trim()) {
        url.searchParams.set('hint', p.title.trim())
      }

      const resp = await fetch(url.toString(), { cache: 'no-store' })
      if (!resp.ok) {
        results.push({
          point: { lat: p.lat, lon: p.lon },
          meta: { id: p.id, title: p.title, timestamp: p.timestamp },
          ok: false,
          error: `HTTP ${resp.status}`
        })
        continue
      }

      const data: any = await resp.json()
      const images = Array.isArray(data?.images) ? data.images : []
      const websiteImages = images.filter((img: any) => img?.source === 'website').length

      results.push({
        point: { lat: p.lat, lon: p.lon },
        meta: { id: p.id, title: p.title, timestamp: p.timestamp },
        ok: true,
        title: data?.title,
        hasDescription: !!(data?.description && String(data.description).trim()),
        hasWebsite: !!(data?.place?.website && String(data.place.website).trim()),
        websiteImages,
        provider: data?.place?.source,
        website: data?.place?.website,
        placeName: data?.place?.name,
        fallbacksUsed: Array.isArray(data?.diagnostics?.fallbacksUsed) ? data.diagnostics.fallbacksUsed : undefined
      })
    } catch (error) {
      results.push({
        point: { lat: (p as any).lat, lon: (p as any).lon },
        meta: { id: (p as any).id, title: (p as any).title, timestamp: (p as any).timestamp },
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  return {
    ...summarize(results),
    capped: { max_points: MAX_POINTS, processed: results.length, requested: points.length },
    results
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const points = parsePointsParam(searchParams.get('points'))
  const testPoints = points.length ? points : DEFAULT_POINTS

  const payload = await runForPoints(request, testPoints)
  return NextResponse.json(payload, { status: 200, headers: { 'Cache-Control': 'no-store' } })
}

/**
 * POST /api/diagnostics/places
 * Body: { pins?: Array<{id?, title?, timestamp?, latitude, longitude}>, points?: Array<{lat, lon, ...}> }
 *
 * This allows the client to submit saved pins from localStorage for analysis.
 */
export async function POST(request: NextRequest) {
  try {
    const body: any = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const points: PointWithMeta[] = []

    const bodyPoints = Array.isArray(body.points) ? body.points : []
    for (const p of bodyPoints) {
      const lat = Number(p?.lat)
      const lon = Number(p?.lon)
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
      points.push({ lat, lon, id: p?.id, title: p?.title, timestamp: p?.timestamp })
    }

    const pins = Array.isArray(body.pins) ? body.pins : []
    for (const pin of pins) {
      const lat = Number(pin?.latitude)
      const lon = Number(pin?.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
      points.push({ lat, lon, id: pin?.id, title: pin?.title, timestamp: pin?.timestamp })
    }

    if (points.length === 0) {
      return NextResponse.json({ error: 'No valid points provided' }, { status: 400 })
    }

    const payload = await runForPoints(request, points)
    return NextResponse.json(payload, { status: 200, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to run batch diagnostics', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

