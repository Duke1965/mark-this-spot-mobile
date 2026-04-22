"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import DraftExitDialog from "./DraftExitDialog"

const DRAFT_KEY = "pinit-postcard-draft-v1"

type PendingNav = { kind: "callback"; go: () => void } | { kind: "browser_back" }

function hasActiveDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return false
    // If it can't parse, still treat it as an active draft so user can discard it.
    try {
      const parsed = JSON.parse(raw) as any
      if (parsed && typeof parsed === "object") return true
    } catch {
      return true
    }
    return true
  } catch {
    return false
  }
}

export function usePostcardExit({
  router,
  interceptBrowserBack = true,
}: {
  router: AppRouterInstance
  interceptBrowserBack?: boolean
}) {
  const [exitOpen, setExitOpen] = useState(false)
  const pendingRef = useRef<PendingNav | null>(null)
  const allowBrowserBackRef = useRef(false)

  const currentUrl = useMemo(() => {
    if (typeof window === "undefined") return ""
    return `${window.location.pathname}${window.location.search}${window.location.hash}`
  }, [])

  const handleExit = useCallback((next: () => void) => {
    if (hasActiveDraft()) {
      pendingRef.current = { kind: "callback", go: next }
      setExitOpen(true)
      return
    }
    next()
  }, [])

  useEffect(() => {
    if (!interceptBrowserBack) return
    if (typeof window === "undefined") return

    const onPopState = () => {
      if (allowBrowserBackRef.current) return

      const nextUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`
      if (nextUrl === currentUrl) return

      // User is leaving this screen via browser/mobile back.
      if (!hasActiveDraft()) return

      // Immediately restore this screen, then ask.
      try {
        router.replace(currentUrl)
      } catch {
        // ignore
      }

      pendingRef.current = { kind: "browser_back" }
      setExitOpen(true)
    }

    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [interceptBrowserBack, router, currentUrl])

  const clearDraft = () => {
    try {
      sessionStorage.removeItem(DRAFT_KEY)
    } catch {
      // ignore
    }
  }

  const proceed = () => {
    const pending = pendingRef.current
    pendingRef.current = null
    if (!pending) return

    if (pending.kind === "callback") {
      pending.go()
      return
    }

    if (pending.kind === "browser_back") {
      allowBrowserBackRef.current = true
      try {
        window.history.back()
      } finally {
        // Let the back complete; then reset.
        window.setTimeout(() => {
          allowBrowserBackRef.current = false
        }, 0)
      }
    }
  }

  const exitDialog = (
    <DraftExitDialog
      open={exitOpen}
      onSave={() => {
        setExitOpen(false)
        proceed()
      }}
      onDiscard={() => {
        clearDraft()
        setExitOpen(false)
        proceed()
      }}
      onCancel={() => {
        pendingRef.current = null
        setExitOpen(false)
      }}
    />
  )

  return { handleExit, exitDialog }
}

