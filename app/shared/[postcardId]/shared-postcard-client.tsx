"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { getTemplateConfig } from "@/app/postcard/editor/template-config"
import { Caveat } from "next/font/google"
import { sanitizePlaceDescription } from "@/lib/sanitizePlaceDescription"
import { openGoogleMapsNavigation } from "@/lib/openGoogleMapsNavigation"
import { hasPostcardNavigationCoords } from "@/lib/postcardLocation"
import { isInsideMappo } from "@/lib/isInsideMappo"
import { MAPPO_SUBPAGE_BG } from "@/lib/mappoBackgrounds"
import { mappoBackButtonStyle } from "@/lib/mappoHeaderStyles"

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
  imageUrl: string | null
  latitude?: number | null
  longitude?: number | null
  locationName?: string | null
  message: string
  title: string
  description: string
  stickers: StickerItem[]
  transform: { tx?: number; ty?: number; scale?: number; rotation?: number }
}

const BASE_POSTCARD_W = 420
const BASE_POSTCARD_H = 280
const MAX_MESSAGE_LEN = 60

export default function SharedPostcardClient({ data }: { data: SharedPostcardData }) {
  const templateConfig = useMemo(() => getTemplateConfig(data.template), [data.template])
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [compositionScale, setCompositionScale] = useState(1)
  const [insideMappo, setInsideMappo] = useState(false)

  useEffect(() => {
    setInsideMappo(isInsideMappo())
  }, [])

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

  const displayDescription = useMemo(
    () => sanitizePlaceDescription(data.description),
    [data.description]
  )

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <Link href="/" style={styles.homeBtn}>← Home</Link>
        <div style={styles.headerTitle}>Shared Postcard</div>
        <div style={{ width: 60 }} />
      </div>

      <div style={styles.content}>
        <div style={styles.postcardWrap}>
          <div style={styles.postcardViewport} ref={viewportRef}>
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
                  ) : null}
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
                    {String(data.message || "").slice(0, MAX_MESSAGE_LEN)}
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

        <div style={styles.metaCard}>
          <div style={styles.metaTitle}>{data.title}</div>
          <div style={styles.metaDesc}>{displayDescription}</div>
        </div>

        {hasPostcardNavigationCoords(data.latitude, data.longitude) ? (
          <button
            type="button"
            style={styles.goThere}
            onClick={() =>
              openGoogleMapsNavigation({
                latitude: data.latitude,
                longitude: data.longitude,
                placeName: data.locationName?.trim() || String(data.title || "").trim(),
              })
            }
          >
            Go there
          </button>
        ) : null}

        {!insideMappo ? (
          <Link href="/" style={{ ...styles.cta, marginTop: 10 }}>
            Get Mappo to reply
          </Link>
        ) : null}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  screen: {
    minHeight: "100dvh",
    backgroundImage: `url(${MAPPO_SUBPAGE_BG})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundColor: "#eef8f4",
    color: "#3a2e1e",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "1rem",
    paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)",
    background: "rgba(255,255,255,0.7)",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    backdropFilter: "blur(18px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.5rem",
  },
  headerTitle: { fontSize: "1.125rem", fontWeight: 900, textAlign: "center", flex: 1 },
  homeBtn: {
    ...mappoBackButtonStyle,
    textDecoration: "none",
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
    background: "rgba(0,0,0,0.06)",
    border: "1px solid rgba(79,59,43,0.1)",
    boxShadow: "0 8px 30px rgba(0,0,0,0.1)",
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
    width: 120,
    height: 120,
    transformOrigin: "center center",
    pointerEvents: "none",
  },
  metaCard: {
    width: "100%",
    maxWidth: 420,
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(79,59,43,0.1)",
    borderRadius: 16,
    padding: 14,
    backdropFilter: "blur(12px)",
  },
  metaTitle: { fontWeight: 900, fontSize: "1.05rem", marginBottom: 6 },
  metaDesc: { opacity: 0.7, lineHeight: 1.35 },
  cta: {
    width: "100%",
    maxWidth: 420,
    textDecoration: "none",
    textAlign: "center",
    background: "rgba(79,59,43,0.1)",
    border: "1px solid rgba(79,59,43,0.15)",
    color: "#4f3b2b",
    fontWeight: 900,
    padding: "0.95rem 1rem",
    borderRadius: 14,
  },
  goThere: {
    width: "100%",
    maxWidth: 420,
    textAlign: "center",
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(79,59,43,0.12)",
    color: "#4f3b2b",
    fontWeight: 900,
    padding: "0.95rem 1rem",
    borderRadius: 14,
    cursor: "pointer",
    marginTop: 10,
  },
  card: {
    margin: "3rem auto",
    width: "min(520px, 92vw)",
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(79,59,43,0.1)",
    borderRadius: 16,
    padding: 16,
    backdropFilter: "blur(12px)",
    textAlign: "center",
  },
  title: { fontSize: "1.25rem", fontWeight: 900, marginBottom: 8 },
  text: { opacity: 0.75, lineHeight: 1.35 },
  missing: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
  },
}

