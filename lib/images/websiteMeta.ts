/**
 * Website metadata fetcher (metadata-only, single request).
 *
 * - Fetches HTML once (manual redirects, http/https only)
 * - Extracts: og:title, og:description, <title>, meta description
 * - Extracts up to 3 good images: og:image, twitter:image, optional first reasonable <img>
 * - SSRF guardrails: blocks non-http(s) + obvious private hosts
 * - Caches per finalUrl host+path for 7 days (in-memory)
 *
 * NOTE: We do NOT crawl additional pages. We do NOT store raw HTML.
 */

export type WebsiteMeta = {
  finalUrl: string
  ogTitle?: string
  ogDescription?: string
  siteTitle?: string
  metaDescription?: string
  images: string[]
}

type Cached = { expiresAt: number; value: WebsiteMeta }
const cache = new Map<string, Cached>()

const DEFAULT_TIMEOUT_MS = 3500
const DEFAULT_MAX_IMAGES = 3
const MAX_BYTES = 1_500_000 // 1.5MB
const TTL_MS = 7 * 24 * 60 * 60 * 1000

function normStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function cacheKeyForFinalUrl(finalUrl: string): string | null {
  try {
    const u = new URL(finalUrl)
    const host = u.hostname.toLowerCase()
    const path = (u.pathname || '/').toLowerCase()
    return `${host}${path}`
  } catch {
    return null
  }
}

function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return false

    const hostname = parsed.hostname.toLowerCase()
    // Block localhost and obvious private IPv4 ranges (best-effort; no DNS resolution).
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.20.') ||
      hostname.startsWith('172.21.') ||
      hostname.startsWith('172.22.') ||
      hostname.startsWith('172.23.') ||
      hostname.startsWith('172.24.') ||
      hostname.startsWith('172.25.') ||
      hostname.startsWith('172.26.') ||
      hostname.startsWith('172.27.') ||
      hostname.startsWith('172.28.') ||
      hostname.startsWith('172.29.') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.')
    ) {
      return false
    }

    return true
  } catch {
    return false
  }
}

function normalizeWebsiteUrl(input: string): string {
  const trimmed = (input || '').trim()
  if (!trimmed) return input
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const u = new URL(withScheme)
    u.hash = ''
    // Keep query for some sites that use it for locale, but strip obvious tracking.
    ;['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'srsltid'].forEach((k) =>
      u.searchParams.delete(k)
    )
    return u.toString()
  } catch {
    return withScheme
  }
}

function resolveUrl(url: string, base: string): string | null {
  try {
    const out = new URL(url, base).toString()
    return out
  } catch {
    return null
  }
}

function looksJunkImage(url: string): boolean {
  const u = url.toLowerCase()
  if (u.startsWith('data:')) return true
  if (u.includes('favicon')) return true
  if (u.includes('sprite')) return true
  if (u.includes('placeholder')) return true
  if (u.includes('blank')) return true
  if (u.includes('default')) return true
  if (u.includes('logo')) return true
  if (u.includes('icon')) return true
  // Reject SVG/ICO.
  try {
    const parsed = new URL(url)
    const p = (parsed.pathname || '').toLowerCase()
    if (p.endsWith('.svg') || p.endsWith('.ico')) return true
  } catch {
    if (u.split('?')[0].endsWith('.svg') || u.split('?')[0].endsWith('.ico')) return true
  }
  return false
}

function dedupe(urls: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const u of urls) {
    const key = u.trim()
    if (!key) continue
    if (seen.has(key)) continue
    seen.add(key)
    out.push(key)
  }
  return out
}

async function fetchHtmlOnce(
  inputUrl: string,
  opts: { timeoutMs: number; maxBytes: number; maxRedirects: number }
): Promise<{ html: string; finalUrl: string } | null> {
  let current = inputUrl

  for (let i = 0; i <= opts.maxRedirects; i++) {
    if (!validateUrl(current)) return null

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs)
    try {
      const resp = await fetch(current, {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          // Normal-ish UA helps with some CDNs/WAFs.
          'User-Agent': 'Mozilla/5.0 (compatible; PINITPreviewBot/1.0; +https://pinit.app)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      })

      clearTimeout(timeout)

      // Handle redirects manually (guardrails).
      if (resp.status >= 300 && resp.status < 400) {
        const loc = resp.headers.get('location')
        if (!loc) return null
        const next = resolveUrl(loc, current)
        if (!next) return null
        current = next
        continue
      }

      if (!resp.ok) return null

      // Read up to maxBytes
      const reader = resp.body?.getReader()
      const decoder = new TextDecoder()
      let html = ''
      let bytesRead = 0

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          bytesRead += value.length
          if (bytesRead > opts.maxBytes) break
          html += decoder.decode(value, { stream: true })
        }
      } else {
        // Fallback (may exceed maxBytes, but rare in Node runtime)
        html = await resp.text()
        if (html.length > opts.maxBytes) html = html.slice(0, opts.maxBytes)
      }

      const finalUrl = resp.url || current
      if (!validateUrl(finalUrl)) return null
      return { html, finalUrl }
    } catch {
      clearTimeout(timeout)
      return null
    }
  }

  return null
}

function parseMeta(html: string, finalUrl: string, maxImages: number): WebsiteMeta {
  const head = html.slice(0, 200_000)

  const metaTags = head.matchAll(/<meta\b[^>]*>/gi)
  const metas: Array<Record<string, string>> = []
  for (const m of metaTags) {
    const raw = m[0] || ''
    const attrs: Record<string, string> = {}
    const attrMatches = raw.matchAll(/([a-zA-Z0-9:_-]+)\s*=\s*["']([^"']*)["']/g)
    for (const a of attrMatches) {
      const k = (a[1] || '').toLowerCase()
      const v = (a[2] || '').trim()
      if (k && v) attrs[k] = v
    }
    if (Object.keys(attrs).length) metas.push(attrs)
  }

  const getAll = (key: string): string[] => {
    const out: string[] = []
    for (const attrs of metas) {
      const k = (attrs.property || attrs.name || '').toLowerCase()
      if (k === key.toLowerCase() && attrs.content) out.push(attrs.content)
    }
    return out
  }

  const ogTitle = normStr(getAll('og:title')[0])
  const ogDescription = normStr(getAll('og:description')[0])
  const metaDescription = normStr(getAll('description')[0])

  let siteTitle = ''
  const titleMatch = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (titleMatch?.[1]) {
    siteTitle = normStr(titleMatch[1].replace(/\s+/g, ' '))
  }

  const candidateImagesRaw: string[] = []
  for (const img of [...getAll('og:image'), ...getAll('og:image:secure_url'), ...getAll('twitter:image'), ...getAll('twitter:image:src')]) {
    const abs = resolveUrl(img, finalUrl)
    if (abs) candidateImagesRaw.push(abs)
  }

  // Optional: first reasonable <img> near top if we still need more
  if (candidateImagesRaw.length < maxImages) {
    const scanWindow = html.slice(0, 80_000)
    const imgMatches = scanWindow.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)
    for (const match of imgMatches) {
      const src = normStr(match[1])
      if (!src) continue
      const abs = resolveUrl(src, finalUrl)
      if (!abs) continue
      candidateImagesRaw.push(abs)
      if (candidateImagesRaw.length >= maxImages * 4) break
    }
  }

  const images = dedupe(candidateImagesRaw)
    .filter((u) => validateUrl(u))
    .filter((u) => !looksJunkImage(u))
    .slice(0, maxImages)

  return {
    finalUrl,
    ogTitle: ogTitle || undefined,
    ogDescription: ogDescription || undefined,
    siteTitle: siteTitle || undefined,
    metaDescription: metaDescription || undefined,
    images
  }
}

export async function getWebsiteMeta(url: string): Promise<WebsiteMeta | null> {
  const enabled = (process.env.ENABLE_WEBSITE_SCRAPE || 'true').toLowerCase() === 'true'
  if (!enabled) return null

  const timeoutMs = parseInt(process.env.WEBSITE_SCRAPE_TIMEOUT_MS || String(DEFAULT_TIMEOUT_MS), 10)
  const maxImages = parseInt(process.env.WEBSITE_SCRAPE_MAX_IMAGES || String(DEFAULT_MAX_IMAGES), 10)

  const normalized = normalizeWebsiteUrl(url)
  if (!validateUrl(normalized)) return null

  // Fast cache check (keyed by final url once known; we also do a pre-key on normalized).
  const preKey = cacheKeyForFinalUrl(normalized)
  const now = Date.now()
  if (preKey) {
    const c = cache.get(preKey)
    if (c && c.expiresAt > now) return c.value
  }

  const fetched = await fetchHtmlOnce(normalized, {
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS,
    maxBytes: MAX_BYTES,
    maxRedirects: 3
  })
  if (!fetched) return null

  const meta = parseMeta(fetched.html, fetched.finalUrl, Math.max(1, Math.min(3, Number.isFinite(maxImages) ? maxImages : DEFAULT_MAX_IMAGES)))
  const key = cacheKeyForFinalUrl(meta.finalUrl) || preKey
  if (key) {
    cache.set(key, { expiresAt: now + TTL_MS, value: meta })
  }

  return meta
}

