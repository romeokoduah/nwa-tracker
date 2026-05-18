import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, BarChart3, Filter, Plus, Edit3 } from 'lucide-react';
import { useNwaStore } from '@/store/useNwaStore';
import { useAuthStore } from '@/store/useAuthStore';
import { FIGURE_TYPES, FIGURE_META, type FigureType } from '@/lib/types';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatCard } from '@/components/common/StatCard';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { TaskStatusBadge } from '@/components/common/StatusBadge';
import { SearchInput } from '@/components/common/SearchInput';
import { Button } from '@/components/ui/button';
import { selectAllFiguresKPIs, selectFigureKPIs } from '@/store/selectors';
import { formatDate, formatPercent } from '@/lib/format';
import { isFigureOverdue } from '@/lib/derive';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/cn';
import { STATUS_COLORS } from '@/lib/constants';
import { BulkAssignDialog } from '@/components/admin/BulkAssignDialog';
import { FigureCellEditor } from '@/components/admin/FigureCellEditor';

export function Figures() {
  const navigate = useNavigate();
  const countries = useNwaStore((s) => s.countries);
  const team = useNwaStore((s) => s.team);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const activity = useNwaStore((s) => s.activity);
  const lastSyncedAt = useNwaStore((s) => s.lastSyncedAt);
  const allKpi = useMemo(
    () => selectAllFiguresKPIs({ countries, team, activity, lastSyncedAt }),
    [countries, team, activity, lastSyncedAt],
  );
  const [active, setActive] = useState<FigureType>(FIGURE_TYPES[0]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        eyebrow="Workstream 1"
        title="Figures"
        subtitle={`Eight scientific figures across ${countries.length} countries — ${countries.length * 8} work items.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total" value={allKpi.total} accent="navy" icon={<BarChart3 className="h-4 w-4" />} />
        <StatCard label="Done" value={allKpi.done} accent="success" />
        <StatCard label="In progress" value={allKpi.inProgress} accent="ocean" />
        <StatCard label="In review" value={allKpi.inReview} accent="teal" />
        <StatCard label="Not started / blocked" value={allKpi.notStarted + allKpi.blocked} accent="amber" />
      </div>

      <Tabs value={active} onValueChange={(v) => setActive(v as FigureType)}>
        <TabsList className="flex-wrap">
          {FIGURE_TYPES.map((t) => (
            <TabsTrigger key={t} value={t} className="gap-1">
              <span className="font-mono text-[10px] text-slate-400">{FIGURE_META[t].order}</span>
              {FIGURE_META[t].shortLabel}
            </TabsTrigger>
          ))}
        </TabsList>

        {FIGURE_TYPES.map((t) => (
          <TabsContent key={t} value={t}>
            <FigureTab type={t} isAdmin={isAdmin} team={team} countries={countries} onOpenCountry={(id) => navigate(`/countries/${id}`)} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function FigureTab({
  type,
  isAdmin,
  team,
  countries,
  onOpenCountry,
}: {
  type: FigureType;
  isAdmin: boolean;
  team: ReturnType<typeof useNwaStore.getState>['team'];
  countries: ReturnType<typeof useNwaStore.getState>['countries'];
  onOpenCountry: (id: string) => void;
}) {
  const activity = useNwaStore((s) => s.activity);
  const lastSyncedAt = useNwaStore((s) => s.lastSyncedAt);
  const kpi = useMemo(
    () => selectFigureKPIs({ countries, team, activity, lastSyncedAt }, type),
    [countries, team, activity, lastSyncedAt, type],
  );
  const meta = FIGURE_META[type];
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const memberById = useMemo(() => {
    const m = new Map<string, (typeof team)[number]>();
    for (const t of team) m.set(t.id, t);
    return m;
  }, [team]);

  const rows = useMemo(() => {
    return countries
      .map((c) => ({ country: c, figure: c.figures.find((f) => f.type === type)! }))
      .filter(({ country }) => !dq || country.name.toLowerCase().includes(dq.toLowerCase()));
  }, [countries, type, dq]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-50">
          {type}
        </h2>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="font-medium uppercase tracking-wide">Lead:</span>
          {meta.lead ? (
            <Badge variant="outline" className="gap-1">
              <Avatar name={meta.lead} size="xs" />
              {meta.lead}
            </Badge>
          ) : (
            <Badge variant="warning" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Unassigned — admin action needed
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="% done" value={formatPercent(kpi.donePct, 0)} accent="success" />
        <StatCard label="Assigned" value={`${kpi.assigned} / ${kpi.total}`} accent="ocean" />
        <StatCard label="Unassigned" value={kpi.unassigned} accent="amber" />
        <StatCard label="Overdue" value={kpi.overdue} accent="rose" />
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-11 md:grid-cols-12 xl:grid-cols-[repeat(22,1fr)]">
            {countries.map((c) => {
              const f = c.figures.find((x) => x.type === type)!;
              const color = STATUS_COLORS[f.status];
              return (
                <button
                  key={c.id}
                  onClick={() => onOpenCountry(c.id)}
                  className="group relative aspect-square rounded-md ring-1 ring-inset ring-black/5 transition-transform hover:scale-110"
                  style={{ background: color, opacity: f.status === 'not_started' ? 0.4 : 1 }}
                  title={`${c.name} — ${f.status}`}
                >
                  <span className="absolute inset-x-0 bottom-0.5 text-center font-mono text-[8px] text-white/90">
                    {c.iso3}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          placeholder="Search country…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          containerClassName="w-full sm:max-w-sm sm:flex-1"
        />
        {isAdmin && (
          <Button variant="primary" size="sm" onClick={() => setBulkOpen(true)} className="ml-auto gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Bulk reassign
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Producer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>Notes</TableHead>
              {isAdmin && <TableHead></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ country, figure }) => {
              const member = figure.assignedTo ? memberById.get(figure.assignedTo) : null;
              const overdue = isFigureOverdue(figure);
              return (
                <TableRow
                  key={country.id}
                  className={cn(
                    'cursor-pointer',
                    isAdmin && 'hover:!bg-ocean/[0.04]',
                  )}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('[data-stop]')) return;
                    onOpenCountry(country.id);
                  }}
                >
                  <TableCell className="font-mono text-xs text-slate-400">{country.no}</TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-900 dark:text-slate-50">
                      {country.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">{country.iso3}</div>
                  </TableCell>
                  <TableCell>
                    {member ? (
                      <Link
                        to={`/team/${member.id}`}
                        data-stop
                        className="inline-flex items-center gap-1.5 text-sm hover:text-ocean"
                      >
                        <Avatar name={member.name} color={member.avatarColor} size="xs" />
                        {member.name}
                      </Link>
                    ) : (
                      <Badge variant="muted">Unassigned</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <TaskStatusBadge status={figure.status} overdue={overdue} />
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {formatDate(figure.deadline)}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {formatDate(figure.completedAt)}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-slate-500">
                    {figure.notes ?? '—'}
                  </TableCell>
                  {isAdmin && (
                    <TableCell data-stop>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setEditing(country.id)}
                        className="gap-1"
                      >
                        <Edit3 className="h-3 w-3" />
                        Edit
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <BulkAssignDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        selectedCountryIds={countries.map((c) => c.id)}
        initialFigureType={type}
      />
      {editing && (
        <FigureCellEditor
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          countryId={editing}
          figureType={type}
        />
      )}
    </div>
  );
}
