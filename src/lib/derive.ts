import type {
  Country,
  FigureProgress,
  ReportProgress,
  ReviewProgress,
  TaskStatus,
} from './types';
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
