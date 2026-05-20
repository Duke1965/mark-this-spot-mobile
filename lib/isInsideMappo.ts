import { Capacitor } from "@capacitor/core"

/** True when the viewer is in the Mappo native app or installed PWA shell. */
export function isInsideMappo(): boolean {
  if (typeof window === "undefined") return false

  try {
    if (Capacitor.isNativePlatform()) return true
  } catch {
    // ignore
  }

  if (window.matchMedia?.("(display-mode: standalone)")?.matches) return true

  if ((navigator as Navigator & { standalone?: boolean }).standalone === true) {
    return true
  }

  return false
}
