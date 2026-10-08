import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_SITE_URL: z.url(),
  EXPO_PUBLIC_SUPABASE_URL: z.url(),
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
});

/** EXPO_PUBLIC_* vars must be referenced literally so Metro can inline them. */
export const env = envSchema.parse({
  EXPO_PUBLIC_SITE_URL: process.env.EXPO_PUBLIC_SITE_URL,
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});
