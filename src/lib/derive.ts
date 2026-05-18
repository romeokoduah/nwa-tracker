import type {
  Comment,
  CommentScope,
  Country,
  FigureProgress,
  FigureType,
  ReportProgress,
  ReviewProgress,
  TaskStatus,
  TeamMember,
} from './types';
import { FIGURE_META } from './types';
import { daysUntil } from './format';

export const isFigureDone = (f: FigureProgress) => f.status === 'done';
export const isReportMet = (r: ReportProgress) => r.status === 'met';
export const isReviewDone = (r: ReviewProgress) => r.done;

export function figuresCompletion(country: Country): number {
  if (country.figures.length === 0) return 0;
  return country.figures.filter(isFigureDone).length / country.figures.length;
}

export function reportCompletion(country: Country): number {
  return isReportMet(country.report) ? 1 : 0;
}

export function reviewsCompletion(country: Country): number {
  if (country.reviews.length === 0) return 0;
  return country.reviews.filter(isReviewDone).length / country.reviews.length;
}

export function overallCompletion(country: Country): number {
  // weighted: figures 40%, report 40%, reviews 20%
  return (
    figuresCompletion(country) * 0.4 +
    reportCompletion(country) * 0.4 +
    reviewsCompletion(country) * 0.2
  );
}

export function isCountryComplete(country: Country): boolean {
  return (
    country.figures.every(isFigureDone) &&
    isReportMet(country.report) &&
    country.reviews.every(isReviewDone)
  );
}

export function countryCompletionBucket(country: Country): 0 | 1 | 2 | 3 | 4 {
  const p = overallCompletion(country);
  if (p >= 1) return 4;
  if (p >= 0.76) return 3;
  if (p >= 0.51) return 2;
  if (p >= 0.26) return 1;
  return 0;
}

export function isFigureOverdue(f: FigureProgress): boolean {
  if (!f.deadline) return false;
  if (f.status === 'done') return false;
  const d = daysUntil(f.deadline);
  return d !== null && d < 0;
}

export function isReportOverdue(r: ReportProgress): boolean {
  if (!r.deadline) return false;
  if (r.status === 'met') return false;
  const d = daysUntil(r.deadline);
  return d !== null && d < 0;
}

export function countOverdue(country: Country): number {
  return (
    country.figures.filter(isFigureOverdue).length + (isReportOverdue(country.report) ? 1 : 0)
  );
}

export function countWithinDays(country: Country, withinDays: number): number {
  let n = 0;
  for (const f of country.figures) {
    if (f.status === 'done') continue;
    const d = daysUntil(f.deadline);
    if (d !== null && d >= 0 && d <= withinDays) n++;
  }
  const rd = daysUntil(country.report.deadline);
  if (
    rd !== null &&
    rd >= 0 &&
    rd <= withinDays &&
    country.report.status !== 'met'
  ) {
    n++;
  }
  return n;
}

export function activeTaskCount(country: Country): number {
  return (
    country.figures.filter((f) => f.status !== 'done').length +
    (country.report.status !== 'met' ? 1 : 0) +
    country.reviews.filter((r) => !r.done).length
  );
}

export interface WorkstreamBreakdown {
  done: number;
  in_progress: number;
  in_review: number;
  not_started: number;
  blocked: number;
  total: number;
}

export function emptyBreakdown(): WorkstreamBreakdown {
  return { done: 0, in_progress: 0, in_review: 0, not_started: 0, blocked: 0, total: 0 };
}

export function addStatus(b: WorkstreamBreakdown, s: TaskStatus) {
  b[s] += 1;
  b.total += 1;
}

export function statusFromReport(r: ReportProgress): TaskStatus {
  switch (r.status) {
    case 'met':
      return 'done';
    case 'not_met':
      return 'blocked';
    case 'in_progress':
      return 'in_progress';
    case 'in_review':
      return 'in_review';
    case 'not_started':
    default:
      return 'not_started';
  }
}

export function statusFromReview(r: ReviewProgress): TaskStatus {
  return r.done ? 'done' : 'not_started';
}

// ── Directed comments / reviewer feedback ────────────────────────────────

/** Unresolved comments written by a reviewer mean "feedback received". */
export function countryFeedbackCount(country: Country): number {
  return (country.messages ?? []).filter(
    (m) => m.fromReviewer && m.status !== 'resolved',
  ).length;
}

export function hasReviewerFeedback(country: Country): boolean {
  return countryFeedbackCount(country) > 0;
}

export interface CommentCounts {
  open: number;
  responded: number;
  resolved: number;
  blockingOpen: number;
  total: number;
}

export function commentCounts(country: Country): CommentCounts {
  const c: CommentCounts = {
    open: 0,
    responded: 0,
    resolved: 0,
    blockingOpen: 0,
    total: 0,
  };
  for (const m of country.messages ?? []) {
    c.total++;
    if (m.status === 'resolved') c.resolved++;
    else if (m.status === 'responded') c.responded++;
    else c.open++;
    if (m.blocking && m.status !== 'resolved') c.blockingOpen++;
  }
  return c;
}

/** Does this comment need the given user's attention (drives the blink)? */
export function commentNeedsAttention(c: Comment, userId: string): boolean {
  if (c.status === 'resolved') return false;
  const replies = c.replies ?? [];
  const ack = c.acknowledgedBy ?? [];
  const recipients = c.recipientIds ?? [];
  const repliedByMe = replies.some((r) => r.authorId === userId);
  const lastReply = replies[replies.length - 1];
  if (recipients.includes(userId) && userId !== c.authorId) {
    // recipient: needs to respond/acknowledge until they do
    return !ack.includes(userId) && !repliedByMe;
  }
  if (c.authorId === userId) {
    // author: notified when the other side has replied
    return !!lastReply && lastReply.authorId !== userId && !ack.includes(userId);
  }
  return false;
}

export interface AttentionItem {
  country: Country;
  comment: Comment;
  role: 'recipient' | 'author';
}

export function attentionForUser(
  countries: Country[],
  userId: string | null,
): AttentionItem[] {
  if (!userId) return [];
  const out: AttentionItem[] = [];
  for (const country of countries) {
    for (const comment of country.messages ?? []) {
      if (commentNeedsAttention(comment, userId)) {
        out.push({
          country,
          comment,
          role: comment.authorId === userId ? 'author' : 'recipient',
        });
      }
    }
  }
  return out.sort((a, b) =>
    a.comment.createdAt < b.comment.createdAt ? 1 : -1,
  );
}

/** Blocking comments authored by a user that are not yet resolved — these
 *  defer that user's sign-off on the country. */
export function unresolvedBlockingByAuthor(
  country: Country,
  userId: string,
): Comment[] {
  return (country.messages ?? []).filter(
    (m) => m.authorId === userId && m.blocking && m.status !== 'resolved',
  );
}

export function canReviewerSignOff(
  country: Country,
  userId: string,
): boolean {
  return unresolvedBlockingByAuthor(country, userId).length === 0;
}

/** Comments visible to a given member: ones they sent, ones directed to them,
 *  or everything for an admin. */
export function visibleMessages(
  country: Country,
  memberId: string | null,
  isAdmin: boolean,
): Comment[] {
  const all = country.messages ?? [];
  if (isAdmin) return all;
  if (!memberId) return [];
  return all.filter(
    (m) => m.authorId === memberId || m.recipientIds.includes(memberId),
  );
}

export interface RecipientInput {
  country: Country;
  team: TeamMember[];
  scope: CommentScope;
  figureType: FigureType | null;
  authorId: string;
  authorIsReviewer: boolean;
  authorIsReportWriter: boolean;
}

/**
 * Route a comment to the people assigned to the relevant section.
 * - figure scope  → that figure's producer + figure lead
 * - report scope  → the report writer (+ other report writers if author is one)
 * - general scope → reviewer/writer broadcast to all section assignees
 */
export function deriveRecipients(input: RecipientInput): {
  ids: string[];
  names: string[];
} {
  const { country, team, scope, figureType, authorId } = input;
  const byId = new Map(team.map((m) => [m.id, m] as const));
  const byName = new Map(
    team.map((m) => [m.name.toLowerCase(), m] as const),
  );
  const out = new Set<string>();

  const add = (id: string | null | undefined) => {
    if (id && id !== authorId && byId.has(id)) out.add(id);
  };

  const figureProducer = (ft: FigureType) => {
    const f = country.figures.find((x) => x.type === ft);
    return f?.assignedTo ?? null;
  };
  const figureLeadId = (ft: FigureType) => {
    const leadName = FIGURE_META[ft].lead;
    if (!leadName) return null;
    return byName.get(leadName.toLowerCase())?.id ?? null;
  };
  const reportWriters = () => {
    const ids = new Set<string>();
    if (country.report.assignedTo) ids.add(country.report.assignedTo);
    for (const m of team) {
      if (m.roles.includes('report_writer')) ids.add(m.id);
    }
    return [...ids];
  };
  const allProducers = () =>
    country.figures.map((f) => f.assignedTo).filter(Boolean) as string[];

  if (scope === 'figure' && figureType) {
    add(figureProducer(figureType));
    add(figureLeadId(figureType));
  } else if (scope === 'report') {
    add(country.report.assignedTo);
    if (input.authorIsReportWriter) reportWriters().forEach(add);
  } else {
    // general
    if (input.authorIsReviewer) {
      allProducers().forEach(add);
      add(country.report.assignedTo);
    } else if (input.authorIsReportWriter) {
      allProducers().forEach(add);
      reportWriters().forEach(add);
    } else {
      add(country.report.assignedTo);
      allProducers().forEach(add);
    }
  }

  const ids = [...out];
  return { ids, names: ids.map((id) => byId.get(id)?.name ?? id) };
}
