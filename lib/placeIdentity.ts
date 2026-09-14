import type { PinData } from "@/lib/types"

/**
 * Normalize a Google Place ID for exact Saved dedupe.
 * Trims whitespace and strips a leading `places/` resource prefix when present.
 */
export function normalizeGooglePlaceId(raw: string): string {
  let id = raw.trim()
  if (id.toLowerCase().startsWith("places/")) {
    id = id.slice("places/".length).trim()
  }
  return id
}

/**
 * Authoritative Google Place identity for Saved dedupe.
 * Uses googlePlaceId only — never historical bare placeId (may be synthetic).
 * Returns null when missing so Save skips automatic dedupe rather than
 * incorrectly matching unrelated pins.
 */
export function getGooglePlaceIdentity(pin: Pick<PinData, "googlePlaceId">): string | null {
  const google = typeof pin.googlePlaceId === "string" ? pin.googlePlaceId : ""
  const normalized = normalizeGooglePlaceId(google)
  return normalized || null
}
