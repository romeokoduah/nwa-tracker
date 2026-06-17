import type { TaskStatus, ReportStatus, ReviewStatus, Region } from './types';

export const ADMIN_USERNAME = 'admin';
// One shared password for every account (admin and all team members), per spec.
export const SHARED_PASSWORD = 'nwa2026';
export const ADMIN_PASSWORD = SHARED_PASSWORD;

export const PROGRAMME_NAME = 'National Water Accounts Atlas';
export const PROGRAMME_SUBTITLE = 'Water accounts for Sub-Saharan Africa';
export const PROGRAMME_OWNER = 'IWMI';

/**
 * Shared SharePoint folder (review + upload). All CGIAR accounts have access.
 * Opens in SharePoint — document libraries cannot be reliably iframe-embedded
 * (Microsoft blocks framing and requires each viewer's CGIAR sign-in).
 */
export const SHAREPOINT_FOLDER_URL =
  'https://cgiar.sharepoint.com/:f:/r/sites/IWMIDIWASAWAinterns/Shared%20Documents/General/National%20Water%20Accounting%20Atlas?csf=1&web=1&e=tqMjls';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
  blocked: 'Blocked',
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  in_review: 'In Review',
  met: 'Met',
  not_met: 'Not Met',
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  not_started: '#64748B',
  in_progress: '#3B82F6',
  in_review: '#2EB5A3',
  done: '#10B981',
  blocked: '#EF4444',
};

export const REPORT_STATUS_COLORS: Record<ReportStatus, string> = {
  not_started: '#64748B',
  in_progress: '#3B82F6',
  in_review: '#2EB5A3',
  met: '#10B981',
  not_met: '#EF4444',
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  reviewed_with_comments: 'Reviewed with comments',
  met: 'Met',
};

/**
 * Reviewer-status colors. Deliberately distinct from every other map palette
 * (completion buckets, regions, task/report status) so a reviewer-status
 * override always reads as a different color from completion. Uses the
 * indigo→purple→pink band, which none of the completion colors occupy.
 */
export const REVIEW_STATUS_COLORS: Record<ReviewStatus, string> = {
  not_started: '#94A3B8',
  in_progress: '#4F46E5', // indigo-600
  reviewed_with_comments: '#A855F7', // purple-500
  met: '#DB2777', // pink-600
};

export const REGION_COLORS: Record<Region, string> = {
  West: '#2EB5A3',
  East: '#3B82F6',
  Central: '#F59E0B',
  Southern: '#1E5A8A',
};

export const REGIONS: Region[] = ['West', 'East', 'Central', 'Southern'];

export const REGION_MAP: Record<string, Region> = {
  // West
  Benin: 'West',
  'Burkina Faso': 'West',
  "Côte d'Ivoire": 'West',
  Gambia: 'West',
  Ghana: 'West',
  Guinea: 'West',
  'Guinea-Bissau': 'West',
  Liberia: 'West',
  Mali: 'West',
  Mauritania: 'West',
  Niger: 'West',
  Nigeria: 'West',
  Senegal: 'West',
  'Sierra Leone': 'West',
  Togo: 'West',
  // East
  Burundi: 'East',
  Djibouti: 'East',
  Eritrea: 'East',
  Ethiopia: 'East',
  Kenya: 'East',
  Rwanda: 'East',
  Somalia: 'East',
  'South Sudan': 'East',
  Tanzania: 'East',
  Uganda: 'East',
  // Central
  Cameroon: 'Central',
  'Central African Republic': 'Central',
  Chad: 'Central',
  Congo: 'Central',
  'DR Congo': 'Central',
  'Equatorial Guinea': 'Central',
  Gabon: 'Central',
  // Southern
  Angola: 'Southern',
  Botswana: 'Southern',
  Eswatini: 'Southern',
  Lesotho: 'Southern',
  Madagascar: 'Southern',
  Malawi: 'Southern',
  Mozambique: 'Southern',
  Namibia: 'Southern',
  'South Africa': 'Southern',
  Zambia: 'Southern',
  Zimbabwe: 'Southern',
};

/** Country tint when a reviewer has left unresolved feedback. */
export const FEEDBACK_COLOR = '#A855F7';

export const NORTH_AFRICA_ISO3 = ['DZA', 'EGY', 'LBY', 'MAR', 'TUN', 'SDN', 'ESH'];

export const AVATAR_PALETTE = [
  '#1E5A8A',
  '#2EB5A3',
  '#5BC9E1',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#10B981',
  '#3B82F6',
  '#D4B98C',
  '#0EA5E9',
  '#F97316',
  '#14B8A6',
  '#A855F7',
];
