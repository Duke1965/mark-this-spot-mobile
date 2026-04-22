"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import DraftExitDialog from "../_components/DraftExitDialog"

const TEMPLATES = ["template-1", "template-2", "template-3", "template-4"] as const
const DRAFT_KEY = "pinit-postcard-draft-v1"

export default function PostcardTemplatesPage() {
  const router = useRouter()
  const [exitOpen, setExitOpen] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)

  useEffect(() => {
    try {
      setHasDraft(!!sessionStorage.getItem(DRAFT_KEY))
    } catch {
      setHasDraft(false)
    }
  }, [])

  const exitToHome = () => {
    router.push("/")
  }

  const onBack = () => {
    if (hasDraft) {
      setExitOpen(true)
      return
    }
    exitToHome()
  }

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
          onClick={onBack}
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
        >
          <ArrowLeft size={20} />
          <span style={{ fontWeight: 700 }}>Back</span>
        </button>
        <div style={{ fontSize: "1.125rem", fontWeight: 800 }}>Postcard Templates</div>
        <div style={{ width: 72 }} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <div style={{ fontSize: "0.9rem", opacity: 0.85, marginBottom: "0.75rem" }}>
            Choose a template to create your postcard
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "0.75rem",
            }}
          >
            {TEMPLATES.map((t) => (
              <button
                key={t}
                onClick={() => router.push(`/postcard/new?template=${encodeURIComponent(t)}`)}
                style={{
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: 16,
                  padding: 10,
                  color: "white",
                  cursor: "pointer",
                  textAlign: "left",
                  backdropFilter: "blur(10px)",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "3 / 2",
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "rgba(0,0,0,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  <img
                    src={`/postcards/${t}.png`}
                    alt={t}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    onError={(e) => {
                      const el = e.target as HTMLImageElement
                      el.style.display = "none"
                    }}
                  />
                  <div style={{ position: "absolute", opacity: 0.85, fontWeight: 800 }}>{t}</div>
                </div>
                <div style={{ marginTop: 8, fontWeight: 800, fontSize: "0.95rem" }}>
                  {t.replace("-", " ").replace("template", "Template")}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <DraftExitDialog
        open={exitOpen}
        onSave={() => {
          // Draft already lives in sessionStorage; keep it and exit.
          setExitOpen(false)
          exitToHome()
        }}
        onDiscard={() => {
          try {
            sessionStorage.removeItem(DRAFT_KEY)
          } catch {
            // ignore
          }
          setExitOpen(false)
          exitToHome()
        }}
        onCancel={() => setExitOpen(false)}
      />
    </div>
  )
}

