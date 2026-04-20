"use client"

import type { CSSProperties } from "react"
import { Send } from "lucide-react"
import type { PinData } from "@/lib/types"
import { sanitizePlaceDescription } from "@/lib/sanitizePlaceDescription"

export function PinResults({
  pin,
  onSave,
  onShare,
  onBack,
}: {
  pin: PinData
  onSave: (pin: PinData) => void
  onShare: (pin: PinData) => void
  onBack: () => void
}) {
  const title = String(pin?.title || pin?.locationName || "Saved Place").trim()
  const description = sanitizePlaceDescription(pin?.description || "")

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <button type="button" onClick={onBack} style={styles.backBtn}>
          Back
        </button>
        <div style={styles.headerTitle}>Pin</div>
        <div style={{ width: 72 }} />
      </div>

      <div style={styles.content}>
        <div style={styles.card}>
          <div style={styles.title}>{title}</div>
          {description ? <div style={styles.desc}>{description}</div> : null}

          <div style={styles.actions}>
            <button type="button" onClick={() => onSave(pin)} style={styles.btn}>
              Save
            </button>
            <button type="button" onClick={() => onShare(pin)} style={styles.btn}>
              Share
            </button>
            <button type="button" onClick={() => (window.location.href = `/postcard/${encodeURIComponent(String(pin.id))}`)} style={styles.btn}>
              <Send size={18} />
              Send Postcard
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
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
    fontWeight: 900,
    padding: "0.5rem",
  },
  content: { flex: 1, overflowY: "auto", padding: "1rem" },
  card: {
    width: "min(720px, 100%)",
    margin: "0 auto",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 14,
    backdropFilter: "blur(12px)",
  },
  title: { fontWeight: 950, fontSize: "1.15rem" },
  desc: { opacity: 0.92, lineHeight: 1.35, marginTop: 8 },
  actions: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 },
  btn: {
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.22)",
    color: "white",
    fontWeight: 900,
    padding: "0.7rem 0.9rem",
    borderRadius: 12,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
}
