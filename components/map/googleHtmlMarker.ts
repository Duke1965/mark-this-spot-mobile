import type { GoogleMapInstance, GoogleMapsNs, GoogleOverlayViewInstance } from "@/lib/google/loadGoogleMapsJs"

export type GoogleHtmlMarkerHandle = {
  remove: () => void
  setLngLat: (lngLat: [number, number]) => void
  setPosition: (pos: { lat: number; lng: number }) => void
}

/**
 * HTML overlay marker (same approach as Mapbox Marker({ element })).
 * Element is centered on the coordinate; optional data-anchor-offset-x shifts it.
 */
export function createGoogleHtmlMarker(
  maps: GoogleMapsNs,
  map: GoogleMapInstance,
  input: { lat: number; lng: number; element: HTMLElement }
): GoogleHtmlMarkerHandle {
  maps.OverlayView.preventMapHitsAndGesturesFrom?.(input.element)

  const OverlayView = maps.OverlayView as unknown as { new (): GoogleOverlayViewInstance }
  class HtmlMarker extends OverlayView {
    lat: number
    lng: number
    element: HTMLElement

    constructor() {
      super()
      this.lat = input.lat
      this.lng = input.lng
      this.element = input.element
      this.element.style.position = "absolute"
    }

    onAdd() {
      const panes = this.getPanes()
      panes?.overlayMouseTarget?.appendChild(this.element)
    }

    draw() {
      const projection = this.getProjection()
      if (!projection) return
      const point = projection.fromLatLngToDivPixel(new maps.LatLng(this.lat, this.lng))
      if (!point) return
      const ox = Number(this.element.dataset.anchorOffsetX || 0)
      this.element.style.left = `${point.x}px`
      this.element.style.top = `${point.y}px`
      this.element.style.transform = `translate(calc(-50% + ${ox}px), -50%)`
    }

    onRemove() {
      this.element.remove()
    }
  }

  const overlay = new HtmlMarker()
  overlay.setMap(map)

  return {
    remove: () => overlay.setMap(null),
    setLngLat: ([lng, lat]) => {
      overlay.lat = lat
      overlay.lng = lng
      overlay.draw()
    },
    setPosition: (pos) => {
      overlay.lat = pos.lat
      overlay.lng = pos.lng
      overlay.draw()
    },
  }
}
