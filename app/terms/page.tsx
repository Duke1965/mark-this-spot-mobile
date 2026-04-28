"use client"

import { useRouter } from "next/navigation"

export const dynamic = "force-dynamic"

export default function TermsPage() {
  const router = useRouter()
  const onBack = () => {
    try {
      if (typeof window !== "undefined" && window.history.length > 1) router.back()
      else router.push("/")
    } catch {
      router.push("/")
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
        color: "white",
        padding: "2rem 1rem",
      }}
    >
      <div
        style={{
          width: "min(760px, 100%)",
          margin: "0 auto",
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 16,
          padding: 16,
          backdropFilter: "blur(12px)",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            background: "transparent",
            border: "none",
            color: "white",
            cursor: "pointer",
            fontWeight: 900,
            padding: "0.4rem 0.25rem",
            marginBottom: 8,
          }}
        >
          ← Back
        </button>
        <div style={{ fontSize: "1.35rem", fontWeight: 950, marginBottom: 10 }}>PINIT Terms of Use</div>
        <div style={{ opacity: 0.94, lineHeight: 1.55, display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            PINIT is provided as a tool for saving places, creating postcards, and sharing links.
          </div>
          <div>
            You are responsible for the content you create and share using PINIT, including photos, messages, stickers, titles,
            and descriptions.
          </div>
          <div>
            Do not upload or share unlawful, harmful, offensive, or infringing content.
          </div>
          <div>
            PINIT may rely on third-party services such as maps, authentication, storage, and place data providers.
          </div>
          <div>
            PINIT is provided “as is” without warranties. Location and place data may not always be perfectly accurate, and PINIT
            is not responsible for decisions made based on app data.
          </div>
          <div>
            Accounts may be disabled for abuse or misuse.
          </div>
          <div>
            These terms may be updated from time to time.
          </div>
          <div>
            Contact:{" "}
            <a href="mailto:support@app-titude.co" style={{ color: "white", fontWeight: 900, textDecoration: "underline" }}>
              support@app-titude.co
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

