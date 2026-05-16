import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppState,
  ActivityEntry,
  Country,
  FigureProgress,
  FigureType,
  ReportProgress,
  ReviewProgress,
  TeamMember,
} from '@/lib/types';
import { seedData } from '@/lib/seed';

function nextId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

interface ActivityInput {
  actor?: string;
  action: string;
  entityType: ActivityEntry['entityType'];
  entityId: string;
}

interface NwaStore extends AppState {
  // queries
  countryById: (id: string) => Country | undefined;
  memberById: (id: string) => TeamMember | undefined;
  // country mutations
  updateCountry: (id: string, patch: Partial<Country>) => void;
  updateFigure: (
    countryId: string,
    figureType: FigureType,
    patch: Partial<FigureProgress>,
  ) => void;
  updateReport: (countryId: string, patch: Partial<ReportProgress>) => void;
  toggleReview: (countryId: string, reviewerId: string, done: boolean) => void;
  setReviewComment: (countryId: string, reviewerId: string, comment: string) => void;
  setCountryComment: (countryId: string, comment: string) => void;
  // team
  addMember: (m: Omit<TeamMember, 'id'>) => string;
  updateMember: (id: string, patch: Partial<TeamMember>) => void;
  removeMember: (id: string) => void;
  // countries CRUD
  addCountry: (c: Omit<Country, 'id'>) => string;
  removeCountry: (id: string) => void;
  // bulk
  bulkAssignFigure: (
    countryIds: string[],
    figureType: FigureType,
    memberId: string | null,
  ) => void;
  // data ops
  exportJson: () => string;
  importJson: (json: string) => void;
  resetToSeed: () => void;
  // activity
  logActivity: (entry: ActivityInput) => void;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function withActivity(state: AppState, entry: ActivityInput): ActivityEntry[] {
  const next: ActivityEntry = {
    id: nextId(),
    timestamp: new Date().toISOString(),
    actor: entry.actor ?? 'Admin',
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
  };
  return [next, ...state.activity].slice(0, 500);
}

export const useNwaStore = create<NwaStore>()(
  persist(
    (set, get) => ({
      ...seedData,

      countryById: (id) => get().countries.find((c) => c.id === id),
      memberById: (id) => get().team.find((m) => m.id === id),

      updateCountry: (id, patch) =>
        set((s) => ({
          countries: s.countries.map((c) => (c.id === id ? { ...c, ...patch } : c)),
          activity: withActivity(s, {
            action: `Updated country ${id}`,
            entityType: 'country',
            entityId: id,
          }),
        })),

      updateFigure: (countryId, figureType, patch) =>
        set((s) => {
          const country = s.countries.find((c) => c.id === countryId);
          const memberName = patch.assignedTo
            ? s.team.find((m) => m.id === patch.assignedTo)?.name
            : null;
          let action = `Updated ${figureType} for ${country?.name ?? countryId}`;
          if (patch.assignedTo !== undefined) {
            action = patch.assignedTo
              ? `Assigned ${figureType} for ${country?.name ?? countryId} to ${memberName ?? patch.assignedTo}`
              : `Cleared assignee for ${figureType} on ${country?.name ?? countryId}`;
          } else if (patch.status === 'done') {
            action = `Marked ${figureType} for ${country?.name ?? countryId} as done`;
          } else if (patch.status) {
            action = `Set ${figureType} for ${country?.name ?? countryId} → ${patch.status}`;
          }
          return {
            countries: s.countries.map((c) =>
              c.id !== countryId
                ? c
                : {
                    ...c,
                    figures: c.figures.map((f) =>
                      f.type === figureType
                        ? {
                            ...f,
                            ...patch,
                            completedAt:
                              patch.status === 'done'
                                ? (patch.completedAt ?? f.completedAt ?? new Date().toISOString())
                                : patch.status !== undefined
                                  ? null
                                  : (patch.completedAt ?? f.completedAt),
                          }
                        : f,
                    ),
                  },
            ),
            activity: withActivity(s, {
              action,
              entityType: 'figure',
              entityId: `${countryId}:${figureType}`,
            }),
          };
        }),

      updateReport: (countryId, patch) =>
        set((s) => {
          const country = s.countries.find((c) => c.id === countryId);
          let action = `Updated report for ${country?.name ?? countryId}`;
          if (patch.assignedTo !== undefined) {
            const m = patch.assignedTo
              ? s.team.find((mm) => mm.id === patch.assignedTo)?.name
              : null;
            action = patch.assignedTo
              ? `Assigned report for ${country?.name ?? countryId} to ${m ?? patch.assignedTo}`
              : `Cleared report assignee for ${country?.name ?? countryId}`;
          } else if (patch.status === 'met') {
            action = `Marked report for ${country?.name ?? countryId} as Met`;
          } else if (patch.status) {
            action = `Set report status for ${country?.name ?? countryId} → ${patch.status}`;
          }
          return {
            countries: s.countries.map((c) =>
              c.id !== countryId
                ? c
                : {
                    ...c,
                    report: {
                      ...c.report,
                      ...patch,
                      completedAt:
                        patch.status === 'met'
                          ? (patch.completedAt ?? c.report.completedAt ?? new Date().toISOString())
                          : patch.status !== undefined
                            ? null
                            : (patch.completedAt ?? c.report.completedAt),
                    },
                  },
            ),
            activity: withActivity(s, {
              action,
              entityType: 'report',
              entityId: countryId,
            }),
          };
        }),

      toggleReview: (countryId, reviewerId, done) =>
        set((s) => {
          const country = s.countries.find((c) => c.id === countryId);
          const reviewer = country?.reviews.find((r) => r.reviewerId === reviewerId);
          const action = `${done ? 'Marked' : 'Cleared'} ${reviewer?.reviewerName ?? reviewerId}'s review of ${country?.name ?? countryId}${done ? ' as done' : ''}`;
          return {
            countries: s.countries.map((c) =>
              c.id !== countryId
                ? c
                : {
                    ...c,
                    reviews: c.reviews.map((r) =>
                      r.reviewerId !== reviewerId
                        ? r
                        : {
                            ...r,
                            done,
                            completedAt: done ? new Date().toISOString() : null,
                          },
                    ),
                  },
            ),
            activity: withActivity(s, {
              action,
              entityType: 'review',
              entityId: `${countryId}:${reviewerId}`,
            }),
          };
        }),

      setReviewComment: (countryId, reviewerId, comment) =>
        set((s) => ({
          countries: s.countries.map((c) =>
            c.id !== countryId
              ? c
              : {
                  ...c,
                  reviews: c.reviews.map((r) =>
                    r.reviewerId !== reviewerId ? r : { ...r, comments: comment },
                  ),
                },
          ),
          activity: withActivity(s, {
            action: `Updated review comment on ${countryId}`,
            entityType: 'review',
            entityId: `${countryId}:${reviewerId}`,
          }),
        })),

      setCountryComment: (countryId, comment) =>
        set((s) => ({
          countries: s.countries.map((c) =>
            c.id !== countryId ? c : { ...c, comments: comment },
          ),
          activity: withActivity(s, {
            action: `Updated comments for ${countryId}`,
            entityType: 'country',
            entityId: countryId,
          }),
        })),

      addMember: (m) => {
        let id = slugify(m.name);
        if (!id) id = nextId();
        const state = get();
        if (state.team.some((t) => t.id === id)) {
          id = `${id}-${nextId().slice(0, 4)}`;
        }
        const member: TeamMember = { ...m, id };
        set((s) => ({
          team: [...s.team, member],
          activity: withActivity(s, {
            action: `Added team member ${m.name}`,
            entityType: 'team',
            entityId: id,
          }),
        }));
        return id;
      },

      updateMember: (id, patch) =>
        set((s) => ({
          team: s.team.map((t) => (t.id === id ? { ...t, ...patch } : t)),
          activity: withActivity(s, {
            action: `Updated team member ${id}`,
            entityType: 'team',
            entityId: id,
          }),
        })),

      removeMember: (id) =>
        set((s) => {
          const member = s.team.find((t) => t.id === id);
          return {
            team: s.team.filter((t) => t.id !== id),
            countries: s.countries.map((c) => ({
              ...c,
              figures: c.figures.map((f) =>
                f.assignedTo === id ? { ...f, assignedTo: null } : f,
              ),
              report:
                c.report.assignedTo === id ? { ...c.report, assignedTo: null } : c.report,
            })),
            activity: withActivity(s, {
              action: `Removed team member ${member?.name ?? id}`,
              entityType: 'team',
              entityId: id,
            }),
          };
        }),

      addCountry: (c) => {
        let id = slugify(c.name);
        if (!id) id = nextId();
        const state = get();
        if (state.countries.some((cc) => cc.id === id)) {
          id = `${id}-${nextId().slice(0, 4)}`;
        }
        const country: Country = { ...c, id };
        set((s) => ({
          countries: [...s.countries, country],
          activity: withActivity(s, {
            action: `Added country ${c.name}`,
            entityType: 'country',
            entityId: id,
          }),
        }));
        return id;
      },

      removeCountry: (id) =>
        set((s) => {
          const country = s.countries.find((c) => c.id === id);
          return {
            countries: s.countries.filter((c) => c.id !== id),
            activity: withActivity(s, {
              action: `Removed country ${country?.name ?? id}`,
              entityType: 'country',
              entityId: id,
            }),
          };
        }),

      bulkAssignFigure: (countryIds, figureType, memberId) =>
        set((s) => {
          const member = memberId ? s.team.find((m) => m.id === memberId) : null;
          return {
            countries: s.countries.map((c) =>
              countryIds.includes(c.id)
                ? {
                    ...c,
                    figures: c.figures.map((f) =>
                      f.type === figureType ? { ...f, assignedTo: memberId } : f,
                    ),
                  }
                : c,
            ),
            activity: withActivity(s, {
              action: `Bulk assigned ${figureType} on ${countryIds.length} countries to ${member?.name ?? 'Unassigned'}`,
              entityType: 'figure',
              entityId: `bulk:${figureType}`,
            }),
          };
        }),

      exportJson: () => {
        const s = get();
        const payload: AppState = {
          countries: s.countries,
          team: s.team,
          activity: s.activity,
          lastSyncedAt: new Date().toISOString(),
        };
        return JSON.stringify(payload, null, 2);
      },

      importJson: (json) => {
        const parsed = JSON.parse(json) as AppState;
        set(() => ({
          countries: parsed.countries,
          team: parsed.team,
          activity: parsed.activity ?? [],
          lastSyncedAt: parsed.lastSyncedAt ?? new Date().toISOString(),
        }));
      },

      resetToSeed: () =>
        set(() => ({
          ...seedData,
          activity: [],
          lastSyncedAt: seedData.lastSyncedAt,
        })),

      logActivity: (entry) =>
        set((s) => ({
          activity: withActivity(s, entry),
        })),
    }),
    {
      // v2: reviewer roster changed (Kirubel, Mansoor, Komalvi, Afua,
      // Smaranika). A new storage key forces a clean rehydrate from seed so
      // existing localStorage doesn't keep the old reviewer structure.
      name: 'nwa-tracker-store-v2',
      version: 2,
    },
  ),
);
