"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { usePinStorage } from "@/hooks/usePinStorage"
import type { PinData } from "@/lib/types"

const ALLOWED_TEMPLATES = new Set(["template-1", "template-2", "template-3", "template-4"])
const DRAFT_KEY = "pinit-postcard-draft-v1"

async function normalizeImageToJpegDataUrlFromBlob(blob: Blob) {
  const MAX_DIM = 1600
  const JPEG_QUALITY = 0.86
  const objectUrl = URL.createObjectURL(blob)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.decoding = "async"
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error("Failed to load image"))
      el.src = objectUrl
    })

    const w = img.naturalWidth || img.width || 0
    const h = img.naturalHeight || img.height || 0
    if (!w || !h) throw new Error("Invalid image dimensions")

    const scale = Math.min(1, MAX_DIM / Math.max(w, h))
    const outW = Math.max(1, Math.round(w * scale))
    const outH = Math.max(1, Math.round(h * scale))

    const canvas = document.createElement("canvas")
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas not available")
    ctx.drawImage(img, 0, 0, outW, outH)

    const outBlob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY))
    if (!outBlob) return canvas.toDataURL("image/jpeg", JPEG_QUALITY)

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(typeof r.result === "string" ? r.result : "")
      r.onerror = () => reject(new Error("Failed to encode image"))
      r.readAsDataURL(outBlob)
    })
    if (!dataUrl) throw new Error("Failed to encode image")
    return dataUrl
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export default function PostcardClient({
  pinId,
  template,
  imageUrl,
  title,
  description,
  onBack,
}: {
  pinId?: string
  template?: string
  imageUrl?: string | null
  title?: string
  description?: string
  onBack?: () => void
}) {
  const router = useRouter()
  const { pins } = usePinStorage()
  const [fatalError, setFatalError] = useState<string | null>(null)

  const resolvedTemplate = ALLOWED_TEMPLATES.has(String(template)) ? String(template) : "template-1"

  const pin: PinData | null = useMemo(() => {
    if (!pinId) return null
    return pins.find((p) => p.id === pinId) || null
  }, [pinId, pins])

  const resolvedTitle = (title || pin?.title || pin?.locationName || "").trim() || (pinId ? "Saved Place" : "My Postcard")
  const resolvedDescription = (description || pin?.description || "").trim() || (pinId ? "A spot worth remembering." : "")
  const resolvedImageUrl =
    imageUrl ||
    pin?.mediaUrl ||
    pin?.additionalPhotos?.find((p) => p?.url && p.url !== "/pinit-placeholder.jpg")?.url ||
    null

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Pin-based postcard flow should reuse the standard postcard creation pipeline.
        if (!pinId) return
        if (!pin) return
        if (!resolvedImageUrl) return
        setFatalError(null)

        // Always produce a safe, uploadable draft image.
        // Never store a raw external URL in the draft (it can break Send with "Failed to fetch").
        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(resolvedImageUrl)}`
        const resp = await fetch(proxyUrl, { cache: "no-store" })
        if (!resp.ok) throw new Error("We couldn’t load that pin photo for a postcard.")
        const blob = await resp.blob()
        const normalized = await normalizeImageToJpegDataUrlFromBlob(blob)

        if (cancelled) return
        sessionStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            template: resolvedTemplate,
            imageUrl: normalized,
            title: resolvedTitle,
            description: resolvedDescription,
            message: "",
          })
        )
        router.replace(`/postcard/editor?template=${encodeURIComponent(resolvedTemplate)}`)
      } catch {
        if (!cancelled) setFatalError("We couldn’t use this pin photo as a postcard. Please try a different photo.")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [pinId, pin, resolvedImageUrl, resolvedTemplate, resolvedTitle, resolvedDescription, router])

  if (fatalError) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
          color: "white",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
          zIndex: 1000,
        }}
      >
        <div style={{ width: "min(520px, 100%)", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 16, padding: 16, backdropFilter: "blur(12px)" }}>
          <div style={{ fontSize: "1.15rem", fontWeight: 950, marginBottom: 8 }}>Can’t use that photo</div>
          <div style={{ opacity: 0.92, lineHeight: 1.35 }}>{fatalError}</div>
          <button
            type="button"
            onClick={() => (onBack ? onBack() : router.back())}
            style={{
              marginTop: 14,
              width: "100%",
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "white",
              fontWeight: 900,
              padding: "0.95rem 1rem",
              borderRadius: 14,
              cursor: "pointer",
            }}
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
        zIndex: 1000,
      }}
    >
      <div style={{ fontSize: "1.15rem", fontWeight: 900, marginBottom: 10 }}>Preparing your postcard…</div>
      <div style={{ opacity: 0.9, maxWidth: 420 }}>
        {pinId && !pin ? "Loading pin…" : resolvedImageUrl ? "Opening editor…" : "Missing pin photo."}
      </div>
      <button
        type="button"
        onClick={() => (onBack ? onBack() : router.back())}
        style={{
          marginTop: 16,
          width: "min(360px, 92vw)",
          background: "rgba(255,255,255,0.15)",
          border: "1px solid rgba(255,255,255,0.22)",
          color: "white",
          fontWeight: 900,
          padding: "0.95rem 1rem",
          borderRadius: 14,
          cursor: "pointer",
        }}
      >
        Back
      </button>
    </div>
  )
}

