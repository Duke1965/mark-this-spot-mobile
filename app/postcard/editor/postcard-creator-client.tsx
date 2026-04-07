"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"

const ALLOWED_TEMPLATES = new Set(["template-1", "template-2", "template-3", "template-4"])
const DRAFT_KEY = "pinit-postcard-draft-v1"
const MAX_MESSAGE_LEN = 160

export default function PostcardCreatorClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const templateParam = (searchParams.get("template") || "").trim()

  const template = useMemo(() => {
    return ALLOWED_TEMPLATES.has(templateParam) ? templateParam : "template-1"
  }, [templateParam])

  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageFailed, setImageFailed] = useState(false)
  const [templateFailed, setTemplateFailed] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as { imageUrl?: string }
      if (parsed?.imageUrl) setImageUrl(parsed.imageUrl)
    } catch {
      // ignore
    }
  }, [])

  if (!imageUrl) {
    return (
      <div style={styles.screen}>
        <Header title="Postcard Editor" onBack={() => router.back()} />
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
      <Header title="Postcard Editor" onBack={() => router.push(`/postcard/new?template=${encodeURIComponent(template)}`)} />

      <div style={styles.content}>
        <div style={styles.postcardWrap}>
          <div style={styles.postcard}>
            {imageUrl && !imageFailed ? (
              <img
                src={imageUrl}
                alt="Postcard background"
                style={styles.bgImage}
                onError={() => setImageFailed(true)}
              />
            ) : (
              <div style={styles.bgPlaceholder}>
                <div style={{ fontSize: "2.25rem" }}>📮</div>
                <div style={{ marginTop: "0.5rem", opacity: 0.85, fontWeight: 800 }}>No image</div>
              </div>
            )}

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
              {message.trim().length > 0 && (
                <div style={styles.messageBubble}>
                  <div style={styles.messageText}>{message}</div>
                </div>
              )}
            </div>
          </div>
        </div>

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
            <div style={styles.note}>Template missing: add `public/postcards/template-1.png`.</div>
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
    pointerEvents: "none",
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
  messageBubble: {
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
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
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

