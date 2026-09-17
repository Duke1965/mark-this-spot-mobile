import {
  checkAndIncrementGoogleDailyLimit,
  getCachedGooglePlaceById,
  getCachedGooglePlaceByLatLon,
} from "@/lib/cache/placeCache"
import { hintMatches, placeDetails, textSearch } from "@/lib/google/googlePlaces"
import { resolveGooglePlacePhoto } from "@/lib/google/resolveGooglePlacePhoto"
import { genuineCommunityPhotoUrl } from "@/lib/recommendations/communityPhoto"

const CLOSED_PERMANENTLY = "CLOSED_PERMANENTLY"
const MAX_MATCH_DISTANCE_M = 250

export type AiGoogleIdentityResult =
  | {
      ok: true
      placeId: string
      photoUrl: string | null
      website?: string
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

/**
 * Cache-first Google identity for an already-selected AI recommendation.
 * Geo-cache is used only when the cached name matches the rec title.
 * Otherwise one Places Text Search (textQuery = title, location bias).
 * A Nearby-selected POI is never accepted merely because it is close.
 */
export async function resolveAiGoogleIdentity(input: {
  title: string
  lat: number
  lng: number
}): Promise<AiGoogleIdentityResult> {
  const title = String(input.title || "").trim()
  const lat = Number(input.lat)
  const lng = Number(input.lng)
  if (!title || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, reason: "invalid" }
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

  return {
    ok: true,
    placeId,
    photoUrl: genuineCommunityPhotoUrl(photo.photoUrl) || null,
    website: photo.website || cachedWebsite || undefined,
    source: photo.source,
  }
}
