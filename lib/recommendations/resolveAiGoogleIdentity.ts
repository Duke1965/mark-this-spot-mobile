import {
  checkAndIncrementGoogleDailyLimit,
  getCachedGooglePlaceById,
  getCachedGooglePlaceByLatLon,
} from "@/lib/cache/placeCache"
import { hintMatches, placeDetails, textSearch } from "@/lib/google/googlePlaces"
import { resolveGooglePlacePhoto } from "@/lib/google/resolveGooglePlacePhoto"
import { genuineCommunityPhotoUrl } from "@/lib/recommendations/communityPhoto"
import { getWebsiteMeta } from "@/lib/images/websiteMeta"
import { mergeTitleDescription } from "@/lib/pinEnrich/mergeTitleDescription"
import {
  buildDescription,
  isAddressLikeDescription,
} from "@/lib/places/formatPlaceText"

const CLOSED_PERMANENTLY = "CLOSED_PERMANENTLY"
const MAX_MATCH_DISTANCE_M = 250

export type AiGoogleIdentityResult =
  | {
      ok: true
      placeId: string
      photoUrl: string | null
      website?: string
      description?: string
      source: "cache" | "google" | "none"
    }
  | {
      ok: false
      closedPermanently?: boolean
      reason: string
      placeId?: string
    }

function isClosedPermanently(status: string | undefined): boolean {
  return String(status || "").trim().toUpperCase() === CLOSED_PERMANENTLY
}

function identityLimitKey(title: string, lat: number, lng: number): string {
  const name = title.trim().toLowerCase().slice(0, 80)
  // v2: Text Search only. Do not reuse `ai-identity:` docs consumed by the old Nearby path.
  return `ai-identity-text:${lat.toFixed(4)}:${lng.toFixed(4)}:${name}`
}

function localityFromFormattedAddress(addr: string | undefined): string | undefined {
  const a = (addr || "").trim()
  if (!a) return undefined
  const parts = a.split(",").map((p) => p.trim()).filter(Boolean)
  if (parts.length < 2) return undefined
  return parts.length >= 3 ? parts[1] : parts[0]
}

async function enrichAiPlaceDescription(input: {
  title: string
  currentDescription?: string
  website?: string
  address?: string
  types?: string[]
  name?: string
}): Promise<string | undefined> {
  const current = String(input.currentDescription || "").trim()
  if (current && !isAddressLikeDescription(current, input.address)) {
    return current
  }

  const name = String(input.name || input.title || "").trim()
  const locality = localityFromFormattedAddress(input.address)
  const baseDescription = buildDescription({
    name,
    categories: Array.isArray(input.types) ? input.types : [],
    address: input.address,
    city: locality,
  })

  let websiteMeta: Awaited<ReturnType<typeof getWebsiteMeta>> = null
  const website = String(input.website || "").trim()
  if (website.startsWith("http")) {
    try {
      websiteMeta = await getWebsiteMeta(website)
    } catch {
      websiteMeta = null
    }
  }

  const merged = mergeTitleDescription({
    baseTitle: input.title,
    baseDescription,
    place: {
      name,
      category: Array.isArray(input.types) ? input.types[0] : undefined,
      address: input.address,
      locality,
      source: "google",
    },
    websiteMeta,
  })

  const next = String(merged.description || baseDescription || "").trim()
  if (next && !isAddressLikeDescription(next, input.address)) return next
  if (baseDescription && !isAddressLikeDescription(baseDescription, input.address)) {
    return baseDescription
  }
  return undefined
}

/**
 * Cache-first Google identity for an already-selected AI recommendation.
 * Geo-cache is used only when the cached name matches the rec title.
 * Otherwise one Places Text Search (textQuery = title, location bias).
 * A Nearby-selected POI is never accepted merely because it is close.
 *
 * Optional placeId: description enrichment only (no Text Search, no photo, no limiter).
 */
export async function resolveAiGoogleIdentity(input: {
  title: string
  lat: number
  lng: number
  placeId?: string
  website?: string
  currentDescription?: string
}): Promise<AiGoogleIdentityResult> {
  const title = String(input.title || "").trim()
  const lat = Number(input.lat)
  const lng = Number(input.lng)
  const knownPlaceId = String(input.placeId || "").trim()
  if (!title || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, reason: "invalid" }
  }

  // Already-identified rec: upgrade address-like description without extra Google calls.
  if (knownPlaceId) {
    const cachedById = await getCachedGooglePlaceById({ placeId: knownPlaceId })
    const cachedWebsite =
      typeof cachedById?.place?.website === "string"
        ? cachedById.place.website.trim()
        : undefined
    const website =
      (typeof input.website === "string" && input.website.trim().startsWith("http")
        ? input.website.trim()
        : undefined) || cachedWebsite
    const cachedPhotos = Array.isArray(cachedById?.place?.photoStorageUrls)
      ? cachedById!.place.photoStorageUrls
      : []
    const description = await enrichAiPlaceDescription({
      title,
      currentDescription: input.currentDescription,
      website,
      address: cachedById?.place?.address,
      types: cachedById?.place?.types,
      name: cachedById?.place?.name || title,
    })
    return {
      ok: true,
      placeId: knownPlaceId,
      photoUrl: genuineCommunityPhotoUrl(cachedPhotos[0]) || null,
      website: website || undefined,
      description,
      source: "cache",
    }
  }

  let placeId: string | undefined
  let cachedWebsite: string | undefined
  let cachedStatus: string | undefined

  const geo = await getCachedGooglePlaceByLatLon({ lat, lon: lng })
  if (geo?.place?.place_id && hintMatches(title, geo.place.name)) {
    placeId = geo.place.place_id
    cachedWebsite =
      typeof geo.place.website === "string" ? geo.place.website.trim() : undefined
    cachedStatus =
      typeof geo.place.businessStatus === "string"
        ? geo.place.businessStatus.trim()
        : undefined
    if (isClosedPermanently(cachedStatus)) {
      return { ok: false, closedPermanently: true, reason: "closed_permanently", placeId }
    }
  }

  if (!placeId) {
    const peek = await checkAndIncrementGoogleDailyLimit({
      key: identityLimitKey(title, lat, lng),
      maxPerDay: 1,
      increment: false,
    })
    if (!peek.allowed) {
      return { ok: false, reason: "limited" }
    }

    let search: Awaited<ReturnType<typeof textSearch>>
    try {
      search = await textSearch({
        textQuery: title,
        lat,
        lon: lng,
      })
    } catch {
      return { ok: false, reason: "error" }
    }
    if (!search.ok) {
      return { ok: false, reason: "error" }
    }

    // Consume the daily slot only after a completed Text Search (match or confirmed miss).
    await checkAndIncrementGoogleDailyLimit({
      key: identityLimitKey(title, lat, lng),
      maxPerDay: 1,
    })

    const matched = search.candidates
      .filter(
        (c) =>
          !!c.placeId &&
          hintMatches(title, c.name) &&
          Number.isFinite(c.distanceMeters) &&
          c.distanceMeters <= MAX_MATCH_DISTANCE_M
      )
      .sort((a, b) => a.distanceMeters - b.distanceMeters)[0]

    if (!matched?.placeId) {
      return { ok: false, reason: "no_match" }
    }
    if (isClosedPermanently(matched.businessStatus)) {
      return {
        ok: false,
        closedPermanently: true,
        reason: "closed_permanently",
        placeId: matched.placeId,
      }
    }
    placeId = matched.placeId
  }

  const cachedById = await getCachedGooglePlaceById({ placeId })
  if (cachedById?.place) {
    if (!cachedWebsite && typeof cachedById.place.website === "string") {
      cachedWebsite = cachedById.place.website.trim()
    }
    if (!cachedStatus && typeof cachedById.place.businessStatus === "string") {
      cachedStatus = cachedById.place.businessStatus.trim()
    }
  }
  if (isClosedPermanently(cachedStatus)) {
    return { ok: false, closedPermanently: true, reason: "closed_permanently", placeId }
  }

  const photo = await resolveGooglePlacePhoto({
    placeId,
    lat,
    lng,
    limiterKey: `rec-photo:${placeId}`,
  })
  const status = photo.businessStatus || cachedStatus
  if (isClosedPermanently(status)) {
    return { ok: false, closedPermanently: true, reason: "closed_permanently", placeId }
  }
  if (!status) {
    const details = await placeDetails(placeId)
    if (isClosedPermanently(details?.businessStatus)) {
      return { ok: false, closedPermanently: true, reason: "closed_permanently", placeId }
    }
    if (!cachedWebsite && details?.website) cachedWebsite = details.website
  }

  const website = photo.website || cachedWebsite || undefined
  const cachedAfterPhoto = await getCachedGooglePlaceById({ placeId })
  const placeForDesc = cachedAfterPhoto?.place || cachedById?.place
  const description = await enrichAiPlaceDescription({
    title,
    currentDescription: input.currentDescription,
    website,
    address: placeForDesc?.address,
    types: placeForDesc?.types,
    name: placeForDesc?.name || title,
  })

  return {
    ok: true,
    placeId,
    photoUrl: genuineCommunityPhotoUrl(photo.photoUrl) || null,
    website,
    description,
    source: photo.source,
  }
}
