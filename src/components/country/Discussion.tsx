import { useMemo, useState } from 'react';
import { MessagesSquare, Send, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { Country, CommentScope, FigureType } from '@/lib/types';
import { FIGURE_TYPES, FIGURE_META } from '@/lib/types';
import { useAuthStore } from '@/store/useAuthStore';
import { useNwaStore } from '@/store/useNwaStore';
import { deriveRecipients, visibleMessages } from '@/lib/derive';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatRelative } from '@/lib/format';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';

export function Discussion({ country }: { country: Country }) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const team = useNwaStore((s) => s.team);
  const addComment = useNwaStore((s) => s.addComment);
  const resolveComment = useNwaStore((s) => s.resolveComment);
  const { toast } = useToast();

  const [scope, setScope] = useState<CommentScope>('general');
  const [figureType, setFigureType] = useState<FigureType>(FIGURE_TYPES[0]);
  const [body, setBody] = useState('');

  const messages = useMemo(
    () =>
      [...visibleMessages(country, currentUser?.id ?? null, isAdmin)].sort(
        (a, b) => (a.createdAt < b.createdAt ? 1 : -1),
      ),
    [country, currentUser?.id, isAdmin],
  );

  const authorFlags = useMemo(() => {
    const isReviewer =
      !!currentUser &&
      (currentUser.roles.includes('reviewer') ||
        country.reviews.some(
          (r) => r.reviewerName.toLowerCase() === currentUser.name.toLowerCase(),
        ));
    const isReportWriter =
      !!currentUser &&
      (currentUser.roles.includes('report_writer') ||
        country.report.assignedTo === currentUser.id);
    return { isReviewer, isReportWriter };
  }, [currentUser, country]);

  const recipients = useMemo(() => {
    if (!currentUser) return { ids: [], names: [] };
    return deriveRecipients({
      country,
      team,
      scope,
      figureType: scope === 'figure' ? figureType : null,
      authorId: currentUser.id,
      authorIsReviewer: authorFlags.isReviewer,
      authorIsReportWriter: authorFlags.isReportWriter,
    });
  }, [currentUser, country, team, scope, figureType, authorFlags]);

  function send() {
    if (!currentUser || !body.trim()) return;
    addComment({
      countryId: country.id,
      scope,
      figureType: scope === 'figure' ? figureType : null,
      body,
      author: {
        id: currentUser.id,
        name: currentUser.name,
        roles: currentUser.roles,
        isAdmin: currentUser.isAdmin,
      },
    });
    setBody('');
    toast({
      title: recipients.names.length
        ? `Comment sent to ${recipients.names.join(', ')}`
        : 'Comment posted',
      variant: 'success',
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessagesSquare className="h-4 w-4 text-ocean" />
          Discussion
          <span className="ml-1 font-mono text-xs font-normal text-slate-400">
            {messages.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!currentUser ? (
          <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Sign in to read and send directed comments. Messages are private to
            the sender, the people they're directed to, and admins.
          </div>
        ) : (
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 dark:border-white/10">
            <div className="flex flex-wrap gap-2">
              <Select
                value={scope}
                onValueChange={(v) => setScope(v as CommentScope)}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                  <SelectItem value="figure">A figure</SelectItem>
                </SelectContent>
              </Select>
              {scope === 'figure' && (
                <Select
                  value={figureType}
                  onValueChange={(v) => setFigureType(v as FigureType)}
                >
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIGURE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {FIGURE_META[t].order}. {FIGURE_META[t].shortLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write a comment or raise a concern…"
              rows={3}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-500">
                {recipients.names.length ? (
                  <>
                    To:{' '}
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {recipients.names.join(', ')}
                    </span>
                  </>
                ) : (
                  'No one is assigned to that section yet — the comment is still recorded.'
                )}
              </span>
              <Button
                size="sm"
                variant="primary"
                onClick={send}
                disabled={!body.trim()}
                className="gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Send
              </Button>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2.5">
          {messages.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No comments yet.
            </div>
          ) : (
            messages.map((m) => {
              const canResolve =
                !m.resolved &&
                (isAdmin ||
                  (currentUser != null &&
                    m.recipientIds.includes(currentUser.id)));
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
                    m.fromReviewer && !m.resolved
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
                    {m.resolved && (
                      <Badge variant="success" className="text-[10px] gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Resolved
                      </Badge>
                    )}
                    <span className="ml-auto text-[11px] text-slate-400">
                      {formatRelative(m.createdAt)}
                    </span>
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                    {m.body}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    {m.recipientNames.length > 0 && (
                      <span>To: {m.recipientNames.join(', ')}</span>
                    )}
                    {canResolve && (
                      <Button
                        size="xs"
                        variant="ghost"
                        className="ml-auto gap-1"
                        onClick={() => {
                          resolveComment(country.id, m.id);
                          toast({ title: 'Comment resolved' });
                        }}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Mark resolved
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
