import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  addMonths,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
} from 'date-fns';
import { useNwaStore } from '@/store/useNwaStore';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { FIGURE_META } from '@/lib/types';
import type { FigureType } from '@/lib/types';

interface CalItem {
  id: string;
  countryId: string;
  countryName: string;
  label: string;
  kind: 'figure' | 'report';
  date: Date;
}

export function AdminDeadlines() {
  const countries = useNwaStore((s) => s.countries);
  const [cursor, setCursor] = useState<Date>(startOfMonth(new Date()));

  const items: CalItem[] = useMemo(() => {
    const arr: CalItem[] = [];
    for (const c of countries) {
      for (const f of c.figures) {
        if (f.deadline) {
          arr.push({
            id: `${c.id}-${f.type}`,
            countryId: c.id,
            countryName: c.name,
            label: FIGURE_META[f.type as FigureType].shortLabel,
            kind: 'figure',
            date: parseISO(f.deadline),
          });
        }
      }
      if (c.report.deadline) {
        arr.push({
          id: `${c.id}-report`,
          countryId: c.id,
          countryName: c.name,
          label: 'Report',
          kind: 'report',
          date: parseISO(c.report.deadline),
        });
      }
    }
    return arr;
  }, [countries]);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let d = gridStart;
  while (d <= gridEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Deadlines"
        subtitle="A month-grid view of every deliverable's due date."
      />

      <div className="flex items-center justify-between">
        <div className="font-display text-lg font-semibold">
          {format(cursor, 'MMMM yyyy')}
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={() => setCursor((c) => addMonths(c, -1))}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCursor(startOfMonth(new Date()))}>
            Today
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCursor((c) => addMonths(c, 1))}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-2">
          <div className="grid grid-cols-7 gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="px-2 py-1.5">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const inMonth = isSameMonth(day, cursor);
              const today = isSameDay(day, new Date());
              const dayItems = items.filter((i) => isSameDay(i.date, day));
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'flex min-h-[100px] flex-col gap-1 rounded-lg border border-slate-100 p-1.5 dark:border-white/5',
                    !inMonth && 'opacity-40',
                    today && 'border-ocean ring-1 ring-ocean/30',
                  )}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-slate-500">
                      {format(day, 'd')}
                    </span>
                    {dayItems.length > 0 && (
                      <span className="rounded-full bg-slate-100 px-1.5 font-mono text-[9px] tabular-nums text-slate-500 dark:bg-white/5">
                        {dayItems.length}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {dayItems.slice(0, 3).map((it) => (
                      <Link
                        key={it.id}
                        to={`/countries/${it.countryId}`}
                        className={cn(
                          'truncate rounded px-1.5 py-0.5 text-[10px] font-medium',
                          it.kind === 'figure'
                            ? 'bg-info/10 text-info'
                            : 'bg-teal/15 text-teal',
                        )}
                      >
                        {it.countryName}: {it.label}
                      </Link>
                    ))}
                    {dayItems.length > 3 && (
                      <span className="px-1.5 text-[10px] text-slate-400">
                        +{dayItems.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-info/30" />
          Figure
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-teal/30" />
          Report
        </span>
        <CalendarIcon className="ml-auto h-3.5 w-3.5 text-slate-400" />
        <span>Tip: add deadlines from the assignment matrix.</span>
      </div>
    </div>
  );
}
