"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Camera, FileText, Images } from "lucide-react"
import { ReliableCamera } from "@/components/reliable-camera"
import { requestCameraPermission } from "@/lib/mobilePermissions"
import { mappoBackButtonStyle } from "@/lib/mappoHeaderStyles"

const ALLOWED_TEMPLATES = new Set(["template-1", "template-2", "template-3", "template-4"])
const DRAFT_KEY = "pinit-postcard-draft-v1"
const TEMPLATE_LABELS: Record<string, string> = {
  "template-1": "Classic",
  "template-2": "Vintage Blue",
  "template-3": "Airmail",
  "template-4": "Sunset",
}

type DraftSource = "camera" | "gallery"

export default function PostcardNewClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const templateParam = (searchParams.get("template") || "").trim()

  const template = useMemo(() => {
    return ALLOWED_TEMPLATES.has(templateParam) ? templateParam : "template-1"
  }, [templateParam])

  const [mode, setMode] = useState<"chooser" | "camera">("chooser")
  const [error, setError] = useState<string | null>(null)
  const [isNormalizing, setIsNormalizing] = useState(false)
  const [existingDraft, setExistingDraft] = useState<{ template: string } | null>(null)
  const [draftPromptOpen, setDraftPromptOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // If a draft exists, don't silently wipe it. Offer resume/replace.
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as any
      const hasImage = typeof parsed?.imageUrl === "string" && parsed.imageUrl.length > 20
      const hasNoPhoto = !!parsed?.noPhoto
      const hasTemplate = typeof parsed?.template === "string" && ALLOWED_TEMPLATES.has(parsed.template.trim())
      if ((hasImage || hasNoPhoto) && hasTemplate) {
        setExistingDraft({ template: parsed.template.trim() })
        setDraftPromptOpen(true)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    setMode("chooser")
    setError(null)
  }, [template])

  const onResumeDraft = () => {
    const t = existingDraft?.template
    if (!t) return
    setDraftPromptOpen(false)
    router.replace(`/postcard/editor?template=${encodeURIComponent(t)}`)
  }

  const onStartNew = () => {
    try {
      sessionStorage.removeItem(DRAFT_KEY)
    } catch {
      // ignore
    }
    setExistingDraft(null)
    setDraftPromptOpen(false)
  }

  const onCancelDraftPrompt = () => {
    setDraftPromptOpen(false)
    router.push("/postcard/templates")
  }

  const saveDraftAndGo = (
    imageUrl: string | null,
    extras?: {
      source?: DraftSource
      noPhoto?: boolean
      latitude?: number
      longitude?: number
      locationName?: string
      title?: string
      description?: string
    }
  ) => {
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          template,
          ...(typeof imageUrl === "string" ? { imageUrl } : null),
          ...(extras || {}),
        })
      )
    } catch {
      setError("That photo is too large to open here. Please try a smaller image.")
      return
    }
    router.push(`/postcard/editor?template=${encodeURIComponent(template)}`)
  }

  const getBestEffortCoords = () =>
    new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
      try {
        if (typeof navigator === "undefined") return resolve(null)
        const geo = navigator.geolocation
        if (!geo?.getCurrentPosition) return resolve(null)
        geo.getCurrentPosition(
          (pos) => {
            const lat = Number(pos?.coords?.latitude)
            const lon = Number(pos?.coords?.longitude)
            if (!Number.isFinite(lat) || !Number.isFinite(lon)) return resolve(null)
            resolve({ latitude: lat, longitude: lon })
          },
          () => resolve(null),
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
        )
      } catch {
        resolve(null)
      }
    })

  const normalizeImageToJpegDataUrl = async (src: { file?: File; url?: string }) => {
    const MAX_DIM = 1600
    const JPEG_QUALITY = 0.86

    let objectUrl: string | null = null
    try {
      const url = src.file ? (objectUrl = URL.createObjectURL(src.file)) : String(src.url || "")
      if (!url) throw new Error("Missing image")

      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image()
        el.decoding = "async"
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
      if (!blob) {
        // Fallback if toBlob is unavailable
        return canvas.toDataURL("image/jpeg", JPEG_QUALITY)
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(typeof r.result === "string" ? r.result : "")
        r.onerror = () => reject(new Error("Failed to encode image"))
        r.readAsDataURL(blob)
      })
      if (!dataUrl) throw new Error("Failed to encode image")
      return dataUrl
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }

  const onTakePhoto = async () => {
    const allowed = await requestCameraPermission()
    if (!allowed) {
      setError("Camera permission was denied. You can still choose a photo from your gallery.")
      return
    }
    setMode("camera")
  }

  const onChooseGallery = async () => {
    // In most browsers/environments, the file picker itself handles permissions.
    // Pre-requesting photo permission can incorrectly fail and block selection.
    setError(null)
    fileInputRef.current?.click()
  }

  const onCreateWithoutPhoto = async () => {
    setError(null)
    setIsNormalizing(true)
    try {
      saveDraftAndGo(null, {
        source: "gallery",
        noPhoto: true,
        title: "",
        description: "",
      })
    } catch {
      setError("We couldn’t start a blank postcard. Please try again.")
    } finally {
      setIsNormalizing(false)
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundImage: "url(/brand/mappo/mappo-create-bg.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#eef8f4",
        color: "#3a2e1e",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
      }}
    >
      {isNormalizing ? (
        <div
          aria-live="polite"
          aria-busy="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9000,
            background: "rgba(238, 248, 244, 0.88)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.25rem",
          }}
        >
          <div
            style={{
              width: "min(420px, 92vw)",
              background: "rgba(255,255,255,0.92)",
              border: "1px solid rgba(79,59,43,0.12)",
              borderRadius: 16,
              padding: 16,
              color: "#3a2e1e",
              boxShadow: "0 18px 60px rgba(0,0,0,0.12)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                border: "3px solid rgba(79,59,43,0.14)",
                borderTop: "3px solid #4f3b2b",
                borderRadius: "50%",
                animation: "mappoSpin 1s linear infinite",
              }}
            />
            <div style={{ fontWeight: 950, fontSize: "1.02rem" }}>Preparing your photo…</div>
            <div style={{ opacity: 0.85, fontWeight: 750, fontSize: "0.92rem", lineHeight: 1.3 }}>
              Loading your photo into the postcard…
            </div>
          </div>
          <style>{`@keyframes mappoSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      ) : null}
      {draftPromptOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 5000,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            style={{
              width: "min(420px, 92vw)",
              background: "rgba(255,255,255,0.96)",
              border: "1px solid rgba(79,59,43,0.12)",
              borderRadius: 16,
              padding: 14,
              color: "#3a2e1e",
              boxShadow: "0 18px 60px rgba(0,0,0,0.18)",
              backdropFilter: "blur(14px)",
            }}
          >
            <div style={{ fontWeight: 950, fontSize: "1.05rem" }}>Resume your postcard draft?</div>
            <div style={{ marginTop: 6, opacity: 0.92, lineHeight: 1.35, fontSize: "0.92rem" }}>
              You have an in-progress postcard. You can continue it, or start a new one.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
              <button type="button" onClick={onResumeDraft} style={btnPrimary}>
                Resume Draft
              </button>
              <button type="button" onClick={onStartNew} style={btnDanger}>
                Start New (Discard Draft)
              </button>
              <button type="button" onClick={onCancelDraftPrompt} style={btnSecondary}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div
        style={{
          padding: "1rem",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)",
          background: "rgba(255,255,255,0.7)",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          backdropFilter: "blur(18px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
        }}
      >
        <button
          type="button"
          onClick={() => (mode === "camera" ? setMode("chooser") : router.push("/postcard/templates"))}
          style={{ ...mappoBackButtonStyle, flexShrink: 0 }}
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <div style={{ fontSize: "1.125rem", fontWeight: 800 }}>Add Your Photo</div>
        <div style={{ width: 72 }} />
      </div>

      {mode === "camera" ? (
        <ReliableCamera
          mode="photo"
          onClose={() => setMode("chooser")}
          onCapture={async (mediaData) => {
            setError(null)
            setIsNormalizing(true)
            const coordsPromise = getBestEffortCoords()
            try {
              const normalized = await normalizeImageToJpegDataUrl({ url: mediaData })
              const coords = await coordsPromise
              saveDraftAndGo(normalized, {
                source: "camera",
                ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : undefined),
              })
            } catch {
              setError("We couldn’t prepare that photo. Please try again with a different image.")
            } finally {
              setIsNormalizing(false)
            }
          }}
        />
      ) : (
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
          <div style={{ maxWidth: 520, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {!templateParam || !ALLOWED_TEMPLATES.has(templateParam) ? (
              <div
                style={{
                  background: "rgba(255,255,255,0.72)",
                  border: "1px solid rgba(79,59,43,0.1)",
                  borderRadius: 16,
                  padding: 14,
                  backdropFilter: "blur(12px)",
                }}
              >
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Choose a template first</div>
                <div style={{ opacity: 0.9, marginBottom: 12 }}>
                  We couldn’t find a valid template in the link. Please pick one from the templates screen.
                </div>
                <button
                  onClick={() => router.push("/postcard/templates")}
                  style={{
                    width: "100%",
                    background: "rgba(79,59,43,0.1)",
                    border: "1px solid rgba(79,59,43,0.15)",
                    color: "#4f3b2b",
                    fontWeight: 900,
                    padding: "0.95rem 1rem",
                    borderRadius: 14,
                    cursor: "pointer",
                  }}
                >
                  Go to Templates
                </button>
              </div>
            ) : (
              <div
                style={{
                  background: "rgba(255,255,255,0.72)",
                  border: "1px solid rgba(79,59,43,0.1)",
                  borderRadius: 16,
                  padding: 14,
                  backdropFilter: "blur(12px)",
                }}
              >
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Style</div>
                <div style={{ opacity: 0.9 }}>{TEMPLATE_LABELS[template] || template}</div>
              </div>
            )}

            {error && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.18)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  borderRadius: 16,
                  padding: 14,
                  backdropFilter: "blur(12px)",
                }}
              >
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Something went wrong</div>
                <div style={{ opacity: 0.95, lineHeight: 1.35 }}>{error}</div>
              </div>
            )}

            <button
              onClick={onTakePhoto}
              disabled={isNormalizing}
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 8,
                background: "rgba(255,255,255,0.78)",
                border: "1px solid rgba(79,59,43,0.12)",
                color: "#3a2e1e",
                fontWeight: 900,
                padding: "1.1rem 1rem",
                borderRadius: 16,
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                cursor: isNormalizing ? "not-allowed" : "pointer",
                opacity: isNormalizing ? 0.7 : 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Camera size={18} /> <span>Take Photo</span>
              </div>
              <div style={{ fontSize: "0.85rem", opacity: 0.9, fontWeight: 700 }}>
                Use your camera to capture a moment.
              </div>
            </button>

            <button
              onClick={onChooseGallery}
              disabled={isNormalizing}
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 8,
                background: "rgba(255,255,255,0.65)",
                border: "1px solid rgba(79,59,43,0.1)",
                color: "#3a2e1e",
                fontWeight: 900,
                padding: "1.1rem 1rem",
                borderRadius: 16,
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                cursor: isNormalizing ? "not-allowed" : "pointer",
                opacity: isNormalizing ? 0.7 : 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Images size={18} /> <span>Choose from Gallery</span>
              </div>
              <div style={{ fontSize: "0.85rem", opacity: 0.9, fontWeight: 700 }}>
                Pick a photo from your device.
              </div>
            </button>

            <button
              onClick={onCreateWithoutPhoto}
              disabled={isNormalizing}
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 8,
                background: "rgba(255,255,255,0.65)",
                border: "1px solid rgba(79,59,43,0.1)",
                color: "#3a2e1e",
                fontWeight: 900,
                padding: "1.1rem 1rem",
                borderRadius: 16,
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                cursor: isNormalizing ? "not-allowed" : "pointer",
                opacity: isNormalizing ? 0.7 : 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <FileText size={18} /> <span>Build your own</span>
              </div>
              <div style={{ fontSize: "0.85rem", opacity: 0.9, fontWeight: 700 }}>
                Start with just the style, message, and stickers.
              </div>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  // Allow picking the same file again if needed
                  e.currentTarget.value = ""
                  if (!file) {
                    setError(null)
                    return
                  }
                  setError(null)
                  setIsNormalizing(true)
                  try {
                    const normalized = await normalizeImageToJpegDataUrl({ file })
                    saveDraftAndGo(normalized, {
                      source: "gallery",
                      title: "",
                      description: "",
                    })
                  } catch {
                    setError("That photo couldn’t be prepared. Please try a different image.")
                  } finally {
                    setIsNormalizing(false)
                  }
                }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

const baseBtn: React.CSSProperties = {
  width: "100%",
  borderRadius: 14,
  padding: "0.85rem 1rem",
  fontWeight: 950,
  cursor: "pointer",
  border: "1px solid rgba(79,59,43,0.12)",
}

const btnPrimary: React.CSSProperties = {
  ...baseBtn,
  background: "rgba(79,59,43,0.1)",
  color: "#4f3b2b",
}

const btnSecondary: React.CSSProperties = {
  ...baseBtn,
  background: "rgba(255,255,255,0.6)",
  color: "#4f3b2b",
}

const btnDanger: React.CSSProperties = {
  ...baseBtn,
  background: "rgba(239,68,68,0.15)",
  border: "1px solid rgba(239,68,68,0.3)",
  color: "#b91c1c",
}

