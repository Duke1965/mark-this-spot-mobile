/**
 * Format place text (title + description) from real metadata.
 * No generic fluff; stable, short strings for UI.
 */

import { sanitizePlaceDescription } from '@/lib/sanitizePlaceDescription'
import { isLikelyOfficialWebsiteUrl } from '@/lib/places/websiteDiscovery'

export type PlaceTextInput = {
  name?: string
  categories?: string[]
  address?: string
  city?: string
  region?: string
  /** Already-accepted official website URL. Presentation is owned by PinResults, not the description. */
  website?: string
}

function isStreetyName(name: string): boolean {
  const n = (name || '').toLowerCase()
  // IMPORTANT: do not treat normal business names like "Wine & Olive Estate" as "streety".
  // Only mark as streety when there are explicit road/address terms.
  return (
    /\b(street|st\\.?|road|rd\\.?|avenue|ave\\.?|drive|dr\\.?|lane|ln\\.?|boulevard|blvd\\.?|highway|hwy\\.?|route|junction|intersection|roundabout)\b/i.test(
      n
    ) || /^\d+\s+\w+/.test(n)
  )
}

function titleCase(s: string): string {
  return s
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function categoryLabel(categories?: string[]): string {
  const c = (categories || []).join(',').toLowerCase()
  if (!c) return 'Place'

  if (c.includes('accommodation')) return 'Accommodation'
  if (c.includes('accommodation.hotel')) return 'Hotel'
  if (c.includes('accommodation.guest_house')) return 'Guest house'
  if (c.includes('accommodation.apartment') || c.includes('accommodation.chalet') || c.includes('accommodation.hut')) return 'Accommodation'
  if (c.includes('catering.restaurant')) return 'Restaurant'
  if (c.includes('catering.cafe')) return 'Cafe'
  if (c.includes('catering.bar') || c.includes('catering.pub')) return 'Bar'
  if (c.includes('entertainment.museum')) return 'Museum'
  if (c.includes('entertainment.culture.gallery') || c.includes('entertainment.gallery')) return 'Gallery'
  if (c.includes('production.winery')) return 'Winery'
  if (c.includes('tourism.attraction') || c.includes('tourism.sights')) return 'Attraction'
  if (c.includes('tourism.sights.memorial') || c.includes('memorial.')) return 'Monument'
  if (c.includes('heritage')) return 'Heritage site'
  if (c.includes('man_made.lighthouse') || c.includes('man_made.tower') || c.includes('man_made.bridge') || c.includes('man_made.pier')) return 'Landmark'
  if (c.includes('leisure.park')) return 'Park'
  if (c.includes('natural')) return 'Nature spot'
  if (c.includes('beach')) return 'Beach'
  if (c.includes('religion.place_of_worship')) return 'Place of worship'
  if (c.includes('building.place_of_worship')) return 'Place of worship'
  if (c.includes('building.historic')) return 'Historic building'
  if (c.includes('building.tourism')) return 'Attraction'
  if (c.includes('commercial.shopping_mall')) return 'Shopping'
  if (c.includes('commercial.marketplace')) return 'Market'
  if (c.includes('commercial.gift_and_souvenir')) return 'Souvenir shop'
  if (c.includes('commercial.art')) return 'Gallery'

  // Fallback: use first category segment if present
  const first = (categories || [])[0]
  if (first) return titleCase(first.split('.')[0])

  return 'Place'
}

function pickLocality(place: { city?: string; region?: string }): string | undefined {
  return place.city || place.region || undefined
}

function isTrustworthyPlaceName(name: string | undefined): boolean {
  const n = (name || '').trim()
  if (!n) return false
  const lower = n.toLowerCase()
  if (lower === 'unknown place' || lower === 'location' || lower === 'pinned location') return false
  if (isStreetyName(n)) return false
  return true
}

function categoryNounPhrase(catLabel: string): string {
  const lower = catLabel.trim().toLowerCase()
  if (!lower || lower === 'place') return 'place'
  if (lower === 'accommodation') return 'accommodation property'
  return lower
}

function withIndefiniteArticle(nounPhrase: string): string {
  const phrase = nounPhrase.trim()
  if (!phrase) return 'a place'
  const first = phrase.charAt(0).toLowerCase()
  const article = 'aeiou'.includes(first) ? 'an' : 'a'
  return `${article} ${phrase}`
}

/** Human-friendly host for display (no scheme, no www). Returns null if the URL is not acceptable. */
export function displayOfficialWebsiteHost(website: string | undefined): string | null {
  const raw = (website || '').trim()
  if (!raw) return null
  if (!isLikelyOfficialWebsiteUrl(raw)) return null
  try {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    const host = new URL(withScheme).hostname.toLowerCase().replace(/^www\./, '')
    if (!host || !host.includes('.')) return null
    return host
  } catch {
    return null
  }
}

/** Full accepted official href for navigation. Separate from the displayed host. */
export function acceptedOfficialWebsiteHref(website: string | undefined): string | null {
  const host = displayOfficialWebsiteHost(website)
  if (!host) return null
  const raw = (website || '').trim()
  if (!raw) return null
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
}

export function buildTitle(place: PlaceTextInput | null | undefined): string {
  if (!place) return 'Location'
  const name = (place.name || '').trim()
  if (name && name !== 'Unknown Place' && !isStreetyName(name)) return name

  const locality = pickLocality(place)
  const cat = categoryLabel(place.categories)
  return locality ? `${cat} near ${locality}` : cat
}

export function buildDescription(place: PlaceTextInput | null | undefined): string {
  if (!place) return 'Place'

  const locality = pickLocality(place)
  const cat = categoryLabel(place.categories)

  if (isTrustworthyPlaceName(place.name)) {
    const name = String(place.name).trim()
    const kind = withIndefiniteArticle(categoryNounPhrase(cat))
    const named = locality ? `${name} is ${kind} in ${locality}.` : `${name} is ${kind}.`
    return sanitizePlaceDescription(named.replace(/\s+/g, ' ').trim())
  }

  const parts: string[] = []
  if (locality) parts.push(`${cat} in ${locality}.`)
  else parts.push(`${cat}.`)

  // Street lines belong in structured address fields, not in the prose description (V1 cleanup).

  return sanitizePlaceDescription(parts.join(' ').replace(/\s+/g, ' ').trim())
}

function normalizePlaceText(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * True when the string is empty or is formatted-address copy (Geoapify/Google),
 * not meaningful place prose. Prefers equality with a known address when given.
 */
export function isAddressLikeDescription(
  description: string | null | undefined,
  knownAddress?: string | null
): boolean {
  const raw = collapseSpaces(description)
  if (!raw) return true

  const known = collapseSpaces(knownAddress)
  if (known) {
    const nDesc = normalizePlaceText(raw)
    const nAddr = normalizePlaceText(known)
    if (nDesc && nAddr && (nDesc === nAddr || nDesc.includes(nAddr) || nAddr.includes(nDesc))) {
      return true
    }
  }

  // Formatted addresses are comma lists without sentence punctuation.
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length < 3 || /[.!?]/.test(raw)) return false

  const hasStreetOrAdmin =
    /\b(street|st\.?|road|rd\.?|avenue|ave\.?|drive|dr\.?|lane|ln\.?|boulevard|blvd\.?|ward|municipality|province|district|county)\b/i.test(
      raw
    )
  const last = parts[parts.length - 1] || ''
  const hasCountryOrPostal =
    /\b\d{4,5}\b/.test(raw) ||
    /^(south africa|namibia|botswana|zimbabwe|mozambique|lesotho|eswatini|united states|united kingdom|australia|canada|france|germany|spain|italy|portugal|ireland|new zealand)$/i.test(
      last
    )
  return hasStreetOrAdmin && hasCountryOrPostal
}

function collapseSpaces(s: string | null | undefined): string {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .trim()
}
