import type { Metadata } from "next"
import SharedPostcardClient, { type SharedPostcardData } from "./shared-postcard-client"
import { loadSharedPostcard } from "@/lib/postcard/loadSharedPostcard"

export const dynamic = "force-dynamic"

const FALLBACK_DESCRIPTION = "Postcards from anywhere."
const BRAND_ICON = "/brand/mappo/mappo-app-icon-1024.png"
const COMPOSED_OG_WIDTH = 840
const COMPOSED_OG_HEIGHT = 560

function metadataBaseUrl(): URL {
  const prod = String(process.env.VERCEL_PROJECT_PRODUCTION_URL || "").trim()
  if (prod) return new URL(prod.startsWith("http") ? prod : `https://${prod}`)
  const vercel = String(process.env.VERCEL_URL || "").trim()
  if (vercel) return new URL(vercel.startsWith("http") ? vercel : `https://${vercel}`)
  return new URL("http://localhost:3000")
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ postcardId: string }>
}): Promise<Metadata> {
  const { postcardId } = await params
  const loaded = await loadSharedPostcard(postcardId)
  if (loaded.status !== "ok") {
    return {
      metadataBase: metadataBaseUrl(),
      title: "Mappo",
      description: FALLBACK_DESCRIPTION,
    }
  }

  const { record } = loaded
  const title = `Mappo Postcard: ${record.title}`
  const description = record.description.trim() ? record.description.trim() : FALLBACK_DESCRIPTION
  const composed = record.composedImageUrl
  const fallbackImage = record.imageUrl || BRAND_ICON
  const imageUrl = composed || fallbackImage

  return {
    metadataBase: metadataBaseUrl(),
    title,
    description,
    openGraph: {
      title,
      description,
      images: composed
        ? [{ url: composed, width: COMPOSED_OG_WIDTH, height: COMPOSED_OG_HEIGHT, type: "image/jpeg" }]
        : [{ url: fallbackImage }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  }
}

export default async function SharedPostcardPage({
  params,
}: {
  params: Promise<{ postcardId: string }>
}) {
  const { postcardId } = await params
  const loaded = await loadSharedPostcard(postcardId)

  if (loaded.status === "not-configured") {
    return (
      <div style={styles.screen}>
        <div style={styles.card}>
          <div style={styles.title}>Sharing not configured</div>
          <div style={styles.text}>
            This environment doesn’t have Firebase Admin credentials set, so hosted postcards can’t be loaded here yet.
          </div>
        </div>
      </div>
    )
  }

  if (loaded.status === "not-found") {
    return (
      <div style={styles.screen}>
        <div style={styles.card}>
          <div style={styles.title}>Postcard not found</div>
          <div style={styles.text}>This link may be invalid or the postcard was removed.</div>
        </div>
      </div>
    )
  }

  const { record } = loaded
  const payload: SharedPostcardData = {
    postcardId: record.postcardId,
    template: record.template,
    imageUrl: record.imageUrl,
    latitude: record.latitude,
    longitude: record.longitude,
    locationName: record.locationName,
    message: record.message,
    title: record.title,
    description: record.description.trim() || "A memorable place worth sharing.",
    stickers: record.stickers as SharedPostcardData["stickers"],
    transform: record.transform,
  }

  return <SharedPostcardClient data={payload} />
}

const styles: Record<string, React.CSSProperties> = {
  screen: {
    minHeight: "100dvh",
    backgroundColor: "#eef8f4",
    color: "#3a2e1e",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "1.5rem",
  },
  card: {
    width: "min(520px, 92vw)",
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(79,59,43,0.1)",
    borderRadius: 16,
    padding: 16,
    backdropFilter: "blur(12px)",
    textAlign: "center",
  },
  title: { fontSize: "1.25rem", fontWeight: 900, marginBottom: 8 },
  text: { opacity: 0.75, lineHeight: 1.35 },
}
