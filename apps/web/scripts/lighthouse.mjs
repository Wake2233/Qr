// Lighthouse budget (PLAN.md Phase 5): home, /inventory and one live VDP on the mobile profile.
// Needs a production build (`pnpm --filter @cp/web build`) and the local Supabase stack.
import { spawn, spawnSync } from 'node:child_process';

const PORT = process.env.LHCI_PORT ?? '3100';
const base = `http://localhost:${PORT}`;
const say = (message) => console.log(`[lighthouse] ${message}`);

// Keep the server's output so a failed start explains itself in the CI log.
let serverOutput = '';
const server = spawn('pnpm', ['exec', 'next', 'start', '--port', PORT], {
  stdio: ['ignore', 'pipe', 'pipe'],
});
for (const stream of [server.stdout, server.stderr]) {
  stream.on('data', (chunk) => (serverOutput = (serverOutput + chunk).slice(-4000)));
}
const stop = () => server.kill('SIGTERM');
process.on('exit', stop);
const fail = (message) => {
  console.error(`[lighthouse] ${message}\n--- next start output (last 4 KB) ---\n${serverOutput}`);
  process.exit(1);
};

async function waitForServer() {
  let last = 'no answer';
  for (let i = 0; i < 90; i++) {
    try {
      const res = await fetch(`${base}/sitemap.xml`);
      if (res.ok) return res.text();
      last = `HTTP ${res.status}`;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return fail(`next start did not serve ${base}/sitemap.xml within 90 s (last: ${last})`);
}

say(`starting next start on port ${PORT}`);
const sitemap = await waitForServer();
const vdp = [...sitemap.matchAll(/<loc>([^<]*\/inventory\/[^<]+)<\/loc>/g)][0]?.[1];
if (!vdp)
  fail('no vehicle in the sitemap: was the build made with a seeded database (pnpm db:seed)?');
const urls = ['/', '/inventory', new URL(vdp).pathname].map((path) => base + path);
say(`measuring ${urls.join(', ')}`);

// Lighthouse's default 4x CPU slowdown assumes a fast desktop; on a slower machine set
// LHCI_CPU_SLOWDOWN from its benchmarkIndex (see Lighthouse docs/throttling.md).
const cpu = process.env.LHCI_CPU_SLOWDOWN;
const collectFlags = cpu ? [`--settings.throttling.cpuSlowdownMultiplier=${cpu}`] : [];

const run = (args) =>
  spawnSync('pnpm', ['exec', 'lhci', ...args], { stdio: 'inherit' }).status ?? 1;
// Upload even when the budget fails, so the reports are kept as a CI artifact.
const collected = run(['collect', ...collectFlags, ...urls.map((url) => `--url=${url}`)]);
if (collected !== 0) fail(`lhci collect failed (exit ${collected}); see its output above`);
const asserted = run(['assert']);
run(['upload']);
say(asserted === 0 ? 'budget met' : 'budget NOT met: see the assertion table above');
stop();
process.exit(asserted);
