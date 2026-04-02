"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Camera, Images } from "lucide-react"
import { ReliableCamera } from "@/components/reliable-camera"
import { requestCameraPermission, requestPhotoPermission } from "@/lib/mobilePermissions"

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMode("chooser")
  }, [template])

  const saveDraftAndGo = (imageUrl: string) => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ template, imageUrl }))
    } catch {
      // ignore
    }
    router.push(`/postcard/editor?template=${encodeURIComponent(template)}`)
  }

  const onTakePhoto = async () => {
    const allowed = await requestCameraPermission()
    if (!allowed) return
    setMode("camera")
  }

  const onChooseGallery = async () => {
    const allowed = await requestPhotoPermission()
    if (!allowed) return
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
        <div style={{ fontSize: "1.125rem", fontWeight: 800 }}>Create Postcard</div>
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

            <button
              onClick={onTakePhoto}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.6rem",
                background: "rgba(255,255,255,0.2)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "white",
                fontWeight: 900,
                padding: "0.95rem 1rem",
                borderRadius: 14,
                cursor: "pointer",
              }}
            >
              <Camera size={18} /> Take Photo
            </button>

            <button
              onClick={onChooseGallery}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.6rem",
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "white",
                fontWeight: 900,
                padding: "0.95rem 1rem",
                borderRadius: 14,
                cursor: "pointer",
              }}
            >
              <Images size={18} /> Choose from Gallery
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = () => {
                  const dataUrl = typeof reader.result === "string" ? reader.result : ""
                  if (!dataUrl) return
                  saveDraftAndGo(dataUrl)
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

