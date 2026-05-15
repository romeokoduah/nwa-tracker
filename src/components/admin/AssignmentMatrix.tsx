import { useMemo, useState } from 'react';
import { useNwaStore } from '@/store/useNwaStore';
import { FIGURE_TYPES, FIGURE_META, type FigureType } from '@/lib/types';
import { Avatar } from '@/components/ui/avatar';
import { STATUS_COLORS } from '@/lib/constants';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Plus, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useToast } from '@/components/ui/toast';
import { FigureCellEditor } from './FigureCellEditor';
import { BulkAssignDialog } from './BulkAssignDialog';

export function AssignmentMatrix() {
  const countries = useNwaStore((s) => s.countries);
  const team = useNwaStore((s) => s.team);
  const updateFigure = useNwaStore((s) => s.updateFigure);
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ countryId: string; figureType: FigureType } | null>(
    null,
  );
  const [bulkOpen, setBulkOpen] = useState(false);

  const allSelected = countries.length > 0 && selected.size === countries.length;

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(countries.map((c) => c.id)));
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const memberById = useMemo(() => {
    const m = new Map<string, (typeof team)[number]>();
    for (const t of team) m.set(t.id, t);
    return m;
  }, [team]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-elev dark:border-white/5 dark:bg-deep">
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {selected.size} selected
        </span>
        <Button
          size="sm"
          variant="primary"
          disabled={selected.size === 0}
          onClick={() => setBulkOpen(true)}
          className="ml-auto gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Bulk assign
        </Button>
      </div>

      <TooltipProvider>
        <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-elev dark:border-white/5 dark:bg-deep">
          <table className="w-full border-separate" style={{ borderSpacing: 0 }}>
            <thead>
              <tr className="text-left">
                <th
                  className="sticky left-0 z-20 w-10 border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/5 dark:bg-deep"
                >
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                </th>
                <th
                  className="sticky left-10 z-20 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:border-white/5 dark:bg-deep"
                  style={{ minWidth: 200 }}
                >
                  Country
                </th>
                {FIGURE_TYPES.map((t) => {
                  const meta = FIGURE_META[t];
                  return (
                    <th
                      key={t}
                      className="border-b border-slate-200 bg-slate-50 px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:border-white/5 dark:bg-deep"
                      style={{ minWidth: 130 }}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="flex flex-col items-start gap-0.5 text-left">
                            <span className="flex items-center gap-1">
                              <span className="font-mono">{meta.order}</span>
                              <span>{meta.shortLabel}</span>
                            </span>
                            <span className="text-[9px] font-medium normal-case tracking-normal text-slate-400">
                              {meta.lead ? `Lead: ${meta.lead}` : 'No lead'}
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{t}</TooltipContent>
                      </Tooltip>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {countries.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02]">
                  <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-3 py-2 dark:border-white/5 dark:bg-deep">
                    <Checkbox
                      checked={selected.has(c.id)}
                      onCheckedChange={() => toggleRow(c.id)}
                    />
                  </td>
                  <td className="sticky left-10 z-10 border-b border-slate-100 bg-white px-3 py-2 dark:border-white/5 dark:bg-deep">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-[11px] tabular-nums text-slate-400">
                        {c.no}
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-50">
                        {c.name}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">{c.iso3}</div>
                  </td>
                  {FIGURE_TYPES.map((t) => {
                    const f = c.figures.find((x) => x.type === t)!;
                    const member = f.assignedTo ? memberById.get(f.assignedTo) : null;
                    return (
                      <td
                        key={t}
                        className="border-b border-slate-100 px-2 py-2 dark:border-white/5"
                      >
                        <button
                          onClick={() => setEditing({ countryId: c.id, figureType: t })}
                          className="group relative flex w-full items-center gap-1.5 rounded-lg border border-transparent px-1.5 py-1 text-left transition-colors hover:border-slate-200 hover:bg-slate-50 dark:hover:border-white/10 dark:hover:bg-white/5"
                        >
                          <span
                            aria-hidden
                            className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full"
                            style={{ background: STATUS_COLORS[f.status] }}
                          />
                          {member ? (
                            <>
                              <Avatar
                                name={member.name}
                                color={member.avatarColor}
                                size="xs"
                              />
                              <span className="truncate text-[11px] text-slate-700 dark:text-slate-200">
                                {member.name}
                              </span>
                            </>
                          ) : (
                            <span className="flex w-full items-center gap-1 rounded-md border border-dashed border-slate-300 px-1.5 py-0.5 text-[11px] text-slate-400 dark:border-white/10">
                              <Plus className="h-3 w-3" />
                              Unassigned
                            </span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TooltipProvider>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLORS.done }} />
          Done
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: STATUS_COLORS.in_progress }}
          />
          In progress
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: STATUS_COLORS.in_review }}
          />
          In review
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: STATUS_COLORS.not_started }}
          />
          Not started
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: STATUS_COLORS.blocked }}
          />
          Blocked
        </span>
        <span className="ml-auto inline-flex items-center gap-1 text-warning">
          <AlertCircle className="h-3 w-3" />
          Figures 2, 3, 8 have no master lead yet
        </span>
      </div>

      {editing && (
        <FigureCellEditor
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          countryId={editing.countryId}
          figureType={editing.figureType}
        />
      )}
      <BulkAssignDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        selectedCountryIds={Array.from(selected)}
        onAssigned={(figureType, memberName) => {
          toast({
            title: 'Bulk assignment applied',
            description: `${selected.size} countries → ${figureType}: ${memberName ?? 'Unassigned'}`,
          });
          setSelected(new Set());
        }}
      />
    </div>
  );
}
