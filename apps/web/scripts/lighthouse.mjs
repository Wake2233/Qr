// Lighthouse budget (PLAN.md Phase 5): home, /inventory and one live VDP on the mobile profile.
// Needs a production build (`pnpm --filter @cp/web build`) and the local Supabase stack.
import { spawn, spawnSync } from 'node:child_process';

const PORT = process.env.LHCI_PORT ?? '3100';
const base = `http://localhost:${PORT}`;
const server = spawn('pnpm', ['exec', 'next', 'start', '--port', PORT], { stdio: 'ignore' });
const stop = () => server.kill('SIGTERM');
process.on('exit', stop);

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${base}/sitemap.xml`);
      if (res.ok) return res.text();
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`next start did not answer on ${base}`);
}

const sitemap = await waitForServer();
const vdp = [...sitemap.matchAll(/<loc>([^<]*\/inventory\/[^<]+)<\/loc>/g)][0]?.[1];
if (!vdp) throw new Error('no vehicle in the sitemap (run pnpm db:seed)');
const urls = ['/', '/inventory', new URL(vdp).pathname].map((path) => base + path);

// Lighthouse's default 4x CPU slowdown assumes a fast desktop; on a slower machine set
// LHCI_CPU_SLOWDOWN from its benchmarkIndex (see Lighthouse docs/throttling.md).
const cpu = process.env.LHCI_CPU_SLOWDOWN;
const collectFlags = cpu ? [`--settings.throttling.cpuSlowdownMultiplier=${cpu}`] : [];

const run = (args) =>
  spawnSync('pnpm', ['exec', 'lhci', ...args], { stdio: 'inherit' }).status ?? 1;
const status =
  run(['collect', ...collectFlags, ...urls.map((url) => `--url=${url}`)]) ||
  run(['assert']) ||
  run(['upload']);
stop();
process.exit(status);
