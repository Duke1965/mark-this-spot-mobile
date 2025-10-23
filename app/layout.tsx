import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "PINIT - Pin It. Find It. Share It.",
  description: "Location-based discovery and sharing app",
  // generator: 'v0.dev', // Removed to eliminate PWA detection
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
      <head>
        {/* Explicitly prevent PWA behavior */}
        <meta name="mobile-web-app-capable" content="no" />
        <meta name="apple-mobile-web-app-capable" content="no" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
        
        {/* Additional PWA prevention */}
        <meta name="application-name" content="PINIT" />
        <meta name="msapplication-TileColor" content="#ffffff" />
        <meta name="theme-color" content="#ffffff" />
        
        {/* Prevent Android Chrome PWA detection */}
        <meta name="mobile-web-app-capable" content="no" />
        <meta name="apple-mobile-web-app-capable" content="no" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        
        {/* Disable PWA installation prompts */}
        <meta name="apple-itunes-app" content="app-id=none" />
      </head>
      <body className="antialiased">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Disable PWA behavior completely
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for(let registration of registrations) {
                    registration.unregister();
                  }
                });
              }
              
              // Prevent PWA installation
              window.addEventListener('beforeinstallprompt', function(e) {
                e.preventDefault();
                return false;
              });
              
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
