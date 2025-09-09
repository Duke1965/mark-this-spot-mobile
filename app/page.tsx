"use client"

export default function Page() {
  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3730a3 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      textAlign: "center",
      padding: "2rem"
    }}>
      <div>
        <h1 style={{ fontSize: "3rem", marginBottom: "1rem" }}>PINIT</h1>
        <p style={{ fontSize: "1.2rem", opacity: 0.9 }}>Loading...</p>
        <p style={{ fontSize: "1rem", opacity: 0.7, marginTop: "2rem" }}>
          Updating components...
        </p>
      </div>
    </div>
  )
}
