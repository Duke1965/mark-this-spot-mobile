import type { WebsiteMeta } from '@/lib/images/websiteMeta'
import { sanitizePlaceDescription } from '@/lib/sanitizePlaceDescription'

type PlaceLike = {
  name?: string
  category?: string
  address?: string
  locality?: string
  region?: string
  country?: string
  source?: string
}

function norm(s: string | undefined): string {
  return (s || '').trim()
}

function normalizeForCompare(input: string): string {
  return (input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function looksGenericTitle(title: string | undefined): boolean {
  const t = normalizeForCompare(title || '')
  if (!t) return true
  if (t === 'location' || t === 'pinned location' || t === 'nature spot') return true
  if (t.startsWith('place near ') || t.startsWith('place in ')) return true
  return false
}

function looksLikeStreetAddress(title: string | undefined): boolean {
  const t = (title || '').trim()
  if (!t) return false
  const lower = t.toLowerCase()
  if (!/\d/.test(lower)) return false
  return (
    lower.includes('street') ||
    lower.includes('st ') ||
    lower.includes('st.') ||
    lower.includes('road') ||
    lower.includes('rd ') ||
    lower.includes('rd.') ||
    lower.includes('avenue') ||
    lower.includes('ave') ||
    lower.includes('crescent') ||
    lower.includes('lane') ||
    lower.includes('drive') ||
    lower.includes('boulevard') ||
    lower.includes('blvd')
  )
}

function cleanSiteTitle(raw: string): string {
  const s = raw.replace(/\s+/g, ' ').trim()
  if (!s) return s
  // Many sites use "Page | Site" or "Page - Site"
  const parts = s.split('|').map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) return parts[0]!
  const dashParts = s.split(' - ').map((p) => p.trim()).filter(Boolean)
  if (dashParts.length >= 2) return dashParts[0]!
  return s
}

function isBadWebsiteTitleCandidate(raw: string): boolean {
  const t = normalizeForCompare(raw)
  if (!t) return true
  const bad = ['home', 'welcome', 'homepage', 'index', 'default', 'untitled']
  if (bad.includes(t)) return true
  // Very short titles are rarely helpful
  if (t.length <= 3) return true
  return false
}

const GENERIC_CATEGORY_LABELS = [
  'accommodation',
  'hotel',
  'guest house',
  'restaurant',
  'cafe',
  'bar',
  'museum',
  'gallery',
  'winery',
  'attraction',
  'monument',
  'heritage site',
  'landmark',
  'park',
  'nature spot',
  'beach',
  'place of worship',
  'historic building',
  'shopping',
  'market',
  'souvenir shop',
  'place'
]

function looksGenericFormatterDescription(desc: string | undefined): boolean {
  const t = normalizeForCompare(desc || '').replace(/\.+$/, '')
  if (!t) return true
  if (t === 'place' || t === 'pinned location' || t === 'location') return true
  for (const label of GENERIC_CATEGORY_LABELS) {
    if (t === label) return true
    const inPrefix = `${label} in `
    const nearPrefix = `${label} near `
    let rest = ''
    if (t.startsWith(inPrefix)) rest = t.slice(inPrefix.length)
    else if (t.startsWith(nearPrefix)) rest = t.slice(nearPrefix.length)
    else continue
    // Formatter output is only "{category} in {locality}." — extra clauses are useful copy.
    if (rest && !/[.:,;]/.test(rest) && rest.split(' ').filter(Boolean).length <= 5) return true
  }
  return false
}

function isBoilerplateDescription(desc: string): boolean {
  const d = normalizeForCompare(desc)
  if (!d) return true
  const exact = [
    'home',
    'welcome',
    'welcome to our website',
    'official website',
    'homepage'
  ]
  if (exact.includes(d.replace(/\.+$/, ''))) return true
  const banned = [
    'we use cookies',
    'this website uses cookies',
    'accept cookies',
    'cookie policy',
    'privacy policy',
    'terms of service',
    'terms and conditions',
    'all rights reserved',
    'add to cart',
    'shopping cart',
    'page not found',
    'error 404'
  ]
  if (banned.some((p) => d.includes(p))) return true
  if (/\b(log in|sign in|login to|create an account)\b/.test(d) && d.length < 80) return true
  return false
}

function isSpammyDescription(desc: string): boolean {
  const d = desc.toLowerCase()
  if (d.includes('!!!')) return true
  if (d.includes('click here')) return true
  if (d.includes('order now')) return true
  // Gambling / SEO spam — not ordinary hospitality marketing.
  if (d.includes('bankroll') || d.includes('odds') || d.includes('tipster') || d.includes('betting')) return true
  if (d.includes('casino') || d.includes('slots') || d.includes('gambling')) return true
  if (d.includes('seo') || d.includes('lorem ipsum')) return true
  if ((d.match(/\|/g) || []).length >= 3) return true
  return false
}

function tokensForRelevance(name: string | undefined): string[] {
  const n = normalizeForCompare(name || '')
  if (!n) return []
  const stop = new Set(['the', 'and', 'for', 'with', 'near', 'from'])
  return n
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length >= 4 && !stop.has(t))
    .slice(0, 6)
}

function categoryHint(place: PlaceLike | undefined): string {
  const raw = (place?.category || '').toLowerCase()
  if (!raw) return ''
  const last = raw.split('.').filter(Boolean).pop() || ''
  return last.replace(/_/g, ' ')
}

function descriptionSeemsRelevant(desc: string, place: PlaceLike | undefined): boolean {
  const d = normalizeForCompare(desc)
  if (!d) return false
  const tokens = tokensForRelevance(place?.name)
  if (tokens.some((t) => d.includes(t))) return true

  const locality = normalizeForCompare(place?.locality || '')
  if (locality.length >= 4 && d.includes(locality)) return true
  const region = normalizeForCompare(place?.region || '')
  if (region.length >= 4 && d.includes(region)) return true

  const cat = categoryHint(place)
  if (cat.length >= 4 && d.includes(cat)) return true

  // Google websiteUri is already bound to this Place ID, so locality/name
  // matches are a bonus rather than a hard requirement.
  if (String(place?.source || '').toLowerCase() === 'google') return true
  if (tokens.length === 0) return true
  return false
}

function pickWebsiteDescription(meta: WebsiteMeta | null | undefined): string[] {
  const og = norm(meta?.ogDescription)
  const metaDesc = norm(meta?.metaDescription)
  const unique = Array.from(new Set([og, metaDesc].filter(Boolean)))
  unique.sort((a, b) => b.length - a.length)
  return unique
}

function isUsableWebsiteDescription(desc: string, place: PlaceLike | undefined): boolean {
  const hint = clampDescription(desc)
  if (hint.length < 32) return false
  if (looksGenericFormatterDescription(hint)) return false
  if (isBoilerplateDescription(hint)) return false
  if (isSpammyDescription(hint)) return false
  if (!descriptionSeemsRelevant(hint, place)) return false
  return true
}

function clampDescription(desc: string): string {
  const s = desc.replace(/\s+/g, ' ').trim()
  if (!s) return s
  const trimmed = s.length > 240 ? s.slice(0, 240) : s
  // Try to end cleanly
  const lastPeriod = trimmed.lastIndexOf('.')
  if (lastPeriod >= 80) return trimmed.slice(0, lastPeriod + 1).trim()
  return trimmed.trim()
}

export function mergeTitleDescription(input: {
  baseTitle: string
  baseDescription: string
  place?: PlaceLike
  websiteMeta?: WebsiteMeta | null
}): { title: string; description: string } {
  const baseTitle = norm(input.baseTitle) || 'Pinned location'
  const baseDescription = norm(input.baseDescription)

  const meta = input.websiteMeta
  const ogTitle = meta?.ogTitle ? cleanSiteTitle(meta.ogTitle) : ''
  const siteTitle = meta?.siteTitle ? cleanSiteTitle(meta.siteTitle) : ''

  let title = baseTitle
  if (looksGenericTitle(baseTitle) || looksLikeStreetAddress(baseTitle)) {
    const candidate = ogTitle || siteTitle
    if (candidate && !isBadWebsiteTitleCandidate(candidate) && !looksLikeStreetAddress(candidate)) {
      title = candidate
    }
  }

  // Description: prefer a usable official-site meta/OG description over generic
  // formatter text such as "Accommodation in Riebeek West."
  let description = baseDescription
  for (const candidate of pickWebsiteDescription(meta)) {
    if (!isUsableWebsiteDescription(candidate, input.place)) continue
    description = clampDescription(candidate)
    break
  }
  if (!description) description = baseDescription || 'Pinned location.'

  return { title, description: sanitizePlaceDescription(description) }
}

