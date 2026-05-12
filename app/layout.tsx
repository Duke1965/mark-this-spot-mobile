import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import RegisterSW from "@/components/RegisterSW"

export const metadata: Metadata = {
  title: "Mappo",
  description: "Postcards from anywhere.",
  manifest: "/manifest.webmanifest",
  themeColor: "#111111",
  icons: {
    icon: "/brand/mappo/mappo-app-icon-1024.png",
    apple: "/brand/mappo/mappo-app-icon-1024.png",
  },
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
      </body>
    </html>
  )
}
