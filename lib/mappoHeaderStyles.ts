import type { CSSProperties } from "react"

/** Preferred Mappo back control — matches My Library page */
export const mappoBackButtonStyle: CSSProperties = {
  background: "rgba(79,59,43,0.12)",
  color: "#4f3b2b",
  padding: "0.75rem",
  borderRadius: "0.75rem",
  border: "1px solid rgba(79,59,43,0.15)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.5rem",
  transition: "all 0.2s ease",
  fontWeight: 700,
  fontSize: "0.95rem",
}

/** Back control pinned to the top-left of a relative header bar */
export const mappoBackButtonAbsoluteStyle: CSSProperties = {
  ...mappoBackButtonStyle,
  position: "absolute",
  left: "1rem",
  top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)",
  zIndex: 2,
}

/** Frosted header shell for title artwork pages */
export const mappoHeaderBarStyle: CSSProperties = {
  position: "relative",
  padding: "1rem",
  paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)",
  paddingBottom: "0.875rem",
  background: "rgba(255,255,255,0.7)",
  backdropFilter: "blur(18px)",
  borderBottom: "1px solid rgba(0,0,0,0.08)",
}

/** Centered Mappo page title artwork — responsive, no distortion */
export const mappoTitleImageStyle: CSSProperties = {
  display: "block",
  margin: "2.75rem auto 0.25rem",
  maxWidth: "min(220px, 72vw)",
  width: "auto",
  height: "auto",
  maxHeight: 56,
  objectFit: "contain",
}

/** Discover title is slightly wider */
export const mappoDiscoverTitleImageStyle: CSSProperties = {
  ...mappoTitleImageStyle,
  maxWidth: "min(240px, 78vw)",
  maxHeight: 60,
}
