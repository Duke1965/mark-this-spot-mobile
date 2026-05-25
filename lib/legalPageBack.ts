import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"

export const LEGAL_FROM_ACCOUNT_PARAM = "account"
export const LEGAL_RETURN_SESSION_KEY = "pinit-legal-return"

export function isLegalOpenedFromAccount(search: string): boolean {
  return new URLSearchParams(search).get("from") === LEGAL_FROM_ACCOUNT_PARAM
}

export function markLegalReturnToAccount(): void {
  try {
    sessionStorage.setItem(LEGAL_RETURN_SESSION_KEY, "1")
  } catch {
    /* ignore */
  }
}

export function consumeLegalReturnToAccount(): boolean {
  try {
    if (sessionStorage.getItem(LEGAL_RETURN_SESSION_KEY) !== "1") return false
    sessionStorage.removeItem(LEGAL_RETURN_SESSION_KEY)
    return true
  } catch {
    return false
  }
}

/** Back from Terms/Privacy: return to Account when opened with ?from=account, else history or Home. */
export function navigateBackFromLegalPage(router: AppRouterInstance): void {
  if (typeof window === "undefined") {
    router.push("/")
    return
  }

  if (isLegalOpenedFromAccount(window.location.search)) {
    markLegalReturnToAccount()
    router.push("/")
    return
  }

  try {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push("/")
    }
  } catch {
    router.push("/")
  }
}
