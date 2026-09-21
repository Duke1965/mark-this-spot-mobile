import {
  checkAndIncrementGoogleDailyLimit,
  getCachedGooglePlaceById,
  type CachedGooglePlace,
} from "@/lib/cache/placeCache"
import {
  hintMatches,
  isMeaningfulDestinationPlace,
  nearbySearch,
  placeDetails,
  textSearch,
} from "@/lib/google/googlePlaces"
import { resolveGooglePlacePhoto } from "@/lib/google/resolveGooglePlacePhoto"
import { genuineCommunityPhotoUrl } from "@/lib/recommendations/communityPhoto"
import { getWebsiteMeta } from "@/lib/images/websiteMeta"
import { mergeTitleDescription } from "@/lib/pinEnrich/mergeTitleDescription"
import {
  buildDescription,
  isAddressLikeDescription,
  isWeakUpstreamTitle,
} from "@/lib/places/formatPlaceText"

const CLOSED_PERMANENTLY = "CLOSED_PERMANENTLY"
const MAX_MATCH_DISTANCE_M = 250

export type AiGoogleIdentityResult =
  | {
      ok: true
      placeId: string
      title: string
      category?: string
      lat?: number
      lng?: number
      address?: string
      photoUrl: string | null
      website?: string
      businessStatus?: string
      description?: string
      source: "cache" | "google" | "none"
      resolver: "place_id" | "place_cache" | "nearby" | "text"
      distanceMeters?: number
    }
  | {
      ok: false
      closedPermanently?: boolean
      reason: string
      placeId?: string
    }

function envInt(name: string, def: number): number {
  const raw = process.env[name]
  if (!raw) return def
  const n = Number(raw)
  return Number.isFinite(n) ? Math.floor(n) : def
}

function isClosedPermanently(status: string | undefined): boolean {
  return String(status || "").trim().toUpperCase() === CLOSED_PERMANENTLY
}

/**
 * v3: coordinate Nearby is primary. Do not reuse
 * `ai-identity:` (old Nearby) or `ai-identity-text:` (title Text Search)
 * docs — those can sticky-miss "Main Street" and block the new strategy.
 */
function identityLimitKey(lat: number, lng: number): string {
  return `ai-identity-nearby-v3:${lat.toFixed(4)}:${lng.toFixed(4)}`
}

/** Same mapping as pin-intel; local copy so Quick Pin is not refactored. */
function googleTypesToCategory(types?: string[]): string | undefined {
  const t = (types || []).map((s) => String(s || "").toLowerCase())
  if (t.includes("museum")) return "entertainment.museum"
  if (t.includes("art_gallery")) return "entertainment.culture.gallery"
  if (t.includes("church") || t.includes("place_of_worship")) return "building.place_of_worship"
  if (t.includes("tourist_attraction")) return "tourism.attraction"
  if (t.includes("park")) return "leisure.park"
  if (t.includes("winery")) return "production.winery"
  if (t.includes("restaurant")) return "catering.restaurant"
  if (t.includes("cafe")) return "catering.cafe"
  if (t.includes("bar")) return "catering.bar"
  if (t.includes("lodging")) return "accommodation"
  return undefined
}

function localityFromFormattedAddress(addr: string | undefined): string | undefined {
  const a = (addr || "").trim()
  if (!a) return undefined
  const parts = a.split(",").map((p) => p.trim()).filter(Boolean)
  if (parts.length < 2) return undefined
  return parts.length >= 3 ? parts[1] : parts[0]
}

function phase1IdentityLog(payload: Record<string, unknown>): void {
  try {
    console.log("[TEMP Phase1 AI identity]", payload)
  } catch {
    // ignore
  }
}

function coordsFromCachedPlace(place: CachedGooglePlace | undefined): {
  lat?: number
  lng?: number
} {
  if (!place) return {}
  const placeLat = Number(place.placeLat)
  const placeLon = Number(place.placeLon)
  if (Number.isFinite(placeLat) && Number.isFinite(placeLon)) {
    return { lat: placeLat, lng: placeLon }
  }
  const lat = Number(place.lat)
  const lon = Number(place.lon)
  if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lng: lon }
  return {}
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

async function finalizeResolvedPlace(input: {
  placeId: string
  titleHint: string
  lat: number
  lng: number
  website?: string
  currentDescription?: string
  resolver: "place_id" | "place_cache" | "nearby" | "text"
  distanceMeters?: number
  requireMeaningful: boolean
}): Promise<AiGoogleIdentityResult> {
  const { placeId } = input
  let cachedById = await getCachedGooglePlaceById({ placeId })
  let cachedWebsite =
    typeof cachedById?.place?.website === "string"
      ? cachedById.place.website.trim()
      : undefined
  let cachedStatus =
    typeof cachedById?.place?.businessStatus === "string"
      ? cachedById.place.businessStatus.trim()
      : undefined

  if (isClosedPermanently(cachedStatus)) {
    return { ok: false, closedPermanently: true, reason: "closed_permanently", placeId }
  }

  const photo = await resolveGooglePlacePhoto({
    placeId,
    lat: input.lat,
    lng: input.lng,
    limiterKey: `rec-photo:${placeId}`,
  })
  const status = photo.businessStatus || cachedStatus
  if (isClosedPermanently(status)) {
    return { ok: false, closedPermanently: true, reason: "closed_permanently", placeId }
  }

  cachedById = (await getCachedGooglePlaceById({ placeId })) || cachedById
  let name = String(cachedById?.place?.name || "").trim()
  let types = Array.isArray(cachedById?.place?.types) ? cachedById!.place.types : undefined
  let address =
    typeof cachedById?.place?.address === "string" ? cachedById.place.address.trim() : undefined
  let coords = coordsFromCachedPlace(cachedById?.place)
  if (!cachedWebsite && photo.website) cachedWebsite = photo.website
  if (!cachedWebsite && typeof input.website === "string" && input.website.trim().startsWith("http")) {
    cachedWebsite = input.website.trim()
  }

  if (!name || !types || !address || !status) {
    const details = await placeDetails(placeId)
    if (isClosedPermanently(details?.businessStatus)) {
      return { ok: false, closedPermanently: true, reason: "closed_permanently", placeId }
    }
    if (!name) name = String(details?.name || "").trim()
    if (!types && Array.isArray(details?.types)) types = details.types
    if (!address) address = details?.formattedAddress?.trim() || undefined
    if (!cachedWebsite && details?.website) cachedWebsite = details.website
    if (
      details?.location &&
      Number.isFinite(details.location.lat) &&
      Number.isFinite(details.location.lon)
    ) {
      coords = { lat: details.location.lat, lng: details.location.lon }
    }
  }

  if (input.requireMeaningful && !isMeaningfulDestinationPlace(types)) {
    phase1IdentityLog({
      originalTitle: input.titleHint,
      resolver: input.resolver,
      candidateSelected: false,
      reason: "details_not_meaningful",
      googleName: name || null,
      googlePlaceId: placeId,
      distanceMeters:
        typeof input.distanceMeters === "number" ? Math.round(input.distanceMeters) : undefined,
    })
    return { ok: false, reason: "no_match", placeId }
  }

  const googleTitle = name || input.titleHint
  const description = await enrichAiPlaceDescription({
    title: googleTitle,
    currentDescription: input.currentDescription,
    website: cachedWebsite,
    address,
    types,
    name: googleTitle,
  })

  phase1IdentityLog({
    originalTitle: input.titleHint,
    nearbyAttempted: input.resolver === "nearby",
    candidateSelected: true,
    selectedGoogleName: googleTitle,
    selectedGooglePlaceId: placeId,
    distanceMeters:
      typeof input.distanceMeters === "number" ? Math.round(input.distanceMeters) : undefined,
    finalTitle: googleTitle,
    resolver: input.resolver,
  })

  return {
    ok: true,
    placeId,
    title: googleTitle,
    category: googleTypesToCategory(types),
    lat: coords.lat,
    lng: coords.lng,
    address,
    photoUrl: genuineCommunityPhotoUrl(photo.photoUrl) || null,
    website: cachedWebsite || undefined,
    businessStatus: status || cachedStatus || undefined,
    description,
    source: photo.source,
    resolver: input.resolver,
    distanceMeters:
      typeof input.distanceMeters === "number" ? Math.round(input.distanceMeters) : undefined,
  }
}

/**
 * Coordinate-first Google identity for an already-selected AI recommendation.
 *
 * Order:
 *   trusted Google Place ID → cache/details for that ID only
 *     → Nearby Search by coordinates (geo-cache must not skip this)
 *     → among plausible meaningful POIs, prefer a strong-title name match
 *       inside the existing pin-intel radius; otherwise closest meaningful
 *     → Place Details / photo / place_cache by Place ID
 *     → optional Text Search when the upstream title is strong and specific
 *     → unresolved
 *
 * Weak titles such as "Main Street" are never a hard Google identity filter.
 * Coordinate geo-cache is not identity-authoritative without a trusted Place ID.
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

  const weakTitle = isWeakUpstreamTitle(title)
  const strongTitle = !weakTitle

  // Already-identified rec: canonical Google fields from cache/details. No Nearby.
  if (knownPlaceId) {
    return finalizeResolvedPlace({
      placeId: knownPlaceId,
      titleHint: title,
      lat,
      lng,
      website: input.website,
      currentDescription: input.currentDescription,
      resolver: "place_id",
      requireMeaningful: false,
    })
  }

  // No trusted Place ID: Nearby must run. place_cache_geo must not bind identity.
  // After Nearby selects a Place ID, finalizeResolvedPlace reuses place_cache Details/photos.

  const peek = await checkAndIncrementGoogleDailyLimit({
    key: identityLimitKey(lat, lng),
    maxPerDay: 1,
    increment: false,
  })
  if (!peek.allowed) {
    phase1IdentityLog({
      originalTitle: title,
      nearbyAttempted: false,
      candidateSelected: false,
      reason: "limited",
    })
    return { ok: false, reason: "limited" }
  }

  const radiusBase = Math.max(10, Math.min(250, envInt("GOOGLE_PIN_INTEL_RADIUS_METERS", 80)))
  const maxDistanceM = Math.max(
    25,
    Math.min(1000, envInt("GOOGLE_PIN_INTEL_MAX_DISTANCE_METERS", MAX_MATCH_DISTANCE_M))
  )
  const radiusMeters = Math.max(radiusBase, Math.min(250, maxDistanceM))
  const chainMaxM = Math.max(
    10,
    Math.min(500, envInt("GOOGLE_PIN_INTEL_MAX_DISTANCE_METERS_CHAIN", 100))
  )

  let googleSearchAttempted = false
  let nearbyReason: string | undefined

  try {
    googleSearchAttempted = true
    phase1IdentityLog({
      originalTitle: title,
      nearbyAttempted: true,
      weakTitle,
      radiusMeters,
      maxDistanceM,
    })
    const nearby = await nearbySearch({
      lat,
      lon: lng,
      radiusMeters,
      maxDistanceMeters: maxDistanceM,
      maxDistanceMetersChain: chainMaxM,
      preferClosestMeaningful: true,
      term: strongTitle ? title : undefined,
    })
    nearbyReason = nearby.reasonIfNotUsed
    const selected = nearby.selected
    if (selected?.placeId && isMeaningfulDestinationPlace(selected.types)) {
      await checkAndIncrementGoogleDailyLimit({
        key: identityLimitKey(lat, lng),
        maxPerDay: 1,
      })
      if (isClosedPermanently(selected.businessStatus)) {
        return {
          ok: false,
          closedPermanently: true,
          reason: "closed_permanently",
          placeId: selected.placeId,
        }
      }
      return finalizeResolvedPlace({
        placeId: selected.placeId,
        titleHint: title,
        lat,
        lng,
        website: input.website,
        currentDescription: input.currentDescription,
        resolver: "nearby",
        distanceMeters: selected.distanceMeters,
        requireMeaningful: true,
      })
    }
    phase1IdentityLog({
      originalTitle: title,
      nearbyAttempted: true,
      candidateSelected: false,
      reason: nearbyReason || "no_match",
    })
  } catch {
    phase1IdentityLog({
      originalTitle: title,
      nearbyAttempted: true,
      candidateSelected: false,
      reason: "error",
    })
    return { ok: false, reason: "error" }
  }

  if (strongTitle) {
    let search: Awaited<ReturnType<typeof textSearch>>
    try {
      googleSearchAttempted = true
      search = await textSearch({
        textQuery: title,
        lat,
        lon: lng,
      })
    } catch {
      if (googleSearchAttempted) {
        await checkAndIncrementGoogleDailyLimit({
          key: identityLimitKey(lat, lng),
          maxPerDay: 1,
        })
      }
      return { ok: false, reason: "error" }
    }
    if (search.ok) {
      const matched = search.candidates
        .filter(
          (c) =>
            !!c.placeId &&
            hintMatches(title, c.name) &&
            Number.isFinite(c.distanceMeters) &&
            c.distanceMeters <= MAX_MATCH_DISTANCE_M
        )
        .sort((a, b) => a.distanceMeters - b.distanceMeters)[0]

      if (matched?.placeId) {
        await checkAndIncrementGoogleDailyLimit({
          key: identityLimitKey(lat, lng),
          maxPerDay: 1,
        })
        if (isClosedPermanently(matched.businessStatus)) {
          return {
            ok: false,
            closedPermanently: true,
            reason: "closed_permanently",
            placeId: matched.placeId,
          }
        }
        return finalizeResolvedPlace({
          placeId: matched.placeId,
          titleHint: title,
          lat,
          lng,
          website: input.website,
          currentDescription: input.currentDescription,
          resolver: "text",
          distanceMeters: matched.distanceMeters,
          requireMeaningful: true,
        })
      }
    }
  }

  if (googleSearchAttempted) {
    await checkAndIncrementGoogleDailyLimit({
      key: identityLimitKey(lat, lng),
      maxPerDay: 1,
    })
  }

  return { ok: false, reason: nearbyReason?.startsWith("google_nearby_status:") && nearbyReason !== "google_nearby_status:ZERO_RESULTS" ? "error" : "no_match" }
}
