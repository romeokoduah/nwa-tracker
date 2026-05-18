import { useMemo, useState } from 'react';
import { useNwaStore } from '@/store/useNwaStore';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { SearchInput } from '@/components/common/SearchInput';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDistanceToNowStrict, parseISO, format } from 'date-fns';
import { EmptyState } from '@/components/common/EmptyState';
import { History } from 'lucide-react';

const ENTITY_TYPES = ['all', 'country', 'figure', 'report', 'review', 'team'] as const;

export function AdminActivity() {
  const activity = useNwaStore((s) => s.activity);
  const [q, setQ] = useState('');
  const [type, setType] = useState<(typeof ENTITY_TYPES)[number]>('all');
  const dq = useDebounce(q);

  const filtered = useMemo(() => {
    return activity.filter((a) => {
      if (dq && !a.action.toLowerCase().includes(dq.toLowerCase())) return false;
      if (type !== 'all' && a.entityType !== type) return false;
      return true;
    });
  }, [activity, dq, type]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Activity log"
        subtitle="Every mutation made to the tracker, latest first."
      />
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-elev dark:border-white/5 dark:bg-deep">
        <SearchInput
          placeholder="Search action…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          containerClassName="w-full sm:max-w-sm sm:flex-1"
        />
        <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t === 'all' ? 'All entity types' : t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto font-mono text-xs tabular-nums text-slate-500">
          {filtered.length}
        </span>
      </div>

      <Card>
        <CardContent className="p-5">
          {filtered.length === 0 ? (
            <EmptyState
              title="No activity yet"
              description="Make an admin change and it will appear here."
              icon={History}
            />
          ) : (
            <ol className="relative ml-3 space-y-3 border-l border-slate-200 pl-4 dark:border-white/10">
              {filtered.map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 inline-flex h-2.5 w-2.5 items-center justify-center rounded-full bg-gradient-to-br from-teal to-ocean ring-4 ring-white dark:ring-deep" />
                  <div className="text-sm text-slate-700 dark:text-slate-200">
                    {a.action}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    <span>{a.actor}</span>
                    <span>·</span>
                    <span>{a.entityType}</span>
                    <span>·</span>
                    <span title={a.timestamp}>
                      {format(parseISO(a.timestamp), 'd MMM yyyy HH:mm')} ({formatDistanceToNowStrict(parseISO(a.timestamp))} ago)
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
