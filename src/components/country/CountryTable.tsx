import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { Country } from '@/lib/types';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { ProgressBar } from '@/components/common/ProgressBar';
import { ReportStatusBadge } from '@/components/common/StatusBadge';
import { Badge } from '@/components/ui/badge';
import {
  figuresCompletion,
  reportCompletion,
  reviewsCompletion,
  overallCompletion,
  isCountryComplete,
  isReportOverdue,
} from '@/lib/derive';
import { formatDate, formatPercent } from '@/lib/format';

type SortKey = 'no' | 'name' | 'region' | 'figures' | 'report' | 'reviews' | 'overall' | 'deadline';

interface CountryTableProps {
  countries: Country[];
}

export function CountryTable({ countries }: CountryTableProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'no',
    dir: 'asc',
  });

  const sorted = useMemo(() => {
    const arr = [...countries];
    const dir = sort.dir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      switch (sort.key) {
        case 'no':
          return (a.no - b.no) * dir;
        case 'name':
          return a.name.localeCompare(b.name) * dir;
        case 'region':
          return a.region.localeCompare(b.region) * dir;
        case 'figures':
          return (figuresCompletion(a) - figuresCompletion(b)) * dir;
        case 'report':
          return (reportCompletion(a) - reportCompletion(b)) * dir;
        case 'reviews':
          return (reviewsCompletion(a) - reviewsCompletion(b)) * dir;
        case 'overall':
          return (overallCompletion(a) - overallCompletion(b)) * dir;
        case 'deadline':
          return ((a.report.deadline ?? '~') > (b.report.deadline ?? '~') ? 1 : -1) * dir;
      }
    });
    return arr;
  }, [countries, sort]);

  function toggle(key: SortKey) {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' },
    );
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sort.key !== k) return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    return sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-elev dark:border-white/5 dark:bg-deep">
      <Table>
        <TableHeader>
          <TableRow>
            <Header sortKey="no" label="#" onSort={toggle} icon={<SortIcon k="no" />} />
            <Header sortKey="name" label="Country" onSort={toggle} icon={<SortIcon k="name" />} />
            <Header sortKey="region" label="Region" onSort={toggle} icon={<SortIcon k="region" />} />
            <Header sortKey="figures" label="Figures" onSort={toggle} icon={<SortIcon k="figures" />} />
            <Header sortKey="report" label="Report" onSort={toggle} icon={<SortIcon k="report" />} />
            <Header sortKey="reviews" label="Reviews" onSort={toggle} icon={<SortIcon k="reviews" />} />
            <Header sortKey="overall" label="Overall" onSort={toggle} icon={<SortIcon k="overall" />} />
            <Header sortKey="deadline" label="Report due" onSort={toggle} icon={<SortIcon k="deadline" />} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((c) => {
            const fig = figuresCompletion(c);
            const rep = c.report;
            const rev = reviewsCompletion(c);
            const overall = overallCompletion(c);
            const complete = isCountryComplete(c);
            const overdue = isReportOverdue(rep);
            return (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs tabular-nums text-slate-400">
                  {c.no}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/countries/${c.id}`}
                      className="font-medium text-slate-900 hover:text-ocean dark:text-slate-50"
                    >
                      {c.name}
                    </Link>
                    {complete && <Badge variant="success">Complete</Badge>}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">{c.iso3}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{c.region}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <ProgressBar value={fig} className="w-20" />
                    <span className="font-mono text-xs tabular-nums text-slate-500">
                      {Math.round(fig * 100)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <ReportStatusBadge status={rep.status} overdue={overdue} />
                </TableCell>
                <TableCell>
                  <span className="font-mono text-sm tabular-nums">
                    {c.reviews.filter((r) => r.done).length}/{c.reviews.length}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <ProgressBar value={overall} className="w-20" />
                    <span className="font-mono text-xs tabular-nums">
                      {formatPercent(overall, 0)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  {formatDate(rep.deadline)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function Header({
  sortKey,
  label,
  onSort,
  icon,
}: {
  sortKey: SortKey;
  label: string;
  onSort: (k: SortKey) => void;
  icon: React.ReactNode;
}) {
  return (
    <TableHead>
      <button
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-50"
      >
        {label}
        {icon}
      </button>
    </TableHead>
  );
}
