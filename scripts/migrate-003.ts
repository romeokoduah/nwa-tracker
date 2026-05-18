/**
 * One-off NON-DESTRUCTIVE migration: merge duplicate person
 * "Komalvi" (id komalvi) into the canonical identity "Komlavi" (id komlavi).
 * Preserves review progress, roles, assignments, activity. Idempotent.
 *
 *   SEED_URL=https://nwa-tracker.vercel.app npx tsx scripts/migrate-003.ts
 */
const OLD_ID = 'komalvi';
const OLD_NAME = 'Komalvi';
const NEW_ID = 'komlavi';
const NEW_NAME = 'Komlavi';

const base = (process.env.SEED_URL ?? 'https://nwa-tracker.vercel.app').replace(
  /\/$/,
  '',
);

type Member = {
  id: string;
  name: string;
  email: string | null;
  roles: string[];
  active: boolean;
  avatarColor: string;
};
type Review = {
  reviewerId: string;
  reviewerName: string;
  done: boolean;
  completedAt: string | null;
  comments: string | null;
};
type Comment = {
  authorId: string;
  authorName: string;
  recipientIds: string[];
  recipientNames: string[];
};
type Country = {
  figures: { assignedTo: string | null }[];
  report: { assignedTo: string | null };
  reviews: Review[];
  messages?: Comment[];
};
type State = {
  countries: Country[];
  team: Member[];
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

const remapId = (v: string | null) => (v === OLD_ID ? NEW_ID : v);
const remapName = (v: string) => (v === OLD_NAME ? NEW_NAME : v);

// 1. Team: merge roles into the surviving komlavi member, drop komalvi.
const oldM = data.team.find((m) => m.id === OLD_ID);
let newM = data.team.find((m) => m.id === NEW_ID);
if (oldM && !newM) {
  // Only the old record exists — rename it in place.
  oldM.id = NEW_ID;
  oldM.name = NEW_NAME;
  newM = oldM;
} else if (oldM && newM) {
  newM.roles = [...new Set([...newM.roles, ...oldM.roles])];
  newM.email = newM.email ?? oldM.email;
  data.team = data.team.filter((m) => m.id !== OLD_ID);
}
if (newM && !newM.roles.includes('reviewer')) newM.roles.push('reviewer');

// 2. Reviews on every country: rename the Komalvi entry, dedupe if needed.
let reviewsFixed = 0;
for (const c of data.countries) {
  let target: Review | undefined;
  const kept: Review[] = [];
  for (const r of c.reviews) {
    const isOld =
      r.reviewerId === OLD_ID || r.reviewerName.toLowerCase() === 'komalvi';
    const isNew =
      r.reviewerId === NEW_ID || r.reviewerName.toLowerCase() === 'komlavi';
    if (isOld || isNew) {
      const norm: Review = {
        ...r,
        reviewerId: NEW_ID,
        reviewerName: NEW_NAME,
      };
      if (!target) {
        target = norm;
        kept.push(norm);
      } else {
        // merge a duplicate (keep done, latest completion, joined comments)
        target.done = target.done || norm.done;
        target.completedAt = target.completedAt ?? norm.completedAt;
        target.comments =
          [target.comments, norm.comments].filter(Boolean).join(' ') || null;
      }
      if (isOld) reviewsFixed++;
    } else {
      kept.push(r);
    }
  }
  c.reviews = kept;

  // 3. Assignments referencing the old id.
  for (const f of c.figures) f.assignedTo = remapId(f.assignedTo);
  c.report.assignedTo = remapId(c.report.assignedTo);

  // 4. Comments referencing the old identity.
  for (const m of c.messages ?? []) {
    m.authorId = remapId(m.authorId) as string;
    m.authorName = remapName(m.authorName);
    m.recipientIds = m.recipientIds.map((x) => remapId(x) as string);
    m.recipientNames = m.recipientNames.map(remapName);
  }
}

data.activity = [
  {
    id: 'mig003' + Date.now().toString(36),
    timestamp: new Date().toISOString(),
    actor: 'System',
    action: `Merged duplicate member "${OLD_NAME}" into canonical identity "${NEW_NAME}".`,
    entityType: 'team',
    entityId: NEW_ID,
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
  `team now ${data.team.length}; review entries renamed on ${reviewsFixed} countries`,
);
const survivor = data.team.find((m) => m.id === NEW_ID);
console.log(`survivor: ${JSON.stringify(survivor)}`);
console.log(`old id still present: ${data.team.some((m) => m.id === OLD_ID)}`);
console.log(`POST /api/state -> ${put.status} ${putText}`);
process.exitCode = put.ok ? 0 : 1;
