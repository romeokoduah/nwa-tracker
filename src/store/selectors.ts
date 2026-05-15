import type { AppState, Country, FigureType, TaskStatus, WorkstreamType } from '@/lib/types';
import { FIGURE_TYPES } from '@/lib/types';
import {
  overallCompletion,
  figuresCompletion,
  reportCompletion,
  reviewsCompletion,
  isCountryComplete,
  activeTaskCount,
  countWithinDays,
  emptyBreakdown,
  addStatus,
  statusFromReport,
  statusFromReview,
  isFigureOverdue,
  isReportOverdue,
  type WorkstreamBreakdown,
} from '@/lib/derive';

export function selectOverallCompletion(state: AppState): number {
  if (state.countries.length === 0) return 0;
  const sum = state.countries.reduce((acc, c) => acc + overallCompletion(c), 0);
  return sum / state.countries.length;
}

export function selectCompleteCountryCount(state: AppState): number {
  return state.countries.filter(isCountryComplete).length;
}

export function selectActiveTaskCount(state: AppState): number {
  return state.countries.reduce((acc, c) => acc + activeTaskCount(c), 0);
}

export function selectApproachingDeadlinesCount(state: AppState, withinDays = 14): number {
  return state.countries.reduce((acc, c) => acc + countWithinDays(c, withinDays), 0);
}

export function selectWorkstreamCompletion(state: AppState, ws: WorkstreamType): number {
  if (state.countries.length === 0) return 0;
  let sum = 0;
  for (const c of state.countries) {
    if (ws === 'figures') sum += figuresCompletion(c);
    else if (ws === 'report') sum += reportCompletion(c);
    else sum += reviewsCompletion(c);
  }
  return sum / state.countries.length;
}

export function selectWorkstreamBreakdown(
  state: AppState,
  ws: WorkstreamType,
): WorkstreamBreakdown {
  const b = emptyBreakdown();
  for (const c of state.countries) {
    if (ws === 'figures') {
      for (const f of c.figures) addStatus(b, f.status);
    } else if (ws === 'report') {
      addStatus(b, statusFromReport(c.report));
    } else {
      for (const r of c.reviews) addStatus(b, statusFromReview(r));
    }
  }
  return b;
}

export interface FigureKPIs {
  done: number;
  inProgress: number;
  inReview: number;
  notStarted: number;
  blocked: number;
  total: number;
  donePct: number;
  assigned: number;
  unassigned: number;
  overdue: number;
}

export function selectFigureKPIs(state: AppState, fig: FigureType): FigureKPIs {
  let done = 0,
    inProgress = 0,
    inReview = 0,
    notStarted = 0,
    blocked = 0,
    assigned = 0,
    overdue = 0;
  for (const c of state.countries) {
    const f = c.figures.find((x) => x.type === fig);
    if (!f) continue;
    if (f.assignedTo) assigned++;
    if (isFigureOverdue(f)) overdue++;
    const s: TaskStatus = f.status;
    if (s === 'done') done++;
    else if (s === 'in_progress') inProgress++;
    else if (s === 'in_review') inReview++;
    else if (s === 'not_started') notStarted++;
    else if (s === 'blocked') blocked++;
  }
  const total = state.countries.length;
  return {
    done,
    inProgress,
    inReview,
    notStarted,
    blocked,
    total,
    donePct: total ? done / total : 0,
    assigned,
    unassigned: total - assigned,
    overdue,
  };
}

export interface AllFiguresKPIs {
  total: number;
  done: number;
  inProgress: number;
  inReview: number;
  notStarted: number;
  blocked: number;
}

export function selectAllFiguresKPIs(state: AppState): AllFiguresKPIs {
  const k: AllFiguresKPIs = {
    total: 0,
    done: 0,
    inProgress: 0,
    inReview: 0,
    notStarted: 0,
    blocked: 0,
  };
  for (const c of state.countries) {
    for (const f of c.figures) {
      k.total++;
      if (f.status === 'done') k.done++;
      else if (f.status === 'in_progress') k.inProgress++;
      else if (f.status === 'in_review') k.inReview++;
      else if (f.status === 'not_started') k.notStarted++;
      else if (f.status === 'blocked') k.blocked++;
    }
  }
  return k;
}

export interface ReviewerStats {
  reviewerId: string;
  reviewerName: string;
  doneCount: number;
  totalCount: number;
  pct: number;
}

export function selectReviewerStats(state: AppState): ReviewerStats[] {
  const map = new Map<string, ReviewerStats>();
  for (const c of state.countries) {
    for (const r of c.reviews) {
      const cur = map.get(r.reviewerId) ?? {
        reviewerId: r.reviewerId,
        reviewerName: r.reviewerName,
        doneCount: 0,
        totalCount: 0,
        pct: 0,
      };
      cur.totalCount++;
      if (r.done) cur.doneCount++;
      map.set(r.reviewerId, cur);
    }
  }
  for (const v of map.values()) {
    v.pct = v.totalCount ? v.doneCount / v.totalCount : 0;
  }
  return Array.from(map.values());
}

export interface WorkloadEntry {
  memberId: string;
  memberName: string;
  total: number;
  done: number;
  pct: number;
  figureCount: number;
  reportCount: number;
}

export function selectWorkloads(state: AppState): WorkloadEntry[] {
  const map = new Map<string, WorkloadEntry>();
  function bump(memberId: string | null, isDone: boolean, kind: 'figure' | 'report') {
    if (!memberId) return;
    const member = state.team.find((m) => m.id === memberId);
    if (!member) return;
    const cur = map.get(memberId) ?? {
      memberId,
      memberName: member.name,
      total: 0,
      done: 0,
      pct: 0,
      figureCount: 0,
      reportCount: 0,
    };
    cur.total++;
    if (isDone) cur.done++;
    if (kind === 'figure') cur.figureCount++;
    else cur.reportCount++;
    map.set(memberId, cur);
  }
  for (const c of state.countries) {
    for (const f of c.figures) bump(f.assignedTo, f.status === 'done', 'figure');
    bump(c.report.assignedTo, c.report.status === 'met', 'report');
  }
  for (const v of map.values()) v.pct = v.total ? v.done / v.total : 0;
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export function selectWorkloadForMember(state: AppState, memberId: string) {
  const figureAssignments: { country: Country; figureType: FigureType; status: TaskStatus }[] = [];
  const reportAssignments: { country: Country; status: string }[] = [];
  const reviewAssignments: { country: Country; done: boolean }[] = [];
  const member = state.team.find((m) => m.id === memberId);
  for (const c of state.countries) {
    for (const f of c.figures) {
      if (f.assignedTo === memberId) {
        figureAssignments.push({ country: c, figureType: f.type, status: f.status });
      }
    }
    if (c.report.assignedTo === memberId) {
      reportAssignments.push({ country: c, status: c.report.status });
    }
    if (member) {
      for (const r of c.reviews) {
        if (r.reviewerName === member.name) {
          reviewAssignments.push({ country: c, done: r.done });
        }
      }
    }
  }
  return { figureAssignments, reportAssignments, reviewAssignments };
}

export function selectOverdueItems(state: AppState) {
  const items: {
    country: Country;
    kind: 'figure' | 'report';
    label: string;
    deadline: string | null;
  }[] = [];
  for (const c of state.countries) {
    for (const f of c.figures) {
      if (isFigureOverdue(f)) {
        items.push({ country: c, kind: 'figure', label: f.type, deadline: f.deadline });
      }
    }
    if (isReportOverdue(c.report)) {
      items.push({ country: c, kind: 'report', label: 'National Water Accounting Report', deadline: c.report.deadline });
    }
  }
  return items;
}

export function selectUpcomingDeadlines(state: AppState, withinDays: number) {
  const items: {
    country: Country;
    kind: 'figure' | 'report';
    label: string;
    deadline: string;
  }[] = [];
  const now = Date.now();
  for (const c of state.countries) {
    for (const f of c.figures) {
      if (f.status === 'done' || !f.deadline) continue;
      const t = new Date(f.deadline).getTime() - now;
      const d = t / (1000 * 60 * 60 * 24);
      if (d >= 0 && d <= withinDays) {
        items.push({ country: c, kind: 'figure', label: f.type, deadline: f.deadline });
      }
    }
    if (c.report.status !== 'met' && c.report.deadline) {
      const t = new Date(c.report.deadline).getTime() - now;
      const d = t / (1000 * 60 * 60 * 24);
      if (d >= 0 && d <= withinDays) {
        items.push({
          country: c,
          kind: 'report',
          label: 'National Water Accounting Report',
          deadline: c.report.deadline,
        });
      }
    }
  }
  return items.sort((a, b) => a.deadline.localeCompare(b.deadline));
}

export function selectFigureTypes(): FigureType[] {
  return FIGURE_TYPES;
}
