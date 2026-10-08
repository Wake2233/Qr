import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Next 16 caching model: `'use cache'` + cacheTag for public reads, Suspense for request reads.
  cacheComponents: true,
  // Internal workspace packages ship TypeScript source.
  transpilePackages: ['@cp/api', '@cp/core', '@cp/types', '@cp/validators'],
};

export default nextConfig;
