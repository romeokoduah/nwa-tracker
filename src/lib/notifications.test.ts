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

function comment(over: Partial<Comment> = {}): Comment {
  return {
    id: 'm1',
    countryId: 'c1',
    scope: 'report',
    figureType: null,
    authorId: 'admin',
    authorName: 'Admin',
    authorRole: 'Admin',
    recipientIds: ['isuru'],
    recipientNames: ['Isuru'],
    body: 'Please update the totals.',
    createdAt: '2026-06-15T00:00:00Z',
    fromReviewer: false,
    blocking: false,
    status: 'open',
    replies: [],
    acknowledgedBy: [],
    resolvedAt: null,
    resolvedBy: null,
    ...over,
  };
}

describe('directed comments', () => {
  const base = () => state({ team: [member('isuru'), member('naga', { roles: ['reviewer'] })], countries: [country('c1', { name: 'Mali' })] });

  it('emails the recipients of a new comment', () => {
    const c = comment();
    const next = base();
    next.countries[0].messages = [c];
    const m: Mutation = { t: 'addComment', comment: c, act: act() };
    const msgs = computeNotifications(base(), next, m, CTX);
    expect(msgs.map((x) => x.to)).toEqual(['isuru@cgiar.org']);
    expect(msgs[0].subject).toContain('New comment');
    expect(msgs[0].text).toContain('Please update the totals.');
  });

  it('uses reviewer-feedback wording when fromReviewer', () => {
    const c = comment({ authorId: 'naga', authorName: 'Naga', fromReviewer: true });
    const next = base();
    const m: Mutation = { t: 'addComment', comment: c, act: act() };
    const msgs = computeNotifications(base(), next, m, { ...CTX, actorId: 'naga' });
    expect(msgs[0].subject).toContain('Reviewer feedback');
  });

  it('uses action-needed wording when blocking', () => {
    const c = comment({ blocking: true });
    const m: Mutation = { t: 'addComment', comment: c, act: act() };
    const msgs = computeNotifications(base(), base(), m, CTX);
    expect(msgs[0].subject).toContain('Action needed');
  });

  it('never emails the comment author even if they are also a recipient', () => {
    const c = comment({ authorId: 'isuru', authorName: 'Isuru', recipientIds: ['isuru'] });
    const m: Mutation = { t: 'addComment', comment: c, act: act() };
    expect(computeNotifications(base(), base(), m, { ...CTX, actorId: 'isuru' })).toHaveLength(0);
  });

  it('does not re-email when the comment already existed (idempotent retry)', () => {
    const c = comment();
    // prev already contains the comment -> a re-applied mutation
    const s = base();
    s.countries[0].messages = [c];
    const m: Mutation = { t: 'addComment', comment: c, act: act() };
    expect(computeNotifications(s, s, m, CTX)).toHaveLength(0);
  });
});

describe('replies', () => {
  const reply: CommentReply = { id: 'r1', authorId: 'isuru', authorName: 'Isuru', authorRole: 'Writer', body: 'Done, fixed.', createdAt: '2026-06-15T01:00:00Z' };
  const team = [member('admin', { name: 'Admin' }), member('isuru'), member('naga')];

  it('emails all thread participants except the replier', () => {
    const before = comment({ authorId: 'naga', authorName: 'Naga', recipientIds: ['isuru'], replies: [] });
    const after = comment({ authorId: 'naga', authorName: 'Naga', recipientIds: ['isuru'], replies: [reply] });
    const prev = state({ team, countries: [country('c1', { name: 'Mali', messages: [before] })] });
    const next = state({ team, countries: [country('c1', { name: 'Mali', messages: [after] })] });
    const m: Mutation = { t: 'replyComment', countryId: 'c1', commentId: 'm1', reply, fromRecipient: true, act: act() };
    const msgs = computeNotifications(prev, next, m, { ...CTX, actorId: 'isuru' });
    // participants: naga (author) + isuru (recipient) + isuru (replier); replier removed -> naga only
    expect(msgs.map((x) => x.to)).toEqual(['naga@cgiar.org']);
    expect(msgs[0].subject).toContain('reply');
    expect(msgs[0].text).toContain('Done, fixed.');
  });

  it('does not re-email when the reply already existed (idempotent retry)', () => {
    const after = comment({ authorId: 'naga', authorName: 'Naga', recipientIds: ['isuru'], replies: [reply] });
    // prev already contains the reply -> a re-applied mutation
    const s = state({ team, countries: [country('c1', { name: 'Mali', messages: [after] })] });
    const m: Mutation = { t: 'replyComment', countryId: 'c1', commentId: 'm1', reply, fromRecipient: true, act: act() };
    expect(computeNotifications(s, s, m, { ...CTX, actorId: 'isuru' })).toHaveLength(0);
  });
});

describe('reviews and status changes', () => {
  function reviewed(reportAssignee: string | null) {
    return country('c1', {
      name: 'Niger',
      report: { assignedTo: reportAssignee, status: 'in_progress', deadline: null, completedAt: null, notes: null },
      reviews: [{ reviewerId: 'naga', reviewerName: 'Naga', done: false, completedAt: null, comments: null }],
    });
  }

  it('emails the report owner when a review is completed', () => {
    const team = [member('afua'), member('naga', { roles: ['reviewer'] })];
    const next = state({ team, countries: [reviewed('afua')] });
    const m: Mutation = { t: 'toggleReview', countryId: 'c1', reviewerId: 'naga', done: true, nowISO: '2026-06-15T00:00:00Z', act: act() };
    const msgs = computeNotifications(next, next, m, { ...CTX, actorId: 'naga' });
    expect(msgs.map((x) => x.to)).toEqual(['afua@cgiar.org']);
    expect(msgs[0].subject).toContain('Review completed');
  });

  it('does not email when a review is un-completed', () => {
    const next = state({ team: [member('afua')], countries: [reviewed('afua')] });
    const m: Mutation = { t: 'toggleReview', countryId: 'c1', reviewerId: 'naga', done: false, nowISO: '2026-06-15T00:00:00Z', act: act() };
    expect(computeNotifications(next, next, m, CTX)).toHaveLength(0);
  });

  it('emails the reviewers when report status becomes in_review', () => {
    const team = [member('afua'), member('naga', { roles: ['reviewer'] })];
    const prev = state({ team, countries: [reviewed('afua')] });
    const next = state({ team, countries: [{ ...reviewed('afua'), report: { assignedTo: 'afua', status: 'in_review', deadline: null, completedAt: null, notes: null } }] });
    const m: Mutation = { t: 'updateReport', countryId: 'c1', patch: { status: 'in_review' }, nowISO: '2026-06-15T00:00:00Z', act: act() };
    const msgs = computeNotifications(prev, next, m, { ...CTX, actorId: 'afua' });
    expect(msgs.map((x) => x.to)).toEqual(['naga@cgiar.org']);
    expect(msgs[0].subject).toContain('Ready for your review');
  });

  // Note: only figures carry a 'blocked' status (TaskStatus); reports (ReportStatus)
  // cannot be blocked, so the blocked mapping is exercised via a figure.
  it('emails the figure assignee and admin when a figure status becomes blocked', () => {
    const team = [member('afua')];
    const fig0 = FIGURE_TYPES[0];
    const withFig = (status: Country['figures'][number]['status']) =>
      country('c1', {
        name: 'Niger',
        figures: [{ type: fig0, assignedTo: 'afua', status, deadline: null, completedAt: null, notes: null }],
        reviews: [{ reviewerId: 'naga', reviewerName: 'Naga', done: false, completedAt: null, comments: null }],
      });
    const prev = state({ team, countries: [withFig('in_progress')] });
    const next = state({ team, countries: [withFig('blocked')] });
    const m: Mutation = { t: 'updateFigure', countryId: 'c1', figureType: fig0, patch: { status: 'blocked' }, nowISO: '2026-06-15T00:00:00Z', act: act() };
    const msgs = computeNotifications(prev, next, m, CTX); // actor = admin (not the assignee)
    const tos = msgs.map((x) => x.to).sort();
    expect(tos).toEqual(['admin@cgiar.org', 'afua@cgiar.org']);
  });
});
