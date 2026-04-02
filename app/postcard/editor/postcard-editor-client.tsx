"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import PostcardClient from "../[pinId]/postcard-client"

const ALLOWED_TEMPLATES = new Set(["template-1", "template-2", "template-3", "template-4"])
const DRAFT_KEY = "pinit-postcard-draft-v1"

export default function PostcardEditorClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const templateParam = (searchParams.get("template") || "").trim()

  const template = useMemo(() => {
    return ALLOWED_TEMPLATES.has(templateParam) ? templateParam : "template-1"
  }, [templateParam])

  const [imageUrl, setImageUrl] = useState<string | null>(null)

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
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
          color: "white",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "1.25rem", fontWeight: 900, marginBottom: 10 }}>No image selected</div>
        <div style={{ opacity: 0.9, marginBottom: 18 }}>Go back and choose a photo first.</div>
        <button
          onClick={() => router.push(`/postcard/new?template=${encodeURIComponent(template)}`)}
          style={{
            width: "100%",
            maxWidth: 360,
            background: "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "white",
            fontWeight: 900,
            padding: "0.95rem 1rem",
            borderRadius: 14,
            cursor: "pointer",
          }}
        >
          Choose Photo
        </button>
      </div>
    )
  }

  return (
    <PostcardClient
      template={template}
      imageUrl={imageUrl}
      title="My Postcard"
      description=""
      onBack={() => router.push(`/postcard/new?template=${encodeURIComponent(template)}`)}
    />
  )
}

