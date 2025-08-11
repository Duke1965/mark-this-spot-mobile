import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "PINIT - Pin It. Find It. Share It.",
  description: "Location-based discovery and sharing app",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  generator: 'v0.dev',
  manifest: '/manifest.json',
  icons: {
    icon: '/pinit-logo.png',
    apple: '/pinit-logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Prevent pull-to-refresh behavior - LESS AGGRESSIVE VERSION
              let startY = 0;
              let currentY = 0;
              let isScrolling = false;
              
              document.addEventListener('touchstart', function(e) {
                startY = e.touches[0].clientY;
                isScrolling = false;
              }, { passive: true });
              
              document.addEventListener('touchmove', function(e) {
                currentY = e.touches[0].clientY;
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                
                // Only prevent pull-to-refresh when at very top of page AND pulling down hard
                if (scrollTop <= 0 && currentY > startY + 50) {
                  e.preventDefault();
                  isScrolling = true;
                }
                
                // Only prevent pull-to-refresh when at very bottom of page AND pulling up hard
                const scrollHeight = document.documentElement.scrollHeight;
                const clientHeight = document.documentElement.clientHeight;
                if (scrollTop + clientHeight >= scrollHeight && currentY < startY - 50) {
                  e.preventDefault();
                  isScrolling = true;
                }
              }, { passive: false });
              
              document.addEventListener('touchend', function(e) {
                if (isScrolling) {
                  e.preventDefault();
                }
              }, { passive: false });
              
              // Allow normal page refresh behavior
              console.log('🔄 PINIT PWA: Pull-to-refresh prevention enabled (less aggressive)');
            `,
          }}
        />
      </body>
    </html>
  )
}
