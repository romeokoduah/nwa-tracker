import { useMemo } from 'react';
import { useNwaStore } from '@/store/useNwaStore';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReviewerHeatmap } from '@/components/charts/ReviewerHeatmap';
import { selectReviewerStats } from '@/store/selectors';
import { Avatar } from '@/components/ui/avatar';
import { ProgressBar } from '@/components/common/ProgressBar';
import { formatPercent } from '@/lib/format';

export function Reviews() {
  const countries = useNwaStore((s) => s.countries);
  const team = useNwaStore((s) => s.team);
  const activity = useNwaStore((s) => s.activity);
  const lastSyncedAt = useNwaStore((s) => s.lastSyncedAt);
  const stats = useMemo(
    () => selectReviewerStats({ countries, team, activity, lastSyncedAt }),
    [countries, team, activity, lastSyncedAt],
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        eyebrow="Workstream 3"
        title="Reviewer sign-offs"
        subtitle="Independent review status for each country."
      />

      <Card>
        <CardHeader>
          <CardTitle>Reviewer × country matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <ReviewerHeatmap />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Per-reviewer progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((r) => (
              <div key={r.reviewerId} className="rounded-xl border border-slate-200 p-4 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <Avatar name={r.reviewerName} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-base font-semibold text-slate-900 dark:text-slate-50">
                      {r.reviewerName}
                    </div>
                    <div className="text-xs text-slate-500">
                      {r.doneCount} / {r.totalCount} signed off
                    </div>
                  </div>
                  <div className="font-display text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
                    {formatPercent(r.pct, 0)}
                  </div>
                </div>
                <div className="mt-3">
                  <ProgressBar value={r.pct} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
