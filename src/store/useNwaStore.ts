import { create } from 'zustand';
import type {
  AppState,
  ActivityEntry,
  Comment,
  CommentScope,
  Country,
  FigureProgress,
  FigureType,
  ReportProgress,
  Role,
  TeamMember,
} from '@/lib/types';
import { FIGURE_META } from '@/lib/types';
import { seedData } from '@/lib/seed';
import { deriveRecipients } from '@/lib/derive';
import { applyMutation, type Mutation } from '@/lib/mutations';

export interface AddCommentInput {
  countryId: string;
  scope: CommentScope;
  figureType: FigureType | null;
  body: string;
  author: { id: string; name: string; roles: Role[]; isAdmin: boolean };
}

function nextId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function nowISO(): string {
  return new Date().toISOString();
}

interface ActivityInput {
  actor?: string;
  action: string;
  entityType: ActivityEntry['entityType'];
  entityId: string;
}

function makeAct(input: ActivityInput): ActivityEntry {
  return {
    id: nextId(),
    timestamp: nowISO(),
    actor: input.actor ?? 'Admin',
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
  };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export type SyncStatus = 'connecting' | 'live' | 'error';

interface SyncDispatchers {
  send: (m: Mutation) => void;
  replace: (s: AppState) => void | Promise<void>;
}

interface NwaStore extends AppState {
  // sync state
  version: number;
  syncStatus: SyncStatus;
  syncError: string | null;

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

  // directed comments
  addComment: (input: AddCommentInput) => void;
  resolveComment: (countryId: string, commentId: string) => void;

  // activity
  logActivity: (entry: ActivityInput) => void;

  // ── sync internals (used by store/sync.ts; not part of the UI surface) ──
  _bindSync: (d: SyncDispatchers) => void;
  _applyRemote: (data: AppState, version: number) => void;
  _setSync: (status: SyncStatus, error?: string) => void;
  _setVersion: (version: number) => void;
  _snapshot: () => AppState;
}

export const useNwaStore = create<NwaStore>()((set, get) => {
  let dispatch: SyncDispatchers | null = null;

  /** Optimistic local apply + ship to the server. */
  function commit(m: Mutation) {
    set((s) => applyMutation(s, m));
    dispatch?.send(m);
  }

  return {
    ...seedData,
    version: 0,
    syncStatus: 'connecting',
    syncError: null,

    countryById: (id) => get().countries.find((c) => c.id === id),
    memberById: (id) => get().team.find((m) => m.id === id),

    updateCountry: (id, patch) =>
      commit({
        t: 'updateCountry',
        id,
        patch,
        act: makeAct({
          action: `Updated country ${id}`,
          entityType: 'country',
          entityId: id,
        }),
      }),

    updateFigure: (countryId, figureType, patch) => {
      const s = get();
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
      commit({
        t: 'updateFigure',
        countryId,
        figureType,
        patch,
        nowISO: nowISO(),
        act: makeAct({
          action,
          entityType: 'figure',
          entityId: `${countryId}:${figureType}`,
        }),
      });
    },

    updateReport: (countryId, patch) => {
      const s = get();
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
      commit({
        t: 'updateReport',
        countryId,
        patch,
        nowISO: nowISO(),
        act: makeAct({ action, entityType: 'report', entityId: countryId }),
      });
    },

    toggleReview: (countryId, reviewerId, done) => {
      const s = get();
      const country = s.countries.find((c) => c.id === countryId);
      const reviewer = country?.reviews.find((r) => r.reviewerId === reviewerId);
      const action = `${done ? 'Marked' : 'Cleared'} ${reviewer?.reviewerName ?? reviewerId}'s review of ${country?.name ?? countryId}${done ? ' as done' : ''}`;
      commit({
        t: 'toggleReview',
        countryId,
        reviewerId,
        done,
        nowISO: nowISO(),
        act: makeAct({
          action,
          entityType: 'review',
          entityId: `${countryId}:${reviewerId}`,
        }),
      });
    },

    setReviewComment: (countryId, reviewerId, comment) =>
      commit({
        t: 'setReviewComment',
        countryId,
        reviewerId,
        comment,
        act: makeAct({
          action: `Updated review comment on ${countryId}`,
          entityType: 'review',
          entityId: `${countryId}:${reviewerId}`,
        }),
      }),

    setCountryComment: (countryId, comment) =>
      commit({
        t: 'setCountryComment',
        countryId,
        comment,
        act: makeAct({
          action: `Updated comments for ${countryId}`,
          entityType: 'country',
          entityId: countryId,
        }),
      }),

    addMember: (m) => {
      let id = slugify(m.name);
      if (!id) id = nextId();
      if (get().team.some((t) => t.id === id)) {
        id = `${id}-${nextId().slice(0, 4)}`;
      }
      const member: TeamMember = { ...m, id };
      commit({
        t: 'addMember',
        member,
        act: makeAct({
          action: `Added team member ${m.name}`,
          entityType: 'team',
          entityId: id,
        }),
      });
      return id;
    },

    updateMember: (id, patch) =>
      commit({
        t: 'updateMember',
        id,
        patch,
        act: makeAct({
          action: `Updated team member ${id}`,
          entityType: 'team',
          entityId: id,
        }),
      }),

    removeMember: (id) => {
      const member = get().team.find((t) => t.id === id);
      commit({
        t: 'removeMember',
        id,
        act: makeAct({
          action: `Removed team member ${member?.name ?? id}`,
          entityType: 'team',
          entityId: id,
        }),
      });
    },

    addCountry: (c) => {
      let id = slugify(c.name);
      if (!id) id = nextId();
      if (get().countries.some((cc) => cc.id === id)) {
        id = `${id}-${nextId().slice(0, 4)}`;
      }
      const country: Country = { ...c, id, messages: c.messages ?? [] };
      commit({
        t: 'addCountry',
        country,
        act: makeAct({
          action: `Added country ${c.name}`,
          entityType: 'country',
          entityId: id,
        }),
      });
      return id;
    },

    removeCountry: (id) => {
      const country = get().countries.find((c) => c.id === id);
      commit({
        t: 'removeCountry',
        id,
        act: makeAct({
          action: `Removed country ${country?.name ?? id}`,
          entityType: 'country',
          entityId: id,
        }),
      });
    },

    bulkAssignFigure: (countryIds, figureType, memberId) => {
      const member = memberId ? get().team.find((m) => m.id === memberId) : null;
      commit({
        t: 'bulkAssignFigure',
        countryIds,
        figureType,
        memberId,
        act: makeAct({
          action: `Bulk assigned ${figureType} on ${countryIds.length} countries to ${member?.name ?? 'Unassigned'}`,
          entityType: 'figure',
          entityId: `bulk:${figureType}`,
        }),
      });
    },

    exportJson: () => {
      const s = get();
      const payload: AppState = {
        countries: s.countries,
        team: s.team,
        activity: s.activity,
        lastSyncedAt: nowISO(),
      };
      return JSON.stringify(payload, null, 2);
    },

    importJson: (json) => {
      const parsed = JSON.parse(json) as AppState;
      const next: AppState = {
        countries: parsed.countries.map((c) => ({
          ...c,
          messages: c.messages ?? [],
        })),
        team: parsed.team,
        activity: parsed.activity ?? [],
        lastSyncedAt: parsed.lastSyncedAt ?? nowISO(),
      };
      set(() => next);
      void dispatch?.replace(next);
    },

    resetToSeed: () => {
      const next: AppState = {
        countries: seedData.countries,
        team: seedData.team,
        activity: [],
        lastSyncedAt: seedData.lastSyncedAt,
      };
      set(() => next);
      void dispatch?.replace(next);
    },

    addComment: (input) => {
      const s = get();
      const country = s.countries.find((c) => c.id === input.countryId);
      if (!country || !input.body.trim()) return;
      const authorIsReviewer =
        input.author.roles.includes('reviewer') ||
        country.reviews.some(
          (r) => r.reviewerName.toLowerCase() === input.author.name.toLowerCase(),
        );
      const authorIsReportWriter =
        input.author.roles.includes('report_writer') ||
        country.report.assignedTo === input.author.id;
      const { ids, names } = deriveRecipients({
        country,
        team: s.team,
        scope: input.scope,
        figureType: input.figureType ?? null,
        authorId: input.author.id,
        authorIsReviewer,
        authorIsReportWriter,
      });
      const roleLabel = input.author.isAdmin
        ? 'Admin'
        : authorIsReviewer
          ? 'Reviewer'
          : authorIsReportWriter
            ? 'Report writer'
            : input.author.roles.includes('figure_lead')
              ? 'Figure lead'
              : input.author.roles.includes('figure_producer')
                ? 'Figure producer'
                : 'Team';
      const id = nextId();
      const comment: Comment = {
        id,
        countryId: input.countryId,
        scope: input.scope,
        figureType: input.scope === 'figure' ? (input.figureType ?? null) : null,
        authorId: input.author.id,
        authorName: input.author.name,
        authorRole: roleLabel,
        recipientIds: ids,
        recipientNames: names,
        body: input.body.trim(),
        createdAt: nowISO(),
        fromReviewer: authorIsReviewer,
        resolved: false,
        resolvedAt: null,
      };
      const scopeLabel =
        input.scope === 'figure' && input.figureType
          ? FIGURE_META[input.figureType].shortLabel
          : input.scope === 'report'
            ? 'Report'
            : 'General';
      commit({
        t: 'addComment',
        comment,
        act: makeAct({
          actor: input.author.name,
          action: `${input.author.name} commented on ${country.name} · ${scopeLabel}`,
          entityType: 'comment',
          entityId: `${input.countryId}:${id}`,
        }),
      });
    },

    resolveComment: (countryId, commentId) => {
      const c = get().countries.find((x) => x.id === countryId);
      commit({
        t: 'resolveComment',
        countryId,
        commentId,
        resolvedAt: nowISO(),
        act: makeAct({
          action: `Resolved a comment on ${c?.name ?? countryId}`,
          entityType: 'comment',
          entityId: `${countryId}:${commentId}`,
        }),
      });
    },

    logActivity: (entry) =>
      commit({ t: 'logActivity', act: makeAct(entry) }),

    _bindSync: (d) => {
      dispatch = d;
    },

    _applyRemote: (data, version) =>
      set(() => ({
        countries: data.countries.map((c) => ({
          ...c,
          messages: c.messages ?? [],
        })),
        team: data.team,
        activity: data.activity ?? [],
        lastSyncedAt: data.lastSyncedAt ?? null,
        version,
      })),

    _setSync: (status, error) =>
      set(() => ({ syncStatus: status, syncError: error ?? null })),

    _setVersion: (version) => set(() => ({ version })),

    _snapshot: () => {
      const s = get();
      return {
        countries: s.countries,
        team: s.team,
        activity: s.activity,
        lastSyncedAt: s.lastSyncedAt,
      };
    },
  };
});
