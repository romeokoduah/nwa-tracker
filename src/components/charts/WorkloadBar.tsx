import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useNwaStore } from '@/store/useNwaStore';
import { selectWorkloads } from '@/store/selectors';
import { Avatar } from '@/components/ui/avatar';
import { formatPercent } from '@/lib/format';

interface WorkloadBarProps {
  limit?: number;
}

export function WorkloadBar({ limit = 10 }: WorkloadBarProps) {
  const countries = useNwaStore((s) => s.countries);
  const team = useNwaStore((s) => s.team);
  const activity = useNwaStore((s) => s.activity);
  const lastSyncedAt = useNwaStore((s) => s.lastSyncedAt);
  const workloads = useMemo(
    () => selectWorkloads({ countries, team, activity, lastSyncedAt }),
    [countries, team, activity, lastSyncedAt],
  );
  const top = workloads.slice(0, limit);
  const max = Math.max(1, ...top.map((w) => w.total));

  if (top.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-white/10">
        No assignments yet. Use the assignment matrix to delegate work.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {top.map((w) => {
        const member = team.find((m) => m.id === w.memberId);
        const width = (w.total / max) * 100;
        const doneWidth = (w.done / max) * 100;
        return (
          <Link
            key={w.memberId}
            to={`/team/${w.memberId}`}
            className="group flex items-center gap-3 rounded-lg px-1 py-1 transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
          >
            <Avatar
              name={w.memberName}
              color={member?.avatarColor}
              size="sm"
              className="shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium text-slate-700 group-hover:text-slate-900 dark:text-slate-200 dark:group-hover:text-slate-50">
                  {w.memberName}
                </span>
                <span className="font-mono text-xs tabular-nums text-slate-500">
                  {w.done}/{w.total} · {formatPercent(w.pct, 0)}
                </span>
              </div>
              <div className="relative mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                <div
                  className="absolute inset-y-0 left-0 bg-slate-300 dark:bg-white/15"
                  style={{ width: `${width}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-teal to-cyan"
                  style={{ width: `${doneWidth}%` }}
                />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
