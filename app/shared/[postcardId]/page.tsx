import { getAdminFirestore } from "@/lib/firebaseAdmin"
import SharedPostcardClient, { type SharedPostcardData } from "./shared-postcard-client"

export const dynamic = "force-dynamic"

export default async function SharedPostcardPage({
  params,
}: {
  params: Promise<{ postcardId: string }>
}) {
  const { postcardId } = await params
  const firestore = getAdminFirestore()

  if (!firestore) {
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

  const doc = await firestore.collection("postcards").doc(postcardId).get()
  if (!doc.exists) {
    return (
      <div style={styles.screen}>
        <div style={styles.card}>
          <div style={styles.title}>Postcard not found</div>
          <div style={styles.text}>This link may be invalid or the postcard was removed.</div>
        </div>
      </div>
    )
  }

  const data = doc.data() as any
  const template = String(data?.template || "template-1")
  const imageUrl = String(data?.imageUrl || "")
  const message = String(data?.message || "")
  const title = String(data?.title || "My Special Place")
  const description = String(data?.description || "A memorable place worth sharing.")
  const t = data?.transform || {}

  const stickers = Array.isArray(data?.stickers) ? data.stickers : []

  const payload: SharedPostcardData = {
    postcardId,
    template,
    imageUrl,
    message,
    title,
    description,
    stickers,
    transform: t || {},
  }

  return <SharedPostcardClient data={payload} />
}

const styles: Record<string, React.CSSProperties> = {
  screen: {
    minHeight: "100dvh",
    background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
    color: "white",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "1.5rem",
  },
  card: {
    width: "min(520px, 92vw)",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 16,
    backdropFilter: "blur(12px)",
    textAlign: "center",
  },
  title: { fontSize: "1.25rem", fontWeight: 900, marginBottom: 8 },
  text: { opacity: 0.9, lineHeight: 1.35 },
}
