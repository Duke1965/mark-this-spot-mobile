/**
 * Unsplash fallback image search (server-side).
 *
 * Env:
 * - UNSPLASH_ACCESS_KEY (required)
 *
 * Notes:
 * - We use this ONLY as a fallback when we couldn't get website/Wikimedia images.
 * - We include attribution + UTM params per Unsplash API guidelines.
 */

export type UnsplashImage = {
  imageUrl: string
  pageUrl: string
  attribution: string
  photographerName?: string
}

type UnsplashSearchResponse = {
  results?: Array<{
    id?: string
    links?: { html?: string }
    urls?: { regular?: string; small?: string; raw?: string }
    user?: { name?: string; links?: { html?: string } }
  }>
}

const cache = new Map<string, { expiresAt: number; images: UnsplashImage[] }>()
const TTL_MS = 6 * 60 * 60 * 1000 // 6h

function normStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function cacheKeyFor(query: string): string {
  return query.trim().toLowerCase()
}

function withUtm(url: string): string {
  try {
    const u = new URL(url)
    u.searchParams.set('utm_source', 'pinit')
    u.searchParams.set('utm_medium', 'referral')
    return u.toString()
  } catch {
    return url
  }
}

function buildAttribution(name?: string): string {
  const n = (name || '').trim()
  return n ? `Photo by ${n} on Unsplash` : 'Photo on Unsplash'
}

export async function searchUnsplashImages(query: string, max: number = 3): Promise<UnsplashImage[]> {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) return []

  const q = normStr(query)
  if (!q) return []

  const ck = cacheKeyFor(q)
  const now = Date.now()
  const cached = cache.get(ck)
  if (cached && cached.expiresAt > now) return cached.images.slice(0, max)

  const url = new URL('https://api.unsplash.com/search/photos')
  url.searchParams.set('query', q)
  url.searchParams.set('per_page', String(Math.min(10, Math.max(1, max * 3))))
  url.searchParams.set('orientation', 'landscape')
  url.searchParams.set('content_filter', 'high')

  const resp = await fetch(url.toString(), {
    headers: {
      Authorization: `Client-ID ${key}`,
      'Accept-Version': 'v1'
    }
  })

  if (!resp.ok) return []

  const data: UnsplashSearchResponse = await resp.json().catch(() => ({} as any))
  const results = Array.isArray(data?.results) ? data.results : []

  const images: UnsplashImage[] = []
  for (const r of results) {
    const regular = normStr(r?.urls?.regular) || normStr(r?.urls?.small) || normStr(r?.urls?.raw)
    const html = normStr(r?.links?.html)
    if (!regular || !html) continue

    const photographer = normStr(r?.user?.name) || undefined
    images.push({
      imageUrl: withUtm(regular),
      pageUrl: withUtm(html),
      attribution: buildAttribution(photographer),
      photographerName: photographer
    })
    if (images.length >= max) break
  }

  cache.set(ck, { expiresAt: now + TTL_MS, images })
  return images
}

