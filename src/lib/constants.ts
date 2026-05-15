import type { TaskStatus, ReportStatus, Region } from './types';

export const ADMIN_USERNAME = 'admin';
export const ADMIN_PASSWORD = 'nwa2026';

export const PROGRAMME_NAME = 'NWA Tracker';
export const PROGRAMME_SUBTITLE = 'National Water Accounting across 43 African countries';
export const PROGRAMME_OWNER = 'IWMI';

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
