/**
 * Build a Google Maps search URL for navigation / opening a place.
 * Prefer coordinates; otherwise fall back to a place name string.
 */
import { Capacitor } from "@capacitor/core"

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

export function isNativeCapacitor(): boolean {
  if (typeof window === "undefined") return false
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

/**
 * Open an http(s) URL without replacing the Mappo screen on ordinary web.
 *
 * Android Capacitor WebView ignores window.open(..., "noopener,noreferrer"),
 * so native uses a same-document assign. Capacitor intercepts off-origin
 * http(s) and launches the system browser instead of navigating the WebView.
 */
export function openExternalUrl(url: string) {
  if (typeof window === "undefined") return
  const href = String(url || "").trim()
  if (!href) return

  if (isNativeCapacitor()) {
    window.location.assign(href)
    return
  }

  window.open(href, "_blank", "noopener,noreferrer")
}

export function openGoogleMapsNavigation(opts: Parameters<typeof buildGoogleMapsSearchUrl>[0]) {
  if (typeof window === "undefined") return
  openExternalUrl(buildGoogleMapsSearchUrl(opts))
}
