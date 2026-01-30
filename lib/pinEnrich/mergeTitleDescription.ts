import type { WebsiteMeta } from '@/lib/images/websiteMeta'

type PlaceLike = {
  name?: string
  category?: string
  address?: string
  locality?: string
  region?: string
  country?: string
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

function isMarketingFluff(desc: string): boolean {
  const d = desc.toLowerCase()
  if (d.includes('!!!')) return true
  if (d.includes('best ') || d.includes('cheap ') || d.includes('sale') || d.includes('discount')) return true
  if (d.includes('click here') || d.includes('book now') || d.includes('order now')) return true
  return false
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

  // Description
  let description = baseDescription
  const metaDescRaw = norm(meta?.metaDescription) || norm(meta?.ogDescription)
  if (metaDescRaw && !isMarketingFluff(metaDescRaw)) {
    // Use as a hint only when it seems relevant and not wildly different
    const hint = clampDescription(metaDescRaw)
    if (hint.length >= 40) {
      description = hint
    }
  }
  if (!description) description = baseDescription || 'Pinned location.'

  return { title, description }
}

