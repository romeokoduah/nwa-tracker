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
