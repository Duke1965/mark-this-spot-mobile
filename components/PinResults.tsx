"use client"

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react"
import { ArrowLeft, Send } from "lucide-react"
import { MAPPO_SUBPAGE_BG } from "@/lib/mappoBackgrounds"
import { mappoBackButtonStyle } from "@/lib/mappoHeaderStyles"
import type { PinData } from "@/lib/types"
import { sanitizePlaceDescription } from "@/lib/sanitizePlaceDescription"
import {
  acceptedOfficialWebsiteHref,
  displayOfficialWebsiteHost,
} from "@/lib/places/formatPlaceText"
import { openExternalUrl } from "@/lib/openGoogleMapsNavigation"

const PLACEHOLDER_PHOTO = "/pinit-placeholder.jpg"

function pinViewPhotoUrl(pin: PinData): string | null {
  const media = typeof pin.mediaUrl === "string" ? pin.mediaUrl.trim() : ""
  if (media && media !== PLACEHOLDER_PHOTO) return media
  const extra = pin.additionalPhotos?.find(
    (p) => typeof p?.url === "string" && p.url.trim() && p.url !== PLACEHOLDER_PHOTO
  )
  return extra?.url?.trim() || null
}

function OfficialWebsiteVisitLine({ website }: { website?: string }) {
  const href = acceptedOfficialWebsiteHref(website)
  const host = displayOfficialWebsiteHost(website)
  if (!href || !host) return null

  const onOpen = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    event.stopPropagation()
    openExternalUrl(href)
  }

  return (
    <div style={styles.visit}>
      Visit{" "}
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={onOpen} style={styles.siteLink}>
        {host}
      </a>{" "}
      for more information.
    </div>
  )
}

export function PinResults({
  pin,
  onSave,
  onShare,
  onBack,
  onAfterSuccessfulSave,
}: {
  pin: PinData
  onSave: (pin: PinData) => void
  onShare: (pin: PinData) => void
  onBack: () => void
  onAfterSuccessfulSave?: () => void
}) {
  const title = String(pin?.title || pin?.locationName || "Saved Place").trim()
  const description = sanitizePlaceDescription(pin?.description || "")
  const photoUrl = pinViewPhotoUrl(pin)
  const [photoFailed, setPhotoFailed] = useState(false)
  const [saveNotice, setSaveNotice] = useState(false)
  const alreadySaved = pin.isSaved === true
  const saveNavigateTimerRef = useRef<number | null>(null)
  useEffect(() => {
    setPhotoFailed(false)
  }, [photoUrl, pin.id])
  useEffect(() => {
    setSaveNotice(false)
  }, [pin.id])
  useEffect(() => {
    return () => {
      if (saveNavigateTimerRef.current != null) {
        window.clearTimeout(saveNavigateTimerRef.current)
        saveNavigateTimerRef.current = null
      }
    }
  }, [])
  const showPhoto = !!photoUrl && !photoFailed

  const onPressSave = () => {
    if (alreadySaved) return
    onSave(pin)
    setSaveNotice(true)
    if (saveNavigateTimerRef.current != null) {
      window.clearTimeout(saveNavigateTimerRef.current)
    }
    saveNavigateTimerRef.current = window.setTimeout(() => {
      saveNavigateTimerRef.current = null
      onAfterSuccessfulSave?.()
    }, 1400)
  }

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <button type="button" onClick={onBack} style={styles.backBtn}>
          <ArrowLeft size={20} />
          Back
        </button>
        <div style={styles.headerTitle}>Pin</div>
        <div style={{ width: 72 }} />
      </div>

      <div style={styles.content}>
        <div style={styles.card}>
          {showPhoto ? (
            <div style={styles.photoWrap}>
              <img
                src={photoUrl}
                alt={title}
                style={styles.photo}
                onError={() => setPhotoFailed(true)}
              />
            </div>
          ) : null}
          <div style={styles.title}>{title}</div>
          {description ? <div style={styles.desc}>{description}</div> : null}
          <OfficialWebsiteVisitLine website={pin.website} />

          <div style={styles.actions}>
            <button
              type="button"
              onClick={onPressSave}
              disabled={alreadySaved}
              style={alreadySaved ? { ...styles.btn, ...styles.btnSaved } : styles.btn}
            >
              {alreadySaved ? "Saved" : "Save"}
            </button>
            <button type="button" onClick={() => (window.location.href = `/postcard/${encodeURIComponent(String(pin.id))}`)} style={styles.btn}>
              <Send size={18} />
              Send Postcard
            </button>
          </div>
          {saveNotice || alreadySaved ? (
            <div style={styles.savedHint}>Saved to Library</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  screen: {
    position: "fixed",
    inset: 0,
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
    gap: "0.75rem",
  },
  headerTitle: { fontSize: "1.125rem", fontWeight: 900, textAlign: "center", flex: 1 },
  backBtn: {
    ...mappoBackButtonStyle,
    flexShrink: 0,
  },
  content: { flex: 1, overflowY: "auto", padding: "1rem" },
  card: {
    width: "min(720px, 100%)",
    margin: "0 auto",
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(79,59,43,0.1)",
    borderRadius: 16,
    padding: 14,
    backdropFilter: "blur(12px)",
  },
  photoWrap: {
    margin: "-14px -14px 12px",
    borderRadius: "16px 16px 0 0",
    overflow: "hidden",
    background: "rgba(79,59,43,0.06)",
  },
  photo: {
    width: "100%",
    aspectRatio: "16 / 10",
    objectFit: "cover",
    display: "block",
  },
  title: { fontWeight: 950, fontSize: "1.15rem" },
  desc: { color: "rgba(58, 46, 30, 0.75)", lineHeight: 1.35, marginTop: 8 },
  visit: { color: "rgba(58, 46, 30, 0.75)", lineHeight: 1.35, marginTop: 10 },
  siteLink: {
    color: "#1a73e8",
    fontWeight: 500,
    textDecoration: "underline",
    textUnderlineOffset: 2,
    cursor: "pointer",
  },
  actions: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 },
  btn: {
    background: "rgba(79,59,43,0.08)",
    border: "1px solid rgba(79,59,43,0.15)",
    color: "#4f3b2b",
    fontWeight: 900,
    padding: "0.7rem 0.9rem",
    borderRadius: 12,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  btnSaved: {
    background: "rgba(16, 185, 129, 0.14)",
    border: "1px solid rgba(16, 185, 129, 0.35)",
    color: "#047857",
    cursor: "default",
  },
  savedHint: {
    marginTop: 10,
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "#047857",
  },
}
