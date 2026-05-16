import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useNwaStore } from '@/store/useNwaStore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FIGURE_TYPES, FIGURE_META, type Country } from '@/lib/types';
import { STATUS_COLORS, REPORT_STATUS_COLORS, STATUS_LABELS, REPORT_STATUS_LABELS } from '@/lib/constants';
import { cn } from '@/lib/cn';

interface HeatRow {
  id: string;
  label: string;
}

interface Cell {
  color: string;
  filled: boolean;
  title: string;
}

interface HeatmapProps {
  rows: HeatRow[];
  countries: Country[];
  getCell: (rowId: string, c: Country) => Cell;
}

function Heatmap({ rows, countries, getCell }: HeatmapProps) {
  const navigate = useNavigate();
  const [hover, setHover] = useState<{ text: string; x: number; y: number } | null>(null);

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-separate" style={{ borderSpacing: '2px' }}>
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white pr-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:bg-deep">
              &nbsp;
            </th>
            {countries.map((c) => (
              <th
                key={c.id}
                className="px-0 align-bottom text-[9px] font-mono tabular-nums text-slate-400"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 56 }}
                title={c.name}
              >
                {c.iso3}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="sticky left-0 z-10 whitespace-nowrap bg-white pr-3 text-xs font-medium text-slate-700 dark:bg-deep dark:text-slate-200">
                {row.label}
              </td>
              {countries.map((c) => {
                const cell = getCell(row.id, c);
                return (
                  <td
                    key={`${row.id}-${c.id}`}
                    className={cn(
                      'h-5 w-5 cursor-pointer rounded-sm ring-1 ring-inset ring-black/5 transition-transform hover:scale-110',
                      !cell.filled && 'opacity-30',
                    )}
                    style={{ background: cell.color }}
                    onMouseEnter={(e) =>
                      setHover({ text: cell.title, x: e.clientX, y: e.clientY })
                    }
                    onMouseMove={(e) =>
                      setHover((h) => (h ? { ...h, x: e.clientX, y: e.clientY } : h))
                    }
                    onMouseLeave={() => setHover(null)}
                    onClick={() => navigate(`/countries/${c.id}`)}
                  >
                    <span className="sr-only">{cell.title}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
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

export function WorkstreamHeatmaps() {
  const countries = useNwaStore((s) => s.countries);

  const sorted = useMemo(
    () => [...countries].sort((a, b) => a.iso3.localeCompare(b.iso3)),
    [countries],
  );

  const figureRows: HeatRow[] = FIGURE_TYPES.map((t) => ({
    id: t,
    label: `${FIGURE_META[t].order}. ${FIGURE_META[t].shortLabel}`,
  }));

  const reviewRows: HeatRow[] = useMemo(() => {
    if (sorted.length === 0) return [];
    return sorted[0].reviews.map((r) => ({ id: r.reviewerId, label: r.reviewerName }));
  }, [sorted]);

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Figures — 8 figures × {sorted.length} countries</CardTitle>
        </CardHeader>
        <CardContent>
          <Heatmap
            rows={figureRows}
            countries={sorted}
            getCell={(rowId, c) => {
              const f = c.figures.find((x) => x.type === rowId)!;
              return {
                color: STATUS_COLORS[f.status],
                filled: f.status !== 'not_started',
                title: `${c.name} — ${FIGURE_META[rowId as keyof typeof FIGURE_META].shortLabel}: ${STATUS_LABELS[f.status]}`,
              };
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reports — status by country</CardTitle>
        </CardHeader>
        <CardContent>
          <Heatmap
            rows={[{ id: 'report', label: 'NWA Report' }]}
            countries={sorted}
            getCell={(_rowId, c) => ({
              color: REPORT_STATUS_COLORS[c.report.status],
              filled: c.report.status !== 'not_started',
              title: `${c.name} — Report: ${REPORT_STATUS_LABELS[c.report.status]}`,
            })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reviews — {reviewRows.length} reviewers × {sorted.length} countries</CardTitle>
        </CardHeader>
        <CardContent>
          <Heatmap
            rows={reviewRows}
            countries={sorted}
            getCell={(rowId, c) => {
              const r = c.reviews.find((x) => x.reviewerId === rowId);
              const done = !!r?.done;
              return {
                color: done ? '#10B981' : '#CBD5E1',
                filled: done,
                title: `${r?.reviewerName ?? rowId} — ${c.name}: ${done ? 'Done' : 'Pending'}`,
              };
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
