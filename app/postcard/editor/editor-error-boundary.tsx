"use client"

import React from "react"

export default class EditorErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, message: "" }
  }

  static getDerivedStateFromError(error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return { hasError: true, message: msg }
  }

  componentDidCatch(error: unknown, info: unknown) {
    // Keep logs extremely obvious for field testing.
    // eslint-disable-next-line no-console
    console.error("🚨 Postcard Editor crashed", error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "#eef8f4",
          color: "#3a2e1e",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.25rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "min(520px, 92vw)",
            background: "rgba(255,255,255,0.78)",
            border: "1px solid rgba(79,59,43,0.1)",
            borderRadius: 16,
            padding: 16,
            backdropFilter: "blur(12px)",
          }}
        >
          <div style={{ fontWeight: 950, fontSize: "1.05rem" }}>Something went wrong</div>
          <div style={{ opacity: 0.9, lineHeight: 1.35, marginTop: 8 }}>
            The editor hit an unexpected error. Please try again.
          </div>
          <div style={{ opacity: 0.8, marginTop: 10, fontSize: "0.85rem", wordBreak: "break-word" }}>
            {this.state.message}
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 12,
              width: "100%",
              background: "rgba(79,59,43,0.1)",
              border: "1px solid rgba(79,59,43,0.15)",
              color: "#4f3b2b",
              fontWeight: 900,
              padding: "0.85rem 1rem",
              borderRadius: 12,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}

