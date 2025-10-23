import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "PINIT - Pin It. Find It. Share It.",
  description: "Location-based discovery and sharing app",
  generator: 'v0.dev',
  // manifest: '/manifest.json', // Removed to eliminate PWA splash screen
  // icons: {
  //   icon: '/pinit-logo.png',
  //   apple: '/pinit-logo.png',
  // }, // Removed to eliminate splash screen
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
              // Mobile touch handling - ALLOW PULL-TO-REFRESH
              let startY = 0;
              let currentY = 0;
              
              // Detect mobile device
              const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
              
              if (isMobile) {
                document.addEventListener('touchstart', function(e) {
                  startY = e.touches[0].clientY;
                }, { passive: true });
                
                document.addEventListener('touchmove', function(e) {
                  currentY = e.touches[0].clientY;
                  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                  
                  // Only prevent overscroll at bottom, allow pull-to-refresh at top
                  const scrollHeight = document.documentElement.scrollHeight;
                  const clientHeight = document.documentElement.clientHeight;
                  if (scrollTop + clientHeight >= scrollHeight - 5 && currentY < startY - 60) {
                    e.preventDefault();
                  }
                }, { passive: false });
              }
              
              // Enable pull-to-refresh
              console.log(' PINIT PWA: Pull-to-refresh enabled');
            `,
          }}
        />
      </body>
    </html>
  )
}
