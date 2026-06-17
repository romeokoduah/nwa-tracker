import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNwaStore } from '@/store/useNwaStore';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { formatDate } from '@/lib/format';
import { reviewStatusOf } from '@/lib/derive';
import { REVIEW_STATUS_COLORS, REVIEW_STATUS_LABELS } from '@/lib/constants';
import { cn } from '@/lib/cn';

interface ReviewerHeatmapProps {
  className?: string;
}

export function ReviewerHeatmap({ className }: ReviewerHeatmapProps) {
  const countries = useNwaStore((s) => s.countries);
  const navigate = useNavigate();
  const [hover, setHover] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  const reviewers = useMemo(() => {
    if (countries.length === 0) return [];
    return countries[0].reviews.map((r) => ({
      id: r.reviewerId,
      name: r.reviewerName,
    }));
  }, [countries]);

  const sortedCountries = useMemo(
    () => [...countries].sort((a, b) => a.iso3.localeCompare(b.iso3)),
    [countries],
  );

  return (
    <div className={cn('w-full', className)}>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-3 dark:border-white/5 dark:bg-deep">
        <table className="w-full border-separate" style={{ borderSpacing: '2px' }}>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white pr-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:bg-deep">
                Reviewer
              </th>
              {sortedCountries.map((c) => (
                <th
                  key={c.id}
                  className="px-0 align-bottom text-[9px] font-mono tabular-nums text-slate-400"
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 60 }}
                  title={c.name}
                >
                  {c.iso3}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reviewers.map((rv) => (
              <tr key={rv.id}>
                <td className="sticky left-0 z-10 whitespace-nowrap bg-white pr-3 text-xs font-medium text-slate-700 dark:bg-deep dark:text-slate-200">
                  {rv.name}
                </td>
                {sortedCountries.map((c) => {
                  const review = c.reviews.find((r) => r.reviewerId === rv.id);
                  const status = review ? reviewStatusOf(review) : 'not_started';
                  const active = status !== 'not_started';
                  const label = REVIEW_STATUS_LABELS[status];
                  return (
                    <td
                      key={`${rv.id}-${c.id}`}
                      style={
                        active
                          ? { background: REVIEW_STATUS_COLORS[status] }
                          : undefined
                      }
                      className={cn(
                        'h-5 w-5 cursor-pointer rounded-sm transition-transform hover:scale-110',
                        active
                          ? 'ring-1 ring-inset ring-black/10'
                          : 'border border-dashed border-slate-300 bg-slate-50 dark:border-white/10 dark:bg-white/5',
                      )}
                      onMouseEnter={(e) =>
                        setHover({
                          text: `${rv.name} — ${c.name}: ${label}${
                            review?.completedAt ? ` (${formatDate(review.completedAt)})` : ''
                          }`,
                          x: e.clientX,
                          y: e.clientY,
                        })
                      }
                      onMouseMove={(e) =>
                        setHover((h) =>
                          h ? { ...h, x: e.clientX, y: e.clientY } : h,
                        )
                      }
                      onMouseLeave={() => setHover(null)}
                      onClick={() => navigate(`/countries/${c.id}`)}
                    >
                      <span className="sr-only">
                        {rv.name} {c.name} {label}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hover &&
        createPortal(
          <div
            className="pointer-events-none fixed z-50 -translate-x-1/2 rounded-md bg-deep px-2.5 py-1 text-[11px] text-white shadow-glass dark:bg-white dark:text-deep"
            style={{ left: hover.x, top: hover.y + 12 }}
          >
            {hover.text}
          </div>,
          document.body,
        )}
    </div>
  );
}
