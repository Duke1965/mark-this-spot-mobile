"use client"

import type { ReactNode } from "react"

export default function DraftExitDialog({
  open,
  title = "Save your postcard as a draft?",
  onSave,
  onDiscard,
  onCancel,
}: {
  open: boolean
  title?: string
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
}) {
  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 5000,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "min(420px, 92vw)",
          background: "rgba(255,255,255,0.96)",
          border: "1px solid rgba(79,59,43,0.12)",
          borderRadius: 16,
          padding: 14,
          color: "#3a2e1e",
          boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
          backdropFilter: "blur(14px)",
        }}
      >
        <div style={{ fontWeight: 950, fontSize: "1.05rem" }}>{title}</div>
        <div style={{ marginTop: 6, opacity: 0.92, lineHeight: 1.35, fontSize: "0.92rem" }}>
          You can come back later and finish it.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          <button type="button" onClick={onSave} style={btnPrimary}>
            Save Draft
          </button>
          <button type="button" onClick={onDiscard} style={btnDanger}>
            Discard
          </button>
          <button type="button" onClick={onCancel} style={btnSecondary}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

const baseBtn: React.CSSProperties = {
  width: "100%",
  borderRadius: 14,
  padding: "0.85rem 1rem",
  fontWeight: 950,
  cursor: "pointer",
  border: "1px solid rgba(79,59,43,0.15)",
}

const btnPrimary: React.CSSProperties = {
  ...baseBtn,
  background: "rgba(79,59,43,0.1)",
  color: "#4f3b2b",
}

const btnSecondary: React.CSSProperties = {
  ...baseBtn,
  background: "rgba(79,59,43,0.05)",
  color: "#4f3b2b",
}

const btnDanger: React.CSSProperties = {
  ...baseBtn,
  background: "rgba(239,68,68,0.12)",
  border: "1px solid rgba(239,68,68,0.25)",
  color: "#b91c1c",
}

