import * as React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title = 'Nothing here yet',
  description = 'Try adjusting your filters or come back later.',
  icon: Icon = Search,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center dark:border-white/10',
        className,
      )}
    >
      <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-500 dark:bg-white/5 dark:text-slate-400">
        <Icon className="h-5 w-5" />
      </div>
      <div className="font-display text-sm font-semibold text-slate-700 dark:text-slate-200">
        {title}
      </div>
      <div className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
        {description}
      </div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
