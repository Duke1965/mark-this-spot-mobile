/**
 * Lightweight website image extraction
 * - Single-page fetch (handled by fetchWebsitePreview)
 * - Strong filtering (no icons/logos/sprites)
 * - Cache by domain for 7 days (in-memory)
 */

import { fetchWebsitePreview, normalizeWebsiteUrl } from '@/lib/pinEnrich/websitePreview'

type Cached = { images: string[]; expiresAt: number }
const domainCache = new Map<string, Cached>()

const DEFAULT_TIMEOUT_MS = 3500
const DEFAULT_MAX_IMAGES = 8
const DOMAIN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

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
  try {
    const u = new URL(url)
    const path = u.pathname.toLowerCase()
    if (path.endsWith('.svg')) return false
    return path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png') || path.endsWith('.webp')
  } catch {
    const lower = url.toLowerCase().split('?')[0].split('#')[0]
    if (lower.endsWith('.svg')) return false
    return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp')
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

  // fetchWebsitePreview already includes throttling + robots checks + caching (24h).
  // We still enforce a strict overall timeout via Promise.race.
  const preview = await Promise.race([
    fetchWebsitePreview(normalized),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS))
  ])

  const rawImages = (preview?.images || []).filter((u) => typeof u === 'string')
  const filtered = dedupe(
    rawImages
      .filter((u) => u && !looksLikeNonPhoto(u))
      .filter((u) => hasGoodExtension(u))
  ).slice(0, maxImages)

  if (domain) {
    domainCache.set(domain, { images: filtered, expiresAt: now + DOMAIN_TTL_MS })
  }

  return { images: filtered, sourceUrl: preview?.sourceUrl || normalized }
}

