export type ID = string;

export type WorkstreamType = 'figures' | 'report' | 'reviews';

export type FigureType =
  | 'Map of country'
  | 'Changes in cultivated area'
  | 'Map showing the spatial distribution of irrigated and rainfed areas'
  | 'River network of country'
  | 'Sankey diagram'
  | 'Long-term average water accounts for country'
  | 'Long-term average water use and rainfall over different landscapes for the period'
  | 'Per capita water availability and environmental water stress for the period';

export const FIGURE_TYPES: FigureType[] = [
  'Map of country',
  'Changes in cultivated area',
  'Map showing the spatial distribution of irrigated and rainfed areas',
  'River network of country',
  'Sankey diagram',
  'Long-term average water accounts for country',
  'Long-term average water use and rainfall over different landscapes for the period',
  'Per capita water availability and environmental water stress for the period',
];

export interface FigureMeta {
  shortLabel: string;
  lead: string | null;
  order: number;
}

export const FIGURE_META: Record<FigureType, FigureMeta> = {
  'Map of country': { shortLabel: 'Country Map', lead: 'Geethya', order: 1 },
  'Changes in cultivated area': { shortLabel: 'Cultivated Area', lead: 'Isuru', order: 2 },
  'Map showing the spatial distribution of irrigated and rainfed areas': {
    shortLabel: 'Irrigation Map',
    lead: 'Isuru',
    order: 3,
  },
  'River network of country': { shortLabel: 'River Network', lead: 'Tharindu', order: 4 },
  'Sankey diagram': { shortLabel: 'Sankey', lead: 'Mohammed', order: 5 },
  'Long-term average water accounts for country': {
    shortLabel: 'Water Accounts',
    lead: 'Naduni',
    order: 6,
  },
  'Long-term average water use and rainfall over different landscapes for the period': {
    shortLabel: 'Water Use & Rainfall',
    lead: 'Isuru',
    order: 7,
  },
  'Per capita water availability and environmental water stress for the period': {
    shortLabel: 'Per Capita & Stress',
    lead: 'Isuru',
    order: 8,
  },
};

export type TaskStatus = 'not_started' | 'in_progress' | 'in_review' | 'done' | 'blocked';

export type ReportStatus = 'not_started' | 'in_progress' | 'in_review' | 'met' | 'not_met';

export type Region = 'West' | 'East' | 'Central' | 'Southern';

export interface FigureProgress {
  type: FigureType;
  assignedTo: ID | null;
  status: TaskStatus;
  deadline: string | null;
  completedAt: string | null;
  notes: string | null;
}

export interface ReviewProgress {
  reviewerId: ID;
  reviewerName: string;
  done: boolean;
  completedAt: string | null;
  comments: string | null;
}

export interface ReportProgress {
  assignedTo: ID | null;
  status: ReportStatus;
  deadline: string | null;
  completedAt: string | null;
  notes: string | null;
}

export interface Country {
  id: ID;
  no: number;
  name: string;
  iso3: string;
  region: Region;
  figures: FigureProgress[];
  report: ReportProgress;
  reviews: ReviewProgress[];
  flags: string[];
  comments: string | null;
  /** directed comment thread (reviewers ↔ writers ↔ figure producers) */
  messages: Comment[];
}

export type Role = 'admin' | 'figure_producer' | 'figure_lead' | 'reviewer' | 'report_writer';

export interface TeamMember {
  id: ID;
  name: string;
  email: string | null;
  roles: Role[];
  avatarColor: string;
  active: boolean;
}

export type CommentScope = 'figure' | 'report' | 'general';

export interface Comment {
  id: ID;
  countryId: ID;
  scope: CommentScope;
  /** set when scope === 'figure' */
  figureType: FigureType | null;
  authorId: ID;
  authorName: string;
  /** human label for the author's role at time of writing, e.g. "Reviewer" */
  authorRole: string;
  /** member ids this comment is directed to (assignees of the section) */
  recipientIds: ID[];
  recipientNames: string[];
  body: string;
  createdAt: string;
  /** true when written by a reviewer — drives the "feedback received" status */
  fromReviewer: boolean;
  resolved: boolean;
  resolvedAt: string | null;
}

export interface ActivityEntry {
  id: ID;
  timestamp: string;
  actor: string;
  action: string;
  entityType: 'country' | 'figure' | 'report' | 'review' | 'team' | 'comment';
  entityId: ID;
}

export interface AppState {
  countries: Country[];
  team: TeamMember[];
  activity: ActivityEntry[];
  lastSyncedAt: string | null;
}

export const REVIEWERS: string[] = [
  'Kirubel',
  'Mansoor',
  'Komalvi',
  'Afua',
  'Smaranika',
  'Naga',
];

export const COMPLETION_BUCKETS = [
  { min: 0, max: 0.25, label: '0–25%', color: '#CBD5E1' },
  { min: 0.26, max: 0.5, label: '26–50%', color: '#F59E0B' },
  { min: 0.51, max: 0.75, label: '51–75%', color: '#3B82F6' },
  { min: 0.76, max: 0.99, label: '76–99%', color: '#2EB5A3' },
  { min: 1, max: 1, label: '100%', color: '#10B981' },
] as const;
