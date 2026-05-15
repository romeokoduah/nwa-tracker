import { cn } from '@/lib/cn';
import { formatPercent } from '@/lib/format';

interface ProgressRingProps {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  className?: string;
  trackColor?: string;
  fillColor?: string;
  showText?: boolean;
}

export function ProgressRing({
  value,
  size = 120,
  stroke = 10,
  label,
  className,
  trackColor = '#E2E8F0',
  fillColor,
  showText = true,
}: ProgressRingProps) {
  const v = Math.max(0, Math.min(1, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - v);
  const gradientId = `pr-${Math.round(value * 1000)}-${size}`;
  // Scale text to ring size so it never overflows.
  const valueFontPx = Math.max(11, Math.round(size * 0.22));
  const labelFontPx = Math.max(8, Math.round(size * 0.08));
  // Drop decimal precision on small rings, where "99.5%" doesn't fit.
  const valuePrecision = size >= 100 && v < 0.999 ? 1 : 0;
  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2EB5A3" />
            <stop offset="100%" stopColor="#1E5A8A" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
          className="dark:opacity-20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={fillColor ?? `url(#${gradientId})`}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 700ms ease' }}
        />
      </svg>
      {showText && (
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <div
            className="font-display font-bold tabular-nums text-slate-900 dark:text-slate-50"
            style={{ fontSize: valueFontPx }}
          >
            {formatPercent(v, valuePrecision)}
          </div>
          {label && (
            <div
              className="mt-0.5 font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              style={{ fontSize: labelFontPx }}
            >
              {label}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
