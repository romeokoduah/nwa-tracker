/**
 * One-off NON-DESTRUCTIVE migration: figures 1–7 are complete for every
 * country; figure 8 (Per Capita & Stress) is complete for Ethiopia only.
 * Preserves team, activity log, assignees and everything else. Idempotent.
 *
 *   SEED_URL=https://nwa-tracker.vercel.app npx tsx scripts/migrate-002.ts
 */
const PERCAP =
  'Per capita water availability and environmental water stress for the period';
const COMPLETED_AT = '2026-05-18T00:00:00.000Z';

const base = (process.env.SEED_URL ?? 'https://nwa-tracker.vercel.app').replace(
  /\/$/,
  '',
);

type Figure = {
  type: string;
  assignedTo: string | null;
  status: string;
  deadline: string | null;
  completedAt: string | null;
  notes: string | null;
};
type Country = { name: string; figures: Figure[] };
type State = {
  countries: Country[];
  team: unknown[];
  activity: {
    id: string;
    timestamp: string;
    actor: string;
    action: string;
    entityType: string;
    entityId: string;
  }[];
};

const res = await fetch(`${base}/api/state`);
const { data, version } = (await res.json()) as { data: State; version: number };
if (!data) throw new Error('No live state to migrate');

let figuresCompleted = 0;
for (const c of data.countries) {
  for (const f of c.figures) {
    if (f.type === PERCAP) {
      if (c.name === 'Ethiopia' && f.status !== 'done') {
        f.status = 'done';
        f.completedAt = f.completedAt ?? COMPLETED_AT;
        figuresCompleted++;
      }
      continue; // non-Ethiopia Per Capita stays as-is (not started)
    }
    if (f.status !== 'done') {
      f.status = 'done';
      f.completedAt = f.completedAt ?? COMPLETED_AT;
      figuresCompleted++;
    }
  }
}

data.activity = [
  {
    id: 'mig002' + Date.now().toString(36),
    timestamp: new Date().toISOString(),
    actor: 'System',
    action:
      'Marked figures 2–7 (Cultivated Area, Irrigation Map, River Network, Sankey, Water Accounts, Water Use & Rainfall) complete for all countries.',
    entityType: 'figure',
    entityId: 'migration-002',
  },
  ...(data.activity ?? []),
].slice(0, 500);

const put = await fetch(`${base}/api/state`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ data }),
});
const putText = await put.text();
console.log(`read version ${version}`);
console.log(`figures newly marked done: ${figuresCompleted}`);
console.log(`POST /api/state -> ${put.status} ${putText}`);
process.exitCode = put.ok ? 0 : 1;
