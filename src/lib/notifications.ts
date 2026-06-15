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
    if ('status' in m.patch && m.patch.status) {
      const before = countryById(prev, m.countryId)?.report.status;
      if (m.patch.status !== before) {
        return statusMessages(next, c, 'report', m.patch.status, c.report.assignedTo, ctx, replyTo);
      }
    }
    return [];
  }

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
    if ('status' in m.patch && m.patch.status) {
      const before = countryById(prev, m.countryId)?.figures.find((f) => f.type === m.figureType)?.status;
      if (m.patch.status !== before) {
        const fig = c.figures.find((f) => f.type === m.figureType);
        return statusMessages(next, c, FIGURE_META[m.figureType].shortLabel, m.patch.status, fig?.assignedTo ?? null, ctx, replyTo);
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

  return [];
}
