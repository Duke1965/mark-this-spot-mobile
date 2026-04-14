"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getTemplateConfig } from "../editor/template-config"
import { STICKER_CATALOG, STICKER_CATEGORIES, type StickerCategory } from "./sticker-catalog"
import { Caveat } from "next/font/google"
import { getHintsEnabled } from "@/lib/hints"

const caveat = Caveat({ subsets: ["latin"], weight: ["500", "600"] })

const ALLOWED_TEMPLATES = new Set(["template-1", "template-2", "template-3", "template-4"])
const DRAFT_KEY = "pinit-postcard-draft-v1"
const STICKER_GESTURE_HINT_KEY = "pinit-postcard-sticker-gesture-hint-shown-v1"

type DraftTransform = { tx?: number; ty?: number; scale?: number; rotation?: number }
type StickerItem = {
  id: string
  name: string
  imageUrl: string
  x: number // percent
  y: number // percent
  scale: number
  rotation: number
}

function uid() {
  return `st_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

export default function StickerStudioClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const templateParam = (searchParams.get("template") || "").trim()

  const template = useMemo(() => {
    return ALLOWED_TEMPLATES.has(templateParam) ? templateParam : "template-1"
  }, [templateParam])
  const templateConfig = useMemo(() => getTemplateConfig(template), [template])

  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [photoTransform, setPhotoTransform] = useState<Required<DraftTransform>>({
    tx: 0,
    ty: 0,
    scale: 1,
    rotation: 0,
  })
  const [stickers, setStickers] = useState<StickerItem[]>([])
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null)
  const [category, setCategory] = useState<StickerCategory>("old-school")
  const [hintsEnabled, setHintsEnabled] = useState(true)
  const [showStickerHint, setShowStickerHint] = useState(false)

  useEffect(() => {
    setHintsEnabled(getHintsEnabled())
  }, [])

  useEffect(() => {
    try {
      if (typeof window === "undefined") return
      if (!hintsEnabled) return
      if (sessionStorage.getItem(STICKER_GESTURE_HINT_KEY)) return
      sessionStorage.setItem(STICKER_GESTURE_HINT_KEY, "1")
      setShowStickerHint(true)
      const t = window.setTimeout(() => setShowStickerHint(false), 4500)
      return () => window.clearTimeout(t)
    } catch {
      return
    }
  }, [hintsEnabled])

  const stickersRef = useRef<StickerItem[]>([])
  useEffect(() => {
    stickersRef.current = stickers
  }, [stickers])

  const postcardRef = useRef<HTMLDivElement>(null)
  const pointerMapRef = useRef(new Map<number, { x: number; y: number }>())
  const gestureRef = useRef<{
    stickerId: string | null
    mode: "none" | "drag" | "pinch"
    startX: number
    startY: number
    startCX: number
    startCY: number
    startDist: number
    startAngle: number
    startStickerX: number
    startStickerY: number
    startScale: number
    startRotation: number
  }>({
    stickerId: null,
    mode: "none",
    startX: 0,
    startY: 0,
    startCX: 0,
    startCY: 0,
    startDist: 0,
    startAngle: 0,
    startStickerX: 50,
    startStickerY: 50,
    startScale: 1,
    startRotation: 0,
  })

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as {
        imageUrl?: string
        message?: string
        transform?: DraftTransform
        stickers?: Array<Partial<StickerItem>>
      }
      if (parsed?.imageUrl) setImageUrl(parsed.imageUrl)
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
          .filter((s) => !!s && typeof s.id === "string" && typeof s.imageUrl === "string")
          .map((s) => ({
            id: String(s.id),
            name: String(s.name || "Sticker"),
            imageUrl: String(s.imageUrl),
            x: Number(s.x ?? 50),
            y: Number(s.y ?? 50),
            scale: Number(s.scale ?? 1),
            rotation: Number(s.rotation ?? 0),
          }))
        setStickers(loaded)
        // In this flow, we treat stickers as "placed" in sequence:
        // only the most recently added sticker stays editable.
        if (loaded.length) setActiveStickerId(loaded[loaded.length - 1].id)
      }
    } catch {
      // ignore
    }
  }, [])

  const saveDraft = (nextStickers: StickerItem[]) => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      const base = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          ...base,
          stickers: nextStickers,
        })
      )
    } catch {
      // ignore
    }
  }

  const onBack = () => {
    saveDraft(stickers)
    router.push(`/postcard/editor?template=${encodeURIComponent(template)}`)
  }

  const onDone = () => {
    saveDraft(stickers)
    router.push(`/postcard/preview?template=${encodeURIComponent(template)}`)
  }

  const addSticker = (s: { id: string; name: string; imageUrl: string }) => {
    const next: StickerItem = {
      id: uid(),
      name: s.name,
      imageUrl: s.imageUrl,
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
    }
    setStickers((prev) => {
      const nextStickers = [...prev, next]
      // Keep ref in sync so the newly added sticker
      // can be manipulated immediately on the next touch.
      stickersRef.current = nextStickers
      saveDraft(nextStickers)
      return nextStickers
    })
    setActiveStickerId(next.id)
  }

  const getRect = () => postcardRef.current?.getBoundingClientRect() || null

  const clientToPercent = (clientX: number, clientY: number) => {
    const rect = getRect()
    if (!rect) return { x: 50, y: 50 }
    const x = ((clientX - rect.left) / rect.width) * 100
    const y = ((clientY - rect.top) / rect.height) * 100
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
  }

  const getTwoPointerGesture = () => {
    const pts = Array.from(pointerMapRef.current.values())
    if (pts.length !== 2) return null
    const [a, b] = pts
    const cx = (a.x + b.x) / 2
    const cy = (a.y + b.y) / 2
    const dx = b.x - a.x
    const dy = b.y - a.y
    const dist = Math.hypot(dx, dy)
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)
    return { cx, cy, dist, angle }
  }

  const beginGesture = (stickerId: string, e: React.PointerEvent<HTMLDivElement>) => {
    const target = stickersRef.current.find((s) => s.id === stickerId)
    if (!target) return
    setActiveStickerId(stickerId)

    pointerMapRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const ptsCount = pointerMapRef.current.size
    if (ptsCount === 1) {
      const p = clientToPercent(e.clientX, e.clientY)
      gestureRef.current = {
        ...gestureRef.current,
        stickerId,
        mode: "drag",
        startX: p.x,
        startY: p.y,
        startStickerX: target.x,
        startStickerY: target.y,
        startScale: target.scale,
        startRotation: target.rotation,
      }
    } else if (ptsCount === 2) {
      const g = getTwoPointerGesture()
      if (!g) return
      const p = clientToPercent(g.cx, g.cy)
      gestureRef.current = {
        ...gestureRef.current,
        stickerId,
        mode: "pinch",
        startCX: p.x,
        startCY: p.y,
        startDist: g.dist || 1,
        startAngle: g.angle,
        startStickerX: target.x,
        startStickerY: target.y,
        startScale: target.scale,
        startRotation: target.rotation,
      }
    }
  }

  const updateSticker = (id: string, updates: Partial<StickerItem>) => {
    setStickers((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      return next
    })
  }

  const onStickersPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (e.button !== 0) return
    if (showStickerHint) setShowStickerHint(false)
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)

    // If a gesture is already in progress for the active sticker, allow a 2nd finger
    // to land anywhere on the stickers layer and "join" the pinch gesture.
    if (
      pointerMapRef.current.size === 1 &&
      gestureRef.current.stickerId &&
      activeStickerId &&
      gestureRef.current.stickerId === activeStickerId
    ) {
      pointerMapRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      const target = stickersRef.current.find((s) => s.id === activeStickerId)
      const g = getTwoPointerGesture()
      if (target && g) {
        const p = clientToPercent(g.cx, g.cy)
        gestureRef.current = {
          ...gestureRef.current,
          stickerId: activeStickerId,
          mode: "pinch",
          startCX: p.x,
          startCY: p.y,
          startDist: g.dist || 1,
          startAngle: g.angle,
          startStickerX: target.x,
          startStickerY: target.y,
          startScale: target.scale,
          startRotation: target.rotation,
        }
      }
      return
    }

    const targetEl = (e.target as HTMLElement | null)?.closest?.("[data-sticker-id]") as HTMLElement | null
    const stickerId = targetEl?.dataset?.stickerId
    if (!stickerId) return
    // Lock older stickers once a new one is chosen.
    // Only the active (most recent) sticker remains editable.
    if (activeStickerId && stickerId !== activeStickerId) return
    beginGesture(stickerId, e)
  }

  const onStickersPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    const id = gestureRef.current.stickerId
    if (!id) return
    if (!pointerMapRef.current.has(e.pointerId)) return
    pointerMapRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    const sticker = stickersRef.current.find((s) => s.id === id)
    if (!sticker) return

    if (gestureRef.current.mode === "drag" && pointerMapRef.current.size === 1) {
      const p = clientToPercent(e.clientX, e.clientY)
      const dx = p.x - gestureRef.current.startX
      const dy = p.y - gestureRef.current.startY
      updateSticker(id, { x: gestureRef.current.startStickerX + dx, y: gestureRef.current.startStickerY + dy })
      return
    }

    if (gestureRef.current.mode === "pinch" && pointerMapRef.current.size === 2) {
      const g = getTwoPointerGesture()
      if (!g) return
      const p = clientToPercent(g.cx, g.cy)
      const scaleFactor = g.dist / (gestureRef.current.startDist || 1)
      const nextScale = Math.min(4, Math.max(0.3, gestureRef.current.startScale * scaleFactor))
      const nextRotation = gestureRef.current.startRotation + (g.angle - gestureRef.current.startAngle)
      const dx = p.x - gestureRef.current.startCX
      const dy = p.y - gestureRef.current.startCY
      updateSticker(id, {
        scale: nextScale,
        rotation: nextRotation,
        x: gestureRef.current.startStickerX + dx,
        y: gestureRef.current.startStickerY + dy,
      })
    }
  }

  const onStickersPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    pointerMapRef.current.delete(e.pointerId)
    try {
      ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
    if (pointerMapRef.current.size === 0) {
      gestureRef.current.stickerId = null
      gestureRef.current.mode = "none"
      saveDraft(stickersRef.current)
    }
  }

  if (!imageUrl) {
    return (
      <div style={styles.screen}>
        <TopBar title="Decorate Your Postcard" onBack={onBack} onDone={onDone} />
        <div style={styles.center}>
          <div style={styles.emptyCard}>
            <div style={styles.emptyTitle}>No image selected</div>
            <div style={styles.emptyText}>Go back to the editor and choose a photo first.</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.screen}>
      <TopBar title="Decorate Your Postcard" onBack={onBack} onDone={onDone} />
      {showStickerHint ? (
        <div style={styles.hint} role="status" aria-live="polite" onClick={() => setShowStickerHint(false)}>
          Tap a sticker to add • Drag to move • Pinch to resize and rotate
        </div>
      ) : null}

      <div style={styles.center}>
        <div style={styles.postcardWrap}>
          <div style={styles.postcard} ref={postcardRef}>
            {/* Photo (display-only) */}
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
              <img
                src={imageUrl}
                alt="Postcard background"
                style={{
                  ...styles.bgImage,
                  transform: `translate3d(${photoTransform.tx}px, ${photoTransform.ty}px, 0) scale(${photoTransform.scale}) rotate(${photoTransform.rotation}deg)`,
                }}
                draggable={false}
              />
            </div>

            {/* Template overlay */}
            <img src={`/postcards/${template}.png`} alt="" style={styles.template} />

            {/* Message */}
            <div style={styles.textLayer}>
              <div
                style={{
                  ...styles.messageOnCard,
                  fontFamily: caveat.style.fontFamily,
                  top: templateConfig.textArea.top,
                  left: templateConfig.textArea.left,
                  width: templateConfig.textArea.width,
                  height: templateConfig.textArea.height || styles.messageOnCard.height,
                  textAlign: templateConfig.textArea.align || styles.messageOnCard.textAlign,
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

            {/* Stickers layer */}
            <div
              style={styles.stickersLayer}
              onPointerDown={onStickersPointerDown}
              onPointerMove={onStickersPointerMove}
              onPointerUp={onStickersPointerUp}
              onPointerCancel={onStickersPointerUp}
              onLostPointerCapture={onStickersPointerUp}
            >
              {stickers.map((s) => {
                const isActive = s.id === activeStickerId
                return (
                  <div
                    key={s.id}
                    style={{
                      ...styles.stickerWrap,
                      left: `${s.x}%`,
                      top: `${s.y}%`,
                      zIndex: isActive ? 5 : 3,
                    }}
                    data-sticker-id={s.id}
                  >
                    <img
                      src={s.imageUrl}
                      alt={s.name}
                      draggable={false}
                      style={{
                        ...styles.stickerImg,
                        transform: `translate(-50%, -50%) scale(${s.scale}) rotate(${s.rotation}deg)`,
                        outline: isActive ? "2px solid rgba(255,255,255,0.35)" : "none",
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.tray}>
        <div style={styles.tabsRow}>
          {STICKER_CATEGORIES.map((c) => {
            const active = c.id === category
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                style={{
                  ...styles.tab,
                  ...(active ? styles.tabActive : null),
                }}
              >
                {c.label}
              </button>
            )
          })}
        </div>
        <div style={styles.trayRow}>
          {STICKER_CATALOG.filter((s) => s.category === category).map((s) => (
            <button key={s.id} style={styles.trayBtn} onClick={() => addSticker(s)} type="button" title={s.name}>
              <img src={s.imageUrl} alt={s.name} style={styles.trayImg} draggable={false} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function TopBar({
  title,
  onBack,
  onDone,
}: {
  title: string
  onBack: () => void
  onDone: () => void
}) {
  return (
    <div style={styles.header}>
      <button onClick={onBack} style={styles.backBtn} type="button">
        <ArrowLeft size={20} />
        <span style={{ fontWeight: 700 }}>Back</span>
      </button>
      <div style={styles.headerTitle}>{title}</div>
      <button onClick={onDone} style={styles.doneBtn} type="button">
        Done
      </button>
    </div>
  )
}

const styles: Record<string, any> = {
  screen: {
    position: "fixed",
    inset: 0,
    background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
    color: "white",
    display: "flex",
    flexDirection: "column",
    zIndex: 1000,
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
    touchAction: "manipulation",
  },
  headerTitle: { fontSize: "1.05rem", fontWeight: 900, textAlign: "center", flex: 1 },
  doneBtn: {
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.22)",
    color: "white",
    fontWeight: 900,
    padding: "0.55rem 0.9rem",
    borderRadius: 12,
    cursor: "pointer",
    touchAction: "manipulation",
  },
  hint: {
    alignSelf: "center",
    width: "min(560px, 92vw)",
    marginTop: 10,
    padding: "0.65rem 0.85rem",
    borderRadius: 999,
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.16)",
    backdropFilter: "blur(12px)",
    color: "rgba(255,255,255,0.95)",
    fontSize: "0.92rem",
    fontWeight: 700,
    lineHeight: 1.25,
    textAlign: "center",
    pointerEvents: "auto",
    cursor: "pointer",
  },
  center: {
    flex: 1,
    overflow: "hidden",
    padding: "1rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  postcardWrap: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
  },
  postcard: {
    width: "100%",
    maxWidth: 420,
    aspectRatio: "3 / 2",
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
    background: "rgba(0,0,0,0.25)",
    border: "1px solid rgba(255,255,255,0.18)",
    boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
    touchAction: "none",
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
  textLayer: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 2,
  },
  messageOnCard: {
    position: "absolute",
    color: "rgba(20, 20, 20, 0.82)",
    fontWeight: 600,
    fontSize: "clamp(16px, 2.2vw, 20px)",
    lineHeight: 1.65,
    letterSpacing: "0.35px",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    overflow: "hidden",
    textShadow: "0 1px 0 rgba(255,255,255,0.28)",
  },
  stickersLayer: {
    position: "absolute",
    inset: 0,
    zIndex: 4,
    // Critical: allow 2-finger pinch/rotate gestures to be handled
    // by our PointerEvent logic instead of browser pinch-zoom.
    touchAction: "none",
  },
  stickerWrap: {
    position: "absolute",
    // Hit area (sticker image is transformed within this box)
    width: 120,
    height: 120,
    touchAction: "none",
    pointerEvents: "auto",
  },
  stickerImg: {
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    transformOrigin: "center center",
  },
  tray: {
    padding: "0.75rem 0.75rem 1rem",
    background: "rgba(30, 58, 138, 0.95)",
    borderTop: "1px solid rgba(255,255,255,0.18)",
    backdropFilter: "blur(15px)",
  },
  tabsRow: {
    display: "flex",
    gap: 8,
    paddingBottom: 10,
    overflowX: "auto",
  },
  tab: {
    flex: "0 0 auto",
    padding: "0.45rem 0.7rem",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.08)",
    color: "white",
    fontWeight: 800,
    fontSize: "0.85rem",
    cursor: "pointer",
  },
  tabActive: {
    background: "rgba(255,255,255,0.18)",
    border: "1px solid rgba(255,255,255,0.28)",
  },
  trayRow: {
    display: "flex",
    gap: 10,
    overflowX: "auto",
    paddingBottom: 6,
  },
  trayBtn: {
    flex: "0 0 auto",
    width: 72,
    height: 72,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.08)",
    padding: 8,
    cursor: "pointer",
  },
  trayImg: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
    pointerEvents: "none",
  },
  emptyCard: {
    width: "100%",
    maxWidth: 420,
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 16,
    backdropFilter: "blur(12px)",
    textAlign: "center",
  },
  emptyTitle: { fontSize: "1.1rem", fontWeight: 900, marginBottom: 6 },
  emptyText: { opacity: 0.9, fontSize: "0.95rem", lineHeight: 1.35 },
}

