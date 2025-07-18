import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PINIT - Location-Based Media Capture',
  description: 'Mobile-first location-based media capture and storytelling app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
