import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { useNwaStore } from '@/store/useNwaStore';
import { selectUpcomingDeadlines } from '@/store/selectors';
import { Calendar, FileText, BarChart3 } from 'lucide-react';
import { formatDate, formatRelative } from '@/lib/format';
import { FIGURE_META } from '@/lib/types';
import type { FigureType } from '@/lib/types';
import { EmptyState } from '@/components/common/EmptyState';

interface DeadlineHorizonCardProps {
  label: string;
  withinDays: number;
}

export function DeadlineHorizonCard({ label, withinDays }: DeadlineHorizonCardProps) {
  const countries = useNwaStore((s) => s.countries);
  const team = useNwaStore((s) => s.team);
  const activity = useNwaStore((s) => s.activity);
  const lastSyncedAt = useNwaStore((s) => s.lastSyncedAt);
  const items = useMemo(
    () =>
      selectUpcomingDeadlines(
        { countries, team, activity, lastSyncedAt },
        withinDays,
      ),
    [countries, team, activity, lastSyncedAt, withinDays],
  );

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="mb-3 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-ocean" />
        <div className="font-display text-sm font-semibold text-slate-900 dark:text-slate-50">
          {label}
        </div>
        <span className="ml-auto font-mono text-xs tabular-nums text-slate-500">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <EmptyState
          title="Nothing due"
          description="No deliverables in this window."
          icon={Calendar}
          className="border-none p-4"
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.slice(0, 6).map((it) => (
            <Link
              key={`${it.country.id}-${it.kind}-${it.label}`}
              to={`/countries/${it.country.id}`}
              className="group flex items-start gap-2.5 rounded-lg p-2 transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
            >
              <div className="mt-0.5 rounded-md bg-slate-100 p-1.5 text-slate-500 group-hover:bg-ocean/10 group-hover:text-ocean dark:bg-white/5">
                {it.kind === 'report' ? (
                  <FileText className="h-3.5 w-3.5" />
                ) : (
                  <BarChart3 className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-50">
                  {it.country.name}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {it.kind === 'figure'
                    ? FIGURE_META[it.label as FigureType]?.shortLabel ?? it.label
                    : 'NWA Report'}
                </div>
              </div>
              <div className="text-right text-[11px]">
                <div className="text-slate-700 dark:text-slate-200">
                  {formatDate(it.deadline)}
                </div>
                <div className="text-slate-400">{formatRelative(it.deadline)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
