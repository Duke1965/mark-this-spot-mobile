/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['placeholder.svg'],
    unoptimized: true,
  },
  // Skip ESLint during Vercel builds (we can re-enable later if needed)
  eslint: { ignoreDuringBuilds: true },

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
