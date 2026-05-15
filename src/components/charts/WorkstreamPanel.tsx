import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { StackedProgressBar } from '@/components/common/ProgressBar';
import type { WorkstreamType } from '@/lib/types';
import { useNwaStore } from '@/store/useNwaStore';
import {
  selectWorkstreamBreakdown,
  selectWorkstreamCompletion,
} from '@/store/selectors';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/constants';
import { formatPercent } from '@/lib/format';
import type { TaskStatus } from '@/lib/types';
import { useMemo } from 'react';
import { BarChart3, FileText, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/cn';

interface WorkstreamPanelProps {
  ws: WorkstreamType;
}

const META: Record<WorkstreamType, { title: string; href: string; icon: typeof BarChart3; accent: string }> = {
  figures: { title: 'Figures', href: '/figures', icon: BarChart3, accent: 'bg-info/10 text-info' },
  report: { title: 'Reports', href: '/reports', icon: FileText, accent: 'bg-teal/10 text-teal' },
  reviews: { title: 'Reviews', href: '/reviews', icon: CheckCircle2, accent: 'bg-success/10 text-success' },
};

const ORDER: TaskStatus[] = ['done', 'in_review', 'in_progress', 'not_started', 'blocked'];

export function WorkstreamPanel({ ws }: WorkstreamPanelProps) {
  const countries = useNwaStore((s) => s.countries);
  const team = useNwaStore((s) => s.team);
  const activity = useNwaStore((s) => s.activity);
  const lastSyncedAt = useNwaStore((s) => s.lastSyncedAt);
  const breakdown = useMemo(
    () => selectWorkstreamBreakdown({ countries, team, activity, lastSyncedAt }, ws),
    [countries, team, activity, lastSyncedAt, ws],
  );
  const completion = useMemo(
    () => selectWorkstreamCompletion({ countries, team, activity, lastSyncedAt }, ws),
    [countries, team, activity, lastSyncedAt, ws],
  );

  const segments = useMemo(
    () =>
      ORDER.map((status) => ({
        status,
        value: breakdown[status],
      })),
    [breakdown],
  );

  const meta = META[ws];
  const Icon = meta.icon;

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={cn('rounded-xl p-2', meta.accent)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="font-display text-base font-semibold text-slate-900 dark:text-slate-50">
            {meta.title}
          </div>
        </div>
        <Link
          to={meta.href}
          className="flex items-center gap-1 text-xs font-medium text-ocean hover:text-navy dark:text-cyan"
        >
          View
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="mb-3 flex items-baseline justify-between">
        <div className="font-display text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
          {formatPercent(completion, 0)}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {breakdown.done}/{breakdown.total} done
        </div>
      </div>

      <StackedProgressBar segments={segments} total={breakdown.total} />

      <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] sm:grid-cols-3">
        {ORDER.map((s) => {
          if (breakdown[s] === 0) return null;
          return (
            <div key={s} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: STATUS_COLORS[s] }}
              />
              <span className="text-slate-600 dark:text-slate-300">{STATUS_LABELS[s]}</span>
              <span className="ml-auto font-mono tabular-nums text-slate-500">
                {breakdown[s]}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
