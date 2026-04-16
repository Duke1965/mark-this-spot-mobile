"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { auth, firestore } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { getTemplateConfig } from "@/app/postcard/editor/template-config"
import { Caveat } from "next/font/google"

const caveat = Caveat({ subsets: ["latin"], weight: ["500", "600"] })

type PostcardDoc = {
  senderUid?: string
  title?: string
  description?: string
  createdAtIso?: string
  template?: string
  imageUrl?: string
  message?: string
  stickers?: Array<{ id: string; name: string; imageUrl: string; x: number; y: number; scale: number; rotation: number }>
  transform?: { tx?: number; ty?: number; scale?: number; rotation?: number } | null
}

export default function PostcardLibraryDetailClient() {
  const router = useRouter()
  const params = useParams<{ postcardId: string }>()
  const postcardId = String(params?.postcardId || "")

  const [uid, setUid] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PostcardDoc | null>(null)

  const shareUrl = useMemo(() => {
    if (!postcardId) return ""
    if (typeof window === "undefined") return ""
    return `${window.location.origin}/shared/${encodeURIComponent(postcardId)}`
  }, [postcardId])

  useEffect(() => {
    const unsub = (auth as any)?.onAuthStateChanged?.((u: any) => {
      setUid(u?.uid ? String(u.uid) : null)
    })
    return () => {
      try {
        unsub?.()
      } catch {
        // ignore
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        if (!uid) {
          setData(null)
          return
        }
        if (!postcardId) throw new Error("Missing postcardId")
        const ref = doc(firestore as any, "postcards", postcardId)
        const snap = await getDoc(ref)
        if (!snap.exists()) throw new Error("Postcard not found")
        const d = snap.data() as any
        const senderUid = d?.senderUid ? String(d.senderUid) : ""
        if (!senderUid || senderUid !== uid) throw new Error("You don’t have access to this postcard.")
        if (!cancelled)
          setData({
            senderUid,
            title: d?.title,
            description: d?.description,
            createdAtIso: d?.createdAtIso,
            template: d?.template,
            imageUrl: d?.imageUrl,
            message: d?.message,
            stickers: Array.isArray(d?.stickers) ? d.stickers : [],
            transform: d?.transform || null,
          })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (!cancelled) setError(msg || "Failed to load")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [uid, postcardId])

  const shareText = useMemo(() => {
    const title = String(data?.title || "My Special Place").trim()
    return `PINIT Postcard: ${title}\n\n${shareUrl}`.trim()
  }, [data?.title, shareUrl])

  const templateConfig = useMemo(() => getTemplateConfig(data?.template), [data?.template])

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <button type="button" onClick={() => router.push("/postcard/library")} style={styles.backBtn}>
          <ArrowLeft size={20} />
          <span style={{ fontWeight: 800 }}>Back</span>
        </button>
        <div style={styles.headerTitle}>Share postcard</div>
        <div style={{ width: 72 }} />
      </div>

      <div style={styles.content}>
        {uid ? null : (
          <div style={styles.card}>
            <div style={styles.cardTitle}>Sign in required</div>
            <div style={styles.cardText}>Please sign in to view this postcard.</div>
          </div>
        )}

        {uid && loading ? (
          <div style={styles.card}>
            <div style={styles.cardTitle}>Loading…</div>
            <div style={styles.cardText}>Preparing your share options.</div>
          </div>
        ) : null}

        {uid && !loading && error ? (
          <div style={styles.card}>
            <div style={styles.cardTitle}>Couldn’t open</div>
            <div style={styles.cardText}>{error}</div>
          </div>
        ) : null}

        {uid && !loading && !error ? (
          <div style={styles.card}>
            <div style={styles.previewWrap}>
              <div style={styles.previewCard}>
                <div
                  style={{
                    ...styles.photoMask,
                    ...(templateConfig.photoArea
                      ? {
                          top: templateConfig.photoArea.top,
                          left: templateConfig.photoArea.left,
                          width: templateConfig.photoArea.width,
                          height: templateConfig.photoArea.height,
                          borderRadius: templateConfig.photoArea.borderRadius ?? styles.photoMask.borderRadius,
                        }
                      : null),
                  }}
                >
                  {data?.imageUrl ? (
                    <img
                      src={String(data.imageUrl)}
                      alt={String(data?.title || "Postcard")}
                      draggable={false}
                      style={{
                        ...styles.bgImage,
                        transform: `translate3d(${Number(data?.transform?.tx || 0)}px, ${Number(data?.transform?.ty || 0)}px, 0) scale(${Number(
                          data?.transform?.scale || 1
                        )}) rotate(${Number(data?.transform?.rotation || 0)}deg)`,
                      }}
                    />
                  ) : (
                    <div style={styles.missing}>No image</div>
                  )}
                </div>

                <img src={`/postcards/${String(data?.template || "template-1")}.png`} alt="" style={styles.template} />

                <div style={styles.textLayer}>
                  <div
                    style={{
                      ...styles.message,
                      fontFamily: caveat.style.fontFamily,
                      top: templateConfig.textArea.top,
                      left: templateConfig.textArea.left,
                      width: templateConfig.textArea.width,
                      height: templateConfig.textArea.height || styles.message.height,
                      textAlign: templateConfig.textArea.align || styles.message.textAlign,
                      ...(templateConfig.textStyle?.fontSize ? { fontSize: templateConfig.textStyle.fontSize } : null),
                      ...(typeof templateConfig.textStyle?.lineHeight === "number"
                        ? { lineHeight: templateConfig.textStyle.lineHeight }
                        : null),
                    }}
                    aria-hidden="true"
                  >
                    {String(data?.message || "")}
                  </div>
                </div>

                <div style={styles.stickersLayer}>
                  {(Array.isArray(data?.stickers) ? data!.stickers! : []).map((s) => (
                    <img
                      key={String(s.id)}
                      src={String(s.imageUrl)}
                      alt={String(s.name || "Sticker")}
                      draggable={false}
                      style={{
                        ...styles.stickerImg,
                        left: `${Number((s as any).x ?? 50)}%`,
                        top: `${Number((s as any).y ?? 50)}%`,
                        transform: `translate(-50%, -50%) scale(${Number((s as any).scale ?? 1)}) rotate(${Number((s as any).rotation ?? 0)}deg)`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div style={styles.cardTitle}>Your postcard is ready</div>
            <div style={styles.cardText}>You can share it again at any time.</div>

            <div style={{ marginTop: 10, fontWeight: 900 }}>Share link</div>
            <div style={{ opacity: 0.92, wordBreak: "break-all", marginTop: 6 }}>{shareUrl}</div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                style={shareBtn}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
              <a href={`mailto:?subject=${encodeURIComponent(String(data?.title || ""))}&body=${encodeURIComponent(shareText)}`} style={shareBtn}>
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
              <button type="button" style={{ ...shareBtn, background: "rgba(255,255,255,0.22)" }} onClick={() => router.push("/")}>
                Done
              </button>
            </div>

            <button
              type="button"
              style={{ ...shareBtn, width: "100%", marginTop: 12, background: "rgba(255,255,255,0.08)" }}
              onClick={() => {
                window.open(`/shared/${encodeURIComponent(postcardId)}`, "_blank", "noopener,noreferrer")
              }}
            >
              View postcard
            </button>
          </div>
        ) : null}
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

const styles: Record<string, React.CSSProperties> = {
  screen: {
    position: "fixed",
    inset: 0,
    background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
    color: "white",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "1rem",
    paddingTop: "3rem",
    background: "rgba(30, 58, 138, 0.95)",
    borderBottom: "1px solid rgba(255,255,255,0.2)",
    backdropFilter: "blur(15px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  headerTitle: { fontSize: "1.125rem", fontWeight: 900, textAlign: "center", flex: 1 },
  backBtn: {
    background: "transparent",
    border: "none",
    color: "white",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.95rem",
    padding: "0.5rem",
  },
  content: { flex: 1, overflowY: "auto", padding: "1rem" },
  card: {
    width: "min(520px, 100%)",
    margin: "0 auto",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 14,
    backdropFilter: "blur(12px)",
  },
  cardTitle: { fontWeight: 900, fontSize: "1.05rem", marginBottom: 6 },
  cardText: { opacity: 0.92, lineHeight: 1.35 },
  previewWrap: { width: "100%", display: "flex", justifyContent: "center", marginBottom: 12 },
  previewCard: {
    width: "100%",
    maxWidth: 520,
    aspectRatio: "3 / 2",
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
    background: "rgba(0,0,0,0.25)",
    border: "1px solid rgba(255,255,255,0.18)",
    boxShadow: "0 18px 60px rgba(0,0,0,0.25)",
  },
  photoMask: {
    position: "absolute",
    left: "7%",
    top: "22%",
    width: "42%",
    height: "56%",
    overflow: "hidden",
    borderRadius: 10,
    background: "rgba(0,0,0,0.06)",
  },
  bgImage: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center",
    pointerEvents: "none",
    transformOrigin: "center center",
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTouchCallout: "none",
  },
  template: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "contain",
    objectPosition: "center",
    pointerEvents: "none",
    zIndex: 2,
  },
  textLayer: { position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 },
  message: {
    position: "absolute",
    top: "40%",
    left: "52%",
    width: "40%",
    height: "44%",
    color: "rgba(20, 20, 20, 0.82)",
    fontWeight: 600,
    fontSize: "clamp(16px, 2.2vw, 20px)",
    lineHeight: 1.58,
    letterSpacing: "0.35px",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    overflow: "hidden",
    boxSizing: "border-box",
    paddingRight: 10,
    textShadow: "0 1px 0 rgba(255,255,255,0.28)",
  },
  stickersLayer: { position: "absolute", inset: 0, pointerEvents: "none", zIndex: 4 },
  stickerImg: {
    position: "absolute",
    width: 96,
    height: 96,
    transformOrigin: "center center",
    pointerEvents: "none",
  },
  missing: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
  },
}

