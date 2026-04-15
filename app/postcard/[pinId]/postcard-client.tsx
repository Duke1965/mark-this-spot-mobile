"use client"

import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { usePinStorage } from "@/hooks/usePinStorage"
import type { PinData } from "@/lib/types"

const ALLOWED_TEMPLATES = new Set(["template-1", "template-2", "template-3", "template-4"])
const DRAFT_KEY = "pinit-postcard-draft-v1"

async function normalizeImageToJpegDataUrl(url: string) {
  const MAX_DIM = 1600
  const JPEG_QUALITY = 0.86
  if (!url) throw new Error("Missing image")

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.decoding = "async"
    el.crossOrigin = "anonymous"
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error("Failed to load image"))
    el.src = url
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

  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY))
  if (!blob) return canvas.toDataURL("image/jpeg", JPEG_QUALITY)

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(typeof r.result === "string" ? r.result : "")
    r.onerror = () => reject(new Error("Failed to encode image"))
    r.readAsDataURL(blob)
  })
  if (!dataUrl) throw new Error("Failed to encode image")
  return dataUrl
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

        let normalized = resolvedImageUrl
        try {
          normalized = await normalizeImageToJpegDataUrl(resolvedImageUrl)
        } catch {
          // If normalization fails (e.g. CORS), fall back to hosted URL.
          normalized = resolvedImageUrl
        }

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
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [pinId, pin, resolvedImageUrl, resolvedTemplate, resolvedTitle, resolvedDescription, router])

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

