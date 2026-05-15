import { COMPLETION_BUCKETS } from '@/lib/types';
import { cn } from '@/lib/cn';

interface MapLegendProps {
  className?: string;
}

export function MapLegend({ className }: MapLegendProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-glass backdrop-blur dark:border-white/10 dark:bg-deep/95',
        className,
      )}
    >
      <div className="mb-2 font-semibold uppercase tracking-wide text-[10px] text-slate-500">
        Programme completion
      </div>
      <div className="flex flex-col gap-1.5">
        {COMPLETION_BUCKETS.map((b) => (
          <div key={b.label} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-sm ring-1 ring-inset ring-black/5"
              style={{ background: b.color }}
            />
            <span className="text-slate-700 dark:text-slate-200">{b.label}</span>
          </div>
        ))}
        <div className="mt-1 flex items-center gap-2 border-t border-slate-200 pt-1.5 dark:border-white/10">
          <span className="h-3 w-3 rounded-sm bg-slate-200 ring-1 ring-inset ring-black/5" />
          <span className="text-slate-500">Out of scope</span>
        </div>
      </div>
    </div>
  );
}
