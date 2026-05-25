"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { mappoBackButtonStyle } from "@/lib/mappoHeaderStyles"

export const dynamic = "force-dynamic"

export default function PrivacyPage() {
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
        backgroundColor: "#eef8f4",
        color: "#3a2e1e",
        padding: "2rem 1rem",
      }}
    >
      <div
        style={{
          width: "min(760px, 100%)",
          margin: "0 auto",
          background: "rgba(255,255,255,0.78)",
          border: "1px solid rgba(79,59,43,0.1)",
          borderRadius: 16,
          padding: 16,
          backdropFilter: "blur(12px)",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{ ...mappoBackButtonStyle, marginBottom: 12 }}
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <div style={{ fontSize: "1.35rem", fontWeight: 950, marginBottom: 10 }}>Mappo Privacy Policy</div>
        <div style={{ opacity: 0.94, lineHeight: 1.55, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontWeight: 900, marginTop: 2 }}>Information Mappo may collect</div>
          <ul style={{ marginLeft: 18, opacity: 0.94, lineHeight: 1.55 }}>
            <li>Account login details such as name/email from your sign-in provider</li>
            <li>Location data needed to pin places and recommend nearby places</li>
            <li>Saved pins</li>
            <li>Postcards, photos, stickers, messages, titles, and descriptions</li>
            <li>Basic usage and diagnostic data to keep the app working</li>
          </ul>

          <div style={{ fontWeight: 900, marginTop: 2 }}>How Mappo uses information</div>
          <ul style={{ marginLeft: 18, opacity: 0.94, lineHeight: 1.55 }}>
            <li>To save your pins and postcards</li>
            <li>To generate share links</li>
            <li>To improve recommendations</li>
            <li>To operate and maintain the app</li>
          </ul>

          <div style={{ fontWeight: 900, marginTop: 2 }}>Hosted postcard links</div>
          <div>
            Recipients can open shared postcard links without logging in. Shared postcards may be visible to anyone with the link.
          </div>

          <div style={{ fontWeight: 900, marginTop: 2 }}>Storage</div>
          <div>Data may be stored using Firebase/Google services.</div>

          <div style={{ fontWeight: 900, marginTop: 2 }}>Third-party services</div>
          <ul style={{ marginLeft: 18, opacity: 0.94, lineHeight: 1.55 }}>
            <li>Firebase (Auth/Storage)</li>
            <li>Maps/place-data providers</li>
            <li>Sharing platforms such as WhatsApp, email, and SMS only when you choose to share</li>
          </ul>

          <div style={{ fontWeight: 900, marginTop: 2 }}>Your control</div>
          <div>
            You can request deletion of your account/data by contacting support. You can also choose not to share a postcard link.
          </div>

          <div style={{ fontWeight: 900, marginTop: 2 }}>Children</div>
          <div>Mappo is not intended for young children.</div>

          <div style={{ fontWeight: 900, marginTop: 2 }}>Updates</div>
          <div>This policy may be updated from time to time.</div>

          <div>
            Contact:
            <br />
            support@app-titude.com
          </div>
        </div>
      </div>
    </div>
  )
}

