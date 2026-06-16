import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { useNwaStore } from '@/store/useNwaStore';
import { useAuthStore } from '@/store/useAuthStore';
import { selectWorkloadForMember } from '@/store/selectors';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FIGURE_META, type Role } from '@/lib/types';
import { TaskStatusBadge } from '@/components/common/StatusBadge';
import { formatDate } from '@/lib/format';
import { ProgressBar } from '@/components/common/ProgressBar';
import { ActivityFeed } from '@/components/common/ActivityFeed';
import { EmptyState } from '@/components/common/EmptyState';

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  figure_producer: 'Producer',
  figure_lead: 'Figure lead',
  reviewer: 'Reviewer',
  report_writer: 'Report writer',
};

export function TeamMemberDetail() {
  const { id } = useParams<{ id: string }>();
  const member = useNwaStore((s) => s.team.find((m) => m.id === id));
  const countries = useNwaStore((s) => s.countries);
  const team = useNwaStore((s) => s.team);
  const activity = useNwaStore((s) => s.activity);
  const lastSyncedAt = useNwaStore((s) => s.lastSyncedAt);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const workload = useMemo(
    () =>
      selectWorkloadForMember(
        { countries, team, activity, lastSyncedAt },
        id ?? '',
      ),
    [countries, team, activity, lastSyncedAt, id],
  );

  const totals = useMemo(() => {
    const totalAssignments =
      workload.figureAssignments.length + workload.reportAssignments.length;
    const totalDone =
      workload.figureAssignments.filter((a) => a.status === 'done').length +
      workload.reportAssignments.filter((a) => a.status === 'met').length;
    const pct = totalAssignments > 0 ? totalDone / totalAssignments : 0;
    return { totalAssignments, totalDone, pct };
  }, [workload]);

  if (!member) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 py-20 text-center">
        <div className="font-display text-xl font-semibold">Team member not found</div>
        <Button asChild variant="outline">
          <Link to="/team">Back to team</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <Link
          to="/team"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
        >
          <ArrowLeft className="h-3 w-3" />
          All team
        </Link>
      </div>

      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-ocean/10 via-transparent to-teal/10 dark:from-ocean/20" />
        <div className="relative flex flex-col items-start gap-6 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={member.name} color={member.avatarColor} size="lg" />
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
                {member.name}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {member.roles.map((r) => (
                  <Badge key={r} variant="outline">
                    {ROLE_LABEL[r]}
                  </Badge>
                ))}
                {member.email && (
                  <Badge variant="muted" className="gap-1">
                    <Mail className="h-3 w-3" />
                    {member.email}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="grid w-full grid-cols-3 gap-4 text-center sm:w-auto sm:gap-6">
            <Stat label="Assigned" value={totals.totalAssignments} />
            <Stat label="Done" value={totals.totalDone} />
            <Stat label="%" value={`${Math.round(totals.pct * 100)}%`} />
          </div>
        </div>
      </Card>

      <PageHeader title="Assigned work" subtitle="Figures and reports assigned to this member." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>Figures</span>
              <span className="font-mono text-xs tabular-nums text-slate-500">
                {workload.figureAssignments.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {workload.figureAssignments.length === 0 ? (
              <EmptyState
                title="No figures assigned"
                description="Figures assigned to this member will appear here."
                className="border-none p-2"
              />
            ) : (
              <div className="flex flex-col divide-y divide-slate-100 dark:divide-white/5">
                {workload.figureAssignments.map((a) => (
                  <Link
                    key={`${a.country.id}-${a.figureType}`}
                    to={`/countries/${a.country.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 dark:text-slate-50">
                        {a.country.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {FIGURE_META[a.figureType].order}. {FIGURE_META[a.figureType].shortLabel}
                      </div>
                    </div>
                    <TaskStatusBadge status={a.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>Reports</span>
              <span className="font-mono text-xs tabular-nums text-slate-500">
                {workload.reportAssignments.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {workload.reportAssignments.length === 0 ? (
              <EmptyState
                title="No reports assigned"
                description="Reports assigned to this member will appear here."
                className="border-none p-2"
              />
            ) : (
              <div className="flex flex-col divide-y divide-slate-100 dark:divide-white/5">
                {workload.reportAssignments.map((a) => (
                  <Link
                    key={a.country.id}
                    to={`/countries/${a.country.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 dark:text-slate-50">
                        {a.country.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        Report · due {formatDate(a.country.report.deadline)}
                      </div>
                    </div>
                    <Badge variant={a.status === 'met' ? 'success' : 'info'}>{a.status}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {workload.reviewAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Reviewer sign-offs · {workload.reviewAssignments.filter((r) => r.done).length}/{workload.reviewAssignments.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressBar
              value={
                workload.reviewAssignments.filter((r) => r.done).length /
                workload.reviewAssignments.length
              }
              showLabel
            />
            <div className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4">
              {workload.reviewAssignments.map((a) => (
                <Link
                  key={a.country.id}
                  to={`/countries/${a.country.id}`}
                  className="flex items-center justify-between rounded-md border border-slate-100 px-2.5 py-1.5 text-xs transition-colors hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5"
                >
                  <span className="truncate text-slate-700 dark:text-slate-200">
                    {a.country.name}
                  </span>
                  <Badge variant={a.done ? 'success' : 'muted'}>{a.done ? '✓' : '·'}</Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isAdmin && <ActivityFeed limit={6} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="font-display text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
        {value}
      </div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>
    </div>
  );
}
