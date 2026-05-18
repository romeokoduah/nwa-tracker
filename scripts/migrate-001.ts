/**
 * One-off NON-DESTRUCTIVE migration for the "Dashboard Revisions" update.
 * Fetches live state, transforms in place, writes it back. Preserves the
 * existing team, activity log and any edits already made.
 *
 *   SEED_URL=https://nwa-tracker.vercel.app npx tsx scripts/migrate-001.ts
 *
 * Applies:
 *  1. Adds "Naga" as a reviewer on every country (if missing).
 *  5. Marks every country's "Map of country" figure complete, produced by
 *     the figure lead (Geethya); marks Ethiopia's Per Capita & Stress
 *     complete, produced by Isuru. (Leads themselves live in code/FIGURE_META.)
 *  Ensures every country has a `messages` array for the new comment system.
 */
const MAP = 'Map of country';
const PERCAP =
  'Per capita water availability and environmental water stress for the period';
const COMPLETED_AT = '2026-05-18T00:00:00.000Z';

const base = (process.env.SEED_URL ?? 'https://nwa-tracker.vercel.app').replace(
  /\/$/,
  '',
);

type Member = { id: string; name: string };
type Review = {
  reviewerId: string;
  reviewerName: string;
  done: boolean;
  completedAt: string | null;
  comments: string | null;
};
type Figure = {
  type: string;
  assignedTo: string | null;
  status: string;
  deadline: string | null;
  completedAt: string | null;
  notes: string | null;
};
type Country = {
  id: string;
  name: string;
  figures: Figure[];
  reviews: Review[];
  messages?: unknown[];
};
type State = {
  countries: Country[];
  team: Member[];
  activity: { id: string; timestamp: string; actor: string; action: string; entityType: string; entityId: string }[];
  lastSyncedAt: string | null;
};

const res = await fetch(`${base}/api/state`);
const { data, version } = (await res.json()) as { data: State; version: number };
if (!data) throw new Error('No live state to migrate');

const memberIdByName = (name: string) =>
  data.team.find((m) => m.name.toLowerCase() === name.toLowerCase())?.id ??
  name.toLowerCase();

const geethya = memberIdByName('Geethya');
const isuru = memberIdByName('Isuru');

let mapsFixed = 0;
let nagaAdded = 0;
let ethiopiaFixed = 0;

for (const c of data.countries) {
  if (!Array.isArray(c.messages)) c.messages = [];

  if (!c.reviews.some((r) => r.reviewerName.toLowerCase() === 'naga')) {
    c.reviews.push({
      reviewerId: 'naga',
      reviewerName: 'Naga',
      done: false,
      completedAt: null,
      comments: null,
    });
    nagaAdded++;
  }

  for (const f of c.figures) {
    if (f.type === MAP) {
      f.status = 'done';
      f.assignedTo = geethya;
      f.completedAt = f.completedAt ?? COMPLETED_AT;
      mapsFixed++;
    }
    if (f.type === PERCAP && c.name === 'Ethiopia') {
      f.status = 'done';
      f.assignedTo = isuru;
      f.completedAt = f.completedAt ?? COMPLETED_AT;
      ethiopiaFixed++;
    }
  }
}

data.activity = [
  {
    id: 'mig001' + Date.now().toString(36),
    timestamp: new Date().toISOString(),
    actor: 'System',
    action:
      'Applied dashboard revisions: Naga added as reviewer; all country maps marked complete (produced by Geethya); Ethiopia Per Capita & Stress complete; Isuru set as lead for Cultivated Area / Irrigation Map / Per Capita & Stress.',
    entityType: 'country',
    entityId: 'migration-001',
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
console.log(
  `maps completed: ${mapsFixed}, Naga added to: ${nagaAdded} countries, Ethiopia per-capita: ${ethiopiaFixed}`,
);
console.log(`geethya id=${geethya}, isuru id=${isuru}`);
console.log(`POST /api/state -> ${put.status} ${putText}`);
process.exitCode = put.ok ? 0 : 1;
