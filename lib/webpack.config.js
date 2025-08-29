// Webpack optimization configuration for PINIT
// Provides bundle splitting, compression, and performance optimizations

const path = require('path')

module.exports = {
  // Bundle optimization for production
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Vendor libraries
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          chunks: 'all',
          enforce: true,
        },
        // React and Next.js
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
          name: 'react',
          priority: 20,
          chunks: 'all',
          enforce: true,
        },
        // UI components
        ui: {
          test: /[\\/]components[\\/]ui[\\/]/,
          name: 'ui',
          priority: 15,
          chunks: 'all',
          minSize: 0,
        },
        // Radix UI components
        radix: {
          test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
          name: 'radix',
          priority: 18,
          chunks: 'all',
        },
        // Lucide icons
        icons: {
          test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
          name: 'icons',
          priority: 17,
          chunks: 'all',
        },
        // Common utilities
        common: {
          name: 'common',
          minChunks: 2,
          priority: 5,
          chunks: 'all',
          enforce: true,
        },
        // App-specific chunks
        hooks: {
          test: /[\\/]hooks[\\/]/,
          name: 'hooks',
          priority: 12,
          chunks: 'all',
          minSize: 0,
        },
        lib: {
          test: /[\\/]lib[\\/]/,
          name: 'lib',
          priority: 12,
          chunks: 'all',
          minSize: 0,
        },
      },
    },
    // Runtime chunk for better caching
    runtimeChunk: {
      name: 'runtime',
    },
    // Module concatenation for better tree shaking
    concatenateModules: true,
    // Remove empty chunks
    removeEmptyChunks: true,
    // Merge duplicate chunks
    mergeDuplicateChunks: true,
  },

  // Module resolution optimizations
  resolve: {
    // Prioritize ES modules for better tree shaking
    mainFields: ['module', 'main'],
    // Optimize module extensions
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    // Module aliases for better imports
    alias: {
      '@': path.resolve(__dirname, '../'),
      '@/components': path.resolve(__dirname, '../components'),
      '@/lib': path.resolve(__dirname, '../lib'),
      '@/hooks': path.resolve(__dirname, '../hooks'),
      // Use ES modules versions for better tree shaking
      'lodash': 'lodash-es',
    },
  },

  // Module rules for optimization
  module: {
    rules: [
      // Optimize images
      {
        test: /\.(png|jpe?g|gif|svg|webp|avif)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024, // 8kb
          },
        },
        generator: {
          filename: 'static/images/[name].[hash][ext]',
        },
      },
      // Optimize fonts
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'static/fonts/[name].[hash][ext]',
        },
      },
    ],
  },

  // Performance hints
  performance: {
    hints: 'warning',
    maxEntrypointSize: 512000, // 500kb
    maxAssetSize: 512000, // 500kb
    assetFilter: (assetFilename) => {
      // Only check JS and CSS files
      return /\.(js|css)$/.test(assetFilename)
    },
  },

  // Development optimizations
  ...(process.env.NODE_ENV === 'development' && {
    devtool: 'eval-cheap-module-source-map',
    cache: {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
    },
  }),

  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    devtool: 'source-map',
    optimization: {
      minimize: true,
      sideEffects: false, // Enable tree shaking
      usedExports: true,
      // Additional production optimizations will be handled by Next.js
    },
  }),
}

// Bundle analyzer configuration
if (process.env.ANALYZE === 'true') {
  const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
  
  module.exports.plugins = [
    ...(module.exports.plugins || []),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: true,
      reportFilename: 'bundle-analysis.html',
    }),
  ]
}

// Export configuration function for Next.js
module.exports.nextWebpackConfig = (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
  // Apply our optimizations
  if (!isServer) {
    config.optimization = {
      ...config.optimization,
      ...module.exports.optimization,
    }

    config.resolve = {
      ...config.resolve,
      ...module.exports.resolve,
    }

    // Add bundle analyzer in development
    if (dev && process.env.BUNDLE_ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          openAnalyzer: true,
        })
      )
    }

    // Optimize for mobile
    if (process.env.NODE_ENV === 'production') {
      config.plugins.push(
        new webpack.DefinePlugin({
          'process.env.MOBILE_OPTIMIZED': JSON.stringify('true'),
        })
      )
    }
  }

  return config
} 
