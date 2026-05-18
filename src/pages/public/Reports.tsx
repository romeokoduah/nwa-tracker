import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Edit3 } from 'lucide-react';
import { useNwaStore } from '@/store/useNwaStore';
import { useAuthStore } from '@/store/useAuthStore';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { ReportStatusBadge } from '@/components/common/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/common/SearchInput';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDate, formatRelative } from '@/lib/format';
import { isReportOverdue } from '@/lib/derive';
import { REGIONS, REGION_COLORS } from '@/lib/constants';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/components/ui/toast';
import type { ReportStatus } from '@/lib/types';

export function Reports() {
  const countries = useNwaStore((s) => s.countries);
  const team = useNwaStore((s) => s.team);
  const updateReport = useNwaStore((s) => s.updateReport);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [region, setRegion] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const dq = useDebounce(q);

  const kpi = useMemo(() => {
    let met = 0,
      inProgress = 0,
      notMet = 0,
      unassigned = 0,
      notStarted = 0;
    for (const c of countries) {
      if (c.report.status === 'met') met++;
      else if (c.report.status === 'in_progress') inProgress++;
      else if (c.report.status === 'not_met') notMet++;
      else if (c.report.status === 'not_started') notStarted++;
      if (!c.report.assignedTo) unassigned++;
    }
    return { met, inProgress, notMet, unassigned, notStarted };
  }, [countries]);

  const byRegion = useMemo(() => {
    const map = new Map<string, { met: number; inProgress: number; notStarted: number; total: number }>();
    for (const r of REGIONS) map.set(r, { met: 0, inProgress: 0, notStarted: 0, total: 0 });
    for (const c of countries) {
      const m = map.get(c.region)!;
      m.total++;
      if (c.report.status === 'met') m.met++;
      else if (c.report.status === 'in_progress' || c.report.status === 'in_review') m.inProgress++;
      else m.notStarted++;
    }
    return map;
  }, [countries]);

  const filtered = useMemo(() => {
    return countries.filter((c) => {
      if (dq && !c.name.toLowerCase().includes(dq.toLowerCase())) return false;
      if (region !== 'all' && c.region !== region) return false;
      if (status !== 'all' && c.report.status !== status) return false;
      return true;
    });
  }, [countries, dq, region, status]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        eyebrow="Workstream 2"
        title="National Water Accounting reports"
        subtitle={`${countries.length} reports — one per country. Met means the country's NWA report is final.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Met" value={kpi.met} accent="success" icon={<FileText className="h-4 w-4" />} />
        <StatCard label="In progress" value={kpi.inProgress} accent="ocean" />
        <StatCard label="Not started" value={kpi.notStarted} accent="amber" />
        <StatCard label="Not met" value={kpi.notMet} accent="rose" />
        <StatCard label="Unassigned" value={kpi.unassigned} accent="navy" />
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Reports by region
          </div>
          <div className="flex flex-col gap-3">
            {REGIONS.map((r) => {
              const v = byRegion.get(r)!;
              const total = Math.max(1, v.total);
              const metPct = (v.met / total) * 100;
              const ipPct = (v.inProgress / total) * 100;
              const nsPct = (v.notStarted / total) * 100;
              return (
                <div key={r}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: REGION_COLORS[r] }}
                      />
                      <span className="font-medium text-slate-700 dark:text-slate-200">{r}</span>
                    </span>
                    <span className="font-mono tabular-nums text-slate-500">
                      {v.met}/{v.total} met
                    </span>
                  </div>
                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                    <div style={{ width: `${metPct}%`, background: '#10B981' }} />
                    <div style={{ width: `${ipPct}%`, background: '#3B82F6' }} />
                    <div style={{ width: `${nsPct}%`, background: '#94A3B8' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-elev dark:border-white/5 dark:bg-deep">
        <SearchInput
          placeholder="Search country…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          containerClassName="w-full sm:max-w-sm sm:flex-1"
        />
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All regions</SelectItem>
            {REGIONS.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="met">Met</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="in_review">In review</SelectItem>
            <SelectItem value="not_started">Not started</SelectItem>
            <SelectItem value="not_met">Not met</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto font-mono text-xs tabular-nums text-slate-500">
          {filtered.length} / {countries.length}
        </span>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Deadline</TableHead>
              {isAdmin && <TableHead></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => {
              const member = c.report.assignedTo
                ? team.find((t) => t.id === c.report.assignedTo)
                : null;
              const overdue = isReportOverdue(c.report);
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs text-slate-400">{c.no}</TableCell>
                  <TableCell>
                    <Link
                      to={`/countries/${c.id}`}
                      className="font-medium text-slate-900 hover:text-ocean dark:text-slate-50"
                    >
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{c.region}</Badge>
                  </TableCell>
                  <TableCell>
                    {member ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Avatar name={member.name} color={member.avatarColor} size="xs" />
                        {member.name}
                      </span>
                    ) : (
                      <Badge variant="muted">Unassigned</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <ReportStatusBadge status={c.report.status} overdue={overdue} />
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {formatDate(c.report.deadline)}
                    {c.report.deadline && (
                      <div className="text-[10px] text-slate-400">
                        {formatRelative(c.report.deadline)}
                      </div>
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Select
                          value={c.report.assignedTo ?? '__none__'}
                          onValueChange={(v) => {
                            updateReport(c.id, {
                              assignedTo: v === '__none__' ? null : v,
                            });
                            toast({ title: `Updated assignee for ${c.name}` });
                          }}
                        >
                          <SelectTrigger className="h-7 w-32 text-xs">
                            <SelectValue placeholder="Assign…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Unassigned</SelectItem>
                            {team.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => {
                            updateReport(c.id, {
                              status: c.report.status === 'met' ? 'in_progress' : 'met',
                            });
                            toast({
                              title:
                                c.report.status === 'met'
                                  ? `Cleared Met status for ${c.name}`
                                  : `Marked report for ${c.name} as Met`,
                              variant: 'success',
                            });
                          }}
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
