/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for performance
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
    legacyBrowsers: false,
    browsersListForSwc: true,
  },

  // Compiler optimizations
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Bundle analyzer (enable when needed)
  // bundleAnalyzer: {
  //   enabled: process.env.ANALYZE === 'true',
  // },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Performance optimizations
  poweredByHeader: false,
  compress: true,
  
  // PWA and caching optimizations
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
      ],
    },
    {
      source: '/static/(.*)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
    {
      source: '/(.*).js',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
    {
      source: '/(.*).css',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ],

  // Webpack optimizations
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Import our optimized webpack configuration
    const { nextWebpackConfig } = require('./lib/webpack.config.js')
    
    // Apply optimizations
    const optimizedConfig = nextWebpackConfig(config, { buildId, dev, isServer, defaultLoaders, webpack })

    // Additional Next.js specific optimizations
    if (!isServer) {
      // Optimize for client-side bundle
      optimizedConfig.resolve.fallback = {
        ...optimizedConfig.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }

      // Add performance monitoring
      if (process.env.NODE_ENV === 'production') {
        optimizedConfig.plugins.push(
          new webpack.DefinePlugin({
            'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString()),
            'process.env.BUILD_ID': JSON.stringify(buildId),
          })
        )
      }
    }

    return optimizedConfig
  },

  // Environment variables optimization
  env: {
    BUILD_TIME: new Date().toISOString(),
    BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
  },

  // Output optimization
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
  // Redirects and rewrites for better SEO
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ]
  },

  // Generate static pages for better performance
  async generateBuildId() {
    // Use git commit hash if available, otherwise timestamp
    return process.env.VERCEL_GIT_COMMIT_SHA || `build-${Date.now()}`
  },
}

export default nextConfig
