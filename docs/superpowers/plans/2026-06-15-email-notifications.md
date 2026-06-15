# Email Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send instant email notifications (assignments, directed comments, replies, review/status changes) to the relevant team members when work changes in the NWA Tracker.

**Architecture:** A pure `computeNotifications(prev, next, mutation, ctx)` function in `src/lib/notifications.ts` decides who to email and what to say (no I/O, fully unit-tested). `api/_mailer.ts` is a thin `nodemailer` Gmail-SMTP transport. `api/mutate.ts` calls compute after a successful CAS and sends in the background via `@vercel/functions` `waitUntil`, so email never blocks or breaks a write. The client passes `actorId` so a user is never emailed about their own action.

**Tech Stack:** TypeScript, Vercel serverless functions (`@vercel/node`), `@vercel/functions` (waitUntil), `nodemailer` (Gmail SMTP), Neon Postgres (existing), Vitest (new, for unit tests).

**Spec:** `docs/superpowers/specs/2026-06-15-email-notifications-design.md`

**Branch:** `email-notifications` (already created; the spec commit is the first commit on it).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/notifications.ts` (NEW) | Pure: decide recipients + build subject/body for every trigger. Imports only from `./types` (and the `Mutation` *type* from `./mutations`). |
| `src/lib/notifications.test.ts` (NEW) | Vitest unit tests for every trigger + guards. |
| `api/_mailer.ts` (NEW) | `nodemailer` Gmail transport. `sendEmails(messages)` — side-effect only, swallows errors. |
| `api/_mailer.test.ts` (NEW) | Tests transport with a mocked `nodemailer`. |
| `api/mutate.ts` (MODIFY) | Read `actorId`; after CAS success, compute + `waitUntil(sendEmails(...))` behind the kill switch. |
| `src/lib/api.ts` (MODIFY) | `postMutation(mutation, actorId)` includes `actorId` in the POST body. |
| `src/store/sync.ts` (MODIFY) | Queue carries `actorId` (captured from `useAuthStore` at enqueue time) and passes it to `postMutation`. |
| `.env.example` (MODIFY) | Document the new env vars. |
| `vitest.config.ts` (NEW) | Vitest config (node env, `*.test.ts`). |
| `package.json` (MODIFY) | Add deps + `test` script. |

**Env vars (set in Vercel + local `.env`):** `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `APP_BASE_URL`, `NOTIFICATIONS_ENABLED`, `ADMIN_NOTIFY_EMAIL`.

---

## Task 1: Tooling — add dependencies and Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/lib/__smoke__.test.ts` (temporary, deleted at end of task)

- [ ] **Step 1: Install dependencies**

Run (from `nwa-tracker/`):
```bash
npm install nodemailer @vercel/functions
npm install -D vitest @types/nodemailer
```
Expected: packages added; `nodemailer` and `@vercel/functions` under `dependencies`, `vitest` + `@types/nodemailer` under `devDependencies`.

- [ ] **Step 2: Add the test script to `package.json`**

In the `"scripts"` block, add:
```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'api/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Add a temporary smoke test**

Create `src/lib/__smoke__.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('tooling', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run the smoke test**

Run: `npm test`
Expected: PASS (1 test passed).

- [ ] **Step 6: Delete the smoke test and commit**

```bash
rm src/lib/__smoke__.test.ts
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest, nodemailer, @vercel/functions

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `notifications.ts` foundation + report assignment

**Files:**
- Create: `src/lib/notifications.ts`
- Test: `src/lib/notifications.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/notifications.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import type { AppState, Country, TeamMember } from './types';
import type { Mutation } from './mutations';
import { computeNotifications, type NotifyCtx } from './notifications';

// ---- fixtures (extended by later tasks) ----
function member(id: string, over: Partial<TeamMember> = {}): TeamMember {
  return {
    id,
    name: id[0].toUpperCase() + id.slice(1),
    email: `${id}@cgiar.org`,
    roles: ['report_writer'],
    avatarColor: '#2EB5A3',
    active: true,
    ...over,
  };
}

function country(id: string, over: Partial<Country> = {}): Country {
  return {
    id,
    no: 1,
    name: id[0].toUpperCase() + id.slice(1),
    iso3: 'XXX',
    region: 'West',
    figures: [],
    report: { assignedTo: null, status: 'not_started', deadline: null, completedAt: null, notes: null },
    reviews: [],
    flags: [],
    comments: null,
    messages: [],
    ...over,
  };
}

function state(over: Partial<AppState> = {}): AppState {
  return { countries: [], team: [], activity: [], lastSyncedAt: null, ...over };
}

const CTX: NotifyCtx = { actorId: 'admin', appBaseUrl: 'https://app.test', adminEmail: 'admin@cgiar.org' };

function act() {
  return { id: 'a1', timestamp: '2026-06-15T00:00:00Z', actor: 'Admin', action: 'x', entityType: 'report' as const, entityId: 'c1' };
}

describe('report assignment', () => {
  it('emails the new assignee when report.assignedTo changes', () => {
    const isuru = member('isuru');
    const prev = state({ team: [isuru], countries: [country('c1', { name: 'Zambia' })] });
    const next = state({ team: [isuru], countries: [country('c1', { name: 'Zambia', report: { assignedTo: 'isuru', status: 'not_started', deadline: null, completedAt: null, notes: null } })] });
    const m: Mutation = { t: 'updateReport', countryId: 'c1', patch: { assignedTo: 'isuru' }, nowISO: '2026-06-15T00:00:00Z', act: act() };

    const msgs = computeNotifications(prev, next, m, CTX);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].to).toBe('isuru@cgiar.org');
    expect(msgs[0].subject).toContain('Zambia');
    expect(msgs[0].text).toContain('https://app.test/countries/c1');
  });

  it('does not email when the assignee is unchanged', () => {
    const isuru = member('isuru');
    const c = country('c1', { report: { assignedTo: 'isuru', status: 'not_started', deadline: null, completedAt: null, notes: null } });
    const prev = state({ team: [isuru], countries: [c] });
    const next = state({ team: [isuru], countries: [c] });
    const m: Mutation = { t: 'updateReport', countryId: 'c1', patch: { assignedTo: 'isuru' }, nowISO: '2026-06-15T00:00:00Z', act: act() };
    expect(computeNotifications(prev, next, m, CTX)).toHaveLength(0);
  });

  it('does not email the actor about their own assignment', () => {
    const isuru = member('isuru');
    const prev = state({ team: [isuru], countries: [country('c1')] });
    const next = state({ team: [isuru], countries: [country('c1', { report: { assignedTo: 'isuru', status: 'not_started', deadline: null, completedAt: null, notes: null } })] });
    const m: Mutation = { t: 'updateReport', countryId: 'c1', patch: { assignedTo: 'isuru' }, nowISO: '2026-06-15T00:00:00Z', act: act() };
    expect(computeNotifications(prev, next, m, { ...CTX, actorId: 'isuru' })).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/notifications.test.ts`
Expected: FAIL — `Failed to resolve import "./notifications"`.

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/notifications.ts`:
```ts
/**
 * Pure notification computation. Given the state before/after a mutation and the
 * mutation itself, returns the emails that should be sent. NO I/O, NO Node/browser
 * globals — imports only `./types` and the `Mutation` *type*. Bundled into the
 * Vercel `mutate` function and exercised by unit tests.
 */
import { FIGURE_META, type AppState, type Country, type TeamMember } from './types';
import type { Mutation } from './mutations';

export interface EmailMessage {
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
}

export interface NotifyCtx {
  /** Team-member id of the user who triggered the mutation (never emailed). */
  actorId: string | null;
  /** Public base URL of the app, no trailing slash, for deep links. */
  appBaseUrl: string;
  /** Address that receives the admin copy of "blocked" notifications. */
  adminEmail: string;
}

interface Recipient {
  id: string;
  name: string;
  email: string;
}

function memberById(s: AppState, id: string | null | undefined): TeamMember | undefined {
  return id ? s.team.find((t) => t.id === id) : undefined;
}

function countryById(s: AppState, id: string): Country | undefined {
  return s.countries.find((c) => c.id === id);
}

/** Resolve member ids to send-able recipients: drop the actor, extra-excluded ids, inactive members, members with no email, and duplicates (by id and by email). */
function recipients(
  s: AppState,
  ids: ReadonlyArray<string | null | undefined>,
  ctx: NotifyCtx,
  extraExclude: ReadonlyArray<string> = [],
): Recipient[] {
  const seenId = new Set<string>();
  const seenEmail = new Set<string>();
  const out: Recipient[] = [];
  for (const id of ids) {
    if (!id || id === ctx.actorId || extraExclude.includes(id) || seenId.has(id)) continue;
    seenId.add(id);
    const m = memberById(s, id);
    if (!m || !m.active || !m.email) continue;
    const email = m.email.toLowerCase();
    if (seenEmail.has(email)) continue;
    seenEmail.add(email);
    out.push({ id: m.id, name: m.name, email: m.email });
  }
  return out;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function link(ctx: NotifyCtx, path: string): string {
  return `${ctx.appBaseUrl}${path}`;
}

function build(
  to: string,
  subject: string,
  lines: string[],
  linkUrl: string,
  replyTo?: string,
): EmailMessage {
  const body = lines.filter(Boolean);
  const linkText = 'Open in NWA Tracker';
  const text = [...body, `${linkText}: ${linkUrl}`].join('\n\n');
  const html =
    body.map((l) => `<p>${escapeHtml(l)}</p>`).join('') +
    `<p><a href="${linkUrl}">${linkText}</a></p>`;
  return replyTo ? { to, replyTo, subject, text, html } : { to, subject, text, html };
}

export function computeNotifications(
  prev: AppState,
  next: AppState,
  m: Mutation,
  ctx: NotifyCtx,
): EmailMessage[] {
  const actor = memberById(next, ctx.actorId);
  const replyTo = actor?.email ?? undefined;

  if (m.t === 'updateReport') {
    const c = countryById(next, m.countryId);
    if (!c) return [];
    if ('assignedTo' in m.patch) {
      const before = countryById(prev, m.countryId)?.report.assignedTo ?? null;
      const after = m.patch.assignedTo ?? null;
      if (after && after !== before) {
        return recipients(next, [after], ctx).map((r) =>
          build(
            r.email,
            `[NWA Tracker] You've been assigned the ${c.name} report`,
            [
              `You've been assigned the country report for ${c.name}.`,
              actor ? `Assigned by ${actor.name}.` : '',
            ],
            link(ctx, `/countries/${c.id}`),
            replyTo,
          ),
        );
      }
    }
    return [];
  }

  return [];
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/notifications.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifications.ts src/lib/notifications.test.ts
git commit -m "feat(notify): report assignment notifications

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Figure assignment (`updateFigure` + `bulkAssignFigure`)

**Files:**
- Modify: `src/lib/notifications.ts`
- Test: `src/lib/notifications.test.ts`

- [ ] **Step 1: Add the failing tests**

Append to `src/lib/notifications.test.ts`:
```ts
import { FIGURE_TYPES } from './types';

describe('figure assignment', () => {
  const fig = FIGURE_TYPES[0]; // 'Map of country' -> shortLabel 'Country Map'
  function withFigure(assignedTo: string | null) {
    return country('c1', {
      name: 'Mali',
      figures: [{ type: fig, assignedTo, status: 'not_started', deadline: null, completedAt: null, notes: null }],
    });
  }

  it('emails the assignee when a figure assignee changes', () => {
    const geethya = member('geethya');
    const prev = state({ team: [geethya], countries: [withFigure(null)] });
    const next = state({ team: [geethya], countries: [withFigure('geethya')] });
    const m: Mutation = { t: 'updateFigure', countryId: 'c1', figureType: fig, patch: { assignedTo: 'geethya' }, nowISO: '2026-06-15T00:00:00Z', act: act() };
    const msgs = computeNotifications(prev, next, m, CTX);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].to).toBe('geethya@cgiar.org');
    expect(msgs[0].subject).toContain('Country Map');
    expect(msgs[0].subject).toContain('Mali');
  });

  it('coalesces a bulk figure assignment into one email', () => {
    const eric = member('eric');
    const next = state({
      team: [eric],
      countries: [country('c1', { name: 'Ghana' }), country('c2', { name: 'Gambia' })],
    });
    const m: Mutation = { t: 'bulkAssignFigure', countryIds: ['c1', 'c2'], figureType: fig, memberId: 'eric', act: act() };
    const msgs = computeNotifications(next, next, m, CTX);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].to).toBe('eric@cgiar.org');
    expect(msgs[0].text).toContain('Ghana');
    expect(msgs[0].text).toContain('Gambia');
  });

  it('sends nothing when a bulk figure assignment clears the assignee', () => {
    const next = state({ team: [member('eric')], countries: [country('c1')] });
    const m: Mutation = { t: 'bulkAssignFigure', countryIds: ['c1'], figureType: fig, memberId: null, act: act() };
    expect(computeNotifications(next, next, m, CTX)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/notifications.test.ts`
Expected: FAIL — figure/bulk assertions fail (no branch yet).

- [ ] **Step 3: Implement the branches**

In `src/lib/notifications.ts`, inside `computeNotifications`, add these branches **before** the final `return []`:
```ts
  if (m.t === 'updateFigure') {
    const c = countryById(next, m.countryId);
    if (!c) return [];
    if ('assignedTo' in m.patch) {
      const before = countryById(prev, m.countryId)?.figures.find((f) => f.type === m.figureType)?.assignedTo ?? null;
      const after = m.patch.assignedTo ?? null;
      if (after && after !== before) {
        const label = FIGURE_META[m.figureType].shortLabel;
        return recipients(next, [after], ctx).map((r) =>
          build(
            r.email,
            `[NWA Tracker] You've been assigned the ${label} figure for ${c.name}`,
            [
              `You've been assigned the "${label}" figure for ${c.name}.`,
              actor ? `Assigned by ${actor.name}.` : '',
            ],
            link(ctx, `/countries/${c.id}`),
            replyTo,
          ),
        );
      }
    }
    return [];
  }

  if (m.t === 'bulkAssignFigure') {
    if (!m.memberId) return [];
    const recips = recipients(next, [m.memberId], ctx);
    if (recips.length === 0) return [];
    const label = FIGURE_META[m.figureType].shortLabel;
    const names = m.countryIds
      .map((id) => countryById(next, id)?.name)
      .filter((n): n is string => Boolean(n));
    if (names.length === 0) return [];
    return recips.map((r) =>
      build(
        r.email,
        `[NWA Tracker] You've been assigned the ${label} figure for ${names.length} ${names.length === 1 ? 'country' : 'countries'}`,
        [
          `You've been assigned the "${label}" figure for: ${names.join(', ')}.`,
          actor ? `Assigned by ${actor.name}.` : '',
        ],
        link(ctx, `/figures`),
        replyTo,
      ),
    );
  }
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/notifications.test.ts`
Expected: PASS (all figure + report tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifications.ts src/lib/notifications.test.ts
git commit -m "feat(notify): figure + bulk figure assignment notifications

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Directed comments (`addComment`)

**Files:**
- Modify: `src/lib/notifications.ts`
- Test: `src/lib/notifications.test.ts`

- [ ] **Step 1: Add the failing tests**

Append to `src/lib/notifications.test.ts`:
```ts
import type { Comment } from './types';

function comment(over: Partial<Comment> = {}): Comment {
  return {
    id: 'm1',
    countryId: 'c1',
    scope: 'report',
    figureType: null,
    authorId: 'admin',
    authorName: 'Admin',
    authorRole: 'Admin',
    recipientIds: ['isuru'],
    recipientNames: ['Isuru'],
    body: 'Please update the totals.',
    createdAt: '2026-06-15T00:00:00Z',
    fromReviewer: false,
    blocking: false,
    status: 'open',
    replies: [],
    acknowledgedBy: [],
    resolvedAt: null,
    resolvedBy: null,
    ...over,
  };
}

describe('directed comments', () => {
  const base = () => state({ team: [member('isuru'), member('naga', { roles: ['reviewer'] })], countries: [country('c1', { name: 'Mali' })] });

  it('emails the recipients of a new comment', () => {
    const c = comment();
    const next = base();
    next.countries[0].messages = [c];
    const m: Mutation = { t: 'addComment', comment: c, act: act() };
    const msgs = computeNotifications(base(), next, m, CTX);
    expect(msgs.map((x) => x.to)).toEqual(['isuru@cgiar.org']);
    expect(msgs[0].subject).toContain('New comment');
    expect(msgs[0].text).toContain('Please update the totals.');
  });

  it('uses reviewer-feedback wording when fromReviewer', () => {
    const c = comment({ authorId: 'naga', authorName: 'Naga', fromReviewer: true });
    const next = base();
    const m: Mutation = { t: 'addComment', comment: c, act: act() };
    const msgs = computeNotifications(base(), next, m, { ...CTX, actorId: 'naga' });
    expect(msgs[0].subject).toContain('Reviewer feedback');
  });

  it('uses action-needed wording when blocking', () => {
    const c = comment({ blocking: true });
    const m: Mutation = { t: 'addComment', comment: c, act: act() };
    const msgs = computeNotifications(base(), base(), m, CTX);
    expect(msgs[0].subject).toContain('Action needed');
  });

  it('never emails the comment author even if they are also a recipient', () => {
    const c = comment({ authorId: 'isuru', authorName: 'Isuru', recipientIds: ['isuru'] });
    const m: Mutation = { t: 'addComment', comment: c, act: act() };
    expect(computeNotifications(base(), base(), m, { ...CTX, actorId: 'isuru' })).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/notifications.test.ts`
Expected: FAIL — `addComment` not handled.

- [ ] **Step 3: Implement the branch**

In `computeNotifications`, add before the final `return []`:
```ts
  if (m.t === 'addComment') {
    const c = m.comment;
    const country = countryById(next, c.countryId);
    if (!country) return [];
    const recips = recipients(next, c.recipientIds, ctx, [c.authorId]);
    if (recips.length === 0) return [];

    const sectionLabel =
      c.scope === 'figure' && c.figureType
        ? FIGURE_META[c.figureType].shortLabel
        : c.scope === 'report'
          ? 'report'
          : 'general discussion';

    const subject = c.blocking
      ? `[NWA Tracker] Action needed: comment on ${country.name}`
      : c.fromReviewer
        ? `[NWA Tracker] Reviewer feedback on ${country.name}`
        : `[NWA Tracker] New comment on ${country.name}`;

    return recips.map((r) =>
      build(
        r.email,
        subject,
        [
          `${c.authorName} left a ${c.blocking ? 'blocking ' : ''}comment on ${country.name} (${sectionLabel}):`,
          `"${c.body}"`,
          c.blocking ? 'This comment is blocking and needs your response.' : '',
        ],
        link(ctx, `/countries/${country.id}`),
        replyTo,
      ),
    );
  }
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/notifications.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifications.ts src/lib/notifications.test.ts
git commit -m "feat(notify): directed comment notifications

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Replies (`replyComment`)

**Files:**
- Modify: `src/lib/notifications.ts`
- Test: `src/lib/notifications.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `src/lib/notifications.test.ts`:
```ts
import type { CommentReply } from './types';

describe('replies', () => {
  it('emails all thread participants except the replier', () => {
    const team = [member('admin', { name: 'Admin' }), member('isuru'), member('naga')];
    const reply: CommentReply = { id: 'r1', authorId: 'isuru', authorName: 'Isuru', authorRole: 'Writer', body: 'Done, fixed.', createdAt: '2026-06-15T01:00:00Z' };
    const threaded = comment({ authorId: 'naga', authorName: 'Naga', recipientIds: ['isuru'], replies: [reply] });
    const next = state({ team, countries: [country('c1', { name: 'Mali', messages: [threaded] })] });
    const m: Mutation = { t: 'replyComment', countryId: 'c1', commentId: 'm1', reply, fromRecipient: true, act: act() };
    const msgs = computeNotifications(next, next, m, { ...CTX, actorId: 'isuru' });
    // participants: naga (author) + isuru (recipient) + isuru (replier); replier removed -> naga only
    expect(msgs.map((x) => x.to)).toEqual(['naga@cgiar.org']);
    expect(msgs[0].subject).toContain('reply');
    expect(msgs[0].text).toContain('Done, fixed.');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/notifications.test.ts`
Expected: FAIL — `replyComment` not handled.

- [ ] **Step 3: Implement the branch**

In `computeNotifications`, add before the final `return []`:
```ts
  if (m.t === 'replyComment') {
    const country = countryById(next, m.countryId);
    const thread = country?.messages?.find((x) => x.id === m.commentId);
    if (!country || !thread) return [];
    const participantIds = [
      thread.authorId,
      ...thread.recipientIds,
      ...thread.replies.map((rep) => rep.authorId),
    ];
    const recips = recipients(next, participantIds, ctx, [m.reply.authorId]);
    if (recips.length === 0) return [];
    return recips.map((r) =>
      build(
        r.email,
        `[NWA Tracker] New reply on ${country.name}`,
        [`${m.reply.authorName} replied on ${country.name}:`, `"${m.reply.body}"`],
        link(ctx, `/countries/${country.id}`),
        replyTo,
      ),
    );
  }
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/notifications.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifications.ts src/lib/notifications.test.ts
git commit -m "feat(notify): comment reply notifications

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Reviews & status changes (`toggleReview`, status → in_review / blocked)

**Files:**
- Modify: `src/lib/notifications.ts`
- Test: `src/lib/notifications.test.ts`

- [ ] **Step 1: Add the failing tests**

Append to `src/lib/notifications.test.ts`:
```ts
describe('reviews and status changes', () => {
  function reviewed(reportAssignee: string | null) {
    return country('c1', {
      name: 'Niger',
      report: { assignedTo: reportAssignee, status: 'in_progress', deadline: null, completedAt: null, notes: null },
      reviews: [{ reviewerId: 'naga', reviewerName: 'Naga', done: false, completedAt: null, comments: null }],
    });
  }

  it('emails the report owner when a review is completed', () => {
    const team = [member('afua'), member('naga', { roles: ['reviewer'] })];
    const next = state({ team, countries: [reviewed('afua')] });
    const m: Mutation = { t: 'toggleReview', countryId: 'c1', reviewerId: 'naga', done: true, nowISO: '2026-06-15T00:00:00Z', act: act() };
    const msgs = computeNotifications(next, next, m, { ...CTX, actorId: 'naga' });
    expect(msgs.map((x) => x.to)).toEqual(['afua@cgiar.org']);
    expect(msgs[0].subject).toContain('Review completed');
  });

  it('does not email when a review is un-completed', () => {
    const next = state({ team: [member('afua')], countries: [reviewed('afua')] });
    const m: Mutation = { t: 'toggleReview', countryId: 'c1', reviewerId: 'naga', done: false, nowISO: '2026-06-15T00:00:00Z', act: act() };
    expect(computeNotifications(next, next, m, CTX)).toHaveLength(0);
  });

  it('emails the reviewers when report status becomes in_review', () => {
    const team = [member('afua'), member('naga', { roles: ['reviewer'] })];
    const prev = state({ team, countries: [reviewed('afua')] });
    const next = state({ team, countries: [{ ...reviewed('afua'), report: { assignedTo: 'afua', status: 'in_review', deadline: null, completedAt: null, notes: null } }] });
    const m: Mutation = { t: 'updateReport', countryId: 'c1', patch: { status: 'in_review' }, nowISO: '2026-06-15T00:00:00Z', act: act() };
    const msgs = computeNotifications(prev, next, m, { ...CTX, actorId: 'afua' });
    expect(msgs.map((x) => x.to)).toEqual(['naga@cgiar.org']);
    expect(msgs[0].subject).toContain('Ready for your review');
  });

  it('emails the assignee and admin when report status becomes blocked', () => {
    const team = [member('afua')];
    const prev = state({ team, countries: [reviewed('afua')] });
    const next = state({ team, countries: [{ ...reviewed('afua'), report: { assignedTo: 'afua', status: 'blocked', deadline: null, completedAt: null, notes: null } }] });
    const m: Mutation = { t: 'updateReport', countryId: 'c1', patch: { status: 'blocked' }, nowISO: '2026-06-15T00:00:00Z', act: act() };
    const msgs = computeNotifications(prev, next, m, CTX); // actor = admin (not the assignee)
    const tos = msgs.map((x) => x.to).sort();
    expect(tos).toEqual(['admin@cgiar.org', 'afua@cgiar.org']);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/notifications.test.ts`
Expected: FAIL — `toggleReview` unhandled and `updateReport` status branch missing.

- [ ] **Step 3: Implement the branches**

3a. Add a shared helper near the top-level functions in `src/lib/notifications.ts` (after `build`):
```ts
/** Emails for a section status transition (report or figure). */
function statusMessages(
  next: AppState,
  country: Country,
  sectionLabel: string,
  newStatus: string,
  assigneeId: string | null,
  ctx: NotifyCtx,
  replyTo: string | undefined,
): EmailMessage[] {
  const url = link(ctx, `/countries/${country.id}`);
  if (newStatus === 'in_review') {
    const reviewerIds = country.reviews.map((rv) => rv.reviewerId);
    return recipients(next, reviewerIds, ctx).map((r) =>
      build(
        r.email,
        `[NWA Tracker] Ready for your review: ${country.name} (${sectionLabel})`,
        [`The ${sectionLabel} for ${country.name} is ready for your review.`],
        url,
        replyTo,
      ),
    );
  }
  if (newStatus === 'blocked') {
    const seen = new Set<string>();
    const emails: string[] = [];
    for (const r of recipients(next, [assigneeId], ctx)) {
      if (!seen.has(r.email.toLowerCase())) { seen.add(r.email.toLowerCase()); emails.push(r.email); }
    }
    if (ctx.adminEmail && ctx.adminEmail.toLowerCase() !== (memberById(next, ctx.actorId)?.email ?? '').toLowerCase() && !seen.has(ctx.adminEmail.toLowerCase())) {
      emails.push(ctx.adminEmail);
    }
    return emails.map((to) =>
      build(
        to,
        `[NWA Tracker] Blocked: ${country.name} (${sectionLabel})`,
        [`The ${sectionLabel} for ${country.name} has been marked blocked.`],
        url,
        replyTo,
      ),
    );
  }
  return [];
}
```

3b. In the `updateReport` branch, **after** the `assignedTo` handling and before its `return []`, add status handling:
```ts
    if ('status' in m.patch && m.patch.status) {
      const before = countryById(prev, m.countryId)?.report.status;
      if (m.patch.status !== before) {
        return statusMessages(next, c, 'report', m.patch.status, c.report.assignedTo, ctx, replyTo);
      }
    }
```

3c. In the `updateFigure` branch, **after** the `assignedTo` handling and before its `return []`, add:
```ts
    if ('status' in m.patch && m.patch.status) {
      const before = countryById(prev, m.countryId)?.figures.find((f) => f.type === m.figureType)?.status;
      if (m.patch.status !== before) {
        const fig = c.figures.find((f) => f.type === m.figureType);
        return statusMessages(next, c, FIGURE_META[m.figureType].shortLabel, m.patch.status, fig?.assignedTo ?? null, ctx, replyTo);
      }
    }
```

3d. Add the `toggleReview` branch before the final `return []`:
```ts
  if (m.t === 'toggleReview') {
    if (!m.done) return [];
    const country = countryById(next, m.countryId);
    if (!country) return [];
    const reviewerName = country.reviews.find((rv) => rv.reviewerId === m.reviewerId)?.reviewerName ?? 'A reviewer';
    return recipients(next, [country.report.assignedTo], ctx).map((r) =>
      build(
        r.email,
        `[NWA Tracker] Review completed for ${country.name}`,
        [`${reviewerName} completed their review of ${country.name}.`],
        link(ctx, `/countries/${country.id}`),
        replyTo,
      ),
    );
  }
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/notifications.test.ts`
Expected: PASS (all notification tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/notifications.ts src/lib/notifications.test.ts
git commit -m "feat(notify): review-done and status-change notifications

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Mailer transport (`api/_mailer.ts`)

**Files:**
- Create: `api/_mailer.ts`
- Test: `api/_mailer.test.ts`

- [ ] **Step 1: Write the failing test**

Create `api/_mailer.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendMail = vi.fn().mockResolvedValue({ messageId: 'x' });
vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail }) },
}));

import { sendEmails } from './_mailer';

describe('sendEmails', () => {
  beforeEach(() => {
    sendMail.mockClear();
    process.env.GMAIL_USER = 'romeo.tweneboahkoduah@gmail.com';
    process.env.GMAIL_APP_PASSWORD = 'app-pass';
  });

  it('sends one mail per message with From set and Reply-To defaulted', async () => {
    await sendEmails([
      { to: 'isuru@cgiar.org', subject: 'S1', text: 'T1', html: '<p>T1</p>' },
      { to: 'afua@cgiar.org', replyTo: 'naga@cgiar.org', subject: 'S2', text: 'T2', html: '<p>T2</p>' },
    ]);
    expect(sendMail).toHaveBeenCalledTimes(2);
    const first = sendMail.mock.calls[0][0];
    expect(first.from).toContain('romeo.tweneboahkoduah@gmail.com');
    expect(first.replyTo).toBe('romeo.tweneboahkoduah@gmail.com'); // defaulted
    const second = sendMail.mock.calls[1][0];
    expect(second.replyTo).toBe('naga@cgiar.org'); // explicit
  });

  it('never throws when a send fails', async () => {
    sendMail.mockRejectedValueOnce(new Error('smtp down'));
    await expect(
      sendEmails([{ to: 'x@cgiar.org', subject: 'S', text: 'T', html: '<p>T</p>' }]),
    ).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run api/_mailer.test.ts`
Expected: FAIL — `Failed to resolve import "./_mailer"`.

- [ ] **Step 3: Write the implementation**

Create `api/_mailer.ts`:
```ts
/**
 * Gmail-SMTP transport for notification emails. Side-effect only: it sends what
 * it is given and swallows per-message failures (the originating write already
 * succeeded, so a mail error must never surface). Note the `_` prefix keeps this
 * out of Vercel's filesystem routing.
 */
import nodemailer from 'nodemailer';
import type { EmailMessage } from '../src/lib/notifications.js';

type Transporter = ReturnType<typeof nodemailer.createTransport>;
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

export async function sendEmails(messages: EmailMessage[]): Promise<void> {
  const user = process.env.GMAIL_USER ?? '';
  const from = `NWA Tracker <${user}>`;
  for (const m of messages) {
    try {
      await getTransporter().sendMail({
        from,
        to: m.to,
        replyTo: m.replyTo ?? user,
        subject: m.subject,
        text: m.text,
        html: m.html,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[notify] send failed:', m.to, m.subject, err);
    }
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run api/_mailer.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add api/_mailer.ts api/_mailer.test.ts
git commit -m "feat(notify): Gmail SMTP mailer transport

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Wire into `api/mutate.ts`

**Files:**
- Modify: `api/mutate.ts`

- [ ] **Step 1: Add imports**

At the top of `api/mutate.ts`, add to the existing imports:
```ts
import { waitUntil } from '@vercel/functions';
import { computeNotifications } from '../src/lib/notifications.js';
import { sendEmails } from './_mailer.js';
```

- [ ] **Step 2: Read `actorId` from the body**

Change the body parse + mutation extraction (currently lines ~25-30) to:
```ts
    const body = parseBody<{ mutation?: unknown; actorId?: unknown }>(req);
    if (!isMutation(body.mutation)) {
      res.status(400).json({ error: 'bad_request', message: 'Missing/invalid `mutation`' });
      return;
    }
    const mutation = body.mutation;
    const actorId = typeof body.actorId === 'string' ? body.actorId : null;
```

- [ ] **Step 3: Fire notifications after a successful CAS**

Replace the success block inside the retry loop:
```ts
      const next = applyMutation(row.data, mutation);
      const newVersion = await casState(row.version, next);
      if (newVersion !== null) {
        if (process.env.NOTIFICATIONS_ENABLED === 'true') {
          try {
            const msgs = computeNotifications(row.data, next, mutation, {
              actorId,
              appBaseUrl: (process.env.APP_BASE_URL ?? '').replace(/\/$/, ''),
              adminEmail: process.env.ADMIN_NOTIFY_EMAIL || process.env.GMAIL_USER || '',
            });
            if (msgs.length) waitUntil(sendEmails(msgs));
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[notify] compute failed:', err);
          }
        }
        res.status(200).json({ version: newVersion });
        return;
      }
```

- [ ] **Step 4: Verify it type-checks**

Run: `npx tsc --noEmit -p api/tsconfig.json`
Expected: no errors. (If `@vercel/functions` types are missing, confirm Task 1 installed it.)

- [ ] **Step 5: Run the whole test suite**

Run: `npm test`
Expected: PASS — all notification + mailer tests still green.

- [ ] **Step 6: Commit**

```bash
git add api/mutate.ts
git commit -m "feat(notify): send notifications from /api/mutate after CAS

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Client — pass `actorId` through the mutate path

**Files:**
- Modify: `src/lib/api.ts`
- Modify: `src/store/sync.ts`

- [ ] **Step 1: Extend `postMutation`**

In `src/lib/api.ts`, replace `postMutation`:
```ts
export function postMutation(
  mutation: Mutation,
  actorId: string | null = null,
): Promise<{ version: number }> {
  return request<{ version: number }>('/api/mutate', {
    method: 'POST',
    body: JSON.stringify({ mutation, actorId }),
  });
}
```

- [ ] **Step 2: Capture and forward `actorId` in `sync.ts`**

In `src/store/sync.ts`:

2a. Add the import (with the other store imports):
```ts
import { useAuthStore } from './useAuthStore';
```

2b. Change the queue type (replace `let queue: Mutation[] = [];`):
```ts
let queue: { m: Mutation; actorId: string | null }[] = [];
```

2c. In `processQueue`, replace the dequeue/send lines:
```ts
      const item = queue[0];
      try {
        const { version } = await postMutation(item.m, item.actorId);
```

2d. In `enqueueMutation`, capture the actor at enqueue time:
```ts
export function enqueueMutation(m: Mutation) {
  const actorId = useAuthStore.getState().currentUser?.id ?? null;
  queue.push({ m, actorId });
  void processQueue();
}
```

(`stopSync` already does `queue = []`, which remains valid with the new element type.)

- [ ] **Step 3: Verify it type-checks**

Run: `npm run build`
Expected: `tsc --noEmit` passes and `vite build` completes with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api.ts src/store/sync.ts
git commit -m "feat(notify): forward actorId from client to mutate API

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Config docs + final verification

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Document the new env vars**

Append to `nwa-tracker/.env.example`:
```
# ── Email notifications (server, Vercel env vars) ────────────────────────
# Gmail SMTP sender. Enable 2FA on the account, then create an App Password
# (Google Account → Security → App passwords) and paste the 16-char value.
GMAIL_USER=romeo.tweneboahkoduah@gmail.com
GMAIL_APP_PASSWORD=
# Public base URL of the app, used for deep links in emails (no trailing slash).
# MUST be publicly reachable — if Vercel Deployment Protection is on, email
# links will hit a login wall. Use the public production alias.
APP_BASE_URL=https://your-app.vercel.app
# Master on/off switch. Notifications only send when this is exactly "true".
NOTIFICATIONS_ENABLED=false
# Recipient for the admin copy of "blocked" notifications (defaults to GMAIL_USER).
ADMIN_NOTIFY_EMAIL=
```

- [ ] **Step 2: Full verification**

Run: `npm test`
Expected: PASS — all suites.

Run: `npm run build`
Expected: type-check + production build succeed.

Run: `npx tsc --noEmit -p api/tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "docs(notify): document notification env vars

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 4: Deployment checklist (manual, performed by the user — not code)**

1. In Vercel → Project → Settings → Environment Variables (Production + Preview + Development), set: `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `APP_BASE_URL`, `ADMIN_NOTIFY_EMAIL`, and `NOTIFICATIONS_ENABLED=true`.
2. Confirm `APP_BASE_URL` is a publicly reachable URL (not behind Vercel Deployment Protection).
3. Merge `email-notifications` → `main` (PR or fast-forward) and let Vercel deploy.
4. Smoke test on the live app: log in as a non-admin, assign a country to a member with an email, and post a directed comment; confirm the emails arrive and the deep link opens the right country.
5. If anything misbehaves, set `NOTIFICATIONS_ENABLED=false` to instantly stop all sends without a redeploy.

---

## Self-Review Notes

- **Spec coverage:** assignments (Tasks 2–3), directed comments incl. reviewer/blocking wording (Task 4), replies (Task 5), review-done + status in_review/blocked with the recommended mapping (Task 6), Gmail transport (Task 7), `/api/mutate` wiring with kill switch + `waitUntil` (Task 8), `actorId` self-suppression end-to-end (Tasks 8–9), env config + deploy steps (Task 10). All spec sections map to a task.
- **Guards:** changed-field checks (assignee/status diffs) prevent duplicate sends on idempotent retries; bulk coalescing in Task 3; author/actor exclusion in Tasks 4–5; inactive/no-email filtering in `recipients`.
- **Type consistency:** `EmailMessage`, `NotifyCtx`, `computeNotifications`, `sendEmails`, and `recipients` signatures are defined in Tasks 2/7 and used unchanged thereafter. `postMutation(mutation, actorId)` matches the `{ mutation, actorId }` body read in Task 8.
- **Open items from the spec:** deep-link route confirmed as `/countries/:id` (used throughout); `setReviewComment` intentionally does **not** notify (only `addComment` does), per spec.
