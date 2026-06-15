# Email Notifications — Design

**Date:** 2026-06-15
**Status:** Approved for planning
**Component:** NWA Tracker (nwa-tracker, Vite + React + Vercel functions + Neon)

## 1. Goal

When work changes hands or needs action, email the people who must act — assignments,
directed comments / reviewer feedback, replies, and review/status changes — so the team
doesn't have to watch the dashboard. Delivery is **instant per event**, sent from a Gmail
account over SMTP.

## 2. Decisions (locked)

- **Triggers:** assignments, directed comments & reviewer feedback, replies, reviews-done / status changes.
- **Timing:** instant (one send per triggering event; coalesced within a single mutation).
- **Provider:** Gmail SMTP via `nodemailer`.
- **Sender:** `romeo.tweneboahkoduah@gmail.com` (requires 2FA + a Gmail App Password).
- **Status mapping:** in_review → reviewers; blocked → assignee + admin; review done → report owner.
- **Rollout:** straight to live (guarded by a kill-switch env var).
- **Recipient computation:** server-side, authoritative, in `/api/mutate`.

## 3. Architecture

Every write already funnels through `POST /api/mutate`, which applies the shared pure
reducer and compare-and-swaps on `version`. Notifications hook in **after the CAS
succeeds**, once, using the `prev` state, the computed `next` state, and the mutation.

Two new units plus small edits to two existing files:

### 3.1 `src/lib/notifications.ts` — pure, dependency-light (NEW)
- Mirror of `mutations.ts` constraints: imports **only** from `./types`. No Node/browser
  globals, no I/O (so it can be unit-tested and bundled into the function).
- Export:
  ```ts
  interface EmailMessage { to: string; replyTo?: string; subject: string; text: string; html: string; }
  interface NotifyCtx { actorId: string | null; appBaseUrl: string; }
  function computeNotifications(prev: AppState, next: AppState, m: Mutation, ctx: NotifyCtx): EmailMessage[]
  ```
- All "who gets told what", subject/body text, dedupe, self-suppression, and
  changed-field guards live here. Returns `[]` when nothing should be sent.

### 3.2 `api/_mailer.ts` — transport (NEW)
- `sendEmails(messages: EmailMessage[]): Promise<void>` using `nodemailer`
  `createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD } })`.
- Reuses a module-scoped transporter across warm invocations.
- Sends sequentially (or small concurrency) with a per-message try/catch; logs failures,
  never throws to the caller.
- No business logic — it only sends what it's given.

### 3.3 `api/mutate.ts` — wiring (EDIT)
- Read optional `actorId` from the request body alongside `mutation`.
- After the successful CAS (`newVersion !== null`), before/at responding:
  ```ts
  const msgs = computeNotifications(row.data, next, mutation, { actorId, appBaseUrl: APP_BASE_URL });
  if (NOTIFICATIONS_ENABLED && msgs.length) ctx.waitUntil(sendEmails(msgs)); // background, non-blocking
  res.status(200).json({ version: newVersion });
  ```
- `ctx.waitUntil` keeps the function alive to finish sending after the response is
  returned, so the user's edit latency is unaffected. Fallback: if `waitUntil` is
  unavailable, fire-and-forget the promise with a `.catch`.
- Email work is fully isolated from the write: a mail failure cannot fail a mutation.

### 3.4 Client `useNwaStore` mutate sender (EDIT)
- Include `actorId: useAuthStore.getState().currentUser?.id ?? null` in the POST body to
  `/api/mutate`. Used only to suppress self-notification; the server stays authoritative.

## 4. Trigger → recipient rules (in `computeNotifications`)

For each, resolve recipient ids → `team[]` members, then **drop**: the actor, inactive
members, and members with no `email`. Dedupe addresses.

| Mutation | Condition | Recipients | Notes |
|---|---|---|---|
| `updateReport` | `patch.assignedTo` present and differs from `prev` assignee | new assignee | "You've been assigned the **<country>** report." |
| `updateFigure` | `patch.assignedTo` differs | new assignee | includes figure short label |
| `bulkAssignFigure` | `memberId` non-null | that member | **one** email listing all affected countries for that figure |
| `addComment` | always | `comment.recipientIds` | subject varies: blocking → "needs your action"; `fromReviewer` → "Reviewer feedback"; else "New comment" |
| `replyComment` | always | thread participants (comment.authorId + recipientIds + all reply.authorIds) minus `reply.authorId` | found by `commentId` in `next` |
| `toggleReview` | `done === true` | report `assignedTo` | "Review completed by <reviewerName>." |
| `updateReport`/`updateFigure` | `patch.status` → `in_review` | the country's reviewers (`reviews[].reviewerId`) | "Ready for your review." |
| `updateReport`/`updateFigure` | `patch.status` → `blocked` | assignee + admin | "Marked blocked." Admin resolved via a role/email constant. |

"Admin" recipient: the configured admin address (env `ADMIN_NOTIFY_EMAIL`, defaults to
`GMAIL_USER`). Status-change emails fire only on an actual transition (prev status differs).

## 5. Email content

- **From:** `"NWA Tracker" <GMAIL_USER>`
- **Reply-To:** the actor's email if resolvable, else `GMAIL_USER`.
- **Subject:** `[NWA Tracker] <event summary>` — e.g. `[NWA Tracker] You've been assigned Zambia`.
- **Body (text + minimal HTML):** one-line what-happened, the country (and figure/section),
  who did it, any comment body (quoted), and a deep link
  `"<APP_BASE_URL>/country/<id>"` (confirm exact route during planning) plus an
  app-home fallback link. Plain, scannable, no images.

## 6. Configuration (Vercel env vars)

| Var | Purpose |
|---|---|
| `GMAIL_USER` | sending Gmail address (`romeo.tweneboahkoduah@gmail.com`) |
| `GMAIL_APP_PASSWORD` | 16-char Gmail App Password (needs 2FA on the account) |
| `APP_BASE_URL` | canonical public app URL for links |
| `NOTIFICATIONS_ENABLED` | `"true"`/`"false"` kill switch (default off until creds set) |
| `ADMIN_NOTIFY_EMAIL` | recipient for `blocked` admin copy (default = `GMAIL_USER`) |

Set in Vercel (Production + Preview + Development) and in `nwa-tracker/.env` for `vercel dev`.
Add the same keys to `.env.example`.

## 7. Edge cases & guards

- **Idempotent retries / no-op writes:** only emit a message when the relevant field
  actually changed (assignee/status diff; comment/reply add is inherently new). Prevents
  duplicate sends when a retried mutation produces an unchanged state.
- **Bulk coalescing:** `bulkAssignFigure` → a single summary email per member, not one per country.
- **Missing email:** silently skipped (logged) — see also unmatched members.
- **Self-action:** actor never emailed about their own change.
- **Gmail limits:** ~500 recipients/day (personal). Team is 19; well within limits, but the
  mailer logs counts so we can see if a bulk action approaches limits.
- **Deliverability:** sending Gmail→cgiar.org; set a clear From/Reply-To and plain content.
  Accept that some mail may land in spam initially; not solvable without a verified domain.
- **Security:** App Password lives only in env vars, never in the repo. `actorId` is a hint
  for suppression only — never trusted for authorization (none exists; open-access app).

## 8. Testing

- **Unit (primary):** `notifications.test.ts` drives `computeNotifications` across every
  trigger with crafted prev/next/mutation fixtures — asserts recipients, dedupe,
  self-suppression, changed-field guards, bulk coalescing, and subject/body text. No I/O.
- **Transport:** `_mailer` tested with a mocked `nodemailer` transporter (assert it's called
  with the right payloads; failures swallowed). No real mail in tests.
- **Manual smoke (post-deploy):** with creds set and `NOTIFICATIONS_ENABLED=true`, perform
  one assignment and one comment; confirm the real emails arrive and the deep link works.

## 9. Out of scope (v1)

- Digests, per-user notification preferences / unsubscribe UI, in-app notification center,
  ret­ry queue / delivery tracking, verified sending domain. (Kill switch is the only
  global control in v1.)

## 10. Open items to confirm during planning

- Exact country deep-link route (read from the app router).
- Whether `setReviewComment` (reviewer's free-text review note) should also notify the
  report owner, or only `addComment` directed comments do. Current spec: only `addComment`.
