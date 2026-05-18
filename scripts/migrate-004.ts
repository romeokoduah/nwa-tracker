/**
 * NON-DESTRUCTIVE identity merges:
 *   thraindu -> tharindu   (canonical "Tharindu")
 *   smarinka -> smaranika  (canonical "Smaranika")
 * Unions roles, removes the duplicate, defensively remaps reviews /
 * assignments / comments. Preserves activity + everything else. Idempotent.
 *
 *   SEED_URL=https://nwa-tracker.vercel.app npx tsx scripts/migrate-004.ts
 */
const MERGES = [
  { oldId: 'thraindu', oldName: 'Thraindu', newId: 'tharindu', newName: 'Tharindu' },
  { oldId: 'smarinka', oldName: 'Smarinka', newId: 'smaranika', newName: 'Smaranika' },
];

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
type State = {
  countries: {
    figures: { assignedTo: string | null }[];
    report: { assignedTo: string | null };
    reviews: {
      reviewerId: string;
      reviewerName: string;
      done: boolean;
      completedAt: string | null;
      comments: string | null;
    }[];
    messages?: {
      authorId: string;
      authorName: string;
      recipientIds: string[];
      recipientNames: string[];
    }[];
  }[];
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

const summary: string[] = [];

for (const { oldId, oldName, newId, newName } of MERGES) {
  const oldM = data.team.find((m) => m.id === oldId);
  let newM = data.team.find((m) => m.id === newId);
  if (oldM && !newM) {
    oldM.id = newId;
    oldM.name = newName;
    newM = oldM;
  } else if (oldM && newM) {
    newM.roles = [...new Set([...newM.roles, ...oldM.roles])];
    newM.email = newM.email ?? oldM.email;
    data.team = data.team.filter((m) => m.id !== oldId);
  }

  const remapId = (v: string | null) => (v === oldId ? newId : v);
  const remapName = (v: string) => (v === oldName ? newName : v);

  for (const c of data.countries) {
    const kept: typeof c.reviews = [];
    let target: (typeof c.reviews)[number] | undefined;
    for (const r of c.reviews) {
      const isOld =
        r.reviewerId === oldId ||
        r.reviewerName.toLowerCase() === oldName.toLowerCase();
      const isNew =
        r.reviewerId === newId ||
        r.reviewerName.toLowerCase() === newName.toLowerCase();
      if (isOld || isNew) {
        const norm = { ...r, reviewerId: newId, reviewerName: newName };
        if (!target) {
          target = norm;
          kept.push(norm);
        } else {
          target.done = target.done || norm.done;
          target.completedAt = target.completedAt ?? norm.completedAt;
          target.comments =
            [target.comments, norm.comments].filter(Boolean).join(' ') || null;
        }
      } else kept.push(r);
    }
    c.reviews = kept;
    for (const f of c.figures) f.assignedTo = remapId(f.assignedTo);
    c.report.assignedTo = remapId(c.report.assignedTo);
    for (const m of c.messages ?? []) {
      m.authorId = remapId(m.authorId) as string;
      m.authorName = remapName(m.authorName);
      m.recipientIds = m.recipientIds.map((x) => remapId(x) as string);
      m.recipientNames = m.recipientNames.map(remapName);
    }
  }
  const survivor = data.team.find((m) => m.id === newId);
  summary.push(
    `${oldName}->${newName}: survivor roles [${survivor?.roles.join(',')}], old present=${data.team.some((m) => m.id === oldId)}`,
  );
}

data.activity = [
  {
    id: 'mig004' + Date.now().toString(36),
    timestamp: new Date().toISOString(),
    actor: 'System',
    action:
      'Merged duplicate members: Thraindu→Tharindu and Smarinka→Smaranika.',
    entityType: 'team',
    entityId: 'migration-004',
  },
  ...(data.activity ?? []),
].slice(0, 500);

const put = await fetch(`${base}/api/state`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ data }),
});
const putText = await put.text();
console.log(`read version ${version}; team now ${data.team.length}`);
summary.forEach((l) => console.log('  ' + l));
console.log(`POST /api/state -> ${put.status} ${putText}`);
process.exitCode = put.ok ? 0 : 1;
