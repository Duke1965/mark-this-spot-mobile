import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import RegisterSW from "./_components/RegisterSW"
import InstallPrompt from "./_components/InstallPrompt"

export const metadata: Metadata = {
  title: "PINIT",
  description: "Pin places fast, like Shazam for locations.",
  manifest: "/manifest.webmanifest",
  themeColor: "#111111",
}



export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body className="antialiased">
        {children}
        <RegisterSW />
        <InstallPrompt />
      </body>
    </html>
  )
}
