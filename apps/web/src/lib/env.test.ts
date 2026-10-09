import { afterEach, describe, expect, it, vi } from 'vitest';

const VALID = {
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_0123456789abcdef',
};

async function loadEnv(overrides: Partial<Record<keyof typeof VALID, string>>) {
  vi.resetModules();
  for (const [key, value] of Object.entries({ ...VALID, ...overrides })) vi.stubEnv(key, value);
  return (await import('./env')).env;
}

describe('env', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('passes valid public env through', async () => {
    await expect(loadEnv({})).resolves.toEqual(VALID);
  });

  it('rejects a relative site URL', async () => {
    await expect(loadEnv({ NEXT_PUBLIC_SITE_URL: 'localhost' })).rejects.toThrow(
      'NEXT_PUBLIC_SITE_URL',
    );
  });

  it('rejects a missing publishable key', async () => {
    await expect(loadEnv({ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '' })).rejects.toThrow(
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    );
  });
});
