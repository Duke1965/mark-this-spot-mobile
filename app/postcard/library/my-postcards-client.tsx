"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { auth, firestore } from "@/lib/firebase"
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore"
import { mappoBackButtonStyle } from "@/lib/mappoHeaderStyles"

type PostcardListItem = {
  id: string
  title: string
  imageUrl: string
  createdAtIso: string
  template: string
}

function formatDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

export default function MyPostcardsClient() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [items, setItems] = useState<PostcardListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = (auth as any)?.onAuthStateChanged?.((u: any) => {
      setUid(u?.uid ? String(u.uid) : null)
    })
    return () => {
      try {
        unsub?.()
      } catch {
        // ignore
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        if (!uid) {
          setItems([])
          return
        }
        if (!firestore || typeof (firestore as any) !== "object") {
          throw new Error("Firestore is not configured")
        }

        const q = query(
          collection(firestore as any, "postcards"),
          where("senderUid", "==", uid),
          orderBy("createdAtIso", "desc"),
          limit(50)
        )
        const snap = await getDocs(q)
        const next: PostcardListItem[] = []
        snap.forEach((doc) => {
          const data = doc.data() as any
          next.push({
            id: doc.id,
            title: String(data?.title || "My Special Place"),
            imageUrl: String(data?.imageUrl || ""),
            createdAtIso: String(data?.createdAtIso || ""),
            template: String(data?.template || "template-1"),
          })
        })
        if (!cancelled) setItems(next)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        // eslint-disable-next-line no-console
        console.error("🚨 MyPostcards query failed", {
          msg,
          uid,
        })
        if (!cancelled) setError(msg || "Failed to load postcards")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [uid])

  const body = useMemo(() => {
    if (!uid) {
      return (
        <div style={styles.card}>
          <div style={styles.cardTitle}>Sign in required</div>
          <div style={styles.cardText}>Please sign in to view your postcards.</div>
        </div>
      )
    }
    if (loading) {
      return (
        <div style={styles.card}>
          <div style={styles.cardTitle}>Loading…</div>
          <div style={styles.cardText}>Fetching your sent postcards.</div>
        </div>
      )
    }
    if (error) {
      return (
        <div style={styles.card}>
          <div style={styles.cardTitle}>Couldn’t load</div>
          <div style={styles.cardText}>{error}</div>
        </div>
      )
    }
    if (items.length === 0) {
      return (
        <div style={styles.card}>
          <div style={styles.cardTitle}>No postcards yet</div>
          <div style={styles.cardText}>After you send a postcard, it will appear here.</div>
          <div style={{ ...styles.cardText, marginTop: 8, opacity: 0.85 }}>
            Debug: querying senderUid = <span style={{ fontWeight: 900 }}>{uid}</span>
          </div>
        </div>
      )
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => router.push(`/postcard/library/${encodeURIComponent(p.id)}`)}
            style={styles.rowBtn}
          >
            <div style={styles.thumb}>
              {p.imageUrl ? <img src={p.imageUrl} alt="" style={styles.thumbImg} draggable={false} /> : null}
              <img src={`/postcards/${p.template}.png`} alt="" style={styles.thumbOverlay} draggable={false} />
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={styles.rowTitle}>{p.title}</div>
              <div style={styles.rowMeta}>{formatDate(p.createdAtIso) || "—"}</div>
            </div>
          </button>
        ))}
      </div>
    )
  }, [uid, loading, error, items, router])

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <button type="button" onClick={() => router.push("/")} style={styles.backBtn}>
          <ArrowLeft size={20} />
          <span style={{ fontWeight: 800 }}>Back</span>
        </button>
        <div style={styles.headerTitle}>My Postcards</div>
        <div style={{ width: 72 }} />
      </div>

      <div style={styles.content}>
        {body}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  screen: {
    position: "fixed",
    inset: 0,
    backgroundImage: "url(/brand/mappo/mappo-library-bg.png)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundColor: "#eef8f4",
    color: "#3a2e1e",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "1rem",
    paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)",
    background: "rgba(255,255,255,0.7)",
    borderBottom: "1px solid rgba(0,0,0,0.08)",
    backdropFilter: "blur(18px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
  },
  headerTitle: { fontSize: "1.125rem", fontWeight: 900, textAlign: "center", flex: 1 },
  backBtn: {
    ...mappoBackButtonStyle,
    flexShrink: 0,
  },
  content: {
    flex: 1,
    overflowY: "auto",
    padding: "1rem",
  },
  card: {
    width: "min(520px, 100%)",
    margin: "0 auto",
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(79,59,43,0.1)",
    borderRadius: 16,
    padding: 14,
    backdropFilter: "blur(12px)",
  },
  cardTitle: { fontWeight: 900, fontSize: "1.05rem", marginBottom: 6 },
  cardText: { opacity: 0.75, lineHeight: 1.35 },
  rowBtn: {
    width: "min(520px, 100%)",
    margin: "0 auto",
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(79,59,43,0.1)",
    borderRadius: 16,
    padding: 12,
    display: "flex",
    gap: 12,
    alignItems: "center",
    color: "#3a2e1e",
    cursor: "pointer",
  },
  thumb: {
    width: 82,
    height: 56,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
    background: "rgba(0,0,0,0.06)",
    border: "1px solid rgba(79,59,43,0.1)",
    flexShrink: 0,
  },
  thumbImg: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" },
  thumbOverlay: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", opacity: 0.95 },
  rowTitle: { fontWeight: 900, fontSize: "1.02rem" },
  rowMeta: { opacity: 0.88, marginTop: 4, fontSize: "0.92rem" },
}

