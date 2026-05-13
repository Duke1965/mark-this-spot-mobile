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
    backgroundImage: "url(/brand/mappo/mappo-home-bg.png)",
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
    background: "transparent",
    border: "none",
    color: "#4f3b2b",
    cursor: "pointer",
    fontWeight: 900,
    padding: "0.5rem",
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
  title: { fontWeight: 950, fontSize: "1.15rem" },
  desc: { opacity: 0.75, lineHeight: 1.35, marginTop: 8 },
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
}
