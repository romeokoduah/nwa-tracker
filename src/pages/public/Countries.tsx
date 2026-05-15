import { useMemo, useState } from 'react';
import { Grid3X3, List, Filter } from 'lucide-react';
import { useNwaStore } from '@/store/useNwaStore';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchInput } from '@/components/common/SearchInput';
import { FilterBar } from '@/components/common/FilterBar';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CountryCard } from '@/components/country/CountryCard';
import { CountryTable } from '@/components/country/CountryTable';
import { EmptyState } from '@/components/common/EmptyState';
import { useDebounce } from '@/hooks/useDebounce';
import {
  countryCompletionBucket,
  countOverdue,
} from '@/lib/derive';
import { REGIONS } from '@/lib/constants';
import { cn } from '@/lib/cn';

type View = 'grid' | 'table';

export function Countries() {
  const countries = useNwaStore((s) => s.countries);
  const [view, setView] = useState<View>('grid');
  const [q, setQ] = useState('');
  const [region, setRegion] = useState<string>('all');
  const [bucket, setBucket] = useState<string>('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const dq = useDebounce(q);

  const filtered = useMemo(() => {
    return countries.filter((c) => {
      if (dq && !c.name.toLowerCase().includes(dq.toLowerCase()) && !c.iso3.toLowerCase().includes(dq.toLowerCase()))
        return false;
      if (region !== 'all' && c.region !== region) return false;
      if (bucket !== 'all' && String(countryCompletionBucket(c)) !== bucket) return false;
      if (overdueOnly && countOverdue(c) === 0) return false;
      return true;
    });
  }, [countries, dq, region, bucket, overdueOnly]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        eyebrow="Programme"
        title="Countries"
        subtitle={`${countries.length} Sub-Saharan African countries tracked. Filter, sort and drill into any country.`}
        actions={
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 dark:border-white/10 dark:bg-deep">
            <button
              onClick={() => setView('grid')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                view === 'grid'
                  ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-50'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-50',
              )}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              Grid
            </button>
            <button
              onClick={() => setView('table')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                view === 'table'
                  ? 'bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-50'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-50',
              )}
            >
              <List className="h-3.5 w-3.5" />
              Table
            </button>
          </div>
        }
      />

      <FilterBar>
        <SearchInput
          placeholder="Search country or ISO code…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          containerClassName="min-w-[240px] max-w-sm flex-1"
        />
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger className="w-40">
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
        <Select value={bucket} onValueChange={setBucket}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All completion</SelectItem>
            <SelectItem value="0">0–25%</SelectItem>
            <SelectItem value="1">26–50%</SelectItem>
            <SelectItem value="2">51–75%</SelectItem>
            <SelectItem value="3">76–99%</SelectItem>
            <SelectItem value="4">100%</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={overdueOnly ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setOverdueOnly((v) => !v)}
          className="gap-1.5"
        >
          <Filter className="h-3.5 w-3.5" />
          Overdue only
        </Button>
        <span className="ml-auto font-mono text-xs tabular-nums text-slate-500">
          {filtered.length} / {countries.length}
        </span>
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState
          title="No countries match"
          description="Try clearing a filter or adjusting your search."
        />
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((c) => (
            <CountryCard key={c.id} country={c} />
          ))}
        </div>
      ) : (
        <CountryTable countries={filtered} />
      )}
    </div>
  );
}
