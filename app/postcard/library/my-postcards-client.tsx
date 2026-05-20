"use client"

import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { mappoBackButtonStyle } from "@/lib/mappoHeaderStyles"
import { MyPostcardsPanel } from "./my-postcards-panel"

export default function MyPostcardsClient() {
  const router = useRouter()

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
        <MyPostcardsPanel />
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
}
