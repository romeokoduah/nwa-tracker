import * as React from 'react';
import { cn } from '@/lib/cn';

export function FilterBar({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-elev dark:border-white/5 dark:bg-deep',
        className,
      )}
    >
      {children}
    </div>
  );
}
