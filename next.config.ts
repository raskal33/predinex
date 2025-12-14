import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Improved experimental features for stability
  experimental: {
    // Optimize chunk loading to prevent build manifest issues
    optimizePackageImports: ['@heroicons/react', '@reown/appkit', 'framer-motion'],
  },
  
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Enable static page generation where possible
  output: 'standalone',
  
  // Webpack configuration to handle Biconomy package issues
  webpack: (config, { isServer }) => {
    // Fix for Biconomy package import errors
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config;
  },
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sportmonks.com',
        port: '',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        port: '',
        pathname: '/api/**',
      },
      {
        protocol: 'https',
        hostname: 'assets.coingecko.com',
        port: '',
        pathname: '/coins/**',
      },
      {
        protocol: 'https',
        hostname: 'coin-images.coingecko.com',
        port: '',
        pathname: '/coins/**',
      },
      {
        protocol: 'https',
        hostname: 'static.coinpaprika.com',
        port: '',
        pathname: '/coin/**',
      },
      {
        protocol: 'https',
        hostname: 's2.coinmarketcap.com',
        port: '',
        pathname: '/static/img/coins/**',
      },
    ],
  },
};

export default nextConfig;
