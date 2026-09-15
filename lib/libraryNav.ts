/** Session handoff: open Library on a specific tab after navigating to `/`. */
export const LIBRARY_OPEN_TAB_KEY = "pinit-library-open-tab-v1"

export type LibraryOpenTab = "pins" | "saved" | "postcards" | "recommended"

function isLibraryOpenTab(value: string | null): value is LibraryOpenTab {
  return value === "pins" || value === "saved" || value === "postcards" || value === "recommended"
}

export function requestOpenLibraryTab(tab: LibraryOpenTab) {
  try {
    sessionStorage.setItem(LIBRARY_OPEN_TAB_KEY, tab)
  } catch {
    // ignore
  }
}

/** True while Done (or similar) asked Home to open Library — do not force map restore. */
export function hasPendingOpenLibraryTab(): boolean {
  try {
    return isLibraryOpenTab(sessionStorage.getItem(LIBRARY_OPEN_TAB_KEY))
  } catch {
    return false
  }
}

export function consumeOpenLibraryTab(): LibraryOpenTab | null {
  try {
    const tab = sessionStorage.getItem(LIBRARY_OPEN_TAB_KEY)
    if (isLibraryOpenTab(tab)) {
      sessionStorage.removeItem(LIBRARY_OPEN_TAB_KEY)
      return tab
    }
  } catch {
    // ignore
  }
  return null
}

/** Session handoff: reopen Pin Results after leaving a pin-origin postcard. */
export const PIN_RESULTS_HANDOFF_KEY = "pinit-open-pin-results-v1"

export function requestOpenPinResults(pinId: string) {
  const id = pinId.trim()
  if (!id) return
  try {
    sessionStorage.setItem(PIN_RESULTS_HANDOFF_KEY, id)
  } catch {
    // ignore
  }
}

export function hasPendingOpenPinResults(): boolean {
  try {
    const id = sessionStorage.getItem(PIN_RESULTS_HANDOFF_KEY)
    return typeof id === "string" && id.trim().length > 0
  } catch {
    return false
  }
}

export function consumeOpenPinResults(): string | null {
  try {
    const id = sessionStorage.getItem(PIN_RESULTS_HANDOFF_KEY)
    if (typeof id === "string" && id.trim()) {
      sessionStorage.removeItem(PIN_RESULTS_HANDOFF_KEY)
      return id.trim()
    }
  } catch {
    // ignore
  }
  return null
}
