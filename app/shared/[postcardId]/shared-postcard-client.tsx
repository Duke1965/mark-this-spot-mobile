"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { getTemplateConfig } from "@/app/postcard/editor/template-config"
import { Caveat } from "next/font/google"
import { getHintsEnabled } from "@/lib/hints"

const caveat = Caveat({ subsets: ["latin"], weight: ["500", "600"] })

type StickerItem = {
  id: string
  name: string
  imageUrl: string
  x: number
  y: number
  scale: number
  rotation: number
}

export type SharedPostcardData = {
  postcardId: string
  template: string
  imageUrl: string
  message: string
  title: string
  description: string
  stickers: StickerItem[]
  transform: { tx?: number; ty?: number; scale?: number; rotation?: number }
}

const ORIENTATION_HINT_KEY = "pinit-shared-rotate-hint-v1"
const BASE_POSTCARD_W = 420
const BASE_POSTCARD_H = 280

export default function SharedPostcardClient({ data }: { data: SharedPostcardData }) {
  const templateConfig = useMemo(() => getTemplateConfig(data.template), [data.template])
  const [isLandscape, setIsLandscape] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [hintsEnabled, setHintsEnabled] = useState(true)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [compositionScale, setCompositionScale] = useState(1)

  useEffect(() => {
    setHintsEnabled(getHintsEnabled())
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const mql = window.matchMedia?.("(orientation: landscape)")
    const update = () => setIsLandscape(!!mql?.matches)
    update()
    if (!mql) return
    if (typeof mql.addListener === "function") mql.addListener(update)
    else mql.addEventListener?.("change", update)
    return () => {
      if (typeof mql.removeListener === "function") mql.removeListener(update)
      else mql.removeEventListener?.("change", update)
    }
  }, [])

  useEffect(() => {
    try {
      if (typeof window === "undefined") return
      if (!hintsEnabled) return
      if (isLandscape) return
      if (sessionStorage.getItem(ORIENTATION_HINT_KEY)) return
      sessionStorage.setItem(ORIENTATION_HINT_KEY, "1")
      setShowHint(true)
      return
    } catch {
      return
    }
  }, [isLandscape, hintsEnabled])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const update = () => {
      const w = el.clientWidth || 0
      if (!w) return
      const next = Math.max(0.5, Math.min(3, w / BASE_POSTCARD_W))
      setCompositionScale(next)
    }

    update()
    // Keep scaling in sync on desktop/laptop resizes.
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => update())
      ro.observe(el)
      return () => ro.disconnect()
    }
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  const t = data.transform || {}

  return (
    <div
      style={{
        ...styles.screen,
        ...(isLandscape
          ? {
              padding: "0.75rem",
              justifyContent: "center",
            }
          : null),
      }}
    >
      {!isLandscape ? (
        <div style={styles.header}>
          <div style={styles.headerTitle}>Shared Postcard</div>
        </div>
      ) : null}

      {showHint && !isLandscape ? (
        <div style={styles.hint} role="status" aria-live="polite">
          <div style={styles.hintTopRow}>
            <div style={styles.hintLabel}>💡 Hint</div>
            <button type="button" onClick={() => setShowHint(false)} style={styles.hintHideBtn} aria-label="Hide tip">
              Hide
            </button>
          </div>
          <div style={styles.hintText}>Rotate your phone for immersive postcard view</div>
        </div>
      ) : null}

      <div
        style={{
          ...styles.content,
          ...(isLandscape
            ? {
                padding: 0,
                gap: "0.75rem",
              }
            : null),
        }}
      >
        <div
          style={{
            ...styles.postcardWrap,
            ...(isLandscape
              ? {
                  width: "100%",
                }
              : null),
          }}
        >
          <div
            style={{
              ...styles.postcardViewport,
              ...(isLandscape
                ? {
                    maxWidth: "min(94vw, 980px)",
                    boxShadow: "0 22px 80px rgba(0,0,0,0.45)",
                  }
                : null),
            }}
            ref={viewportRef}
          >
            <div
              style={{
                ...styles.postcardStage,
                height: BASE_POSTCARD_H * compositionScale,
              }}
            >
              <div
                style={{
                  ...styles.postcard,
                  transform: `scale(${compositionScale})`,
                }}
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
                  {data.imageUrl ? (
                    <img
                      src={data.imageUrl}
                      alt={data.title}
                      draggable={false}
                      style={{
                        ...styles.bgImage,
                        transform: `translate3d(${Number(t.tx || 0)}px, ${Number(t.ty || 0)}px, 0) scale(${Number(
                          t.scale || 1
                        )}) rotate(${Number(t.rotation || 0)}deg)`,
                      }}
                    />
                  ) : (
                    <div style={styles.missing}>No image</div>
                  )}
                </div>

                <img src={`/postcards/${data.template}.png`} alt="" style={styles.template} />

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
                  >
                    {data.message}
                  </div>
                </div>

                <div style={styles.stickersLayer}>
                  {data.stickers.map((s) => (
                    <img
                      key={s.id}
                      src={s.imageUrl}
                      alt={s.name}
                      draggable={false}
                      style={{
                        ...styles.stickerImg,
                        left: `${Number(s.x || 50)}%`,
                        top: `${Number(s.y || 50)}%`,
                        transform: `translate(-50%, -50%) scale(${Number(s.scale || 1)}) rotate(${Number(s.rotation || 0)}deg)`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {!isLandscape ? (
          <>
            <div style={styles.metaCard}>
              <div style={styles.metaTitle}>{data.title}</div>
              <div style={styles.metaDesc}>{data.description}</div>
            </div>

            <Link href="/" style={styles.cta}>
              Send one back with PINIT
            </Link>
          </>
        ) : (
          <div style={styles.landscapeFooter}>
            <div style={styles.landscapeMeta}>
              <div style={styles.landscapeTitle}>{data.title}</div>
              <div style={styles.landscapeDesc}>{data.description}</div>
            </div>
            <Link href="/" style={styles.landscapeCta}>
              Send one back
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  screen: {
    minHeight: "100dvh",
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
  },
  headerTitle: { fontSize: "1.125rem", fontWeight: 900, textAlign: "center" },
  hint: {
    width: "min(560px, 92vw)",
    alignSelf: "center",
    marginTop: 10,
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 999,
    padding: "0.6rem 0.9rem",
    backdropFilter: "blur(10px)",
    fontWeight: 850,
    fontSize: "0.9rem",
    opacity: 0.95,
    textAlign: "center",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: "flex-start",
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
    fontWeight: 850,
    lineHeight: 1.3,
  },
  hintHideBtn: {
    background: "rgba(255,255,255,0.16)",
    border: "1px solid rgba(255,255,255,0.22)",
    color: "white",
    fontWeight: 950,
    borderRadius: 999,
    padding: "0.35rem 0.7rem",
    cursor: "pointer",
    flexShrink: 0,
  },
  content: {
    flex: 1,
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    alignItems: "center",
  },
  postcardWrap: { width: "100%", display: "flex", justifyContent: "center" },
  postcardViewport: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
    background: "rgba(0,0,0,0.25)",
    border: "1px solid rgba(255,255,255,0.18)",
    boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
  },
  postcardStage: {
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },
  postcard: {
    width: BASE_POSTCARD_W,
    height: BASE_POSTCARD_H,
    aspectRatio: "3 / 2",
    position: "relative",
    transformOrigin: "top left",
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
  metaCard: {
    width: "100%",
    maxWidth: 420,
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 14,
    backdropFilter: "blur(12px)",
  },
  metaTitle: { fontWeight: 900, fontSize: "1.05rem", marginBottom: 6 },
  metaDesc: { opacity: 0.9, lineHeight: 1.35 },
  cta: {
    width: "100%",
    maxWidth: 420,
    textDecoration: "none",
    textAlign: "center",
    background: "rgba(255,255,255,0.2)",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "white",
    fontWeight: 900,
    padding: "0.95rem 1rem",
    borderRadius: 14,
  },
  landscapeFooter: {
    width: "100%",
    maxWidth: "min(94vw, 980px)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "0.5rem 0.25rem 0",
  },
  landscapeMeta: { flex: 1, minWidth: 0 },
  landscapeTitle: { fontWeight: 950, fontSize: "1.05rem", lineHeight: 1.15 },
  landscapeDesc: { opacity: 0.9, lineHeight: 1.25, fontSize: "0.92rem", marginTop: 3 },
  landscapeCta: {
    textDecoration: "none",
    textAlign: "center",
    background: "rgba(255,255,255,0.18)",
    border: "1px solid rgba(255,255,255,0.22)",
    color: "white",
    fontWeight: 950,
    padding: "0.75rem 0.95rem",
    borderRadius: 14,
    flexShrink: 0,
    whiteSpace: "nowrap",
  },
  card: {
    margin: "3rem auto",
    width: "min(520px, 92vw)",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 16,
    backdropFilter: "blur(12px)",
    textAlign: "center",
  },
  title: { fontSize: "1.25rem", fontWeight: 900, marginBottom: 8 },
  text: { opacity: 0.9, lineHeight: 1.35 },
  missing: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
  },
}

