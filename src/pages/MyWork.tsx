import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, FileText, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useNwaStore } from '@/store/useNwaStore';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/common/StatCard';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/common/EmptyState';
import { TaskStatusBadge, ReportStatusBadge } from '@/components/common/StatusBadge';
import { FIGURE_META, type FigureType, type TaskStatus, type ReportStatus } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { useToast } from '@/components/ui/toast';

export function MyWork() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const countries = useNwaStore((s) => s.countries);
  const team = useNwaStore((s) => s.team);
  const updateFigure = useNwaStore((s) => s.updateFigure);
  const updateReport = useNwaStore((s) => s.updateReport);
  const toggleReview = useNwaStore((s) => s.toggleReview);
  const { toast } = useToast();

  const member = useMemo(
    () => (currentUser ? team.find((m) => m.id === currentUser.id) : undefined),
    [team, currentUser],
  );

  const myFigures = useMemo(() => {
    if (!currentUser) return [];
    const out: { countryId: string; countryName: string; type: FigureType; status: TaskStatus }[] = [];
    for (const c of countries) {
      for (const f of c.figures) {
        if (f.assignedTo === currentUser.id) {
          out.push({ countryId: c.id, countryName: c.name, type: f.type, status: f.status });
        }
      }
    }
    return out;
  }, [countries, currentUser]);

  const myReports = useMemo(() => {
    if (!currentUser) return [];
    return countries
      .filter((c) => c.report.assignedTo === currentUser.id)
      .map((c) => ({
        countryId: c.id,
        countryName: c.name,
        status: c.report.status as ReportStatus,
        deadline: c.report.deadline,
      }));
  }, [countries, currentUser]);

  const myReviews = useMemo(() => {
    if (!currentUser) return [];
    const name = currentUser.name.toLowerCase();
    const out: { countryId: string; countryName: string; reviewerId: string; done: boolean }[] = [];
    for (const c of countries) {
      const r = c.reviews.find((rv) => rv.reviewerName.toLowerCase() === name);
      if (r) {
        out.push({ countryId: c.id, countryName: c.name, reviewerId: r.reviewerId, done: r.done });
      }
    }
    return out;
  }, [countries, currentUser]);

  if (!currentUser) return null;

  const figuresDone = myFigures.filter((f) => f.status === 'done').length;
  const reportsMet = myReports.filter((r) => r.status === 'met').length;
  const reviewsDone = myReviews.filter((r) => r.done).length;
  const hasAnyWork = myFigures.length + myReports.length + myReviews.length > 0;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-ocean/10 via-transparent to-teal/10 dark:from-ocean/20" />
        <div className="relative flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar
              name={currentUser.name}
              color={member?.avatarColor}
              size="lg"
            />
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal">
                My workspace
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
                {currentUser.name}
              </h1>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {currentUser.roles.map((r) => (
                  <Badge key={r} variant="outline">
                    {r.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          {currentUser.isAdmin && (
            <Button asChild variant="primary" size="sm" className="gap-1.5">
              <Link to="/admin">
                <ShieldCheck className="h-3.5 w-3.5" />
                Open admin
              </Link>
            </Button>
          )}
        </div>
      </Card>

      <PageHeader
        title="My assignments"
        subtitle="Tick items off as you complete them — every change updates the main dashboard immediately."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Figures" value={`${figuresDone} / ${myFigures.length}`} accent="ocean" icon={<BarChart3 className="h-4 w-4" />} />
        <StatCard label="Reports" value={`${reportsMet} / ${myReports.length}`} accent="teal" icon={<FileText className="h-4 w-4" />} />
        <StatCard label="Reviews" value={`${reviewsDone} / ${myReviews.length}`} accent="success" icon={<CheckCircle2 className="h-4 w-4" />} />
      </div>

      {currentUser.isAdmin && !hasAnyWork && (
        <Card>
          <CardContent className="p-6 text-sm text-slate-600 dark:text-slate-300">
            You're signed in as <strong>admin</strong>. Admins manage everything from the{' '}
            <Link to="/admin" className="text-ocean hover:underline">
              admin dashboard
            </Link>
            . This page only lists work directly assigned to a person.
          </CardContent>
        </Card>
      )}

      {!currentUser.isAdmin && !hasAnyWork && (
        <EmptyState
          title="No assignments yet"
          description="Nothing has been assigned to you. Check back once an admin delegates work, or browse the public dashboard."
        />
      )}

      {myFigures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-info" />
              My figures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-white/5">
              {myFigures.map((f) => {
                const isDone = f.status === 'done';
                return (
                  <div
                    key={`${f.countryId}-${f.type}`}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <label className="flex flex-1 cursor-pointer items-center gap-3">
                      <Checkbox
                        checked={isDone}
                        onCheckedChange={(c) => {
                          updateFigure(f.countryId, f.type, {
                            status: c ? 'done' : 'in_progress',
                          });
                          toast({
                            title: `${f.countryName} — ${FIGURE_META[f.type].shortLabel} ${c ? 'marked done' : 'reopened'}`,
                            variant: c ? 'success' : 'info',
                          });
                        }}
                      />
                      <div className="min-w-0">
                        <Link
                          to={`/countries/${f.countryId}`}
                          className="font-medium text-slate-900 hover:text-ocean dark:text-slate-50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {f.countryName}
                        </Link>
                        <div className="text-xs text-slate-500">
                          {FIGURE_META[f.type].order}. {FIGURE_META[f.type].shortLabel}
                        </div>
                      </div>
                    </label>
                    <TaskStatusBadge status={f.status} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {myReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-teal" />
              My reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-white/5">
              {myReports.map((r) => {
                const isMet = r.status === 'met';
                return (
                  <div
                    key={r.countryId}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <label className="flex flex-1 cursor-pointer items-center gap-3">
                      <Checkbox
                        checked={isMet}
                        onCheckedChange={(c) => {
                          updateReport(r.countryId, {
                            status: c ? 'met' : 'in_progress',
                          });
                          toast({
                            title: `${r.countryName} report ${c ? 'marked Met' : 'reopened'}`,
                            variant: c ? 'success' : 'info',
                          });
                        }}
                      />
                      <div className="min-w-0">
                        <Link
                          to={`/countries/${r.countryId}`}
                          className="font-medium text-slate-900 hover:text-ocean dark:text-slate-50"
                        >
                          {r.countryName}
                        </Link>
                        <div className="text-xs text-slate-500">
                          NWA Report · due {formatDate(r.deadline)}
                        </div>
                      </div>
                    </label>
                    <ReportStatusBadge status={r.status} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {myReviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-success" />
              My reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {myReviews.map((r) => (
                <label
                  key={r.countryId}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 transition-colors hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5"
                >
                  <Checkbox
                    checked={r.done}
                    onCheckedChange={(c) => {
                      toggleReview(r.countryId, r.reviewerId, !!c);
                      toast({
                        title: `${r.countryName} review ${c ? 'signed off' : 'reopened'}`,
                        variant: c ? 'success' : 'info',
                      });
                    }}
                  />
                  <span className="flex-1 truncate text-sm text-slate-800 dark:text-slate-100">
                    {r.countryName}
                  </span>
                  {r.done && <Badge variant="success">Done</Badge>}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
