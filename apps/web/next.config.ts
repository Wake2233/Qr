import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Internal workspace packages ship TypeScript source.
  transpilePackages: ['@cp/api', '@cp/core', '@cp/types', '@cp/validators'],
};

export default nextConfig;
