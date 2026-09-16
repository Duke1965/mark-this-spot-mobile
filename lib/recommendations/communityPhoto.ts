const PLACEHOLDER_MARKERS = [
  "pinit-placeholder.jpg",
  "placeholder.svg",
  "placeholder.jpg",
]

export function genuineCommunityPhotoUrl(url: unknown): string | undefined {
  if (typeof url !== "string") return undefined
  const trimmed = url.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return undefined
  const lower = trimmed.toLowerCase()
  if (PLACEHOLDER_MARKERS.some((marker) => lower.includes(marker))) return undefined
  if (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    (trimmed.startsWith("/") && !trimmed.startsWith("//"))
  ) {
    return trimmed.slice(0, 2000)
  }
  return undefined
}

function trimId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

/** Recover a Google/place id from stored fields or existing placeKey=place:<id>. */
export function googlePlaceIdFromRecommendationFields(input: {
  googlePlaceId?: unknown
  placeId?: unknown
  placeKey?: unknown
}): string | undefined {
  const direct = trimId(input.googlePlaceId) || trimId(input.placeId)
  if (direct) return direct

  const placeKey = typeof input.placeKey === "string" ? input.placeKey.trim() : ""
  if (!placeKey.startsWith("place:")) return undefined
  const id = placeKey.slice("place:".length).trim()
  if (!id || id.startsWith("coord:")) return undefined
  return id
}
