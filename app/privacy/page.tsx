export const dynamic = "force-dynamic"

export default function PrivacyPage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
        color: "white",
        padding: "2rem 1rem",
      }}
    >
      <div
        style={{
          width: "min(760px, 100%)",
          margin: "0 auto",
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 16,
          padding: 16,
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ fontSize: "1.35rem", fontWeight: 950, marginBottom: 10 }}>Privacy Policy</div>
        <div style={{ opacity: 0.92, lineHeight: 1.45 }}>
          This is a placeholder Privacy Policy page for PINIT.
          <br />
          <br />
          Replace this content with your official privacy policy before public launch.
        </div>
      </div>
    </div>
  )
}

