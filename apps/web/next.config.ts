import type { NextConfig } from 'next';

// Vehicle photos come from Supabase Storage (public bucket URLs).
const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321');
const isLocalSupabase = ['127.0.0.1', 'localhost'].includes(supabaseUrl.hostname);

const nextConfig: NextConfig = {
  // Next 16 caching model: `'use cache'` + cacheTag for public reads, Suspense for request reads.
  cacheComponents: true,
  // Internal workspace packages ship TypeScript source.
  transpilePackages: ['@cp/api', '@cp/core', '@cp/types', '@cp/validators'],
  images: {
    remotePatterns: [
      {
        protocol: supabaseUrl.protocol === 'https:' ? 'https' : 'http',
        hostname: supabaseUrl.hostname,
        port: supabaseUrl.port,
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // The optimizer refuses private IPs by default; only the local Supabase stack needs it.
    dangerouslyAllowLocalIP: isLocalSupabase,
  },
};

export default nextConfig;
