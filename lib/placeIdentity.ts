import type { PinData } from "@/lib/types"

/**
 * Authoritative Google Place identity for Saved dedupe.
 * Prefer googlePlaceId; fall back to placeId only where Identify/completion
 * writes the same Google source ID into both fields.
 */
export function getGooglePlaceIdentity(pin: Pick<PinData, "googlePlaceId" | "placeId">): string | null {
  const google = typeof pin.googlePlaceId === "string" ? pin.googlePlaceId.trim() : ""
  if (google) return google
  const placeId = typeof pin.placeId === "string" ? pin.placeId.trim() : ""
  return placeId || null
}
