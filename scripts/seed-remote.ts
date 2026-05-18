/**
 * One-off / ops utility: publish the built-in seed data to a deployed API as
 * the initial shared state. Safe to re-run (server upserts + bumps version).
 *
 *   SEED_URL=https://your-app.vercel.app npx tsx scripts/seed-remote.ts
 *
 * The app also auto-seeds on the first browser visit; this just lets you
 * initialise (or hard-reset) the shared database without opening the site.
 */
import { seedData } from '../src/lib/seed';

const base = (process.env.SEED_URL ?? '').replace(/\/$/, '');
if (!base) {
  console.error('Set SEED_URL, e.g. SEED_URL=https://nwa-tracker.vercel.app');
  process.exit(1);
}

const res = await fetch(`${base}/api/state`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ data: seedData }),
});

const text = await res.text();
console.log(`POST /api/state -> ${res.status} ${text}`);
console.log(
  `seeded: ${seedData.countries.length} countries, ${seedData.team.length} team members`,
);
// Set exit code without process.exit() so pending sockets drain cleanly
// (avoids a libuv teardown assertion on Node 24 / Windows).
process.exitCode = res.ok ? 0 : 1;
