/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
      '.cjs': ['.cts', '.cjs'],
    };
    return config;
  },
  turbopack: {
    resolveAlias: {
      './schema.js': './schema.ts',
      '../src/db/index.js': '../src/db/index.ts',
      '../src/db/schema.js': '../src/db/schema.ts',
      '../../src/db/index.js': '../../src/db/index.ts',
      '../../src/db/schema.js': '../../src/db/schema.ts'
    }
  },
  async rewrites() {
    return [
      {
        source: '/reddit-proxy/:path*',
        destination: 'https://www.reddit.com/:path*',
      },
    ];
  }
};

export default nextConfig;
