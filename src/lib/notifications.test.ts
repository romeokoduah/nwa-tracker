import { describe, it, expect } from 'vitest';
import type { AppState, Country, TeamMember, Comment, CommentReply } from './types';
import { FIGURE_TYPES } from './types';
import type { Mutation } from './mutations';
import { computeNotifications, type NotifyCtx } from './notifications';

// ---- fixtures (extended by later tasks) ----
function member(id: string, over: Partial<TeamMember> = {}): TeamMember {
  return {
    id,
    name: id[0].toUpperCase() + id.slice(1),
    email: `${id}@cgiar.org`,
    roles: ['report_writer'],
    avatarColor: '#2EB5A3',
    active: true,
    ...over,
  };
}

function country(id: string, over: Partial<Country> = {}): Country {
  return {
    id,
    no: 1,
    name: id[0].toUpperCase() + id.slice(1),
    iso3: 'XXX',
    region: 'West',
    figures: [],
    report: { assignedTo: null, status: 'not_started', deadline: null, completedAt: null, notes: null },
    reviews: [],
    flags: [],
    comments: null,
    messages: [],
    ...over,
  };
}

function state(over: Partial<AppState> = {}): AppState {
  return { countries: [], team: [], activity: [], lastSyncedAt: null, ...over };
}

const CTX: NotifyCtx = { actorId: 'admin', appBaseUrl: 'https://app.test', adminEmail: 'admin@cgiar.org' };

function act() {
  return { id: 'a1', timestamp: '2026-06-15T00:00:00Z', actor: 'Admin', action: 'x', entityType: 'report' as const, entityId: 'c1' };
}

describe('report assignment', () => {
  it('emails the new assignee when report.assignedTo changes', () => {
    const isuru = member('isuru');
    const prev = state({ team: [isuru], countries: [country('c1', { name: 'Zambia' })] });
    const next = state({ team: [isuru], countries: [country('c1', { name: 'Zambia', report: { assignedTo: 'isuru', status: 'not_started', deadline: null, completedAt: null, notes: null } })] });
    const m: Mutation = { t: 'updateReport', countryId: 'c1', patch: { assignedTo: 'isuru' }, nowISO: '2026-06-15T00:00:00Z', act: act() };

    const msgs = computeNotifications(prev, next, m, CTX);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].to).toBe('isuru@cgiar.org');
    expect(msgs[0].subject).toContain('Zambia');
    expect(msgs[0].text).toContain('https://app.test/countries/c1');
  });

  it('does not email when the assignee is unchanged', () => {
    const isuru = member('isuru');
    const c = country('c1', { report: { assignedTo: 'isuru', status: 'not_started', deadline: null, completedAt: null, notes: null } });
    const prev = state({ team: [isuru], countries: [c] });
    const next = state({ team: [isuru], countries: [c] });
    const m: Mutation = { t: 'updateReport', countryId: 'c1', patch: { assignedTo: 'isuru' }, nowISO: '2026-06-15T00:00:00Z', act: act() };
    expect(computeNotifications(prev, next, m, CTX)).toHaveLength(0);
  });

  it('does not email the actor about their own assignment', () => {
    const isuru = member('isuru');
    const prev = state({ team: [isuru], countries: [country('c1')] });
    const next = state({ team: [isuru], countries: [country('c1', { report: { assignedTo: 'isuru', status: 'not_started', deadline: null, completedAt: null, notes: null } })] });
    const m: Mutation = { t: 'updateReport', countryId: 'c1', patch: { assignedTo: 'isuru' }, nowISO: '2026-06-15T00:00:00Z', act: act() };
    expect(computeNotifications(prev, next, m, { ...CTX, actorId: 'isuru' })).toHaveLength(0);
  });
});

describe('figure assignment', () => {
  const fig = FIGURE_TYPES[0]; // 'Map of country' -> shortLabel 'Country Map'
  function withFigure(assignedTo: string | null) {
    return country('c1', {
      name: 'Mali',
      figures: [{ type: fig, assignedTo, status: 'not_started', deadline: null, completedAt: null, notes: null }],
    });
  }

  it('emails the assignee when a figure assignee changes', () => {
    const geethya = member('geethya');
    const prev = state({ team: [geethya], countries: [withFigure(null)] });
    const next = state({ team: [geethya], countries: [withFigure('geethya')] });
    const m: Mutation = { t: 'updateFigure', countryId: 'c1', figureType: fig, patch: { assignedTo: 'geethya' }, nowISO: '2026-06-15T00:00:00Z', act: act() };
    const msgs = computeNotifications(prev, next, m, CTX);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].to).toBe('geethya@cgiar.org');
    expect(msgs[0].subject).toContain('Country Map');
    expect(msgs[0].subject).toContain('Mali');
  });

  it('coalesces a bulk figure assignment into one email', () => {
    const eric = member('eric');
    const next = state({
      team: [eric],
      countries: [country('c1', { name: 'Ghana' }), country('c2', { name: 'Gambia' })],
    });
    const m: Mutation = { t: 'bulkAssignFigure', countryIds: ['c1', 'c2'], figureType: fig, memberId: 'eric', act: act() };
    const msgs = computeNotifications(next, next, m, CTX);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].to).toBe('eric@cgiar.org');
    expect(msgs[0].text).toContain('Ghana');
    expect(msgs[0].text).toContain('Gambia');
  });

  it('sends nothing when a bulk figure assignment clears the assignee', () => {
    const next = state({ team: [member('eric')], countries: [country('c1')] });
    const m: Mutation = { t: 'bulkAssignFigure', countryIds: ['c1'], figureType: fig, memberId: null, act: act() };
    expect(computeNotifications(next, next, m, CTX)).toHaveLength(0);
  });
});
