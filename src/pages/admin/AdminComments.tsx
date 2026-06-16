import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessagesSquare, ShieldCheck, Trash2, RotateCcw } from 'lucide-react';
import { useNwaStore } from '@/store/useNwaStore';
import { useAuthStore } from '@/store/useAuthStore';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/components/ui/toast';
import { FIGURE_META } from '@/lib/types';
import { formatRelative, formatDate } from '@/lib/format';

interface FlatComment {
  countryId: string;
  countryName: string;
  id: string;
  authorName: string;
  authorRole: string;
  scopeLabel: string;
  body: string;
  createdAt: string;
  status: string;
  blocking: boolean;
  reminder: boolean;
  replyCount: number;
  recipientNames: string[];
}

interface FlatSignoff {
  countryId: string;
  countryName: string;
  reviewerId: string;
  reviewerName: string;
  completedAt: string | null;
}

export function AdminComments() {
  const countries = useNwaStore((s) => s.countries);
  const removeComment = useNwaStore((s) => s.removeComment);
  const toggleReview = useNwaStore((s) => s.toggleReview);
  const currentUser = useAuthStore((s) => s.currentUser);
  const { toast } = useToast();

  const actor = currentUser ?? { id: 'admin', name: 'Administrator' };

  const comments = useMemo<FlatComment[]>(() => {
    const out: FlatComment[] = [];
    for (const c of countries) {
      for (const m of c.messages ?? []) {
        out.push({
          countryId: c.id,
          countryName: c.name,
          id: m.id,
          authorName: m.authorName,
          authorRole: m.authorRole,
          scopeLabel:
            m.scope === 'figure' && m.figureType
              ? FIGURE_META[m.figureType].shortLabel
              : m.scope === 'report'
                ? 'Report'
                : 'General',
          body: m.body,
          createdAt: m.createdAt,
          status: m.status,
          blocking: m.blocking,
          reminder: !!m.reminder,
          replyCount: m.replies?.length ?? 0,
          recipientNames: m.recipientNames ?? [],
        });
      }
    }
    return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [countries]);

  const signoffs = useMemo<FlatSignoff[]>(() => {
    const out: FlatSignoff[] = [];
    for (const c of countries) {
      for (const rv of c.reviews) {
        if (rv.done) {
          out.push({
            countryId: c.id,
            countryName: c.name,
            reviewerId: rv.reviewerId,
            reviewerName: rv.reviewerName,
            completedAt: rv.completedAt,
          });
        }
      }
    }
    return out.sort((a, b) => ((a.completedAt ?? '') < (b.completedAt ?? '') ? 1 : -1));
  }, [countries]);

  const [pendingDelete, setPendingDelete] = useState<FlatComment | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Comments & sign-offs"
        subtitle="Review every comment thread and reviewer sign-off. Remove items that are no longer needed."
      />

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessagesSquare className="h-4 w-4 text-ocean" /> Comments
            <Badge variant="muted">{comments.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {comments.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-400">No comments yet.</div>
          ) : (
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-white/5">
              {comments.map((c) => (
                <div key={`${c.countryId}:${c.id}`} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Link
                        to={`/countries/${c.countryId}`}
                        className="font-medium text-slate-900 hover:text-ocean dark:text-slate-50"
                      >
                        {c.countryName}
                      </Link>
                      <Badge variant="muted" className="text-[10px]">{c.scopeLabel}</Badge>
                      {c.blocking && <Badge variant="danger" className="text-[10px]">Blocking</Badge>}
                      {c.reminder && <Badge variant="warning" className="text-[10px]">Reminder</Badge>}
                      <Badge
                        variant={c.status === 'resolved' ? 'success' : c.status === 'responded' ? 'info' : 'outline'}
                        className="text-[10px] capitalize"
                      >
                        {c.status}
                      </Badge>
                    </div>
                    <div className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                      {c.body}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      {c.authorName} ({c.authorRole}) · {formatRelative(c.createdAt)}
                      {c.recipientNames.length > 0 && <> · to {c.recipientNames.join(', ')}</>}
                      {c.replyCount > 0 && <> · {c.replyCount} {c.replyCount === 1 ? 'reply' : 'replies'}</>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 gap-1 text-danger hover:bg-danger/10"
                    onClick={() => setPendingDelete(c)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sign-offs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-success" /> Reviewer sign-offs
            <Badge variant="muted">{signoffs.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {signoffs.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-400">No sign-offs yet.</div>
          ) : (
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-white/5">
              {signoffs.map((s) => (
                <div key={`${s.countryId}:${s.reviewerId}`} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Link
                        to={`/countries/${s.countryId}`}
                        className="font-medium text-slate-900 hover:text-ocean dark:text-slate-50"
                      >
                        {s.countryName}
                      </Link>
                      <Badge variant="success" className="text-[10px]">Signed off</Badge>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {s.reviewerName}
                      {s.completedAt && <> · {formatDate(s.completedAt)}</>}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1"
                    onClick={() => {
                      toggleReview(s.countryId, s.reviewerId, false);
                      toast({ title: `Sign-off revoked for ${s.countryName}`, variant: 'info' });
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Delete this comment?"
        description={
          pendingDelete
            ? `This permanently removes ${pendingDelete.authorName}'s comment on ${pendingDelete.countryName}${pendingDelete.replyCount > 0 ? ` and its ${pendingDelete.replyCount} repl${pendingDelete.replyCount === 1 ? 'y' : 'ies'}` : ''}. This cannot be undone.`
            : ''
        }
        destructive
        confirmLabel="Delete"
        onConfirm={() => {
          if (pendingDelete) {
            removeComment(pendingDelete.countryId, pendingDelete.id, actor);
            toast({ title: 'Comment deleted', variant: 'info' });
            setPendingDelete(null);
          }
        }}
      />
    </div>
  );
}
