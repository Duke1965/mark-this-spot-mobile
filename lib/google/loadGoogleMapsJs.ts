export type GoogleLatLngLiteral = { lat: number; lng: number }

export type GoogleMapInstance = {
  setCenter: (pos: GoogleLatLngLiteral) => void
  panTo: (pos: GoogleLatLngLiteral) => void
  setZoom: (zoom: number) => void
  setOptions: (opts: Record<string, unknown>) => void
  getDiv?: () => HTMLElement
}

export type GoogleMarkerInstance = {
  setPosition: (pos: GoogleLatLngLiteral) => void
  getPosition: () => { lat: () => number; lng: () => number } | null
  setMap: (map: GoogleMapInstance | null) => void
  addListener: (event: string, handler: () => void) => unknown
}

export type GoogleOverlayViewInstance = {
  setMap: (map: GoogleMapInstance | null) => void
  getPanes: () => { overlayMouseTarget?: HTMLElement } | null
  getProjection: () => {
    fromLatLngToDivPixel: (latLng: unknown) => { x: number; y: number } | null
  } | null
}

export type GoogleOverlayViewConstructor = (new () => GoogleOverlayViewInstance) & {
  preventMapHitsAndGesturesFrom?: (el: HTMLElement) => void
  preventMapHitsFrom?: (el: HTMLElement) => void
}

export type GoogleMapsNs = {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => GoogleMapInstance
  Marker: new (opts: Record<string, unknown>) => GoogleMarkerInstance
  OverlayView: GoogleOverlayViewConstructor
  LatLng: new (lat: number, lng: number) => unknown
  event: {
    clearInstanceListeners: (instance: unknown) => void
    addListener: (instance: unknown, event: string, handler: () => void) => unknown
    addListenerOnce?: (instance: unknown, event: string, handler: () => void) => unknown
    trigger: (instance: unknown, event: string) => void
  }
}

const SCRIPT_ATTR = "data-mappo-google-maps"
let googleMapsLoadPromise: Promise<GoogleMapsNs> | null = null

export function getGoogleMaps(): GoogleMapsNs | null {
  if (typeof window === "undefined") return null
  const maps = (window as unknown as { google?: { maps?: GoogleMapsNs } }).google?.maps
  if (!maps?.Map || !maps?.Marker || !maps?.event || !maps?.OverlayView || !maps?.LatLng) return null
  return maps
}

export function loadGoogleMapsJs(apiKey: string): Promise<GoogleMapsNs> {
  const existing = getGoogleMaps()
  if (existing) return Promise.resolve(existing)
  if (googleMapsLoadPromise) return googleMapsLoadPromise

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    const already = document.querySelector(`script[${SCRIPT_ATTR}]`) as HTMLScriptElement | null
    const onReady = () => {
      const maps = getGoogleMaps()
      if (maps) resolve(maps)
      else reject(new Error("Google Maps loaded but API is unavailable"))
    }

    if (already) {
      if (getGoogleMaps()) {
        onReady()
        return
      }
      already.addEventListener("load", onReady)
      already.addEventListener("error", () => reject(new Error("Failed to load Google Maps")))
      return
    }

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`
    script.async = true
    script.defer = true
    script.setAttribute(SCRIPT_ATTR, "true")
    script.onload = onReady
    script.onerror = () => {
      googleMapsLoadPromise = null
      reject(new Error("Failed to load Google Maps"))
    }
    document.head.appendChild(script)
  })

  return googleMapsLoadPromise
}
