import { type NextRequest, NextResponse } from 'next/server'

import { resolvePlaceIdentity } from '@/lib/pinEnrich/resolvePlaceIdentity'
import { shouldAttemptWikidata, tryWikidataMatch } from '@/lib/pinEnrich/wikidata'
import { downloadAndUploadImage } from '@/lib/pinEnrich/imageStore'
import { getWebsiteImages } from '@/lib/images/websiteScrape'
import { buildTitle, buildDescription } from '@/lib/places/formatPlaceText'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type PinIntelImage = {
  url: string
  source: 'website' | 'wikimedia' | 'facebook' | 'stock' | 'area'
  attribution?: string
  sourceUrl?: string
}

/**
 * GET /api/pin-intel?lat=..&lon=..&hint=..
 *
 * Returns consistent PinIntel payload:
 * - place identity (Geoapify)
 * - stable title/description derived from metadata
 * - website-first images (uploaded to Firebase Storage)
 * - diagnostics for road testing
 */
export async function GET(request: NextRequest) {
  const startedAt = Date.now()
  const timings: Record<string, number> = {}
  const fallbacksUsed: string[] = []
  const uploadFailures: Array<{ source: string; url: string }> = []

  try {
    const { searchParams } = new URL(request.url)
    const latRaw = searchParams.get('lat')
    const lonRaw = searchParams.get('lon') || searchParams.get('lng')
    const hint = searchParams.get('hint') || undefined

    const lat = latRaw ? Number(latRaw) : NaN
    const lon = lonRaw ? Number(lonRaw) : NaN

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json({ error: 'Missing/invalid lat/lon' }, { status: 400 })
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return NextResponse.json({ error: 'Coordinates out of range' }, { status: 400 })
    }

    // 1) Place resolve (Geoapify)
    const t0 = Date.now()
    let place = await resolvePlaceIdentity(lat, lon, hint)
    timings.place_resolve_ms = Date.now() - t0

    // 1b) If missing website, try strict Wikidata match to fill official website (P856)
    let wikidata: Awaited<ReturnType<typeof tryWikidataMatch>> | null = null
    if (!place.website && shouldAttemptWikidata(place)) {
      const t0b = Date.now()
      wikidata = await tryWikidataMatch(place)
      timings.wikidata_lookup_ms = Date.now() - t0b
      if (wikidata?.officialWebsite) {
        place = { ...place, website: wikidata.officialWebsite }
        fallbacksUsed.push('wikidata_official_website')
      }
    }

    // Normalize into the formatter input shape
    const formatterInput = {
      name: place.name,
      categories: place.category ? [place.category] : [],
      address: place.address,
      city: place.locality,
      region: place.region
    }

    const title = buildTitle(formatterInput)
    const description = buildDescription(formatterInput)

    // 2) Website-first images (only if website exists)
    const images: PinIntelImage[] = []
    const cacheKey = `pinintel:${lat.toFixed(5)}:${lon.toFixed(5)}`

    if (place.website) {
      const t1 = Date.now()
      const { images: websiteImages, sourceUrl } = await getWebsiteImages(place.website)
      timings.website_scrape_ms = Date.now() - t1

      if (websiteImages.length > 0) {
        const t2 = Date.now()
        for (const imgUrl of websiteImages.slice(0, 3)) {
          const hostedUrl = await downloadAndUploadImage(imgUrl, cacheKey, 'website')
          if (hostedUrl) {
            images.push({ url: hostedUrl, source: 'website', sourceUrl: imgUrl })
          } else {
            uploadFailures.push({ source: 'website', url: imgUrl })
          }
        }
        timings.website_upload_ms = Date.now() - t2
      } else {
        fallbacksUsed.push('no_website_images')
      }

      void sourceUrl
    } else {
      fallbacksUsed.push('no_website')
    }

    // 3) Wikimedia fallback (only if we still have no images)
    if (images.length === 0 && shouldAttemptWikidata(place)) {
      if (!wikidata) {
        const t3 = Date.now()
        wikidata = await tryWikidataMatch(place)
        timings.wikidata_ms = Date.now() - t3
      }

      const commons = wikidata?.commonsImages || []
      if (commons.length > 0) {
        const t4 = Date.now()
        for (const imgUrl of commons.slice(0, 3)) {
          const hostedUrl = await downloadAndUploadImage(imgUrl, cacheKey, 'wikimedia')
          if (hostedUrl) {
            images.push({ url: hostedUrl, source: 'wikimedia', sourceUrl: imgUrl })
          } else {
            uploadFailures.push({ source: 'wikimedia', url: imgUrl })
          }
        }
        timings.wikimedia_upload_ms = Date.now() - t4
      } else {
        fallbacksUsed.push('no_wikimedia_images')
      }
    } else if (images.length === 0) {
      fallbacksUsed.push('skip_wikidata')
    }

    timings.total_ms = Date.now() - startedAt

    return NextResponse.json(
      {
        place,
        title,
        description,
        images,
        diagnostics: {
          provider: place.source,
          timings,
          fallbacksUsed,
          uploadFailures: uploadFailures.length ? uploadFailures.slice(0, 10) : []
        }
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('❌ /api/pin-intel error:', error)
    return NextResponse.json(
      {
        error: 'Failed to build pin intel',
        details: error instanceof Error ? error.message : String(error),
        diagnostics: { timings: { total_ms: Date.now() - startedAt } }
      },
      { status: 500 }
    )
  }
}

