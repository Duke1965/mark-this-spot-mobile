import { type NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Point = { lat: number; lon: number }

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const points = parsePointsParam(searchParams.get('points'))
  const testPoints = points.length ? points : DEFAULT_POINTS

  const origin = request.nextUrl.origin

  const results: Array<{
    point: Point
    ok: boolean
    title?: string
    hasDescription?: boolean
    hasWebsite?: boolean
    websiteImages?: number
    provider?: string
    error?: string
  }> = []

  for (const p of testPoints) {
    try {
      const url = new URL(`${origin}/api/pin-intel`)
      url.searchParams.set('lat', String(p.lat))
      url.searchParams.set('lon', String(p.lon))

      const resp = await fetch(url.toString(), { cache: 'no-store' })
      if (!resp.ok) {
        results.push({
          point: p,
          ok: false,
          error: `HTTP ${resp.status}`
        })
        continue
      }

      const data: any = await resp.json()
      const images = Array.isArray(data?.images) ? data.images : []
      const websiteImages = images.filter((img: any) => img?.source === 'website').length

      results.push({
        point: p,
        ok: true,
        title: data?.title,
        hasDescription: !!(data?.description && String(data.description).trim()),
        hasWebsite: !!(data?.place?.website && String(data.place.website).trim()),
        websiteImages,
        provider: data?.place?.source
      })
    } catch (error) {
      results.push({
        point: p,
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  const total = results.length
  const okCount = results.filter((r) => r.ok).length
  const withTitle = results.filter((r) => r.ok && r.title && String(r.title).trim() && r.title !== 'Location').length
  const withDescription = results.filter((r) => r.ok && r.hasDescription).length
  const withWebsite = results.filter((r) => r.ok && r.hasWebsite).length
  const withWebsiteImages = results.filter((r) => r.ok && (r.websiteImages || 0) > 0).length

  return NextResponse.json(
    {
      timestamp: new Date().toISOString(),
      total,
      ok: okCount,
      hit_rate: {
        title: total ? withTitle / total : 0,
        description: total ? withDescription / total : 0,
        website: total ? withWebsite / total : 0,
        website_images: total ? withWebsiteImages / total : 0
      },
      counts: {
        withTitle,
        withDescription,
        withWebsite,
        withWebsiteImages
      },
      results
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  )
}

