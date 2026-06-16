/**
 * Pure notification computation. Given the state before/after a mutation and the
 * mutation itself, returns the emails that should be sent. NO I/O, NO Node/browser
 * globals — imports only `./types` and the `Mutation` *type*. Bundled into the
 * Vercel `mutate` function and exercised by unit tests.
 */
import { FIGURE_META, type AppState, type Country, type TeamMember } from './types.js';
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

const EMAIL_SIGNATURE = 'Coordinating Team, National Water Accounts Atlas';

/** Render the branded HTML + plain-text body shared by every email. Links go to the main app URL. */
export function renderEmail(opts: {
  heading: string;
  lines: string[];
  appBaseUrl: string;
}): { text: string; html: string } {
  const body = opts.lines.filter(Boolean);
  const url = opts.appBaseUrl || '#';
  const text = [opts.heading, '', ...body, '', `Open the tracker: ${url}`, '', `— ${EMAIL_SIGNATURE}`].join('\n');
  const html = `<!doctype html><html><body style="margin:0;background:#f4f8f7;padding:24px 12px;font-family:'Segoe UI',Arial,sans-serif;color:#0f2e2a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e2e8e6;border-radius:12px;overflow:hidden;">
<tr><td style="background:#0f3b36;padding:18px 24px;">
<div style="color:#ffffff;font-size:16px;font-weight:700;">National Water Accounts Atlas</div>
<div style="color:#bfe6df;font-size:12px;margin-top:2px;">Sub-Saharan Africa Tracker</div>
</td></tr>
<tr><td style="height:4px;background:#2eb5a3;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:24px;">
<div style="font-size:16px;font-weight:600;margin-bottom:14px;">${escapeHtml(opts.heading)}</div>
${body.map((l) => `<p style="margin:0 0 12px;font-size:14px;line-height:1.55;">${escapeHtml(l)}</p>`).join('')}
<p style="margin:22px 0 4px;"><a href="${url}" style="display:inline-block;background:#2eb5a3;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:8px;font-size:14px;font-weight:600;">Open the Tracker</a></p>
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #eef2f1;color:#5b6b68;font-size:12px;line-height:1.5;">— ${escapeHtml(EMAIL_SIGNATURE)}</td></tr>
</table></td></tr></table>
</body></html>`;
  return { text, html };
}

function build(
  to: string,
  subject: string,
  lines: string[],
  ctx: NotifyCtx,
  replyTo?: string,
): EmailMessage {
  const heading = subject.replace(/^\[NWA Tracker\]\s*/, '');
  const { text, html } = renderEmail({ heading, lines, appBaseUrl: ctx.appBaseUrl });
  return replyTo ? { to, replyTo, subject, text, html } : { to, subject, text, html };
}

/** Compose one branded email for free-form admin messages (used by /api/send-mail). */
export function composeEmail(opts: {
  to: string;
  subject: string;
  lines: string[];
  appBaseUrl: string;
  replyTo?: string;
}): EmailMessage {
  const heading = opts.subject.replace(/^\[NWA Tracker\]\s*/, '');
  const { text, html } = renderEmail({ heading, lines: opts.lines, appBaseUrl: opts.appBaseUrl });
  const msg: EmailMessage = { to: opts.to, subject: opts.subject, text, html };
  if (opts.replyTo) msg.replyTo = opts.replyTo;
  return msg;
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
  if (newStatus === 'in_review') {
    const reviewerIds = country.reviews.map((rv) => rv.reviewerId);
    return recipients(next, reviewerIds, ctx).map((r) =>
      build(
        r.email,
        `[NWA Tracker] Ready for your review: ${country.name} (${sectionLabel})`,
        [`The ${sectionLabel} for ${country.name} is ready for your review.`],
        ctx,
        replyTo,
      ),
    );
  }
  if (newStatus === 'blocked') {
    // recipients() already de-dupes by email and drops the actor/inactive/no-email.
    const emails = recipients(next, [assigneeId], ctx).map((r) => r.email);
    const actorEmail = memberById(next, ctx.actorId)?.email?.toLowerCase();
    const adminLower = ctx.adminEmail.toLowerCase();
    if (ctx.adminEmail && adminLower !== actorEmail && !emails.some((e) => e.toLowerCase() === adminLower)) {
      emails.push(ctx.adminEmail);
    }
    return emails.map((to) =>
      build(
        to,
        `[NWA Tracker] Blocked: ${country.name} (${sectionLabel})`,
        [`The ${sectionLabel} for ${country.name} has been marked blocked.`],
        ctx,
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
            ctx,
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
            ctx,
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
        ctx,
        replyTo,
      ),
    );
  }

  if (m.t === 'addComment') {
    const c = m.comment;
    const country = countryById(next, c.countryId);
    if (!country) return [];
    // Retry-safe: if this comment already existed before the mutation, this is a
    // re-applied (duplicate) mutation — don't email again.
    if (countryById(prev, c.countryId)?.messages?.some((x) => x.id === c.id)) return [];
    const recips = recipients(next, c.recipientIds, ctx, [c.authorId]);
    if (recips.length === 0) return [];

    const sectionLabel =
      c.scope === 'figure' && c.figureType
        ? FIGURE_META[c.figureType].shortLabel
        : c.scope === 'report'
          ? 'report'
          : 'general discussion';

    if (c.reminder) {
      return recips.map((r) =>
        build(
          r.email,
          `[NWA Tracker] Reminder — ${country.name} (${sectionLabel})`,
          [
            `This is a reminder from the ${c.authorName} regarding the ${sectionLabel} for ${country.name}.`,
            `"${c.body}"`,
            'Please log in and update your progress when you can. It will also appear on your dashboard.',
          ],
          ctx,
          replyTo,
        ),
      );
    }

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
        ctx,
        replyTo,
      ),
    );
  }

  if (m.t === 'replyComment') {
    const country = countryById(next, m.countryId);
    const thread = country?.messages?.find((x) => x.id === m.commentId);
    if (!country || !thread) return [];
    // Retry-safe: skip if this reply already existed before the mutation.
    const prevThread = countryById(prev, m.countryId)?.messages?.find((x) => x.id === m.commentId);
    if (prevThread?.replies?.some((rep) => rep.id === m.reply.id)) return [];
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
        ctx,
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
        ctx,
        replyTo,
      ),
    );
  }

  return [];
}
