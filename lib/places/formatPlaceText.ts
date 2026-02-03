/**
 * Format place text (title + description) from real metadata.
 * No generic fluff; stable, short strings for UI.
 */

export type PlaceTextInput = {
  name?: string
  categories?: string[]
  address?: string
  city?: string
  region?: string
}

function isStreetyName(name: string): boolean {
  const n = (name || '').toLowerCase()
  return (
    /\b(street|st\\.?|road|rd\\.?|avenue|ave\\.?|drive|dr\\.?|lane|ln\\.?|boulevard|blvd\\.?|highway|hwy\\.?|route|junction|intersection|roundabout)\b/i.test(
      n
    ) ||
    /^\d+\s+\w+/.test(n) ||
    n.includes(' at ') ||
    n.includes(' & ') ||
    n.includes(' and ')
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

  const parts: string[] = []
  if (locality) parts.push(`${cat} in ${locality}.`)
  else parts.push(`${cat}.`)

  const addr = (place.address || '').trim()
  if (addr && addr.length <= 80 && !addr.toLowerCase().includes('unnamed')) {
    parts.push(addr.endsWith('.') ? addr : `${addr}.`)
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

