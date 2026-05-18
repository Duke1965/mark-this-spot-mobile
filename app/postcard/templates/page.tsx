"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { usePostcardExit } from "../_components/usePostcardExit"
import {
  mappoBackButtonAbsoluteStyle,
  mappoHeaderBarStyle,
  mappoTitleImageStyle,
} from "@/lib/mappoHeaderStyles"

const TEMPLATES = ["template-1", "template-2", "template-3", "template-4"] as const
const TEMPLATE_LABELS: Record<(typeof TEMPLATES)[number], string> = {
  "template-1": "Classic",
  "template-2": "Vintage Blue",
  "template-3": "Airmail",
  "template-4": "Sunset",
}

export default function PostcardTemplatesPage() {
  const router = useRouter()
  const { handleExit, exitDialog } = usePostcardExit({ router })

  const onBack = () => {
    handleExit(() => router.push("/"))
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundImage: "url(/brand/mappo/mappo-create-bg.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#eef8f4",
        color: "#3a2e1e",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
      }}
    >
      <div style={mappoHeaderBarStyle}>
        <button type="button" onClick={onBack} style={mappoBackButtonAbsoluteStyle}>
          <ArrowLeft size={20} />
          Back
        </button>
        <img
          src="/brand/mappo/mappo-create-title.png"
          alt="Create"
          style={mappoTitleImageStyle}
        />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <div style={{ fontSize: "0.9rem", opacity: 0.7, marginBottom: "0.75rem" }}>
            Choose a postcard style
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
                  border: "1px solid rgba(79,59,43,0.1)",
                  background: "rgba(255,255,255,0.72)",
                  borderRadius: 16,
                  padding: 10,
                  color: "#3a2e1e",
                  cursor: "pointer",
                  textAlign: "left",
                  backdropFilter: "blur(10px)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "3 / 2",
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "rgba(0,0,0,0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid rgba(79,59,43,0.08)",
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
                </div>
                <div style={{ marginTop: 8, fontWeight: 800, fontSize: "0.95rem" }}>
                  {TEMPLATE_LABELS[t]}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {exitDialog}
    </div>
  )
}

