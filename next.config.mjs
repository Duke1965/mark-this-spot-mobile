/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['placeholder.svg'],
    unoptimized: true,
  },
  // Transpile TomTom Maps SDK for Next.js
  transpilePackages: ['@tomtom-international/web-sdk-maps'],
  // Removed PWA routing support to eliminate splash screen behavior
  // async rewrites() {
  //   return [
  //     {
  //       source: '/(.*)',
  //       destination: '/',
  //     },
  //   ]
  // },
}

export default nextConfig
