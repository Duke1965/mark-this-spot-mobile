import { uploadToStorage } from "@/lib/pinEnrich/imageStore"
import {
  checkAndIncrementGoogleDailyLimit,
  getCachedGooglePlaceById,
  setCachedGooglePlace,
} from "@/lib/cache/placeCache"
import { fetchPhoto, hashPhotoRef, placeDetails } from "@/lib/google/googlePlaces"
import { genuineCommunityPhotoUrl } from "@/lib/recommendations/communityPhoto"

function firstCachedPhotoUrl(urls: unknown): string | undefined {
  if (!Array.isArray(urls)) return undefined
  for (const url of urls) {
    const genuine = genuineCommunityPhotoUrl(url)
    if (genuine) return genuine
  }
  return undefined
}

function photosEnabled(): boolean {
  return String(process.env.GOOGLE_ENABLE_PHOTOS || "true").toLowerCase() !== "false"
}

/**
 * Resolve one hosted Google photo for a known Place ID.
 * Cache hit with photos → no Google call. Miss → Details + first photo, then place_cache.
 */
export async function resolveGooglePlacePhoto(input: {
  placeId: string
  lat?: number
  lng?: number
  limiterKey?: string
}): Promise<{
  photoUrl: string | null
  source: "cache" | "google" | "none"
  businessStatus?: string
  website?: string
}> {
  const placeId = String(input.placeId || "").trim()
  if (!placeId) return { photoUrl: null, source: "none" }

  const cached = await getCachedGooglePlaceById({ placeId })
  const cachedUrl = firstCachedPhotoUrl(cached?.place?.photoStorageUrls)
  const cachedStatus =
    typeof cached?.place?.businessStatus === "string"
      ? cached.place.businessStatus.trim()
      : undefined
  const cachedWebsite =
    typeof cached?.place?.website === "string" ? cached.place.website.trim() : undefined
  if (cachedUrl) {
    return {
      photoUrl: cachedUrl,
      source: "cache",
      businessStatus: cachedStatus || undefined,
      website: cachedWebsite || undefined,
    }
  }

  if (!photosEnabled()) {
    return {
      photoUrl: null,
      source: "none",
      businessStatus: cachedStatus || undefined,
      website: cachedWebsite || undefined,
    }
  }

  const limiterKey = input.limiterKey || `rec-photo:${placeId}`
  const peek = await checkAndIncrementGoogleDailyLimit({
    key: limiterKey,
    maxPerDay: 1,
    increment: false,
  })
  if (!peek.allowed) {
    return {
      photoUrl: null,
      source: "none",
      businessStatus: cachedStatus || undefined,
      website: cachedWebsite || undefined,
    }
  }

  let details: Awaited<ReturnType<typeof placeDetails>>
  try {
    details = await placeDetails(placeId)
  } catch {
    return {
      photoUrl: null,
      source: "none",
      businessStatus: cachedStatus || undefined,
      website: cachedWebsite || undefined,
    }
  }
  if (!details?.placeId) {
    return {
      photoUrl: null,
      source: "none",
      businessStatus: cachedStatus || undefined,
      website: cachedWebsite || undefined,
    }
  }

  const lat =
    typeof input.lat === "number" && Number.isFinite(input.lat)
      ? input.lat
      : details.location?.lat
  const lng =
    typeof input.lng === "number" && Number.isFinite(input.lng)
      ? input.lng
      : details.location?.lon
  const hasCoords = typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng)

  const photos = Array.isArray(details.photos) ? details.photos : []
  const hostedPhotoUrls: string[] = []
  const first = photos[0]
  const closedPermanently = details.businessStatus === "CLOSED_PERMANENTLY"
  const hasUsablePhotoRef = !!first?.photoReference && !closedPermanently
  if (hasUsablePhotoRef) {
    try {
      const got = await fetchPhoto(first.photoReference, 1200)
      const ext = got.contentType.toLowerCase().includes("png")
        ? "png"
        : got.contentType.toLowerCase().includes("webp")
          ? "webp"
          : "jpg"
      const hash = hashPhotoRef(first.photoReference)
      const path = `place_cache/google/${details.placeId}/${hash}.${ext}`
      const url = await uploadToStorage(got.buffer, path, got.contentType)
      hostedPhotoUrls.push(url)
    } catch {
      // Keep going; identity can still be cached.
    }
  }

  const photoUrl = firstCachedPhotoUrl(hostedPhotoUrls) || null
  const definitiveResult = !!photoUrl || !hasUsablePhotoRef
  if (definitiveResult) {
    await checkAndIncrementGoogleDailyLimit({
      key: limiterKey,
      maxPerDay: 1,
    })
  }

  if (hasCoords) {
    try {
      await setCachedGooglePlace({
        lat,
        lon: lng,
        writeGeo: false,
        writeCoarseGeo: false,
        place: {
          place_id: details.placeId,
          name: details.name,
          address: details.formattedAddress,
          website: details.website,
          types: details.types,
          photoStorageUrls: hostedPhotoUrls,
          placeLat: details.location?.lat,
          placeLon: details.location?.lon,
          lat,
          lon: lng,
          source: "google",
          businessStatus: details.businessStatus,
        },
      })
    } catch {
      // Cache write is best-effort.
    }
  }

  return {
    photoUrl,
    source: photoUrl ? "google" : "none",
    businessStatus: details.businessStatus,
    website: details.website,
  }
}
