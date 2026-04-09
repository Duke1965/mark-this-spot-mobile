"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"

export default function PreviewClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const template = (searchParams.get("template") || "template-1").trim()

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
        color: "white",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          padding: "1rem",
          paddingTop: "3rem",
          background: "rgba(30, 58, 138, 0.95)",
          borderBottom: "1px solid rgba(255,255,255,0.2)",
          backdropFilter: "blur(15px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
        }}
      >
        <button
          onClick={() => router.push(`/postcard/stickers?template=${encodeURIComponent(template)}`)}
          style={{
            background: "transparent",
            border: "none",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.95rem",
            padding: "0.5rem",
          }}
          type="button"
        >
          <ArrowLeft size={20} />
          <span style={{ fontWeight: 700 }}>Back</span>
        </button>
        <div style={{ fontSize: "1.125rem", fontWeight: 900 }}>Preview (coming soon)</div>
        <div style={{ width: 72 }} />
      </div>

      <div style={{ flex: 1, padding: "2rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 16,
            padding: 16,
            backdropFilter: "blur(12px)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "1.1rem", fontWeight: 900, marginBottom: 6 }}>Preview screen placeholder</div>
          <div style={{ opacity: 0.9, lineHeight: 1.35 }}>
            Stickers are saved. Next we’ll build a full preview and sharing flow.
          </div>
        </div>
      </div>
    </div>
  )
}

