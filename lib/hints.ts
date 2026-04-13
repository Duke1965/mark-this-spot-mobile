export const HINTS_ENABLED_KEY = "pinit-hints-enabled-v1"

export function getHintsEnabled(): boolean {
  try {
    if (typeof window === "undefined") return true
    const raw = localStorage.getItem(HINTS_ENABLED_KEY)
    if (raw === null) return true
    return raw === "1" || raw === "true"
  } catch {
    return true
  }
}

export function setHintsEnabled(enabled: boolean) {
  try {
    if (typeof window === "undefined") return
    localStorage.setItem(HINTS_ENABLED_KEY, enabled ? "1" : "0")
  } catch {
    // ignore
  }
}

