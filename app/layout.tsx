import type React from "react"
import "./globals.css"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" style={{ margin: 0, padding: 0, height: "100%" }}>
      <body style={{ margin: 0, padding: 0, height: "100%", backgroundColor: "#1e293b" }}>{children}</body>
    </html>
  )
}
