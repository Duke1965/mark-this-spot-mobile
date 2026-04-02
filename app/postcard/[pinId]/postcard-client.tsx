"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { usePinStorage } from "@/hooks/usePinStorage"
import type { PinData } from "@/lib/types"

const ALLOWED_TEMPLATES = new Set(["template-1", "template-2", "template-3", "template-4"])
const ROTATE_HINT_KEY = "pinit-postcard-rotate-hint-shown-v1"

export default function PostcardClient({
  pinId,
  template,
  imageUrl,
  title,
  description,
  onBack,
}: {
  pinId?: string
  template?: string
  imageUrl?: string | null
  title?: string
  description?: string
  onBack?: () => void
}) {
  const router = useRouter()
  const { pins } = usePinStorage()

  const resolvedTemplate = ALLOWED_TEMPLATES.has(String(template)) ? String(template) : "template-1"

  const pin: PinData | null = useMemo(() => {
    if (!pinId) return null
    return pins.find((p) => p.id === pinId) || null
  }, [pinId, pins])

  const [message, setMessage] = useState("")
  const MAX_MESSAGE_LEN = 160

  const [imageFailed, setImageFailed] = useState(false)
  const [templateFailed, setTemplateFailed] = useState(false)
  const [showRotateHint, setShowRotateHint] = useState(false)

  useEffect(() => {
    setImageFailed(false)
    setTemplateFailed(false)
    setMessage("")
  }, [pinId, resolvedTemplate])

  useEffect(() => {
    try {
      if (typeof window === "undefined") return
      if (sessionStorage.getItem(ROTATE_HINT_KEY)) return
      sessionStorage.setItem(ROTATE_HINT_KEY, "1")
      setShowRotateHint(true)
      const t = window.setTimeout(() => setShowRotateHint(false), 4500)
      return () => window.clearTimeout(t)
    } catch {
      return
    }
  }, [])

  const resolvedTitle = (title || pin?.title || pin?.locationName || "").trim() || (pinId ? "Saved Place" : "My Postcard")
  const resolvedDescription = (description || pin?.description || "").trim() || (pinId ? "A spot worth remembering." : "")
  const resolvedImageUrl =
    imageUrl ||
    pin?.mediaUrl ||
    pin?.additionalPhotos?.find((p) => p?.url && p.url !== "/pinit-placeholder.jpg")?.url ||
    null

  if (!pinId && !resolvedImageUrl) {
    return (
      <div style={styles.screen}>
        <Header title="Postcard" onBack={onBack || (() => router.back())} />
        <div style={styles.content}>
          <div style={styles.errorCard}>
            <div style={styles.errorTitle}>Postcard</div>
            <div style={styles.errorText}>Missing image.</div>
            <button style={styles.primaryButton} onClick={() => (onBack ? onBack() : router.push("/"))}>
              Go back
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (pinId && !pin) {
    return (
      <div style={styles.screen}>
        <Header title="Postcard" onBack={onBack || (() => router.back())} />
        <div style={styles.content}>
          <div style={styles.errorCard}>
            <div style={styles.errorTitle}>Couldn’t find this pin</div>
            <div style={styles.errorText}>This pin may have been deleted or not synced yet.</div>
            <button style={styles.primaryButton} onClick={() => (onBack ? onBack() : router.back())}>
              Go back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.screen}>
      <Header title="Postcard" onBack={onBack || (() => router.back())} />

      <div style={styles.content}>
        {showRotateHint && (
          <div
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 14,
              padding: "0.75rem 0.9rem",
              backdropFilter: "blur(10px)",
              fontWeight: 800,
              fontSize: "0.9rem",
              opacity: 0.95,
            }}
          >
            💡 Rotate your phone for a better editing experience
          </div>
        )}
        <div style={styles.postcardWrap}>
          <div style={styles.postcard}>
            {/* Background image */}
            {resolvedImageUrl && !imageFailed ? (
              <img
                src={resolvedImageUrl}
                alt={resolvedTitle}
                style={styles.bgImage}
                onError={() => setImageFailed(true)}
              />
            ) : (
              <div style={styles.bgPlaceholder}>
                <div style={{ fontSize: "2.25rem" }}>📮</div>
                <div style={{ marginTop: "0.5rem", opacity: 0.85, fontWeight: 700 }}>No image</div>
              </div>
            )}

            {/* Template overlay */}
            {!templateFailed ? (
              <img
                src={`/postcards/${resolvedTemplate}.png`}
                alt=""
                style={styles.template}
                onError={() => setTemplateFailed(true)}
              />
            ) : (
              <div style={styles.templateFallback} />
            )}

            {/* Text overlay */}
            <div style={styles.textLayer}>
              <div style={styles.title} title={resolvedTitle}>
                {resolvedTitle}
              </div>
              <div style={styles.desc} title={resolvedDescription}>
                {resolvedDescription}
              </div>

              {message.trim().length > 0 && (
                <div style={styles.messageBubble}>
                  <div style={styles.messageText}>{message}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Message input */}
        <div style={styles.inputCard}>
          <div style={styles.inputLabelRow}>
            <div style={styles.inputLabel}>Message</div>
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
          {templateFailed && (
            <div style={styles.note}>
              Template missing: add `public/postcards/template-1.png`.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={styles.header}>
      <button onClick={onBack} style={styles.backBtn}>
        <ArrowLeft size={20} />
        <span style={{ fontWeight: 700 }}>Back</span>
      </button>
      <div style={styles.headerTitle}>{title}</div>
      <div style={{ width: 72 }} />
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
  },
  headerTitle: { fontSize: "1.125rem", fontWeight: 800 },
  content: {
    flex: 1,
    overflowY: "auto",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
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
  },
  bgImage: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center",
    filter: "saturate(1.05) contrast(1.05)",
  },
  bgPlaceholder: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,0,0,0.35)",
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
  title: {
    fontSize: "1.05rem",
    fontWeight: 900,
    textShadow: "0 3px 18px rgba(0,0,0,0.6)",
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },
  desc: {
    fontSize: "0.85rem",
    opacity: 0.95,
    textShadow: "0 3px 18px rgba(0,0,0,0.55)",
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
  },
  messageBubble: {
    marginTop: 6,
    maxWidth: "100%",
    alignSelf: "flex-start",
    background: "rgba(0,0,0,0.35)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 14,
    padding: "10px 12px",
    backdropFilter: "blur(10px)",
  },
  messageText: {
    fontSize: "0.85rem",
    lineHeight: 1.3,
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
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

