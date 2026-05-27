"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { auth, firestore } from "@/lib/firebase"
import { collection, deleteDoc, doc, getDocs, limit, orderBy, query, where } from "firebase/firestore"

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

/** Postcard list for My Library tab or standalone /postcard/library page. */
export function MyPostcardsPanel() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [items, setItems] = useState<PostcardListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDeletePostcard = useCallback(async (postcardId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm("Delete this postcard? This can't be undone.")) return
    if (!firestore || typeof (firestore as any) !== "object") {
      try {
        window.alert("Could not delete postcard. Please try again.")
      } catch {
        // ignore
      }
      return
    }
    setDeletingId(postcardId)
    try {
      await deleteDoc(doc(firestore as any, "postcards", postcardId))
      setItems((prev) => prev.filter((p) => p.id !== postcardId))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // eslint-disable-next-line no-console
      console.error("🚨 Postcard delete failed", { postcardId, msg })
      try {
        window.alert(msg || "Could not delete postcard. Please try again.")
      } catch {
        // ignore
      }
    } finally {
      setDeletingId(null)
    }
  }, [])

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

  const content = useMemo(() => {
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
          <div key={p.id} style={styles.row}>
            <button
              type="button"
              onClick={() => router.push(`/postcard/library/${encodeURIComponent(p.id)}`)}
              style={styles.rowMain}
            >
              <div style={styles.thumb}>
                {p.imageUrl ? <img src={p.imageUrl} alt="" style={styles.thumbImg} draggable={false} /> : null}
                <img src={`/postcards/${p.template}.png`} alt="" style={styles.thumbOverlay} draggable={false} />
              </div>
              <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                <div style={styles.rowTitle}>{p.title}</div>
                <div style={styles.rowMeta}>{formatDate(p.createdAtIso) || "—"}</div>
              </div>
            </button>
            <button
              type="button"
              disabled={deletingId === p.id}
              onClick={(e) => handleDeletePostcard(p.id, e)}
              style={{
                ...styles.deleteBtn,
                opacity: deletingId === p.id ? 0.65 : 1,
                cursor: deletingId === p.id ? "not-allowed" : "pointer",
              }}
            >
              {deletingId === p.id ? "Deleting…" : "Delete"}
            </button>
          </div>
        ))}
      </div>
    )
  }, [uid, loading, error, items, router, deletingId, handleDeletePostcard])

  return content
}

const styles: Record<string, React.CSSProperties> = {
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
  row: {
    width: "min(520px, 100%)",
    margin: "0 auto",
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(79,59,43,0.1)",
    borderRadius: 16,
    padding: 12,
    display: "flex",
    gap: 10,
    alignItems: "center",
    color: "#3a2e1e",
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    padding: 0,
    border: "none",
    background: "transparent",
    display: "flex",
    gap: 12,
    alignItems: "center",
    color: "inherit",
    cursor: "pointer",
    textAlign: "left",
  },
  deleteBtn: {
    flexShrink: 0,
    background: "rgba(239, 68, 68, 0.12)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: 10,
    padding: "0.45rem 0.65rem",
    color: "#b91c1c",
    fontSize: "0.82rem",
    fontWeight: 900,
    whiteSpace: "nowrap",
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
