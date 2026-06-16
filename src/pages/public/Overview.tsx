import { Globe2, ListChecks, Flame, Clock } from 'lucide-react';
import { useNwaStore } from '@/store/useNwaStore';
import { useAuthStore } from '@/store/useAuthStore';
import {
  selectActiveTaskCount,
  selectApproachingDeadlinesCount,
  selectCompleteCountryCount,
  selectOverallCompletion,
} from '@/store/selectors';
import { StatCard } from '@/components/common/StatCard';
import { ProgressRing } from '@/components/common/ProgressRing';
import { WorkstreamPanel } from '@/components/charts/WorkstreamPanel';
import { AfricaMap } from '@/components/map/AfricaMap';
import { WorkstreamHeatmaps } from '@/components/charts/WorkstreamHeatmaps';
import { WorkloadBar } from '@/components/charts/WorkloadBar';
import { DeadlineHorizonCard } from '@/components/charts/DeadlineTimeline';
import { ActivityFeed } from '@/components/common/ActivityFeed';
import { CommentsHub } from '@/components/common/CommentsHub';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PROGRAMME_NAME, PROGRAMME_SUBTITLE } from '@/lib/constants';
import { formatLastSynced } from '@/lib/format';

export function Overview() {
  const completion = useNwaStore((s) =>
    selectOverallCompletion({
      countries: s.countries,
      team: s.team,
      activity: s.activity,
      lastSyncedAt: s.lastSyncedAt,
    }),
  );
  const completeCount = useNwaStore((s) =>
    selectCompleteCountryCount({
      countries: s.countries,
      team: s.team,
      activity: s.activity,
      lastSyncedAt: s.lastSyncedAt,
    }),
  );
  const activeTasks = useNwaStore((s) =>
    selectActiveTaskCount({
      countries: s.countries,
      team: s.team,
      activity: s.activity,
      lastSyncedAt: s.lastSyncedAt,
    }),
  );
  const approaching = useNwaStore((s) =>
    selectApproachingDeadlinesCount(
      { countries: s.countries, team: s.team, activity: s.activity, lastSyncedAt: s.lastSyncedAt },
      14,
    ),
  );
  const totalCountries = useNwaStore((s) => s.countries.length);
  const lastSyncedAt = useNwaStore((s) => s.lastSyncedAt);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      {/* Hero */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-navy via-ocean to-navy text-white shadow-glass">
        <div className="absolute inset-0 bg-water-grid opacity-25" aria-hidden />
        <div className="relative flex flex-col items-start gap-6 p-7 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-cyan" />
              Programme overview
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
              {PROGRAMME_NAME}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-cyan/90 md:text-base">
              {PROGRAMME_SUBTITLE}. Tracking the figures, reporting and review workstreams
              across {totalCountries} countries.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-cyan/70">
              <Badge variant="outline" className="border-white/20 bg-white/5 text-cyan">
                {totalCountries} countries
              </Badge>
              <span>·</span>
              <span>{formatLastSynced(lastSyncedAt)}</span>
            </div>
          </div>
          <ProgressRing
            value={completion}
            size={150}
            stroke={11}
            label="Programme"
            trackColor="rgba(255,255,255,0.12)"
            fillColor="url(#hero-gradient)"
            className="self-center"
          />
          <svg width={0} height={0} className="absolute">
            <defs>
              <linearGradient id="hero-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#5BC9E1" />
                <stop offset="100%" stopColor="#2EB5A3" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total countries"
          value={totalCountries}
          hint="Sub-Saharan Africa"
          icon={<Globe2 className="h-4 w-4" />}
          accent="navy"
        />
        <StatCard
          label="Fully complete"
          value={`${completeCount} / ${totalCountries}`}
          hint="All figures, report met, all reviews"
          icon={<ListChecks className="h-4 w-4" />}
          accent="success"
        />
        <StatCard
          label="Active tasks"
          value={activeTasks}
          hint="Across figures, report, reviews"
          icon={<Flame className="h-4 w-4" />}
          accent="amber"
        />
        <StatCard
          label="Due in 14 days"
          value={approaching}
          hint="Approaching deadlines"
          icon={<Clock className="h-4 w-4" />}
          accent="rose"
        />
      </div>

      {/* Comments & sign-off */}
      <CommentsHub />

      {/* Workstreams */}
      <div className="grid gap-4 lg:grid-cols-3">
        <WorkstreamPanel ws="figures" />
        <WorkstreamPanel ws="report" />
        <WorkstreamPanel ws="reviews" />
      </div>

      {/* Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-ocean" />
            Africa — programme completion by country
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AfricaMap height={500} />
        </CardContent>
      </Card>

      {/* Workstream heatmaps — one per workstream */}
      <div>
        <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-teal">
          Workstream heatmaps
        </div>
        <WorkstreamHeatmaps />
      </div>

      {/* Workload */}
      <Card>
        <CardHeader>
          <CardTitle>Workload by team member</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkloadBar />
        </CardContent>
      </Card>

      {/* Deadline horizon */}
      <div className="grid gap-4 md:grid-cols-3">
        <DeadlineHorizonCard label="This week" withinDays={7} />
        <DeadlineHorizonCard label="Next 14 days" withinDays={14} />
        <DeadlineHorizonCard label="This month" withinDays={30} />
      </div>

      {/* Activity — admin only */}
      {isAdmin && <ActivityFeed limit={10} />}
    </div>
  );
}
