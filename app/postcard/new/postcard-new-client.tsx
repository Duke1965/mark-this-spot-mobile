"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Camera, Images } from "lucide-react"
import { ReliableCamera } from "@/components/reliable-camera"
import { requestCameraPermission } from "@/lib/mobilePermissions"

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Starting a new postcard should reset any previous draft.
    try {
      sessionStorage.removeItem(DRAFT_KEY)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    setMode("chooser")
    setError(null)
  }, [template])

  const saveDraftAndGo = (
    imageUrl: string,
    extras?: {
      source?: DraftSource
      latitude?: number
      longitude?: number
      locationName?: string
      title?: string
      description?: string
    }
  ) => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ template, imageUrl, ...(extras || {}) }))
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

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
        color: "white",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          padding: "1rem",
          paddingTop: "3rem",
          background: "rgba(30, 58, 138, 0.95)",
          borderBottom: "1px solid rgba(255,255,255,0.2)",
          backdropFilter: "blur(15px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
        }}
      >
        <button
          onClick={() => (mode === "camera" ? setMode("chooser") : router.push("/postcard/templates"))}
          style={{
            background: "transparent",
            border: "none",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.95rem",
            padding: "0.5rem",
          }}
        >
          <ArrowLeft size={20} />
          <span style={{ fontWeight: 700 }}>Back</span>
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
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.15)",
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
                    background: "rgba(255,255,255,0.2)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "white",
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
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.15)",
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
                background: "rgba(255,255,255,0.16)",
                border: "1px solid rgba(255,255,255,0.22)",
                color: "white",
                fontWeight: 900,
                padding: "1.1rem 1rem",
                borderRadius: 16,
                cursor: isNormalizing ? "not-allowed" : "pointer",
                opacity: isNormalizing ? 0.7 : 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Camera size={18} /> <span>Take Photo</span>
              </div>
              <div style={{ fontSize: "0.85rem", opacity: 0.9, fontWeight: 700 }}>
                Use your camera to capture a new photo.
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
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "white",
                fontWeight: 900,
                padding: "1.1rem 1rem",
                borderRadius: 16,
                cursor: isNormalizing ? "not-allowed" : "pointer",
                opacity: isNormalizing ? 0.7 : 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Images size={18} /> <span>Choose from Gallery</span>
              </div>
              <div style={{ fontSize: "0.85rem", opacity: 0.9, fontWeight: 700 }}>
                Pick an existing photo from your device.
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

