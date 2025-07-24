import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "PINIT - Pin It. Find It. Share It.",
  description: "Location-based discovery and sharing app",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
