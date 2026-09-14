/** Session handoff: open Library on a specific tab after navigating to `/`. */
export const LIBRARY_OPEN_TAB_KEY = "pinit-library-open-tab-v1"

export type LibraryOpenTab = "pins" | "saved" | "postcards" | "recommended"

export function requestOpenLibraryTab(tab: LibraryOpenTab) {
  try {
    sessionStorage.setItem(LIBRARY_OPEN_TAB_KEY, tab)
  } catch {
    // ignore
  }
}

export function consumeOpenLibraryTab(): LibraryOpenTab | null {
  try {
    const tab = sessionStorage.getItem(LIBRARY_OPEN_TAB_KEY)
    if (tab === "pins" || tab === "saved" || tab === "postcards" || tab === "recommended") {
      sessionStorage.removeItem(LIBRARY_OPEN_TAB_KEY)
      return tab
    }
  } catch {
    // ignore
  }
  return null
}
