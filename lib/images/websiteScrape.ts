/**
 * Lightweight website image extraction
 * - Single-page fetch (handled by fetchWebsitePreview)
 * - Strong filtering (no icons/logos/sprites)
 * - Cache by domain for 7 days (in-memory)
 */

import { fetchWebsitePreviewWithOptions, normalizeWebsiteUrl } from '@/lib/pinEnrich/websitePreview'

type Cached = { images: string[]; expiresAt: number }
const domainCache = new Map<string, Cached>()

// 3.5s was too aggressive on Vercel; many real sites (WordPress etc.) exceed that.
const DEFAULT_TIMEOUT_MS = 6500
const DEFAULT_MAX_IMAGES = 8
const DOMAIN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const EMPTY_TTL_MS = 60 * 60 * 1000 // 1 hour (don't lock in "no images" for a week)

function getDomain(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

function looksLikeNonPhoto(url: string): boolean {
  const u = url.toLowerCase()
  if (u.includes('favicon')) return true
  if (u.includes('logo')) return true
  if (u.includes('sprite')) return true
  if (u.includes('icon')) return true
  if (u.includes('placeholder')) return true
  if (u.includes('blank')) return true
  if (u.includes('default')) return true
  return false
}

function hasGoodExtension(url: string): boolean {
  // Many real sites serve OG images without a clean extension (CDNs / Cloudflare / WP transforms).
  // Keep a conservative allow-list of patterns that are *very likely* images.
  try {
    const u = new URL(url)
    const path = u.pathname.toLowerCase()
    if (path.endsWith('.svg')) return false
    if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.webp')) return true

    const qs = u.searchParams.toString().toLowerCase()
    if (qs.includes('format=jpg') || qs.includes('format=jpeg') || qs.includes('format=png') || qs.includes('format=webp')) return true
    if (qs.includes('fm=jpg') || qs.includes('fm=jpeg') || qs.includes('fm=png') || qs.includes('fm=webp')) return true

    // WordPress / CMS uploads frequently omit extensions after transforms
    if (path.includes('/wp-content/uploads/')) return true
    if (path.includes('/uploads/') || path.includes('/media/')) return true

    // Cloudflare image resizing proxy
    if (path.includes('/cdn-cgi/image/')) return true

    return false
  } catch {
    const lower = url.toLowerCase().split('?')[0].split('#')[0]
    if (lower.endsWith('.svg')) return false
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp')) return true
    if (lower.includes('/wp-content/uploads/')) return true
    if (lower.includes('/uploads/') || lower.includes('/media/')) return true
    if (lower.includes('/cdn-cgi/image/')) return true
    return false
  }
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

/**
 * Extract up to N usable images from a place's official website.
 */
export async function getWebsiteImages(websiteUrl: string): Promise<{ images: string[]; sourceUrl: string }> {
  const enabled = (process.env.ENABLE_WEBSITE_SCRAPE || 'true').toLowerCase() === 'true'
  if (!enabled) return { images: [], sourceUrl: websiteUrl }

  const maxImages = parseInt(process.env.WEBSITE_SCRAPE_MAX_IMAGES || String(DEFAULT_MAX_IMAGES), 10)
  const timeoutMs = parseInt(process.env.WEBSITE_SCRAPE_TIMEOUT_MS || String(DEFAULT_TIMEOUT_MS), 10)

  const normalized = normalizeWebsiteUrl(websiteUrl)
  const domain = getDomain(normalized)
  const now = Date.now()

  if (domain) {
    const cached = domainCache.get(domain)
    if (cached && cached.expiresAt > now) {
      return { images: cached.images.slice(0, maxImages), sourceUrl: normalized }
    }
  }

  // fetchWebsitePreviewWithOptions includes throttling + robots checks + caching (24h).
  const preview = await fetchWebsitePreviewWithOptions(normalized, { timeoutMs })

  const rawImages = (preview?.images || []).filter((u) => typeof u === 'string')
  const filtered = dedupe(
    rawImages
      .filter((u) => u && !looksLikeNonPhoto(u))
      .filter((u) => hasGoodExtension(u))
  ).slice(0, maxImages)

  if (domain) {
    // Avoid caching empty results for too long (network timeouts / cold starts are common).
    domainCache.set(domain, { images: filtered, expiresAt: now + (filtered.length ? DOMAIN_TTL_MS : EMPTY_TTL_MS) })
  }

  return { images: filtered, sourceUrl: preview?.sourceUrl || normalized }
}

