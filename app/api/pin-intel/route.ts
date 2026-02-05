import { type NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

import { resolvePlaceIdentity } from '@/lib/pinEnrich/resolvePlaceIdentity'
import { shouldAttemptWikidata, tryWikidataMatch } from '@/lib/pinEnrich/wikidata'
import { downloadAndUploadImage, uploadToStorage } from '@/lib/pinEnrich/imageStore'
import { getWebsiteMeta } from '@/lib/images/websiteMeta'
import { searchUnsplashImages } from '@/lib/images/unsplash'
import { buildTitle, buildDescription } from '@/lib/places/formatPlaceText'
import { discoverOfficialWebsite } from '@/lib/places/websiteDiscovery'
import { mergeTitleDescription } from '@/lib/pinEnrich/mergeTitleDescription'
import { nearbySearch, placeDetails, fetchPhoto, hashPhotoRef } from '@/lib/google/googlePlaces'
import { checkAndIncrementGoogleDailyLimit, getCachedGooglePlaceByLatLon, setCachedGooglePlace } from '@/lib/cache/placeCache'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type PinIntelImage = {
  url: string
  source: 'google' | 'website' | 'wikimedia' | 'facebook' | 'stock' | 'area'
  attribution?: string
  sourceUrl?: string
}

function envInt(name: string, def: number): number {
  const raw = process.env[name]
  if (!raw) return def
  const n = Number(raw)
  return Number.isFinite(n) ? Math.floor(n) : def
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  if (realIP) return realIP.trim()
  return 'unknown'
}

function limiterKeyForRequest(request: NextRequest): string {
  const userId = (request.headers.get('x-user-id') || request.headers.get('x-userid') || '').trim()
  if (userId) return `uid:${userId}`
  const ip = getClientIP(request)
  const ua = (request.headers.get('user-agent') || '').trim()
  const uaHash = createHash('sha256').update(ua).digest('hex').slice(0, 12)
  return `ip:${ip}:ua:${uaHash}`
}

function normalizeForIncludes(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function websiteLooksOfficialForPlace(placeName: string, websiteTitle: string | undefined): boolean {
  const n = normalizeForIncludes(placeName)
  const t = normalizeForIncludes(websiteTitle || '')
  if (!n || !t) return false
  // Require at least the main name token to be present to avoid random domains counting as "official".
  const mainToken = n.split(' ').filter(Boolean)[0]
  if (!mainToken) return false
  return t.includes(mainToken)
}

function googleTypesToCategory(types?: string[]): string | undefined {
  const t = (types || []).map((s) => String(s || '').toLowerCase())
  if (t.includes('museum')) return 'entertainment.museum'
  if (t.includes('art_gallery')) return 'entertainment.culture.gallery'
  if (t.includes('church') || t.includes('place_of_worship')) return 'building.place_of_worship'
  if (t.includes('tourist_attraction')) return 'tourism.attraction'
  if (t.includes('park')) return 'leisure.park'
  if (t.includes('restaurant')) return 'catering.restaurant'
  if (t.includes('cafe')) return 'catering.cafe'
  if (t.includes('bar')) return 'catering.bar'
  return undefined
}

function parseLocalityFromFormattedAddress(addr: string | undefined): { locality?: string; country?: string } {
  const a = (addr || '').trim()
  if (!a) return {}
  const parts = a.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length < 2) return {}
  const country = parts[parts.length - 1]
  // Heuristic: for "street, town, postal, country" the town is usually index 1.
  const locality = parts.length >= 3 ? parts[1] : parts[0]
  return { locality, country }
}

function looksGenericTitle(title: string | undefined): boolean {
  const t = (title || '').trim().toLowerCase()
  if (!t) return true
  if (t === 'location' || t === 'pinned location' || t === 'nature spot') return true
  if (t.startsWith('place near ')) return true
  if (t.startsWith('place in ')) return true
  // Titles that are really category + "near <locality>" are generic and should not be used as the search name.
  if (t.includes(' near ') && (t.startsWith('catering near ') || t.startsWith('restaurant near ') || t.startsWith('hotel near '))) {
    return true
  }
  return false
}

function isRiskyShortAllCapsBrand(name: string | undefined): boolean {
  const n = (name || '').trim()
  if (!n) return false
  if (n.length <= 4 && n === n.toUpperCase()) return true
  return false
}

function looksLikeStreetAddress(name: string | undefined): boolean {
  const n = (name || '').trim()
  if (!n) return false
  // Basic heuristic: numbers + street words => likely address, not a POI name.
  const lower = n.toLowerCase()
  if (!/\d/.test(lower)) return false
  return (
    lower.includes('street') ||
    lower.includes('st ') ||
    lower.includes('st.') ||
    lower.includes('road') ||
    lower.includes('rd ') ||
    lower.includes('rd.') ||
    lower.includes('ave') ||
    lower.includes('avenue') ||
    lower.includes('crescent') ||
    lower.includes('lane') ||
    lower.includes('drive') ||
    lower.includes('boulevard') ||
    lower.includes('blvd')
  )
}

function shouldUseUnsplashFallback(place: any): boolean {
  // Unsplash is "better than a map screenshot" when we couldn't get official photos.
  // We only skip it for very risky short ALLCAPS brands (KFC, BP, etc.).
  if (isRiskyShortAllCapsBrand(place?.name)) return false
  return true
}

function buildUnsplashQuery(place: any, hint: string | undefined): string {
  const locality = (place?.locality || place?.region || place?.country || '').trim()
  const category = (place?.category || '').trim()
  const name = (place?.name || '').trim()

  // Generic pins should not search by a raw street address (often returns nothing).
  if (looksGenericTitle(hint) || looksLikeStreetAddress(name)) {
    const cat = category ? category.split('.').slice(-1)[0] : 'travel'
    const loc = locality || 'South Africa'
    return `${cat} ${loc} landscape`
  }

  // For named POIs/businesses, keep it descriptive but not overly specific.
  // Adding locality helps avoid totally unrelated results.
  return locality ? `${name} ${locality}` : name
}

function buildUnsplashFallbackQueries(place: any, hint: string | undefined): string[] {
  const locality = (place?.locality || place?.region || place?.country || '').trim() || 'South Africa'
  const category = (place?.category || '').trim()
  const cat = category ? category.split('.').slice(-1)[0] : 'travel'

  const primary = buildUnsplashQuery(place, hint)
  const q1 = primary || `${cat} ${locality}`
  const q2 = `${cat} ${locality} travel`
  const q3 = `${locality} landscape`
  // Dedupe
  return Array.from(new Set([q1, q2, q3].map((s) => s.trim()).filter(Boolean)))
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
  const uploadFailures: Array<{ source: string; url: string; stage?: 'init' | 'download' | 'upload'; message?: string }> =
    []
  const websiteMetaDiag = {
    attempted: false,
    hasTitleHint: false,
    hasDescriptionHint: false,
    imageCandidates: 0
  }

  try {
    const { searchParams } = new URL(request.url)
    const latRaw = searchParams.get('lat')
    const lonRaw = searchParams.get('lon') || searchParams.get('lng')
    const hint = searchParams.get('hint') || undefined
    const mode = (searchParams.get('mode') || '').toLowerCase()
    const maxDistanceRaw = searchParams.get('maxDistanceM') || searchParams.get('max_distance_m')

    const lat = latRaw ? Number(latRaw) : NaN
    const lon = lonRaw ? Number(lonRaw) : NaN

    const maxDistanceMFromQuery = maxDistanceRaw ? Number(maxDistanceRaw) : NaN
    const isAdjusted = mode === 'adjusted' || mode === 'final' || mode === 'pin_adjusted'
    const maxDistanceM = Number.isFinite(maxDistanceMFromQuery)
      ? maxDistanceMFromQuery
      : isAdjusted
        ? 10
        : undefined
    const searchRadiusM = isAdjusted ? 120 : undefined

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json({ error: 'Missing/invalid lat/lon' }, { status: 400 })
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return NextResponse.json({ error: 'Coordinates out of range' }, { status: 400 })
    }

    const googleFlag = String(process.env.NEXT_PUBLIC_USE_GOOGLE_PIN_INTEL || '').toLowerCase() === 'true'
    const hasGoogleKey = !!process.env.GOOGLE_MAPS_API_KEY
    const googleEnabled = googleFlag && hasGoogleKey
    const googleMaxPhotos = Math.max(0, Math.min(5, envInt('GOOGLE_PIN_INTEL_MAX_PHOTOS', 3)))
    const googleRadiusMeters = Math.max(10, Math.min(250, envInt('GOOGLE_PIN_INTEL_RADIUS_METERS', 80)))
    const googleCacheTtlDays = Math.max(1, Math.min(365, envInt('GOOGLE_PIN_INTEL_CACHE_TTL_DAYS', 30)))

    const googleDiag: any = {
      enabled: googleEnabled,
      cacheHit: false,
      used: false,
      called: false,
      placeId: undefined as string | undefined,
      calls: { nearby: 0, details: 0, photos: 0 },
      dailyLimitRemaining: undefined as number | undefined
    }

    // Images we return (hosted URLs only)
    const images: PinIntelImage[] = []

    // 0) Google cache-first + pin-time lookup (only if enabled)
    let place: any | null = null
    if (googleEnabled) {
      const tG0 = Date.now()
      const cached = await getCachedGooglePlaceByLatLon({ lat, lon, ttlDays: googleCacheTtlDays })
      timings.google_cache_ms = Date.now() - tG0

      if (cached?.place?.place_id) {
        googleDiag.cacheHit = true
        googleDiag.used = true
        googleDiag.placeId = cached.place.place_id

        const { locality, country } = parseLocalityFromFormattedAddress(cached.place.address)
        place = {
          lat,
          lng: lon,
          name: cached.place.name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
          address: cached.place.address,
          locality,
          country,
          website: cached.place.website,
          category: googleTypesToCategory(cached.place.types),
          source: 'google' as const,
          sourceId: cached.place.place_id,
          confidence: 0.95,
          canonicalQuery: [cached.place.name, locality].filter(Boolean).join(' ').trim() || (cached.place.name || '')
        }

        for (const u of (cached.place.photoStorageUrls || []).slice(0, googleMaxPhotos)) {
          images.push({ url: u, source: 'google', sourceUrl: `google:place:${cached.place.place_id}` })
        }
      } else {
        // Daily safety limit before calling Google
        const key = limiterKeyForRequest(request)
        const limit = await checkAndIncrementGoogleDailyLimit({ key })
        googleDiag.dailyLimitRemaining = limit.remaining
        if (!limit.allowed) {
          fallbacksUsed.push('google_daily_limit_reached')
        } else {
          try {
            googleDiag.called = true
            const tG1 = Date.now()
            googleDiag.calls.nearby++
            const cand = await nearbySearch({ lat, lon, radiusMeters: googleRadiusMeters })
            timings.google_nearby_ms = Date.now() - tG1
            if (!cand?.placeId) {
              fallbacksUsed.push('google_no_candidate')
            } else {
              googleDiag.placeId = cand.placeId
              const tG2 = Date.now()
              googleDiag.calls.details++
              const det = await placeDetails(cand.placeId)
              timings.google_details_ms = Date.now() - tG2
              if (!det?.placeId) {
                fallbacksUsed.push('google_no_details')
              } else {
                // Validate candidate distance (protects against mismatched nearby results)
                const detLoc = det.location
                const distOk =
                  detLoc && Number.isFinite(detLoc.lat) && Number.isFinite(detLoc.lon)
                    ? (() => {
                        const R = 6371000
                        const toRad = (x: number) => (x * Math.PI) / 180
                        const dLat = toRad(detLoc.lat - lat)
                        const dLon = toRad(detLoc.lon - lon)
                        const a =
                          Math.sin(dLat / 2) ** 2 +
                          Math.cos(toRad(lat)) * Math.cos(toRad(detLoc.lat)) * Math.sin(dLon / 2) ** 2
                        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
                        const d = R * c
                        return d <= 150
                      })()
                    : true

                if (!distOk) {
                  fallbacksUsed.push('google_reject_far_candidate')
                } else {
                  const { locality, country } = parseLocalityFromFormattedAddress(det.formattedAddress)
                  place = {
                    lat,
                    lng: lon,
                    name: det.name || cand.name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
                    category: googleTypesToCategory(det.types || cand.types),
                    address: det.formattedAddress,
                    locality,
                    country,
                    website: det.website,
                    phone: det.phone,
                    source: 'google' as const,
                    sourceId: det.placeId,
                    confidence: 0.95,
                    canonicalQuery: [det.name, locality].filter(Boolean).join(' ').trim() || (det.name || '')
                  }

                  // Photos (download and upload to our Storage; never hotlink)
                  const hostedPhotoUrls: string[] = []
                  const tG3 = Date.now()
                  const photos = Array.isArray(det.photos) ? det.photos : []
                  for (const p of photos.slice(0, googleMaxPhotos)) {
                    try {
                      googleDiag.calls.photos++
                      const got = await fetchPhoto(p.photoReference, 1200)
                      const ext = got.contentType.toLowerCase().includes('png')
                        ? 'png'
                        : got.contentType.toLowerCase().includes('webp')
                          ? 'webp'
                          : 'jpg'
                      const hash = hashPhotoRef(p.photoReference)
                      const path = `place_cache/google/${det.placeId}/${hash}.${ext}`
                      const url = await uploadToStorage(got.buffer, path, got.contentType)
                      hostedPhotoUrls.push(url)
                      images.push({ url, source: 'google', sourceUrl: `google:photo:${hash}` })
                    } catch (e) {
                      const msg = e instanceof Error ? e.message : String(e)
                      uploadFailures.push({ source: 'google', url: `google:photo`, stage: 'upload', message: msg })
                    }
                  }
                  timings.google_photos_ms = Date.now() - tG3

                  // Cache in Firestore so repeat pins/views are free.
                  const tG4 = Date.now()
                  await setCachedGooglePlace({
                    lat,
                    lon,
                    place: {
                      place_id: det.placeId,
                      name: det.name,
                      address: det.formattedAddress,
                      website: det.website,
                      types: det.types,
                      photoStorageUrls: hostedPhotoUrls,
                      lat,
                      lon,
                      source: 'google'
                    }
                  })
                  timings.google_cache_set_ms = Date.now() - tG4
                  googleDiag.used = true
                }
              }
            }
          } catch (e) {
            googleDiag.error = e instanceof Error ? e.message : String(e)
            fallbacksUsed.push('google_error')
          }
        }
      }
    } else if (googleFlag && !hasGoogleKey) {
      fallbacksUsed.push('google_flag_on_missing_key')
    }

    // 1) Place resolve (Geoapify)
    const t0 = Date.now()
    if (!place) {
      place = await resolvePlaceIdentity(lat, lon, hint, { searchRadiusM, maxDistanceM })
      timings.place_resolve_ms = Date.now() - t0
    } else {
      timings.place_resolve_ms = 0
    }

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
      const hasSerperKey = !!process.env.SERPER_API_KEY
      const hintIsGeneric = looksGenericTitle(hint)
      const serperName = hintIsGeneric ? place.name : (hint || place.name)
      const nameLooksAddress = looksLikeStreetAddress(serperName)
      const nameLooksUnknown = String(serperName || '').trim().toLowerCase() === 'unknown place'

      if (!hasSerperKey) {
        fallbacksUsed.push('no_serper_key')
      } else if (!serperName || nameLooksAddress || nameLooksUnknown) {
        // Avoid searching generic street addresses (often returns random domains).
        fallbacksUsed.push('skip_serper_generic_hint')
      } else {
        const t0c = Date.now()
        const found = await discoverOfficialWebsite({
          name: serperName,
          locality: place.locality,
          region: place.region,
          country: place.country
        })
        timings.website_discovery_ms = Date.now() - t0c
        if (found.website) {
          place = { ...place, website: found.website }
          fallbacksUsed.push('serper_official_website')
        } else {
          fallbacksUsed.push('no_serper_match')
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

    const baseTitle = buildTitle(formatterInput)
    const baseDescription = buildDescription(formatterInput)

    // 2) Website-first images (only if website exists) — only needed if Google didn't already give us photos.
    const cacheKey = `pinintel:${lat.toFixed(5)}:${lon.toFixed(5)}`
    let websiteMeta: Awaited<ReturnType<typeof getWebsiteMeta>> | null = null
    let websiteValidated = false
    let websiteWasDiscovered = false

    if (place.website) {
      // If the website came from Serper discovery, apply a conservative "officialness" guard.
      // We only do this for discovered websites (not for provider-provided websites like Google/Geoapify).
      websiteWasDiscovered = fallbacksUsed.includes('serper_official_website')
      if (websiteWasDiscovered) {
        try {
          const host = new URL(place.website).hostname.toLowerCase()
          const blocked = ['municipalities.co.za']
          if (blocked.some((b) => host === b || host.endsWith(`.${b}`))) {
            fallbacksUsed.push('reject_discovered_website:blocked_domain')
            place = { ...place, website: undefined }
          }
        } catch {
          // ignore
        }
      }

      // Skip website meta if we already have enough Google photos.
      if (images.filter((i) => i.source === 'google').length >= Math.max(1, googleMaxPhotos)) {
        fallbacksUsed.push('skip_website_meta_google_photos')
      } else if (place.website) {
      websiteMetaDiag.attempted = true
      const t1 = Date.now()
      websiteMeta = await getWebsiteMeta(place.website)
      timings.website_meta_ms = Date.now() - t1

      websiteMetaDiag.hasTitleHint = !!(websiteMeta?.ogTitle || websiteMeta?.siteTitle)
      websiteMetaDiag.hasDescriptionHint = !!(websiteMeta?.metaDescription || websiteMeta?.ogDescription)
      websiteMetaDiag.imageCandidates = Array.isArray(websiteMeta?.images) ? websiteMeta!.images.length : 0

      if (websiteWasDiscovered) {
        const titleHint = websiteMeta?.ogTitle || websiteMeta?.siteTitle
        websiteValidated = websiteLooksOfficialForPlace(place.name, titleHint)
        if (!websiteValidated) {
          fallbacksUsed.push('website_not_official_title_mismatch')
          // If we can't validate "official", don't count it as a success and don't use its images.
          websiteMeta = null
          place = { ...place, website: undefined }
        } else {
          fallbacksUsed.push('website_validated')
        }
      } else {
        // Provider-provided website (Google/Geoapify) counts as validated for metrics.
        websiteValidated = true
      }

      const websiteImages = Array.isArray(websiteMeta?.images) ? websiteMeta!.images : []
      if (websiteImages.length > 0) {
        const t2 = Date.now()
        for (const imgUrl of websiteImages.slice(0, 3)) {
          let err: { stage: 'init' | 'download' | 'upload'; message: string } | null = null
          const hostedUrl = await downloadAndUploadImage(imgUrl, cacheKey, 'website', {
            timeoutMs: 6500,
            onError: (info) => {
              err = info
            }
          })
          if (hostedUrl) {
            images.push({ url: hostedUrl, source: 'website', sourceUrl: imgUrl })
          } else {
            const stage = (err as any)?.stage as 'init' | 'download' | 'upload' | undefined
            const message = (err as any)?.message as string | undefined
            uploadFailures.push({ source: 'website', url: imgUrl, stage, message })
          }
        }
        timings.website_upload_ms = Date.now() - t2
      } else {
        fallbacksUsed.push('no_website_images')
      }
      }
    } else {
      fallbacksUsed.push('no_website')
    }

    // 2b) Merge title/description with website metadata hints (no crawling)
    const merged = mergeTitleDescription({
      baseTitle,
      baseDescription,
      place,
      websiteMeta
    })
    const title = merged.title
    const description = merged.description

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
          let err: { stage: 'init' | 'download' | 'upload'; message: string } | null = null
          const hostedUrl = await downloadAndUploadImage(imgUrl, cacheKey, 'wikimedia', {
            onError: (info) => {
              err = info
            }
          })
          if (hostedUrl) {
            images.push({ url: hostedUrl, source: 'wikimedia', sourceUrl: imgUrl })
          } else {
            const stage = (err as any)?.stage as 'init' | 'download' | 'upload' | undefined
            const message = (err as any)?.message as string | undefined
            uploadFailures.push({ source: 'wikimedia', url: imgUrl, stage, message })
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
    if (images.length === 0 && process.env.UNSPLASH_ACCESS_KEY && shouldUseUnsplashFallback(place)) {
      const t5 = Date.now()
      const queries = buildUnsplashFallbackQueries(place, hint)
      let unsplashPicked: Awaited<ReturnType<typeof searchUnsplashImages>> = []
      let usedQuery: string | null = null

      for (const q of queries) {
        const got = await searchUnsplashImages(q, 3)
        if (got.length > 0) {
          unsplashPicked = got
          usedQuery = q
          break
        }
      }

      timings.unsplash_ms = Date.now() - t5

      if (usedQuery) fallbacksUsed.push(`unsplash_query:${usedQuery}`.slice(0, 120))

      for (const img of unsplashPicked) {
        let err: { stage: 'init' | 'download' | 'upload'; message: string } | null = null
        const hostedUrl = await downloadAndUploadImage(img.imageUrl, cacheKey, 'stock', {
          timeoutMs: 8000,
          onError: (info) => {
            err = info
          }
        })
        if (hostedUrl) {
          images.push({ url: hostedUrl, source: 'stock', sourceUrl: img.pageUrl, attribution: img.attribution })
        } else {
          const stage = (err as any)?.stage as 'init' | 'download' | 'upload' | undefined
          const message = (err as any)?.message as string | undefined
          uploadFailures.push({ source: 'stock', url: img.imageUrl, stage, message })
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
          googleUsed: !!googleDiag.used,
          cacheHit: !!googleDiag.cacheHit,
          google: googleDiag,
          websiteValidated,
          timings,
          fallbacksUsed,
          uploadFailures: uploadFailures.length ? uploadFailures.slice(0, 10) : [],
          websiteMeta: websiteMetaDiag
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

