import { useMemo } from 'react';
import { MessagesSquare, ShieldAlert, AlertOctagon, CornerDownRight } from 'lucide-react';
import type { Country } from '@/lib/types';
import { FIGURE_META } from '@/lib/types';
import { useAuthStore } from '@/store/useAuthStore';
import { visibleMessages } from '@/lib/derive';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/cn';

const STATUS_BADGE = {
  open: { variant: 'warning' as const, label: 'Open' },
  responded: { variant: 'info' as const, label: 'Responded' },
  resolved: { variant: 'success' as const, label: 'Resolved' },
};

/** Read-only thread. Authoring/replies/resolve happen in the Overview hub. */
export function Discussion({ country }: { country: Country }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const messages = useMemo(
    () =>
      [...visibleMessages(country, currentUser?.id ?? null, isAdmin)].sort(
        (a, b) => (a.createdAt < b.createdAt ? 1 : -1),
      ),
    [country, currentUser?.id, isAdmin],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessagesSquare className="h-4 w-4 text-ocean" />
          Discussion
          <span className="ml-1 font-mono text-xs font-normal text-slate-400">
            {messages.length}
          </span>
          <Badge variant="muted" className="ml-auto text-[10px] font-normal">
            Comment &amp; reply from the Overview page
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!currentUser ? (
          <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Sign in to view directed comments. They're private to the sender,
            the people they're directed to, and admins.
          </div>
        ) : messages.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No comments yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {messages.map((m) => {
              const sb = STATUS_BADGE[m.status];
              const scopeLabel =
                m.scope === 'figure' && m.figureType
                  ? FIGURE_META[m.figureType].shortLabel
                  : m.scope === 'report'
                    ? 'Report'
                    : 'General';
              return (
                <div
                  key={m.id}
                  className={cn(
                    'rounded-xl border p-3',
                    m.blocking && m.status !== 'resolved'
                      ? 'border-danger/40 bg-danger/5'
                      : m.fromReviewer && m.status !== 'resolved'
                        ? 'border-warning/40 bg-warning/5'
                        : 'border-slate-200 dark:border-white/10',
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Avatar name={m.authorName} size="xs" />
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-50">
                      {m.authorName}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {m.authorRole}
                    </Badge>
                    <Badge variant="muted" className="text-[10px]">
                      {scopeLabel}
                    </Badge>
                    {m.blocking && (
                      <Badge variant="danger" className="gap-1 text-[10px]">
                        <AlertOctagon className="h-3 w-3" />
                        Blocking
                      </Badge>
                    )}
                    <Badge variant={sb.variant} className="text-[10px]">
                      {sb.label}
                    </Badge>
                    <span className="ml-auto text-[11px] text-slate-400">
                      {formatRelative(m.createdAt)}
                    </span>
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                    {m.body}
                  </div>
                  {m.recipientNames.length > 0 && (
                    <div className="mt-2 text-[11px] text-slate-400">
                      To: {m.recipientNames.join(', ')}
                    </div>
                  )}
                  {(m.replies ?? []).length > 0 && (
                    <div className="mt-2 flex flex-col gap-2 border-l-2 border-slate-200 pl-3 dark:border-white/10">
                      {m.replies.map((r) => (
                        <div key={r.id}>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                            <CornerDownRight className="h-3 w-3" />
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                              {r.authorName}
                            </span>
                            <span>· {r.authorRole}</span>
                            <span>· {formatRelative(r.createdAt)}</span>
                          </div>
                          <div className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                            {r.body}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
