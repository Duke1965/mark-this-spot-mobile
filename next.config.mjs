/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['placeholder.svg'],
    unoptimized: true,
  },
  // Add PWA routing support to prevent refresh redirects
  async rewrites() {
    return [
      {
        source: '/(.*)',
        destination: '/',
      },
    ]
  },
}

export default nextConfig
