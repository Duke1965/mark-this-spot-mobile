/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['placeholder.svg'],
    unoptimized: true,
  },
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
