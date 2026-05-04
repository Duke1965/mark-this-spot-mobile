/**
 * Build a Google Maps search URL for navigation / opening a place.
 * Prefer coordinates; otherwise fall back to a place name string.
 */
export function buildGoogleMapsSearchUrl(opts: {
  latitude?: number | null
  longitude?: number | null
  placeName?: string | null
}) {
  const lat = Number(opts.latitude)
  const lng = Number(opts.longitude)
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`
  }
  const q = String(opts.placeName || "").trim() || "Place"
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

export function openGoogleMapsNavigation(opts: Parameters<typeof buildGoogleMapsSearchUrl>[0]) {
  if (typeof window === "undefined") return
  const url = buildGoogleMapsSearchUrl(opts)
  window.open(url, "_blank", "noopener,noreferrer")
}
