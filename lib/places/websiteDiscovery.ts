/**
 * Website discovery via Serper (Google Search API).
 *
 * Why: Many real places have websites, but they are often missing from Geoapify/OSM/Wikidata.
 * This optional step can discover an official domain so we can do website-first images.
 *
 * Enable by setting:
 * - SERPER_API_KEY (required)
 * Optional:
 * - SERPER_GL (default: "za")
 * - SERPER_HL (default: "en")
 */
export type WebsiteDiscoveryInput = {
  name: string
  locality?: string
  region?: string
  country?: string
}

type SerperOrganicResult = {
  title?: string
  link?: string
  snippet?: string
  position?: number
}

function normStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function normalizeForCompare(input: string): string {
  return (input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function similarityScore(a: string, b: string): number {
  const aa = normalizeForCompare(a)
  const bb = normalizeForCompare(b)
  if (!aa || !bb) return 0
  if (aa === bb) return 1
  if (aa.includes(bb) || bb.includes(aa)) return 0.85

  const aTokens = new Set(aa.split(' ').filter(Boolean))
  const bTokens = new Set(bb.split(' ').filter(Boolean))
  if (aTokens.size === 0 || bTokens.size === 0) return 0

  let inter = 0
  for (const t of aTokens) if (bTokens.has(t)) inter++
  const union = aTokens.size + bTokens.size - inter
  return union > 0 ? inter / union : 0
}

function isBadDomain(host: string): boolean {
  const h = host.toLowerCase()
  const blocked = [
    'facebook.com',
    'm.facebook.com',
    'instagram.com',
    'tiktok.com',
    'twitter.com',
    'x.com',
    'youtube.com',
    'youtu.be',
    'tripadvisor.',
    'booking.com',
    'airbnb.',
    'expedia.',
    'agoda.',
    'yelp.',
    'zomato.',
    'ubereats.',
    'doordash.',
    'deliveroo.',
    'goo.gl',
    'bit.ly',
    'linktr.ee',
    'maps.app.goo.gl',

    // Media / music / app store links (not an "official website" for a place)
    'spotify.com',
    'soundcloud.com',
    'music.apple.com',
    'podcasts.apple.com',
    'apps.apple.com',
    'play.google.com',

    // Knowledge bases / aggregators that are almost never an "official website"
    'wikipedia.org',
    'wikidata.org',
    'datacommons.org',
    'openstreetmap.org',
    'osm.org',
    'foursquare.com'
  ]
  return blocked.some((b) => (b.includes('.') ? h.includes(b) : h === b))
}

function normalizeUrl(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`
  try {
    const u = new URL(withScheme)
    if (!u.hostname) return null
    u.hash = ''
    // Strip obvious tracking params
    ;[
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'gclid',
      'fbclid',
      // Google SERP click tracking
      'srsltid'
    ].forEach((k) => u.searchParams.delete(k))
    return u.toString()
  } catch {
    return null
  }
}

/**
 * Attempt to discover an official website.
 *
 * Returns a normalized URL or null.
 */
export async function discoverOfficialWebsite(
  input: WebsiteDiscoveryInput
): Promise<{ website: string | null; debug: { query: string; considered: Array<{ url: string; score: number }> } }> {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) {
    return { website: null, debug: { query: '', considered: [] } }
  }

  const name = normStr(input.name)
  if (!name) return { website: null, debug: { query: '', considered: [] } }

  const parts = [name, normStr(input.locality), normStr(input.region), normStr(input.country)].filter(Boolean)
  const query = parts.join(' ')

  const gl = normStr(process.env.SERPER_GL) || 'za'
  const hl = normStr(process.env.SERPER_HL) || 'en'

  const resp = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey
    },
    body: JSON.stringify({ q: query, gl, hl, num: 10 })
  })

  if (!resp.ok) {
    return { website: null, debug: { query, considered: [] } }
  }

  const data: any = await resp.json()
  const organic: SerperOrganicResult[] = Array.isArray(data?.organic) ? data.organic : []

  const considered: Array<{ url: string; score: number }> = []
  let best: { url: string; score: number } | null = null

  for (const r of organic) {
    const link = normalizeUrl(normStr(r.link))
    if (!link) continue
    let host = ''
    try {
      host = new URL(link).hostname
    } catch {
      continue
    }
    if (isBadDomain(host)) continue

    const title = normStr(r.title)
    const snippet = normStr(r.snippet)

    // Score: name similarity + light preference for top positions
    const simTitle = similarityScore(name, title)
    const simSnippet = similarityScore(name, snippet)
    const simHost = similarityScore(name, host.replace(/^www\./, ''))
    const sim = Math.max(simTitle, simSnippet * 0.9, simHost * 0.8)
    const pos = typeof r.position === 'number' ? r.position : 10
    const posBoost = Math.max(0, 1 - pos / 15) * 0.1
    const score = sim + posBoost

    considered.push({ url: link, score })
    if (!best || score > best.score) best = { url: link, score }
  }

  // Require at least a modest match to avoid random domains.
  if (!best || best.score < 0.55) {
    return { website: null, debug: { query, considered: considered.slice(0, 10) } }
  }

  return { website: best.url, debug: { query, considered: considered.slice(0, 10) } }
}

