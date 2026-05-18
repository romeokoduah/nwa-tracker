import seedJson from '../../seed_data.json';
import {
  type AppState,
  type Country,
  type FigureProgress,
  type ReportProgress,
  type ReviewProgress,
  type TeamMember,
  type Role,
  type ReportStatus,
  FIGURE_TYPES,
  REVIEWERS,
  FIGURE_META,
} from './types';
import { COUNTRY_ISO3, slugifyCountry, slugifyPerson } from './countryCodes';
import { AVATAR_PALETTE, REGION_MAP } from './constants';
import { colorFromName } from './format';

interface SeedCountry {
  no: number;
  name: string;
  reportAssignee: string | null;
  reportDeadline: string | null;
  reviews: Record<string, boolean>;
  comments: string | null;
}

interface SeedFigureProducer {
  name: string;
  workload: string;
  note: string | null;
}

interface SeedShape {
  metadata: { lastSynced: string | null };
  countries: SeedCountry[];
  reviewers: string[];
  figureProducers: SeedFigureProducer[];
}

const raw = seedJson as unknown as SeedShape;

function normaliseAssigneeName(rawName: string): string {
  // strip parenthetical notes, e.g. "Kirubel  (1st reviewer)" -> "Kirubel"
  // pick the first name when separated by '/', e.g. "Eric/Romeo" -> "Eric"
  return rawName.replace(/\(.*?\)/g, '').split('/')[0].trim();
}

interface MemberBuild {
  id: string;
  name: string;
  roles: Set<Role>;
}

function ensureMember(map: Map<string, MemberBuild>, rawName: string, role: Role): string {
  const name = normaliseAssigneeName(rawName);
  if (!name) return '';
  const id = slugifyPerson(name);
  if (!id) return '';
  const existing = map.get(id);
  if (existing) {
    existing.roles.add(role);
    return id;
  }
  map.set(id, { id, name, roles: new Set([role]) });
  return id;
}

export function buildSeed(): AppState {
  const memberMap = new Map<string, MemberBuild>();

  // Figure leads
  for (const fig of FIGURE_TYPES) {
    const lead = FIGURE_META[fig].lead;
    if (lead) ensureMember(memberMap, lead, 'figure_lead');
  }
  // Reviewers
  for (const rv of REVIEWERS) ensureMember(memberMap, rv, 'reviewer');
  // Producers
  for (const p of raw.figureProducers) ensureMember(memberMap, p.name, 'figure_producer');
  // Report writers
  for (const c of raw.countries) {
    if (c.reportAssignee) ensureMember(memberMap, c.reportAssignee, 'report_writer');
  }

  const team: TeamMember[] = Array.from(memberMap.values()).map((m) => ({
    id: m.id,
    name: m.name,
    email: null,
    roles: Array.from(m.roles),
    avatarColor: colorFromName(m.name, AVATAR_PALETTE),
    active: true,
  }));

  const countries: Country[] = raw.countries.map((c) => {
    const id = slugifyCountry(c.name);
    const iso3 = COUNTRY_ISO3[c.name] ?? '';
    const region = REGION_MAP[c.name] ?? 'Southern';
    const flags: string[] = [];
    if (
      c.name === 'Burundi' ||
      c.name === 'DR Congo' ||
      c.name === 'Kenya' ||
      c.name === 'Tanzania' ||
      c.name === 'Uganda' ||
      c.name === 'Rwanda'
    ) {
      // optional flag — not required by spec but useful for lake-sharing demo data
    }

    // Current progress baseline: all country maps are complete and were
    // produced by the figure lead; Per Capita & Stress is complete for
    // Ethiopia only (the rest remain not started).
    const completedAt = raw.metadata.lastSynced ?? '2026-05-18T00:00:00.000Z';
    const figures: FigureProgress[] = FIGURE_TYPES.map((type) => {
      if (type === 'Map of country') {
        const leadName = FIGURE_META[type].lead;
        return {
          type,
          assignedTo: leadName ? slugifyPerson(leadName) : null,
          status: 'done',
          deadline: null,
          completedAt,
          notes: null,
        };
      }
      if (
        type ===
          'Per capita water availability and environmental water stress for the period' &&
        c.name === 'Ethiopia'
      ) {
        return {
          type,
          assignedTo: slugifyPerson('Isuru'),
          status: 'done',
          deadline: null,
          completedAt,
          notes: null,
        };
      }
      return {
        type,
        assignedTo: null,
        status: 'not_started',
        deadline: null,
        completedAt: null,
        notes: null,
      };
    });

    let reportAssigneeId: string | null = null;
    if (c.reportAssignee) {
      const name = normaliseAssigneeName(c.reportAssignee);
      reportAssigneeId = name ? slugifyPerson(name) : null;
    }
    const reportStatus: ReportStatus = reportAssigneeId ? 'in_progress' : 'not_started';
    const report: ReportProgress = {
      assignedTo: reportAssigneeId,
      status: reportStatus,
      deadline: c.reportDeadline,
      completedAt: null,
      notes: null,
    };

    const reviews: ReviewProgress[] = REVIEWERS.map((name) => {
      const reviewerId = slugifyPerson(name);
      const done = Boolean(c.reviews?.[name]);
      return {
        reviewerId,
        reviewerName: name,
        done,
        completedAt: done ? raw.metadata.lastSynced : null,
        comments: null,
      };
    });

    return {
      id,
      no: c.no,
      name: c.name,
      iso3,
      region,
      figures,
      report,
      reviews,
      flags,
      comments: c.comments,
      messages: [],
    };
  });

  return {
    countries,
    team,
    activity: [],
    lastSyncedAt: raw.metadata.lastSynced,
  };
}

export const seedData: AppState = buildSeed();
