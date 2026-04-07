"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Camera, Images } from "lucide-react"
import { ReliableCamera } from "@/components/reliable-camera"
import { requestCameraPermission } from "@/lib/mobilePermissions"

const ALLOWED_TEMPLATES = new Set(["template-1", "template-2", "template-3", "template-4"])
const DRAFT_KEY = "pinit-postcard-draft-v1"

export default function PostcardNewClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const templateParam = (searchParams.get("template") || "").trim()

  const template = useMemo(() => {
    return ALLOWED_TEMPLATES.has(templateParam) ? templateParam : "template-1"
  }, [templateParam])

  const [mode, setMode] = useState<"chooser" | "camera">("chooser")
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMode("chooser")
    setError(null)
  }, [template])

  const saveDraftAndGo = (imageUrl: string) => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ template, imageUrl }))
    } catch {
      setError("That photo is too large to open here. Please try a smaller image.")
      return
    }
    router.push(`/postcard/editor?template=${encodeURIComponent(template)}`)
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
          onClick={() => (mode === "camera" ? setMode("chooser") : router.back())}
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
          onCapture={(mediaData) => {
            saveDraftAndGo(mediaData)
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
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Selected template</div>
                <div style={{ opacity: 0.9 }}>{template}</div>
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
                cursor: "pointer",
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
                cursor: "pointer",
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
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) {
                  setError(null)
                  return
                }
                // Prefer an object URL to avoid large base64 data exceeding sessionStorage quota.
                try {
                  const objectUrl = URL.createObjectURL(file)
                  saveDraftAndGo(objectUrl)
                  // Allow picking the same file again if needed
                  e.currentTarget.value = ""
                  return
                } catch {
                  // Fall back to base64 if object URLs are unavailable.
                }

                const reader = new FileReader()
                reader.onload = () => {
                  const dataUrl = typeof reader.result === "string" ? reader.result : ""
                  if (!dataUrl) {
                    setError("We couldn’t read that image. Please try another photo.")
                    return
                  }
                  saveDraftAndGo(dataUrl)
                  e.currentTarget.value = ""
                }
                reader.onerror = () => {
                  setError("We couldn’t read that image. Please try another photo.")
                }
                reader.readAsDataURL(file)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

