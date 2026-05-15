import { History } from 'lucide-react';
import { useNwaStore } from '@/store/useNwaStore';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/common/EmptyState';

interface ActivityFeedProps {
  limit?: number;
  inCard?: boolean;
}

export function ActivityFeed({ limit = 10, inCard = true }: ActivityFeedProps) {
  const activity = useNwaStore((s) => s.activity);
  const items = activity.slice(0, limit);

  const inner = items.length === 0 ? (
    <EmptyState
      title="No activity yet"
      description="Make an admin change and it will appear here."
      icon={History}
      className="border-none p-4"
    />
  ) : (
    <ol className="relative ml-3 space-y-3 border-l border-slate-200 pl-4 dark:border-white/10">
      {items.map((a) => (
        <li key={a.id} className="relative">
          <span className="absolute -left-[21px] top-1.5 inline-flex h-2.5 w-2.5 items-center justify-center rounded-full bg-gradient-to-br from-teal to-ocean ring-4 ring-white dark:ring-deep" />
          <div className="text-sm text-slate-700 dark:text-slate-200">{a.action}</div>
          <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {a.actor} · {formatDistanceToNowStrict(parseISO(a.timestamp))} ago
          </div>
        </li>
      ))}
    </ol>
  );

  if (!inCard) return inner;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4 text-ocean" />
          Recent activity
        </CardTitle>
      </CardHeader>
      <CardContent>{inner}</CardContent>
    </Card>
  );
}
