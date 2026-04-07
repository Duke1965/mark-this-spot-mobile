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
  const [message, setMessage] = useState("")
  const [tapCount, setTapCount] = useState(0)

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

  return (
    <div style={styles.screen}>
      <Header title="Postcard Editor Debug" onBack={() => router.push(`/postcard/new?template=${encodeURIComponent(template)}`)} />

      <div style={styles.content}>
        <div style={styles.debugCard}>
          <div style={styles.debugTitle}>Postcard Editor Debug</div>
          <div style={styles.debugSub}>
            template: <span style={styles.mono}>{template}</span>
          </div>
          <div style={styles.debugSub}>
            imageUrl in sessionStorage: <span style={styles.mono}>{imageUrl ? "present" : "missing"}</span>
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
          <button
            type="button"
            style={styles.tapTestButton}
            onClick={() => {
              setTapCount((c) => c + 1)
              try {
                window.alert("Tap Test: button is clickable")
              } catch {
                // ignore
              }
            }}
          >
            Tap Test ({tapCount})
          </button>
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
  debugCard: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 14,
    backdropFilter: "blur(12px)",
  },
  debugTitle: { fontSize: "1.05rem", fontWeight: 900, marginBottom: 8 },
  debugSub: { fontSize: "0.9rem", opacity: 0.92, lineHeight: 1.35 },
  mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" },
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
  tapTestButton: {
    marginTop: 12,
    width: "100%",
    background: "rgba(255,255,255,0.2)",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "white",
    fontWeight: 900,
    padding: "0.95rem 1rem",
    borderRadius: 14,
    cursor: "pointer",
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

