import { create } from 'zustand';
import type {
  AppSettings,
  AppState,
  ActivityEntry,
  Comment,
  CommentScope,
  Country,
  FigureProgress,
  FigureType,
  ReportProgress,
  ReviewStatus,
  Role,
  TeamMember,
} from '@/lib/types';
import { FIGURE_META } from '@/lib/types';
import { seedData } from '@/lib/seed';
import { deriveRecipients } from '@/lib/derive';
import { applyMutation, normalizeCountry, type Mutation } from '@/lib/mutations';

export interface CommentAuthor {
  id: string;
  name: string;
  roles: Role[];
  isAdmin: boolean;
}

export interface AddCommentInput {
  countryId: string;
  scope: CommentScope;
  figureType: FigureType | null;
  body: string;
  blocking: boolean;
  author: CommentAuthor;
}

export interface ReplyCommentInput {
  countryId: string;
  commentId: string;
  body: string;
  author: CommentAuthor;
}

export interface SendReminderInput {
  countryId: string;
  recipientId: string;
  recipientName: string;
  scope: CommentScope;
  figureType?: FigureType | null;
  body: string;
  /** the admin/coordinator triggering the reminder (used as the comment author id) */
  author: CommentAuthor;
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

function commentAuthorMeta(
  country: Country,
  author: { id: string; name: string; roles: Role[]; isAdmin: boolean },
) {
  const isReviewer =
    author.roles.includes('reviewer') ||
    country.reviews.some(
      (r) => r.reviewerName.toLowerCase() === author.name.toLowerCase(),
    );
  const isReportWriter =
    author.roles.includes('report_writer') ||
    country.report.assignedTo === author.id;
  const roleLabel = author.isAdmin
    ? 'Admin'
    : isReviewer
      ? 'Reviewer'
      : isReportWriter
        ? 'Report writer'
        : author.roles.includes('figure_lead')
          ? 'Figure lead'
          : author.roles.includes('figure_producer')
            ? 'Figure producer'
            : 'Team';
  return { isReviewer, isReportWriter, roleLabel };
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
  setReviewStatus: (
    countryId: string,
    reviewerId: string,
    status: ReviewStatus,
  ) => void;
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
  replyComment: (input: ReplyCommentInput) => void;
  acknowledgeComment: (
    countryId: string,
    commentId: string,
    user: { id: string; name: string },
  ) => void;
  resolveComment: (
    countryId: string,
    commentId: string,
    by: { id: string; name: string },
  ) => void;
  removeComment: (
    countryId: string,
    commentId: string,
    by: { id: string; name: string },
  ) => void;

  // reminders (coordinator -> assignee/reviewer): shows on dashboard + emails
  sendReminder: (input: SendReminderInput) => void;

  // settings
  updateSettings: (patch: Partial<AppSettings>) => void;

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

    setReviewStatus: (countryId, reviewerId, status) => {
      const s = get();
      const country = s.countries.find((c) => c.id === countryId);
      const reviewer = country?.reviews.find((r) => r.reviewerId === reviewerId);
      const labels: Record<ReviewStatus, string> = {
        not_started: 'Not started',
        in_progress: 'In progress',
        reviewed_with_comments: 'Reviewed with comments',
        met: 'Met',
      };
      const action = `Set ${reviewer?.reviewerName ?? reviewerId}'s review of ${country?.name ?? countryId} → ${labels[status]}`;
      commit({
        t: 'setReviewStatus',
        countryId,
        reviewerId,
        status,
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
        settings: s.settings,
      };
      return JSON.stringify(payload, null, 2);
    },

    importJson: (json) => {
      const parsed = JSON.parse(json) as AppState;
      const next: AppState = {
        countries: parsed.countries.map(normalizeCountry),
        team: parsed.team,
        activity: parsed.activity ?? [],
        lastSyncedAt: parsed.lastSyncedAt ?? nowISO(),
        settings: parsed.settings,
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
      const { isReviewer, isReportWriter, roleLabel } = commentAuthorMeta(
        country,
        input.author,
      );
      const { ids, names } = deriveRecipients({
        country,
        team: s.team,
        scope: input.scope,
        figureType: input.figureType ?? null,
        authorId: input.author.id,
        authorIsReviewer: isReviewer,
        authorIsReportWriter: isReportWriter,
      });
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
        fromReviewer: isReviewer,
        blocking: input.blocking,
        status: 'open',
        replies: [],
        acknowledgedBy: [],
        resolvedAt: null,
        resolvedBy: null,
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
          action: `${input.author.name} left a ${input.blocking ? 'blocking' : 'non-blocking'} comment on ${country.name} · ${scopeLabel}`,
          entityType: 'comment',
          entityId: `${input.countryId}:${id}`,
        }),
      });
    },

    replyComment: (input) => {
      const s = get();
      const country = s.countries.find((c) => c.id === input.countryId);
      if (!country || !input.body.trim()) return;
      const comment = (country.messages ?? []).find(
        (m) => m.id === input.commentId,
      );
      if (!comment) return;
      const { roleLabel } = commentAuthorMeta(country, input.author);
      const reply = {
        id: nextId(),
        authorId: input.author.id,
        authorName: input.author.name,
        authorRole: roleLabel,
        body: input.body.trim(),
        createdAt: nowISO(),
      };
      commit({
        t: 'replyComment',
        countryId: input.countryId,
        commentId: input.commentId,
        reply,
        fromRecipient: input.author.id !== comment.authorId,
        act: makeAct({
          actor: input.author.name,
          action: `${input.author.name} replied to a comment on ${country.name}`,
          entityType: 'comment',
          entityId: `${input.countryId}:${input.commentId}`,
        }),
      });
    },

    acknowledgeComment: (countryId, commentId, user) =>
      commit({
        t: 'acknowledgeComment',
        countryId,
        commentId,
        userId: user.id,
        act: makeAct({
          actor: user.name,
          action: `${user.name} acknowledged a comment on ${
            get().countries.find((x) => x.id === countryId)?.name ?? countryId
          }`,
          entityType: 'comment',
          entityId: `${countryId}:${commentId}`,
        }),
      }),

    resolveComment: (countryId, commentId, by) => {
      const c = get().countries.find((x) => x.id === countryId);
      commit({
        t: 'resolveComment',
        countryId,
        commentId,
        resolvedAt: nowISO(),
        resolvedBy: by.id,
        act: makeAct({
          actor: by.name,
          action: `${by.name} resolved a comment on ${c?.name ?? countryId}`,
          entityType: 'comment',
          entityId: `${countryId}:${commentId}`,
        }),
      });
    },

    removeComment: (countryId, commentId, by) => {
      const c = get().countries.find((x) => x.id === countryId);
      commit({
        t: 'removeComment',
        countryId,
        commentId,
        act: makeAct({
          actor: by.name,
          action: `${by.name} deleted a comment on ${c?.name ?? countryId}`,
          entityType: 'comment',
          entityId: `${countryId}:${commentId}`,
        }),
      });
    },

    sendReminder: (input) => {
      const s = get();
      const country = s.countries.find((c) => c.id === input.countryId);
      if (!country || !input.body.trim()) return;
      const scopeLabel =
        input.scope === 'figure' && input.figureType
          ? FIGURE_META[input.figureType].shortLabel
          : input.scope === 'report'
            ? 'Report'
            : 'General';
      const id = nextId();
      const comment: Comment = {
        id,
        countryId: input.countryId,
        scope: input.scope,
        figureType: input.scope === 'figure' ? (input.figureType ?? null) : null,
        authorId: input.author.id,
        authorName: 'Coordinating Team',
        authorRole: 'Coordinator',
        recipientIds: [input.recipientId],
        recipientNames: [input.recipientName],
        body: input.body.trim(),
        createdAt: nowISO(),
        fromReviewer: false,
        blocking: false,
        reminder: true,
        status: 'open',
        replies: [],
        acknowledgedBy: [],
        resolvedAt: null,
        resolvedBy: null,
      };
      commit({
        t: 'addComment',
        comment,
        act: makeAct({
          actor: 'Coordinating Team',
          action: `Reminder sent to ${input.recipientName} for ${country.name} · ${scopeLabel}`,
          entityType: 'comment',
          entityId: `${input.countryId}:${id}`,
        }),
      });
    },

    updateSettings: (patch) =>
      commit({
        t: 'updateSettings',
        patch,
        act: makeAct({
          action: `Updated notification settings`,
          entityType: 'team',
          entityId: 'settings',
        }),
      }),

    logActivity: (entry) =>
      commit({ t: 'logActivity', act: makeAct(entry) }),

    _bindSync: (d) => {
      dispatch = d;
    },

    _applyRemote: (data, version) =>
      set(() => ({
        countries: data.countries.map(normalizeCountry),
        team: data.team,
        activity: data.activity ?? [],
        lastSyncedAt: data.lastSyncedAt ?? null,
        settings: data.settings,
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
        settings: s.settings,
      };
    },
  };
});
