"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getTemplateConfig } from "./template-config"
import { Caveat } from "next/font/google"
import { getHintsEnabled } from "@/lib/hints"

const caveat = Caveat({ subsets: ["latin"], weight: ["500", "600"] })

const ALLOWED_TEMPLATES = new Set(["template-1", "template-2", "template-3", "template-4"])
const DRAFT_KEY = "pinit-postcard-draft-v1"
const MAX_MESSAGE_LEN = 160
const ROTATE_HINT_KEY = "pinit-postcard-rotate-hint-shown-v1"
const PHOTO_GESTURE_HINT_KEY = "pinit-postcard-photo-gesture-hint-shown-v1"

export default function PostcardCreatorClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const templateParam = (searchParams.get("template") || "").trim()

  const template = useMemo(() => {
    return ALLOWED_TEMPLATES.has(templateParam) ? templateParam : "template-1"
  }, [templateParam])

  const templateConfig = useMemo(() => getTemplateConfig(template), [template])

  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageFailed, setImageFailed] = useState(false)
  const [templateFailed, setTemplateFailed] = useState(false)
  const [message, setMessage] = useState("")
  const [showRotateHint, setShowRotateHint] = useState(false)
  const [showPhotoGestureHint, setShowPhotoGestureHint] = useState(false)
  const [hintsEnabled, setHintsEnabled] = useState(true)
  const [isLandscape, setIsLandscape] = useState(false)

  // Photo transform state (creation editor only)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0) // degrees

  const debugIdRef = useRef<string>("")
  const lastLogRef = useRef<number>(0)
  const log = (...args: unknown[]) => {
    // Throttle noisy logs
    const now = Date.now()
    if (now - lastLogRef.current < 250) return
    lastLogRef.current = now
    // eslint-disable-next-line no-console
    console.log("🧪 EditorDebug", debugIdRef.current, ...args)
  }

  const pointerMapRef = useRef(new Map<number, { x: number; y: number }>())
  const gestureRef = useRef<{
    mode: "none" | "drag" | "pinch"
    startTx: number
    startTy: number
    startScale: number
    startRotation: number
    startX: number
    startY: number
    startDist: number
    startAngle: number
  }>({
    mode: "none",
    startTx: 0,
    startTy: 0,
    startScale: 1,
    startRotation: 0,
    startX: 0,
    startY: 0,
    startDist: 0,
    startAngle: 0,
  })

  useEffect(() => {
    debugIdRef.current = `t=${template} ts=${Date.now().toString(16)}`
    // eslint-disable-next-line no-console
    console.log("🧪 EditorDebug init", debugIdRef.current, { template })
  }, [template])

  useEffect(() => {
    const onErr = (ev: ErrorEvent) => {
      // eslint-disable-next-line no-console
      console.error("🚨 Editor window.error", debugIdRef.current, ev.error || ev.message)
    }
    const onRej = (ev: PromiseRejectionEvent) => {
      // eslint-disable-next-line no-console
      console.error("🚨 Editor unhandledrejection", debugIdRef.current, ev.reason)
    }
    window.addEventListener("error", onErr)
    window.addEventListener("unhandledrejection", onRej)
    return () => {
      window.removeEventListener("error", onErr)
      window.removeEventListener("unhandledrejection", onRej)
    }
  }, [])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as {
        imageUrl?: string
        message?: string
        transform?: { tx?: number; ty?: number; scale?: number; rotation?: number }
      }
      if (parsed?.imageUrl) setImageUrl(parsed.imageUrl)
      if (typeof parsed?.message === "string") setMessage(parsed.message.slice(0, MAX_MESSAGE_LEN))
      if (parsed?.transform) {
        if (typeof parsed.transform.tx === "number") setTx(parsed.transform.tx)
        if (typeof parsed.transform.ty === "number") setTy(parsed.transform.ty)
        if (typeof parsed.transform.scale === "number") setScale(parsed.transform.scale)
        if (typeof parsed.transform.rotation === "number") setRotation(parsed.transform.rotation)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    setHintsEnabled(getHintsEnabled())
  }, [])

  useEffect(() => {
    try {
      if (typeof window === "undefined") return
      if (!hintsEnabled) return
      if (sessionStorage.getItem(ROTATE_HINT_KEY)) return
      sessionStorage.setItem(ROTATE_HINT_KEY, "1")
      setShowRotateHint(true)
      return
    } catch {
      return
    }
  }, [hintsEnabled])

  useEffect(() => {
    try {
      if (typeof window === "undefined") return
      if (!hintsEnabled) return
      if (sessionStorage.getItem(PHOTO_GESTURE_HINT_KEY)) return
      sessionStorage.setItem(PHOTO_GESTURE_HINT_KEY, "1")
      setShowPhotoGestureHint(true)
      return
    } catch {
      return
    }
  }, [hintsEnabled])

  useEffect(() => {
    if (typeof window === "undefined") return
    const mql = window.matchMedia?.("(orientation: landscape)")
    const update = () => setIsLandscape(!!mql?.matches)
    update()
    if (!mql) return
    // Safari iOS uses addListener/removeListener; modern browsers use addEventListener.
    if (typeof mql.addListener === "function") mql.addListener(update)
    else mql.addEventListener?.("change", update)
    return () => {
      if (typeof mql.removeListener === "function") mql.removeListener(update)
      else mql.removeEventListener?.("change", update)
    }
  }, [])

  const saveDraft = () => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      const base = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
      const next = {
        ...base,
        message,
        transform: { tx, ty, scale, rotation },
      }
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
  }

  const onDone = () => {
    saveDraft()
    router.push(`/postcard/stickers?template=${encodeURIComponent(template)}`)
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

  const onPhotoPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    // Only interact with primary pointer types (touch/mouse/pen). Ignore right-click.
    if (e.button !== 0) return
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    pointerMapRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    const ptsCount = pointerMapRef.current.size
    if (ptsCount === 1) {
      log("gesture:start drag", { tx, ty, scale, rotation })
      gestureRef.current = {
        ...gestureRef.current,
        mode: "drag",
        startTx: tx,
        startTy: ty,
        startX: e.clientX,
        startY: e.clientY,
        startScale: scale,
        startRotation: rotation,
      }
    } else if (ptsCount === 2) {
      const g = getTwoPointerGesture()
      if (g) {
        log("gesture:start pinch", { tx, ty, scale, rotation, dist: g.dist, angle: g.angle })
        gestureRef.current = {
          ...gestureRef.current,
          mode: "pinch",
          startTx: tx,
          startTy: ty,
          startScale: scale,
          startRotation: rotation,
          startX: g.cx,
          startY: g.cy,
          startDist: g.dist || 1,
          startAngle: g.angle,
        }
      }
    }
  }

  const onPhotoPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!pointerMapRef.current.has(e.pointerId)) return
    pointerMapRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (gestureRef.current.mode === "drag" && pointerMapRef.current.size === 1) {
      const dx = e.clientX - gestureRef.current.startX
      const dy = e.clientY - gestureRef.current.startY
      setTx(gestureRef.current.startTx + dx)
      setTy(gestureRef.current.startTy + dy)
      return
    }

    if (gestureRef.current.mode === "pinch" && pointerMapRef.current.size === 2) {
      const g = getTwoPointerGesture()
      if (!g) return
      const scaleFactor = g.dist / (gestureRef.current.startDist || 1)
      const nextScale = Math.min(4, Math.max(0.25, gestureRef.current.startScale * scaleFactor))
      const nextRotation = gestureRef.current.startRotation + (g.angle - gestureRef.current.startAngle)

      // Translate relative to the moving midpoint (so pinch feels anchored).
      const dx = g.cx - gestureRef.current.startX
      const dy = g.cy - gestureRef.current.startY
      setTx(gestureRef.current.startTx + dx)
      setTy(gestureRef.current.startTy + dy)
      setScale(nextScale)
      setRotation(nextRotation)
    }
  }

  const onPhotoPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    pointerMapRef.current.delete(e.pointerId)
    try {
      ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
    if (pointerMapRef.current.size === 0) {
      gestureRef.current.mode = "none"
      log("gesture:end", { tx, ty, scale, rotation })
      saveDraft()
    } else if (pointerMapRef.current.size === 1) {
      // If one finger remains, switch to drag mode anchored at that finger.
      const remaining = Array.from(pointerMapRef.current.values())[0]
      gestureRef.current = {
        ...gestureRef.current,
        mode: "drag",
        startTx: tx,
        startTy: ty,
        startX: remaining.x,
        startY: remaining.y,
        startScale: scale,
        startRotation: rotation,
      }
    }
  }

  if (!imageUrl) {
    return (
      <div style={styles.screen}>
        <Header title="Postcard Editor" onBack={() => router.back()} right={<div style={{ width: 72 }} />} compact={isLandscape} />
        <div style={styles.content}>
          <div style={styles.errorCard}>
            <div style={styles.errorTitle}>No image selected</div>
            <div style={styles.errorText}>Go back and choose a photo first.</div>
            <button
              style={styles.primaryButton}
              onClick={() => router.push(`/postcard/new?template=${encodeURIComponent(template)}`)}
            >
              Choose Photo
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.screen}>
      <Header
        title="Postcard Editor"
        onBack={() => {
          saveDraft()
          router.push(`/postcard/new?template=${encodeURIComponent(template)}`)
        }}
        right={
          <button type="button" onClick={onDone} style={styles.doneBtn}>
            Done
          </button>
        }
        compact={isLandscape}
      />

      <div
        style={{
          ...styles.content,
          flexDirection: isLandscape ? "row" : "column",
          alignItems: isLandscape ? "flex-start" : "stretch",
          padding: isLandscape ? "0.6rem" : styles.content.padding,
          gap: isLandscape ? "0.6rem" : styles.content.gap,
          overflowY: isLandscape ? "hidden" : styles.content.overflowY,
        }}
      >
        {showRotateHint && !isLandscape && (
          <div style={styles.hint} role="status" aria-live="polite">
            <div style={styles.hintTopRow}>
              <div style={styles.hintLabel}>💡 Hint</div>
              <button type="button" onClick={() => setShowRotateHint(false)} style={styles.hintHideBtn} aria-label="Hide tip">
                Hide
              </button>
            </div>
            <div style={styles.hintText}>Rotate your phone for easier editing</div>
          </div>
        )}
        {!isLandscape && showPhotoGestureHint && (
          <div style={styles.hint} role="status" aria-live="polite">
            <div style={styles.hintTopRow}>
              <div style={styles.hintLabel}>💡 Hint</div>
              <button
                type="button"
                onClick={() => setShowPhotoGestureHint(false)}
                style={styles.hintHideBtn}
                aria-label="Hide tip"
              >
                Hide
              </button>
            </div>
            <div style={styles.hintText}>
              Move your photo with 1 finger. Pinch with 2 fingers to resize and rotate it behind the frame.
            </div>
          </div>
        )}
        <div
          style={{
            ...styles.postcardWrap,
            ...(isLandscape ? { flex: "1 1 auto", minWidth: 0 } : null),
          }}
        >
          <div
            style={{
              ...styles.postcard,
              ...(isLandscape
                ? {
                    maxWidth: "min(78vw, 920px)",
                    boxShadow: "0 18px 60px rgba(0,0,0,0.42)",
                  }
                : null),
            }}
            onPointerDown={onPhotoPointerDown}
            onPointerMove={onPhotoPointerMove}
            onPointerUp={onPhotoPointerUp}
            onPointerCancel={onPhotoPointerUp}
            onLostPointerCapture={onPhotoPointerUp}
          >
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
              <div
                style={styles.photoStage}
              >
                {imageUrl && !imageFailed ? (
                  <img
                    src={imageUrl}
                    alt="Postcard background"
                    style={{
                      ...styles.bgImage,
                      transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale}) rotate(${rotation}deg)`,
                    }}
                    onLoad={(e) => {
                      const img = e.currentTarget
                      // eslint-disable-next-line no-console
                      console.log("🧪 EditorDebug image:onLoad", debugIdRef.current, {
                        srcPrefix: String(img.currentSrc || img.src || "").slice(0, 80),
                        naturalWidth: img.naturalWidth,
                        naturalHeight: img.naturalHeight,
                      })
                    }}
                    onError={() => setImageFailed(true)}
                    draggable={false}
                  />
                ) : (
                  <div style={styles.bgPlaceholder}>
                    <div style={{ fontSize: "2.25rem" }}>📮</div>
                    <div style={{ marginTop: "0.5rem", opacity: 0.85, fontWeight: 800 }}>No image</div>
                  </div>
                )}
              </div>
            </div>

            {!templateFailed ? (
              <img
                src={`/postcards/${template}.png`}
                alt=""
                style={styles.template}
                onError={() => setTemplateFailed(true)}
              />
            ) : (
              <div style={styles.templateFallback} />
            )}

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
          </div>
        </div>

        {isLandscape ? (
          <div
            style={{
              width: "min(300px, 22vw)",
              maxWidth: "min(300px, 22vw)",
              minWidth: 240,
              alignSelf: "stretch",
              overflowY: "auto",
              maxHeight: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {showPhotoGestureHint ? (
              <div
                style={{
                  ...styles.hint,
                  maxWidth: "100%",
                  width: "100%",
                  padding: "0.45rem 0.6rem",
                  borderRadius: 12,
                  gap: 6,
                }}
                role="status"
                aria-live="polite"
              >
                <div style={styles.hintTopRow}>
                  <div style={styles.hintLabel}>💡 Hint</div>
                  <button
                    type="button"
                    onClick={() => setShowPhotoGestureHint(false)}
                    style={{
                      ...styles.hintHideBtn,
                      padding: "0.25rem 0.55rem",
                    }}
                    aria-label="Hide tip"
                  >
                    Hide
                  </button>
                </div>
                <div style={{ ...styles.hintText, fontSize: "0.78rem", lineHeight: 1.2, fontWeight: 750 }}>
                  Move your photo with 1 finger. Pinch with 2 fingers to resize and rotate it behind the frame.
                </div>
              </div>
            ) : null}

            <div
              style={{
                ...styles.inputCard,
                width: "100%",
                maxWidth: "100%",
                alignSelf: "stretch",
                padding: 12,
              }}
            >
              <div style={styles.inputLabelRow}>
                <div style={styles.inputLabel}>Your message</div>
                <div style={styles.charCount}>
                  {message.length}/{MAX_MESSAGE_LEN}
                </div>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LEN))}
                placeholder="Write a message…"
                style={styles.textarea}
                rows={6}
              />
              {templateFailed && <div style={styles.note}>Template missing: add `public/postcards/template-1.png`.</div>}
            </div>
          </div>
        ) : (
          <div style={styles.inputCard}>
            <div style={styles.inputLabelRow}>
              <div style={styles.inputLabel}>Your message</div>
              <div style={styles.charCount}>
                {message.length}/{MAX_MESSAGE_LEN}
              </div>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LEN))}
              placeholder="Write a message…"
              style={styles.textarea}
              rows={3}
            />
            {templateFailed && <div style={styles.note}>Template missing: add `public/postcards/template-1.png`.</div>}
          </div>
        )}
      </div>
    </div>
  )
}

function Header({
  title,
  onBack,
  right,
  compact,
}: {
  title: string
  onBack: () => void
  right: React.ReactNode
  compact?: boolean
}) {
  return (
    <div
      style={{
        ...styles.header,
        ...(compact
          ? {
              padding: "0.6rem 0.75rem",
              paddingTop: "0.6rem",
            }
          : null),
      }}
    >
      <button onClick={onBack} style={styles.backBtn}>
        <ArrowLeft size={20} />
        <span style={{ fontWeight: 700 }}>Back</span>
      </button>
      <div style={styles.headerTitle}>{title}</div>
      <div style={{ width: 72, display: "flex", justifyContent: "flex-end" }}>{right}</div>
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
    pointerEvents: "auto",
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
    position: "relative",
    zIndex: 2,
    pointerEvents: "auto",
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
    pointerEvents: "auto",
    touchAction: "manipulation",
  },
  headerTitle: { fontSize: "1.125rem", fontWeight: 800 },
  doneBtn: {
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.22)",
    color: "white",
    fontWeight: 900,
    padding: "0.55rem 0.9rem",
    borderRadius: 12,
    cursor: "pointer",
    pointerEvents: "auto",
    touchAction: "manipulation",
  },
  content: {
    flex: 1,
    overflowY: "auto",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    position: "relative",
    zIndex: 1,
    pointerEvents: "auto",
  },
  hint: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 14,
    padding: "0.75rem 0.9rem",
    backdropFilter: "blur(10px)",
    fontWeight: 800,
    fontSize: "0.9rem",
    opacity: 0.95,
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: 8,
  },
  hintTopRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  hintLabel: {
    fontSize: "0.75rem",
    opacity: 0.88,
    fontWeight: 500,
    letterSpacing: "0.2px",
  },
  hintText: {
    fontSize: "0.9rem",
    fontWeight: 800,
    lineHeight: 1.3,
  },
  hintHideBtn: {
    background: "rgba(255,255,255,0.16)",
    border: "1px solid rgba(255,255,255,0.22)",
    color: "white",
    fontWeight: 900,
    borderRadius: 999,
    padding: "0.35rem 0.7rem",
    cursor: "pointer",
    flexShrink: 0,
  },
  postcardWrap: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    pointerEvents: "auto",
    flex: "0 0 auto",
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
    pointerEvents: "auto",
    touchAction: "none",
  },
  photoMask: {
    position: "absolute",
    // Approximate the visible photo window on the left side of the postcard template.
    left: "7%",
    top: "22%",
    width: "42%",
    height: "56%",
    overflow: "hidden",
    borderRadius: 10,
    pointerEvents: "auto",
    touchAction: "none",
    background: "rgba(0,0,0,0.06)",
  },
  photoStage: {
    position: "absolute",
    inset: 0,
    pointerEvents: "auto",
    touchAction: "none",
  },
  bgImage: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center",
    filter: "saturate(1.05) contrast(1.05)",
    pointerEvents: "none",
    transformOrigin: "center center",
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTouchCallout: "none",
  },
  bgPlaceholder: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,0,0,0.35)",
    pointerEvents: "none",
  },
  template: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "contain",
    objectPosition: "center",
    pointerEvents: "none",
  },
  templateFallback: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background:
      "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.22) 100%)",
    outline: "2px solid rgba(255,255,255,0.15)",
    outlineOffset: "-10px",
  },
  textLayer: {
    position: "absolute",
    inset: 0,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    gap: 8,
    pointerEvents: "none",
  },
  messageOnCard: {
    position: "absolute",
    // Template is 3:2 and typically has photo left / writing right.
    // Place text into the right-side writing area.
    top: "40%",
    right: "7.5%",
    width: "41%",
    height: "46%",
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
    pointerEvents: "none",
    // Slight shadow to keep legible over template highlights, but still "ink-like".
    textShadow: "0 1px 0 rgba(255,255,255,0.28)",
  },
  inputCard: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 14,
    backdropFilter: "blur(12px)",
    position: "relative",
    zIndex: 2,
    pointerEvents: "auto",
    flex: "1 1 auto",
  },
  inputLabelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  inputLabel: { fontWeight: 800, fontSize: "0.95rem" },
  charCount: { fontSize: "0.8rem", opacity: 0.8 },
  textarea: {
    width: "100%",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.18)",
    color: "white",
    padding: "10px 12px",
    fontSize: "0.95rem",
    outline: "none",
    resize: "none",
    pointerEvents: "auto",
    touchAction: "manipulation",
  },
  note: {
    marginTop: 10,
    fontSize: "0.8rem",
    opacity: 0.85,
  },
  errorCard: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 16,
    backdropFilter: "blur(12px)",
    textAlign: "center",
  },
  errorTitle: { fontSize: "1.1rem", fontWeight: 900, marginBottom: 6 },
  errorText: { opacity: 0.9, marginBottom: 14, fontSize: "0.95rem", lineHeight: 1.35 },
  primaryButton: {
    width: "100%",
    background: "rgba(255,255,255,0.2)",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "white",
    fontWeight: 800,
    padding: "0.85rem 1rem",
    borderRadius: 12,
    cursor: "pointer",
  },
}

