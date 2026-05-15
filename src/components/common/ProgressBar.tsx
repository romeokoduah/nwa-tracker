import { cn } from '@/lib/cn';
import { STATUS_COLORS } from '@/lib/constants';
import type { TaskStatus } from '@/lib/types';

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  color?: string;
  showLabel?: boolean;
}

export function ProgressBar({
  value,
  max = 1,
  className,
  color,
  showLabel = false,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${(pct * 100).toFixed(2)}%`,
            background: color ?? 'linear-gradient(90deg, #2EB5A3, #5BC9E1)',
          }}
        />
      </div>
      {showLabel && (
        <span className="min-w-[3.5ch] text-right font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
          {Math.round(pct * 100)}%
        </span>
      )}
    </div>
  );
}

interface StackedProgressProps {
  segments: { status: TaskStatus; value: number }[];
  total: number;
  className?: string;
}

export function StackedProgressBar({ segments, total, className }: StackedProgressProps) {
  return (
    <div
      className={cn(
        'flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10',
        className,
      )}
    >
      {segments.map((s) => {
        if (s.value === 0) return null;
        const pct = total > 0 ? (s.value / total) * 100 : 0;
        return (
          <div
            key={s.status}
            className="h-full transition-all"
            style={{ width: `${pct}%`, background: STATUS_COLORS[s.status] }}
            title={`${s.status}: ${s.value}`}
          />
        );
      })}
    </div>
  );
}
