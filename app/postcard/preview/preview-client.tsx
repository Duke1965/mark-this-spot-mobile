"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getTemplateConfig } from "../editor/template-config"
import { Caveat } from "next/font/google"
import { uploadImageToFirebase, generateImageFilename } from "@/lib/imageUpload"
import { auth } from "@/lib/firebase"

const caveat = Caveat({ subsets: ["latin"], weight: ["500", "600"] })

const ALLOWED_TEMPLATES = new Set(["template-1", "template-2", "template-3", "template-4"])
const DRAFT_KEY = "pinit-postcard-draft-v1"

export default function PreviewClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const templateParam = (searchParams.get("template") || "").trim()
  const template = useMemo(() => (ALLOWED_TEMPLATES.has(templateParam) ? templateParam : "template-1"), [templateParam])
  const templateConfig = useMemo(() => getTemplateConfig(template), [template])

  const [loadingMeta, setLoadingMeta] = useState(true)
  const [title, setTitle] = useState("My Special Place")
  const [description, setDescription] = useState("A memorable place worth sharing.")
  const [isSending, setIsSending] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [photoTransform, setPhotoTransform] = useState<{ tx: number; ty: number; scale: number; rotation: number }>({
    tx: 0,
    ty: 0,
    scale: 1,
    rotation: 0,
  })
  const [stickers, setStickers] = useState<
    Array<{ id: string; name: string; imageUrl: string; x: number; y: number; scale: number; rotation: number }>
  >([])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as any
      if (typeof parsed?.imageUrl === "string") setImageUrl(parsed.imageUrl)
      if (typeof parsed?.message === "string") setMessage(parsed.message)
      if (parsed?.transform) {
        setPhotoTransform({
          tx: Number(parsed.transform.tx ?? 0),
          ty: Number(parsed.transform.ty ?? 0),
          scale: Number(parsed.transform.scale ?? 1),
          rotation: Number(parsed.transform.rotation ?? 0),
        })
      }
      if (Array.isArray(parsed?.stickers)) {
        const loaded = parsed.stickers
          .filter((s: any) => !!s && typeof s.id === "string" && typeof s.imageUrl === "string")
          .map((s: any) => ({
            id: String(s.id),
            name: String(s.name || "Sticker"),
            imageUrl: String(s.imageUrl),
            x: Number(s.x ?? 50),
            y: Number(s.y ?? 50),
            scale: Number(s.scale ?? 1),
            rotation: Number(s.rotation ?? 0),
          }))
        setStickers(loaded)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingMeta(true)
      try {
        const raw = sessionStorage.getItem(DRAFT_KEY)
        const parsed = raw ? (JSON.parse(raw) as any) : null

        // Best-effort metadata fetch using existing place intel system, if coordinates exist.
        const lat = Number(parsed?.latitude ?? parsed?.lat)
        const lon = Number(parsed?.longitude ?? parsed?.lon ?? parsed?.lng)
        const hint = typeof parsed?.locationName === "string" ? parsed.locationName : undefined

        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          const url = new URL("/api/pin-intel", window.location.origin)
          url.searchParams.set("lat", String(lat))
          url.searchParams.set("lon", String(lon))
          if (hint) url.searchParams.set("hint", hint)
          const res = await fetch(url.toString(), { cache: "no-store" })
          if (res.ok) {
            const data = (await res.json()) as any
            const nextTitle = typeof data?.title === "string" ? data.title : ""
            const nextDesc = typeof data?.description === "string" ? data.description : ""
            if (!cancelled) {
              setTitle(nextTitle.trim() || "My Special Place")
              setDescription(nextDesc.trim() || "A memorable place worth sharing.")
            }
          } else if (!cancelled) {
            setTitle("My Special Place")
            setDescription("A memorable place worth sharing.")
          }
        } else if (!cancelled) {
          setTitle("My Special Place")
          setDescription("A memorable place worth sharing.")
        }
      } catch {
        if (!cancelled) {
          setTitle("My Special Place")
          setDescription("A memorable place worth sharing.")
        }
      } finally {
        if (!cancelled) setLoadingMeta(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const onSend = async () => {
    if (isSending) return
    setIsSending(true)
    try {
      if (!imageUrl) throw new Error("Missing image")

      // Upload photo to Firebase Storage to ensure the shared link has a durable URL.
      const uid = (auth as any)?.currentUser?.uid as string | undefined
      const filename = generateImageFilename(uid)
      const hostedImageUrl = await uploadImageToFirebase(imageUrl, filename)

      const res = await fetch("/api/postcards/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template,
          imageUrl: hostedImageUrl,
          message,
          stickers,
          title,
          description,
          transform: photoTransform,
        }),
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || "Failed to create postcard")
      }
      const data = (await res.json()) as { postcardId?: string }
      const postcardId = String(data.postcardId || "")
      if (!postcardId) throw new Error("Missing postcardId")

      const url = `${window.location.origin}/shared/${encodeURIComponent(postcardId)}`
      setShareUrl(url)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      try {
        window.alert(msg)
      } catch {
        // ignore
      }
    } finally {
      setIsSending(false)
    }
  }

  const shareText = useMemo(() => {
    const t = (title || "My Special Place").trim()
    return `PINIT Postcard: ${t}\n\n${shareUrl || ""}`.trim()
  }, [title, shareUrl])

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
          onClick={() => router.push(`/postcard/stickers?template=${encodeURIComponent(template)}`)}
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
          type="button"
        >
          <ArrowLeft size={20} />
          <span style={{ fontWeight: 700 }}>Back</span>
        </button>
        <div style={{ fontSize: "1.125rem", fontWeight: 900 }}>Preview</div>
        <button
          onClick={onSend}
          disabled={isSending}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.22)",
            color: "white",
            fontWeight: 900,
            padding: "0.55rem 0.9rem",
            borderRadius: 12,
            cursor: isSending ? "not-allowed" : "pointer",
            opacity: isSending ? 0.7 : 1,
          }}
          type="button"
        >
          {isSending ? "Sending…" : "Send"}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
        <div style={{ maxWidth: 520, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 420,
                aspectRatio: "3 / 2",
                borderRadius: 18,
                overflow: "hidden",
                position: "relative",
                background: "rgba(0,0,0,0.25)",
                border: "1px solid rgba(255,255,255,0.18)",
                boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
              }}
            >
              {/* Photo */}
              <div
                style={{
                  position: "absolute",
                  left: "7%",
                  top: "22%",
                  width: "42%",
                  height: "56%",
                  overflow: "hidden",
                  borderRadius: 10,
                  background: "rgba(0,0,0,0.06)",
                  ...(templateConfig.photoArea
                    ? {
                        top: templateConfig.photoArea.top,
                        left: templateConfig.photoArea.left,
                        width: templateConfig.photoArea.width,
                        height: templateConfig.photoArea.height,
                        borderRadius: templateConfig.photoArea.borderRadius ?? 10,
                      }
                    : null),
                }}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Postcard background"
                    draggable={false}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "center",
                      transformOrigin: "center center",
                      transform: `translate3d(${photoTransform.tx}px, ${photoTransform.ty}px, 0) scale(${photoTransform.scale}) rotate(${photoTransform.rotation}deg)`,
                      pointerEvents: "none",
                      userSelect: "none",
                      WebkitUserSelect: "none",
                      WebkitTouchCallout: "none",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(0,0,0,0.35)",
                      color: "white",
                      fontWeight: 800,
                    }}
                  >
                    No image
                  </div>
                )}
              </div>

              {/* Template */}
              <img
                src={`/postcards/${template}.png`}
                alt=""
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  objectPosition: "center",
                  pointerEvents: "none",
                }}
              />

              {/* Message */}
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                <div
                  style={{
                    position: "absolute",
                    color: "rgba(20, 20, 20, 0.82)",
                    fontFamily: caveat.style.fontFamily,
                    fontWeight: 600,
                    fontSize: "1.12rem",
                    lineHeight: 1.65,
                    letterSpacing: "0.35px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    overflow: "hidden",
                    textShadow: "0 1px 0 rgba(255,255,255,0.28)",
                    top: templateConfig.textArea.top,
                    left: templateConfig.textArea.left,
                    width: templateConfig.textArea.width,
                    height: templateConfig.textArea.height || "44%",
                    textAlign: templateConfig.textArea.align || "left",
                    ...(templateConfig.textStyle?.fontSize ? { fontSize: templateConfig.textStyle.fontSize } : null),
                    ...(typeof templateConfig.textStyle?.lineHeight === "number"
                      ? { lineHeight: templateConfig.textStyle.lineHeight }
                      : null),
                  }}
                  aria-hidden="true"
                >
                  {message}
                </div>
              </div>

              {/* Stickers */}
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                {stickers.map((s) => (
                  <img
                    key={s.id}
                    src={s.imageUrl}
                    alt={s.name}
                    draggable={false}
                    style={{
                      position: "absolute",
                      left: `${s.x}%`,
                      top: `${s.y}%`,
                      width: 96,
                      height: 96,
                      transform: `translate(-50%, -50%) scale(${s.scale}) rotate(${s.rotation}deg)`,
                      transformOrigin: "center center",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {loadingMeta ? (
            <div
              style={{
                width: "100%",
                maxWidth: 520,
                margin: "0 auto",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 16,
                padding: 14,
                backdropFilter: "blur(12px)",
                opacity: 0.95,
              }}
            >
              Preparing your postcard…
            </div>
          ) : null}

          <div
            style={{
              width: "100%",
              maxWidth: 520,
              margin: "0 auto",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 16,
              padding: 14,
              backdropFilter: "blur(12px)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 900 }}>Title</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(0,0,0,0.18)",
                color: "white",
                padding: "10px 12px",
                fontSize: "0.95rem",
                outline: "none",
              }}
              placeholder="My Special Place"
            />

            <div style={{ fontWeight: 900, marginTop: 6 }}>Description</div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(0,0,0,0.18)",
                color: "white",
                padding: "10px 12px",
                fontSize: "0.95rem",
                outline: "none",
                resize: "none",
              }}
              placeholder="A memorable place worth sharing."
            />
          </div>

          {shareUrl ? (
            <div
              style={{
                width: "100%",
                maxWidth: 520,
                margin: "0 auto",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 16,
                padding: 14,
                backdropFilter: "blur(12px)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ fontWeight: 900 }}>Share link</div>
              <div style={{ opacity: 0.92, wordBreak: "break-all" }}>{shareUrl}</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                  style={shareBtn}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
                <a href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(shareText)}`} style={shareBtn}>
                  Email
                </a>
                <a href={`sms:?&body=${encodeURIComponent(shareText)}`} style={shareBtn}>
                  SMS
                </a>
                <button
                  type="button"
                  style={shareBtn}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(shareUrl)
                      window.alert("Link copied")
                    } catch {
                      window.alert("Copy failed")
                    }
                  }}
                >
                  Copy Link
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

const shareBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.15)",
  border: "1px solid rgba(255,255,255,0.22)",
  color: "white",
  fontWeight: 900,
  padding: "0.7rem 0.9rem",
  borderRadius: 12,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
}

