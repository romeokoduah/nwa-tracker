import * as React from 'react';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  delta?: { value: number; positive?: boolean };
  icon?: React.ReactNode;
  accent?: 'ocean' | 'teal' | 'amber' | 'rose' | 'success' | 'navy';
  className?: string;
}

const ACCENT: Record<NonNullable<StatCardProps['accent']>, string> = {
  ocean: 'from-ocean/15 to-transparent text-ocean',
  teal: 'from-teal/15 to-transparent text-teal',
  amber: 'from-warning/15 to-transparent text-warning',
  rose: 'from-danger/15 to-transparent text-danger',
  success: 'from-success/15 to-transparent text-success',
  navy: 'from-navy/15 to-transparent text-navy dark:text-cyan',
};

export function StatCard({
  label,
  value,
  hint,
  delta,
  icon,
  accent = 'ocean',
  className,
}: StatCardProps) {
  return (
    <Card className={cn('relative overflow-hidden p-5', className)}>
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-70 blur-2xl',
          ACCENT[accent],
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            {label}
          </div>
          <div className="mt-1 font-display text-3xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
            {value}
          </div>
          {(hint || delta) && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              {delta && (
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 font-medium',
                    delta.positive ? 'text-success' : 'text-danger',
                  )}
                >
                  {delta.positive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {delta.value}
                </span>
              )}
              {hint}
            </div>
          )}
        </div>
        {icon && (
          <div className={cn('rounded-xl p-2', ACCENT[accent].replace('from-', 'bg-').split(' ')[0].replace('/15', '/10'))}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
