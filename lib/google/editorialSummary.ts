import {
  getCachedGooglePlaceById,
  setCachedGooglePlace,
  type CachedGooglePlace,
} from "@/lib/cache/placeCache"
import { placeDetails, type GooglePlaceDetails } from "@/lib/google/googlePlaces"

/** Collapse whitespace only. Do not paraphrase or strip Google editorial text. */
export function usableEditorialSummary(text: string | undefined): string | undefined {
  const t = String(text || "")
    .replace(/\s+/g, " ")
    .trim()
  return t || undefined
}

export function editorialCacheFields(details: Pick<GooglePlaceDetails, "editorialSummary">): {
  editorialSummary?: string
  editorialSummaryChecked: true
} {
  const text = usableEditorialSummary(details.editorialSummary)
  return text
    ? { editorialSummary: text, editorialSummaryChecked: true }
    : { editorialSummaryChecked: true }
}

export function cacheNeedsEditorialSummaryCheck(place: CachedGooglePlace | undefined): boolean {
  if (!place) return true
  if (place.editorialSummaryChecked === true) return false
  return true
}

/**
 * Reuse cached editorialSummary when Place Details already requested it.
 * Old cache docs (no checked flag) may trigger one Details refresh, then persist checked.
 */
export async function ensureEditorialSummary(input: {
  placeId: string
  lat: number
  lon: number
}): Promise<{ editorialSummary?: string; fetched: boolean }> {
  const placeId = String(input.placeId || "").trim()
  const lat = Number(input.lat)
  const lon = Number(input.lon)
  if (!placeId || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { fetched: false }
  }

  const cached = await getCachedGooglePlaceById({ placeId })
  if (cached?.place && !cacheNeedsEditorialSummaryCheck(cached.place)) {
    return {
      editorialSummary: usableEditorialSummary(cached.place.editorialSummary),
      fetched: false,
    }
  }

  const existing = usableEditorialSummary(cached?.place?.editorialSummary)
  if (existing) {
    try {
      await setCachedGooglePlace({
        lat,
        lon,
        writeGeo: false,
        writeCoarseGeo: false,
        place: {
          place_id: placeId,
          lat,
          lon,
          source: "google",
          editorialSummary: existing,
          editorialSummaryChecked: true,
        },
      })
    } catch {
      // best-effort
    }
    return { editorialSummary: existing, fetched: false }
  }

  let details: GooglePlaceDetails | null = null
  try {
    details = await placeDetails(placeId)
  } catch {
    return { fetched: false }
  }
  if (!details?.placeId) {
    return { fetched: false }
  }

  const fields = editorialCacheFields(details)
  try {
    await setCachedGooglePlace({
      lat,
      lon,
      writeGeo: false,
      writeCoarseGeo: false,
      place: {
        place_id: details.placeId,
        name: details.name,
        address: details.formattedAddress,
        website: details.website,
        types: details.types,
        placeLat: details.location?.lat,
        placeLon: details.location?.lon,
        lat,
        lon,
        source: "google",
        businessStatus: details.businessStatus,
        ...fields,
      },
    })
  } catch {
    // best-effort
  }

  return { editorialSummary: fields.editorialSummary, fetched: true }
}
