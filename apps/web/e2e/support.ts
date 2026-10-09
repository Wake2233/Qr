import type { Database } from '@cp/types';
import { expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/** Local stack only (see supabase/config.toml and scripts/seed-users.ts). */
export const SUPABASE_URL = process.env.SUPABASE_TEST_URL ?? 'http://127.0.0.1:54321';
export const PUBLISHABLE_KEY =
  process.env.SUPABASE_TEST_PUBLISHABLE_KEY ?? 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324';
const LOCAL_TEST_PASSWORD = 'LocalDev-2026!';

/** Latest 6-digit code Mailpit received for `email` after `since`. */
export async function readOtp(email: string, since: Date): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const res = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}&limit=1`,
    );
    const body = (await res.json()) as { messages: { ID: string; Created: string }[] };
    const latest = body.messages[0];
    if (latest && new Date(latest.Created) >= since) {
      const message = (await (
        await fetch(`${MAILPIT_URL}/api/v1/message/${latest.ID}`)
      ).json()) as {
        Text: string;
      };
      const code = /\b(\d{6})\b/.exec(message.Text)?.[1];
      if (code) return code;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No sign-in code for ${email} in Mailpit`);
}

/** Signs in through the real /login flow (email code read from Mailpit). */
export async function signIn(page: Page, email: string, next = '/dashboard') {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  const since = new Date(Date.now() - 2000);
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Email me a sign-in code' }).click();
  await expect(page.getByText(`We sent a 6-digit code to ${email}`)).toBeVisible();
  await page.getByLabel('Sign-in code').fill(await readOtp(email, since));
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((url) => url.pathname === next.split('?')[0]);
}

/** API client signed in with a seeded password (setup/cleanup only — never the secret key). */
export async function apiAs(email: string) {
  const client = createClient<Database>(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: LOCAL_TEST_PASSWORD });
  if (error) throw new Error(`Sign-in failed for ${email} (run pnpm db:seed): ${error.message}`);
  return client;
}

export const anonApi = () =>
  createClient<Database>(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

/** Picks an option in a shadcn/Radix select identified by its label. */
export async function selectOption(page: Page, label: string, option: string) {
  // Required fields append "(required to publish)" to the label.
  const name = new RegExp(
    `^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( \\(required to publish\\))?$`,
  );
  await page.getByRole('combobox', { name }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
}

/** A solid-color PNG of the given size (photo uploads). */
export function pngFixture(page: Page, color: string, label: string) {
  return page
    .evaluate(
      async ({ color, label }) => {
        const canvas = document.createElement('canvas');
        canvas.width = 1600;
        canvas.height = 1200;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('no canvas');
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1600, 1200);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 120px sans-serif';
        ctx.fillText(label, 200, 640);
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/png'),
        );
        if (!blob) throw new Error('no blob');
        return Array.from(new Uint8Array(await blob.arrayBuffer()));
      },
      { color, label },
    )
    .then((bytes) => ({ name: `${label}.png`, mimeType: 'image/png', buffer: Buffer.from(bytes) }));
}
