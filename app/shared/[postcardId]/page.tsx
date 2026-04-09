import { getAdminFirestore } from "@/lib/firebaseAdmin"

type StickerItem = {
  id: string
  name: string
  imageUrl: string
  x: number
  y: number
  scale: number
  rotation: number
}

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
  const stickers: StickerItem[] = Array.isArray(data?.stickers) ? data.stickers : []
  const t = data?.transform || {}

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>Shared Postcard</div>
      </div>

      <div style={styles.content}>
        <div style={styles.postcardWrap}>
          <div style={styles.postcard}>
            <div style={styles.photoMask}>
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={title}
                  draggable={false}
                  style={{
                    ...styles.bgImage,
                    transform: `translate3d(${Number(t.tx || 0)}px, ${Number(t.ty || 0)}px, 0) scale(${Number(
                      t.scale || 1
                    )}) rotate(${Number(t.rotation || 0)}deg)`,
                  }}
                />
              ) : (
                <div style={styles.missing}>No image</div>
              )}
            </div>

            <img src={`/postcards/${template}.png`} alt="" style={styles.template} />

            <div style={styles.textLayer}>
              <div style={styles.message}>{message}</div>
            </div>

            <div style={styles.stickersLayer}>
              {stickers.map((s) => (
                <img
                  key={s.id}
                  src={s.imageUrl}
                  alt={s.name}
                  draggable={false}
                  style={{
                    ...styles.stickerImg,
                    left: `${Number(s.x || 50)}%`,
                    top: `${Number(s.y || 50)}%`,
                    transform: `translate(-50%, -50%) scale(${Number(s.scale || 1)}) rotate(${Number(s.rotation || 0)}deg)`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div style={styles.metaCard}>
          <div style={styles.metaTitle}>{title}</div>
          <div style={styles.metaDesc}>{description}</div>
        </div>

        <a href="/" style={styles.cta}>
          Send one back with PINIT
        </a>
      </div>
    </div>
  )
}

const styles: Record<string, any> = {
  screen: {
    minHeight: "100dvh",
    background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
    color: "white",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "1rem",
    paddingTop: "3rem",
    background: "rgba(30, 58, 138, 0.95)",
    borderBottom: "1px solid rgba(255,255,255,0.2)",
    backdropFilter: "blur(15px)",
  },
  headerTitle: { fontSize: "1.125rem", fontWeight: 900, textAlign: "center" },
  content: {
    flex: 1,
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    alignItems: "center",
  },
  postcardWrap: { width: "100%", display: "flex", justifyContent: "center" },
  postcard: {
    width: "100%",
    maxWidth: 420,
    aspectRatio: "3 / 2",
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
    background: "rgba(0,0,0,0.25)",
    border: "1px solid rgba(255,255,255,0.18)",
    boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
  },
  photoMask: {
    position: "absolute",
    left: "7%",
    top: "22%",
    width: "42%",
    height: "56%",
    overflow: "hidden",
    borderRadius: 10,
    background: "rgba(0,0,0,0.06)",
  },
  bgImage: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center",
    pointerEvents: "none",
    transformOrigin: "center center",
  },
  template: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "contain",
    objectPosition: "center",
    pointerEvents: "none",
    zIndex: 2,
  },
  textLayer: { position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 },
  message: {
    position: "absolute",
    top: "40%",
    left: "52%",
    width: "40%",
    height: "44%",
    color: "rgba(20, 20, 20, 0.82)",
    fontWeight: 600,
    fontSize: "1.12rem",
    lineHeight: 1.65,
    letterSpacing: "0.35px",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    overflow: "hidden",
    textShadow: "0 1px 0 rgba(255,255,255,0.28)",
  },
  stickersLayer: { position: "absolute", inset: 0, pointerEvents: "none", zIndex: 4 },
  stickerImg: {
    position: "absolute",
    width: 96,
    height: 96,
    transformOrigin: "center center",
    pointerEvents: "none",
  },
  metaCard: {
    width: "100%",
    maxWidth: 420,
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 14,
    backdropFilter: "blur(12px)",
  },
  metaTitle: { fontWeight: 900, fontSize: "1.05rem", marginBottom: 6 },
  metaDesc: { opacity: 0.9, lineHeight: 1.35 },
  cta: {
    width: "100%",
    maxWidth: 420,
    textDecoration: "none",
    textAlign: "center",
    background: "rgba(255,255,255,0.2)",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "white",
    fontWeight: 900,
    padding: "0.95rem 1rem",
    borderRadius: 14,
  },
  card: {
    margin: "3rem auto",
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
  missing: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
  },
}
