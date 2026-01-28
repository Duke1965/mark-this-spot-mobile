import { type NextRequest, NextResponse } from 'next/server'

import { resolvePlaceIdentity } from '@/lib/pinEnrich/resolvePlaceIdentity'
import { shouldAttemptWikidata, tryWikidataMatch } from '@/lib/pinEnrich/wikidata'
import { downloadAndUploadImage } from '@/lib/pinEnrich/imageStore'
import { getWebsiteImages } from '@/lib/images/websiteScrape'
import { searchUnsplashImages } from '@/lib/images/unsplash'
import { buildTitle, buildDescription } from '@/lib/places/formatPlaceText'
import { discoverOfficialWebsite } from '@/lib/places/websiteDiscovery'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type PinIntelImage = {
  url: string
  source: 'website' | 'wikimedia' | 'facebook' | 'stock' | 'area'
  attribution?: string
  sourceUrl?: string
}

function looksGenericTitle(title: string | undefined): boolean {
  const t = (title || '').trim().toLowerCase()
  if (!t) return true
  if (t === 'location' || t === 'pinned location' || t === 'nature spot') return true
  if (t.startsWith('place near ')) return true
  if (t.startsWith('place in ')) return true
  return false
}

function looksLikeChainOrTooGenericName(name: string | undefined): boolean {
  const n = (name || '').trim()
  if (!n) return true
  if (n === 'Unknown Place') return true
  // Very short ALLCAPS brands are high-risk for "wrong branch" photos.
  if (n.length <= 4 && n === n.toUpperCase()) return true
  return false
}

function shouldUseUnsplashFallback(place: any, hint: string | undefined): boolean {
  // Use Unsplash only when it's likely to be a "generic vibe" photo,
  // not a specific branded/business photo.
  if (looksGenericTitle(hint)) return true
  if (looksLikeChainOrTooGenericName(place?.name)) return false

  const cat = (place?.category || '').toLowerCase()
  if (!cat) return false

  // Nature/outdoors/travel categories benefit from Unsplash.
  return (
    cat.includes('natural') ||
    cat.includes('leisure') ||
    cat.includes('park') ||
    cat.includes('beach') ||
    cat.includes('tourism') ||
    cat.includes('viewpoint') ||
    cat.includes('mountain') ||
    cat.includes('trail') ||
    cat.includes('hiking') ||
    cat.includes('waterfall') ||
    cat.includes('lake') ||
    cat.includes('river')
  )
}

function getMapboxStaticUrl(lat: number, lon: number): string | null {
  const token = process.env.NEXT_PUBLIC_MAPBOX_API_KEY
  if (!token) return null
  const style = 'streets-v12'
  const zoom = 15.5
  const width = 800
  const height = 600
  // Use an overlay pin so the user sees the exact point.
  const overlay = `pin-s+ff0000(${lon},${lat})`
  const base = `https://api.mapbox.com/styles/v1/mapbox/${style}/static`
  const url = new URL(`${base}/${overlay}/${lon},${lat},${zoom}/${width}x${height}`)
  url.searchParams.set('access_token', token)
  return url.toString()
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

    // 1c) If still missing website, try search-based discovery (optional, requires SERPER_API_KEY)
    if (!place.website) {
      // Skip discovery when the hint is generic (prevents bad matches like Wikipedia "Swartland" or unrelated "Nature Spot").
      if (looksGenericTitle(hint)) {
        fallbacksUsed.push('skip_serper_generic_hint')
      } else {
        const t0c = Date.now()
        const found = await discoverOfficialWebsite({
          name: hint || place.name,
          locality: place.locality,
          region: place.region,
          country: place.country
        })
        timings.website_discovery_ms = Date.now() - t0c
        if (found.website) {
          place = { ...place, website: found.website }
          fallbacksUsed.push('serper_official_website')
        } else {
          fallbacksUsed.push(process.env.SERPER_API_KEY ? 'no_serper_match' : 'no_serper_key')
        }
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

    // 4) Unsplash fallback (optional)
    if (images.length === 0 && process.env.UNSPLASH_ACCESS_KEY && shouldUseUnsplashFallback(place, hint)) {
      const t5 = Date.now()
      const q = looksGenericTitle(hint) ? (place.category || place.name) : place.name
      const unsplash = await searchUnsplashImages(String(q || 'travel'), 3)
      timings.unsplash_ms = Date.now() - t5

      for (const img of unsplash) {
        const hostedUrl = await downloadAndUploadImage(img.imageUrl, cacheKey, 'stock')
        if (hostedUrl) {
          images.push({ url: hostedUrl, source: 'stock', sourceUrl: img.pageUrl, attribution: img.attribution })
        } else {
          uploadFailures.push({ source: 'stock', url: img.imageUrl })
        }
      }

      if (images.length > 0) {
        fallbacksUsed.push('unsplash_images')
      } else {
        fallbacksUsed.push('no_unsplash_images')
      }
    } else if (images.length === 0 && process.env.UNSPLASH_ACCESS_KEY) {
      fallbacksUsed.push('skip_unsplash')
    } else if (images.length === 0) {
      fallbacksUsed.push('no_unsplash_key')
    }

    // 5) Final fallback: map snapshot (prevents irrelevant/random client-side fallbacks)
    if (images.length === 0) {
      const mapUrl = getMapboxStaticUrl(lat, lon)
      if (mapUrl) {
        images.push({ url: mapUrl, source: 'area', sourceUrl: 'mapbox-static' })
        fallbacksUsed.push('mapbox_static_image')
      }
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

