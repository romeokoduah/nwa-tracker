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
  AppState,
  Country,
  FigureProgress,
  FigureType,
  ReportProgress,
  TeamMember,
} from './types';

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
  | { t: 'logActivity'; act: ActivityEntry }
  | { t: 'replaceState'; state: AppState };

export const MUTATION_TYPES: readonly Mutation['t'][] = [
  'updateCountry',
  'updateFigure',
  'updateReport',
  'toggleReview',
  'setReviewComment',
  'setCountryComment',
  'addMember',
  'updateMember',
  'removeMember',
  'addCountry',
  'removeCountry',
  'bulkAssignFigure',
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
        countries: m.state.countries,
        team: m.state.team,
        activity: m.state.activity ?? [],
        lastSyncedAt: m.state.lastSyncedAt ?? null,
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
                    : { ...r, done: m.done, completedAt: m.done ? m.nowISO : null },
                ),
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
