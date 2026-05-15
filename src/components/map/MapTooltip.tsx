import { createPortal } from 'react-dom';
import type { Country } from '@/lib/types';
import {
  figuresCompletion,
  reportCompletion,
  reviewsCompletion,
  overallCompletion,
} from '@/lib/derive';
import { formatPercent } from '@/lib/format';
import { ProgressBar } from '@/components/common/ProgressBar';

interface MapTooltipProps {
  name: string;
  country?: Country;
  x: number;
  y: number;
}

export function MapTooltip({ name, country, x, y }: MapTooltipProps) {
  return createPortal(
    <div
      className="pointer-events-none fixed z-50 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 shadow-glass dark:border-white/10 dark:bg-deep"
      style={{ left: x, top: y + 14, minWidth: 200 }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="font-display text-sm font-semibold text-slate-900 dark:text-slate-50">
          {name}
        </div>
        {country && (
          <div className="font-mono text-xs tabular-nums text-slate-500">
            {formatPercent(overallCompletion(country), 0)}
          </div>
        )}
      </div>
      {country && (
        <div className="mt-2 grid gap-1.5 text-[11px]">
          <Line label="Figures" value={figuresCompletion(country)} />
          <Line label="Report" value={reportCompletion(country)} />
          <Line label="Reviews" value={reviewsCompletion(country)} />
        </div>
      )}
    </div>,
    document.body,
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid grid-cols-[64px_1fr_36px] items-center gap-2">
      <span className="font-medium text-slate-500">{label}</span>
      <ProgressBar value={value} />
      <span className="text-right font-mono text-slate-500 tabular-nums">
        {formatPercent(value, 0)}
      </span>
    </div>
  );
}
