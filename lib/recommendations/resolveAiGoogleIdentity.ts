import {
  checkAndIncrementGoogleDailyLimit,
  getCachedGooglePlaceById,
  getCachedGooglePlaceByLatLon,
} from "@/lib/cache/placeCache"
import { hintMatches, nearbySearch, placeDetails } from "@/lib/google/googlePlaces"
import { resolveGooglePlacePhoto } from "@/lib/google/resolveGooglePlacePhoto"
import { genuineCommunityPhotoUrl } from "@/lib/recommendations/communityPhoto"

const CLOSED_PERMANENTLY = "CLOSED_PERMANENTLY"

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
  return `ai-identity:${lat.toFixed(4)}:${lng.toFixed(4)}:${name}`
}

/**
 * Cache-first Google identity for an already-selected AI recommendation.
 * Geo-cache is used only when the cached name matches the rec title.
 * Nearby is accepted only when hintMatches(title, googleName) is true.
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
    const limit = await checkAndIncrementGoogleDailyLimit({
      key: identityLimitKey(title, lat, lng),
      maxPerDay: 1,
    })
    if (!limit.allowed) {
      return { ok: false, reason: "limited" }
    }

    const sel = await nearbySearch({ lat, lon: lng, term: title })
    const picked = sel.selected
    if (!picked?.placeId || !hintMatches(title, picked.name)) {
      return { ok: false, reason: "no_match" }
    }
    if (isClosedPermanently(picked.businessStatus)) {
      return {
        ok: false,
        closedPermanently: true,
        reason: "closed_permanently",
        placeId: picked.placeId,
      }
    }
    placeId = picked.placeId
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
