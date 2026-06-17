/**
 * Pure, deterministic state reducer shared by the browser store (optimistic
 * updates) and the serverless `/api/mutate` function (authoritative apply).
 *
 * IMPORTANT: this module must stay dependency-light — it may only import from
 * `./types`. No `@/` path alias, no browser globals, no Node globals — it is
 * bundled into a Vercel serverless function as-is. All non-determinism (ids,
 * timestamps, activity-log text) is resolved on the client and passed inside
 * the mutation so the client and server compute byte-identical results.
 */
import type {
  ActivityEntry,
  AppSettings,
  AppState,
  Comment,
  CommentReply,
  Country,
  FigureProgress,
  FigureType,
  ReportProgress,
  ReviewProgress,
  ReviewStatus,
  TeamMember,
} from './types';

/** Back-fill new comment fields on data written before the redesign. */
function normalizeComment(c: Comment): Comment {
  const legacy = c as Comment & { resolved?: boolean };
  return {
    ...c,
    blocking: c.blocking ?? false,
    status: c.status ?? (legacy.resolved ? 'resolved' : 'open'),
    replies: c.replies ?? [],
    acknowledgedBy: c.acknowledgedBy ?? [],
    resolvedAt: c.resolvedAt ?? null,
    resolvedBy: c.resolvedBy ?? null,
  };
}

/** Back-fill `status` on reviews written before reviewer statuses existed, and
 *  keep the `done` mirror consistent with `status`. */
function normalizeReview(r: ReviewProgress): ReviewProgress {
  const status: ReviewStatus = r.status ?? (r.done ? 'met' : 'not_started');
  const done = status === 'met' || status === 'reviewed_with_comments';
  return { ...r, status, done };
}

/** Back-fill all derived/added fields on a country loaded from storage. */
export function normalizeCountry(c: Country): Country {
  return {
    ...c,
    messages: (c.messages ?? []).map(normalizeComment),
    reviews: (c.reviews ?? []).map(normalizeReview),
  };
}

export const ACTIVITY_LIMIT = 500;

export type Mutation =
  | { t: 'updateCountry'; id: string; patch: Partial<Country>; act: ActivityEntry }
  | {
      t: 'updateFigure';
      countryId: string;
      figureType: FigureType;
      patch: Partial<FigureProgress>;
      nowISO: string;
      act: ActivityEntry;
    }
  | {
      t: 'updateReport';
      countryId: string;
      patch: Partial<ReportProgress>;
      nowISO: string;
      act: ActivityEntry;
    }
  | {
      t: 'toggleReview';
      countryId: string;
      reviewerId: string;
      done: boolean;
      nowISO: string;
      act: ActivityEntry;
    }
  | {
      t: 'setReviewStatus';
      countryId: string;
      reviewerId: string;
      status: ReviewStatus;
      nowISO: string;
      act: ActivityEntry;
    }
  | {
      t: 'setReviewComment';
      countryId: string;
      reviewerId: string;
      comment: string;
      act: ActivityEntry;
    }
  | { t: 'setCountryComment'; countryId: string; comment: string; act: ActivityEntry }
  | { t: 'addMember'; member: TeamMember; act: ActivityEntry }
  | { t: 'updateMember'; id: string; patch: Partial<TeamMember>; act: ActivityEntry }
  | { t: 'removeMember'; id: string; act: ActivityEntry }
  | { t: 'addCountry'; country: Country; act: ActivityEntry }
  | { t: 'removeCountry'; id: string; act: ActivityEntry }
  | {
      t: 'bulkAssignFigure';
      countryIds: string[];
      figureType: FigureType;
      memberId: string | null;
      act: ActivityEntry;
    }
  | { t: 'addComment'; comment: Comment; act: ActivityEntry }
  | {
      t: 'replyComment';
      countryId: string;
      commentId: string;
      reply: CommentReply;
      /** true when the reply is from a recipient (moves status -> responded) */
      fromRecipient: boolean;
      act: ActivityEntry;
    }
  | {
      t: 'acknowledgeComment';
      countryId: string;
      commentId: string;
      userId: string;
      act: ActivityEntry;
    }
  | {
      t: 'resolveComment';
      countryId: string;
      commentId: string;
      resolvedAt: string;
      resolvedBy: string;
      act: ActivityEntry;
    }
  | { t: 'removeComment'; countryId: string; commentId: string; act: ActivityEntry }
  | { t: 'updateSettings'; patch: Partial<AppSettings>; act: ActivityEntry }
  | { t: 'logActivity'; act: ActivityEntry }
  | { t: 'replaceState'; state: AppState };

export const MUTATION_TYPES: readonly Mutation['t'][] = [
  'updateCountry',
  'updateFigure',
  'updateReport',
  'toggleReview',
  'setReviewStatus',
  'setReviewComment',
  'setCountryComment',
  'addMember',
  'updateMember',
  'removeMember',
  'addCountry',
  'removeCountry',
  'bulkAssignFigure',
  'addComment',
  'replyComment',
  'acknowledgeComment',
  'resolveComment',
  'removeComment',
  'updateSettings',
  'logActivity',
  'replaceState',
];

function withActivity(activity: ActivityEntry[], act: ActivityEntry): ActivityEntry[] {
  return [act, ...activity].slice(0, ACTIVITY_LIMIT);
}

/** Apply a single mutation. Returns a new AppState; never mutates the input. */
export function applyMutation(state: AppState, m: Mutation): AppState {
  switch (m.t) {
    case 'replaceState':
      return {
        countries: m.state.countries.map(normalizeCountry),
        team: m.state.team,
        activity: m.state.activity ?? [],
        lastSyncedAt: m.state.lastSyncedAt ?? null,
        settings: m.state.settings,
      };

    case 'removeComment':
      return {
        ...state,
        countries: state.countries.map((c) =>
          c.id !== m.countryId
            ? c
            : { ...c, messages: (c.messages ?? []).filter((msg) => msg.id !== m.commentId) },
        ),
        activity: withActivity(state.activity, m.act),
      };

    case 'updateSettings':
      return {
        ...state,
        settings: { notificationsEnabled: true, ...state.settings, ...m.patch },
        activity: withActivity(state.activity, m.act),
      };

    case 'addComment':
      return {
        ...state,
        countries: state.countries.map((c) =>
          c.id !== m.comment.countryId
            ? c
            : { ...c, messages: [...(c.messages ?? []), m.comment] },
        ),
        activity: withActivity(state.activity, m.act),
      };

    case 'replyComment':
      return {
        ...state,
        countries: state.countries.map((c) =>
          c.id !== m.countryId
            ? c
            : {
                ...c,
                messages: (c.messages ?? []).map((msg) =>
                  msg.id !== m.commentId
                    ? msg
                    : {
                        ...msg,
                        replies: [...(msg.replies ?? []), m.reply],
                        // a recipient's reply moves Open -> Responded;
                        // never downgrade a Resolved thread.
                        status:
                          msg.status === 'resolved'
                            ? 'resolved'
                            : m.fromRecipient
                              ? 'responded'
                              : msg.status,
                        // a new reply re-raises attention for the other side
                        acknowledgedBy: [],
                      },
                ),
              },
        ),
        activity: withActivity(state.activity, m.act),
      };

    case 'acknowledgeComment':
      return {
        ...state,
        countries: state.countries.map((c) =>
          c.id !== m.countryId
            ? c
            : {
                ...c,
                messages: (c.messages ?? []).map((msg) =>
                  msg.id !== m.commentId
                    ? msg
                    : {
                        ...msg,
                        acknowledgedBy: msg.acknowledgedBy.includes(m.userId)
                          ? msg.acknowledgedBy
                          : [...msg.acknowledgedBy, m.userId],
                      },
                ),
              },
        ),
        activity: withActivity(state.activity, m.act),
      };

    case 'resolveComment':
      return {
        ...state,
        countries: state.countries.map((c) =>
          c.id !== m.countryId
            ? c
            : {
                ...c,
                messages: (c.messages ?? []).map((msg) =>
                  msg.id === m.commentId
                    ? {
                        ...msg,
                        status: 'resolved',
                        resolvedAt: m.resolvedAt,
                        resolvedBy: m.resolvedBy,
                      }
                    : msg,
                ),
              },
        ),
        activity: withActivity(state.activity, m.act),
      };

    case 'logActivity':
      return { ...state, activity: withActivity(state.activity, m.act) };

    case 'updateCountry':
      return {
        ...state,
        countries: state.countries.map((c) =>
          c.id === m.id ? { ...c, ...m.patch } : c,
        ),
        activity: withActivity(state.activity, m.act),
      };

    case 'updateFigure':
      return {
        ...state,
        countries: state.countries.map((c) =>
          c.id !== m.countryId
            ? c
            : {
                ...c,
                figures: c.figures.map((f) =>
                  f.type === m.figureType
                    ? {
                        ...f,
                        ...m.patch,
                        completedAt:
                          m.patch.status === 'done'
                            ? (m.patch.completedAt ?? f.completedAt ?? m.nowISO)
                            : m.patch.status !== undefined
                              ? null
                              : (m.patch.completedAt ?? f.completedAt),
                      }
                    : f,
                ),
              },
        ),
        activity: withActivity(state.activity, m.act),
      };

    case 'updateReport':
      return {
        ...state,
        countries: state.countries.map((c) =>
          c.id !== m.countryId
            ? c
            : {
                ...c,
                report: {
                  ...c.report,
                  ...m.patch,
                  completedAt:
                    m.patch.status === 'met'
                      ? (m.patch.completedAt ?? c.report.completedAt ?? m.nowISO)
                      : m.patch.status !== undefined
                        ? null
                        : (m.patch.completedAt ?? c.report.completedAt),
                },
              },
        ),
        activity: withActivity(state.activity, m.act),
      };

    case 'toggleReview':
      return {
        ...state,
        countries: state.countries.map((c) =>
          c.id !== m.countryId
            ? c
            : {
                ...c,
                reviews: c.reviews.map((r) =>
                  r.reviewerId !== m.reviewerId
                    ? r
                    : {
                        ...r,
                        status: m.done ? 'met' : 'not_started',
                        done: m.done,
                        completedAt: m.done ? m.nowISO : null,
                      },
                ),
              },
        ),
        activity: withActivity(state.activity, m.act),
      };

    case 'setReviewStatus':
      return {
        ...state,
        countries: state.countries.map((c) =>
          c.id !== m.countryId
            ? c
            : {
                ...c,
                reviews: c.reviews.map((r) => {
                  if (r.reviewerId !== m.reviewerId) return r;
                  const done =
                    m.status === 'met' || m.status === 'reviewed_with_comments';
                  return {
                    ...r,
                    status: m.status,
                    done,
                    completedAt: done ? (r.completedAt ?? m.nowISO) : null,
                  };
                }),
              },
        ),
        activity: withActivity(state.activity, m.act),
      };

    case 'setReviewComment':
      return {
        ...state,
        countries: state.countries.map((c) =>
          c.id !== m.countryId
            ? c
            : {
                ...c,
                reviews: c.reviews.map((r) =>
                  r.reviewerId !== m.reviewerId ? r : { ...r, comments: m.comment },
                ),
              },
        ),
        activity: withActivity(state.activity, m.act),
      };

    case 'setCountryComment':
      return {
        ...state,
        countries: state.countries.map((c) =>
          c.id !== m.countryId ? c : { ...c, comments: m.comment },
        ),
        activity: withActivity(state.activity, m.act),
      };

    case 'addMember':
      // Idempotent: ignore if the id already exists (covers retried mutations).
      if (state.team.some((t) => t.id === m.member.id)) return state;
      return {
        ...state,
        team: [...state.team, m.member],
        activity: withActivity(state.activity, m.act),
      };

    case 'updateMember':
      return {
        ...state,
        team: state.team.map((t) => (t.id === m.id ? { ...t, ...m.patch } : t)),
        activity: withActivity(state.activity, m.act),
      };

    case 'removeMember':
      return {
        ...state,
        team: state.team.filter((t) => t.id !== m.id),
        countries: state.countries.map((c) => ({
          ...c,
          figures: c.figures.map((f) =>
            f.assignedTo === m.id ? { ...f, assignedTo: null } : f,
          ),
          report:
            c.report.assignedTo === m.id ? { ...c.report, assignedTo: null } : c.report,
        })),
        activity: withActivity(state.activity, m.act),
      };

    case 'addCountry':
      if (state.countries.some((c) => c.id === m.country.id)) return state;
      return {
        ...state,
        countries: [...state.countries, m.country],
        activity: withActivity(state.activity, m.act),
      };

    case 'removeCountry':
      return {
        ...state,
        countries: state.countries.filter((c) => c.id !== m.id),
        activity: withActivity(state.activity, m.act),
      };

    case 'bulkAssignFigure':
      return {
        ...state,
        countries: state.countries.map((c) =>
          m.countryIds.includes(c.id)
            ? {
                ...c,
                figures: c.figures.map((f) =>
                  f.type === m.figureType ? { ...f, assignedTo: m.memberId } : f,
                ),
              }
            : c,
        ),
        activity: withActivity(state.activity, m.act),
      };

    default: {
      // Exhaustiveness guard — unknown mutation is a no-op rather than a throw
      // so a forward-compatible client can't break an older server.
      const _never: never = m;
      void _never;
      return state;
    }
  }
}

/** Minimal runtime guard for the server boundary. */
export function isMutation(value: unknown): value is Mutation {
  if (!value || typeof value !== 'object') return false;
  const t = (value as { t?: unknown }).t;
  return typeof t === 'string' && (MUTATION_TYPES as readonly string[]).includes(t);
}
