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
