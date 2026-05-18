import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MessagesSquare,
  Send,
  AlertOctagon,
  CheckCircle2,
  CornerDownRight,
  Bell,
  ShieldCheck,
} from 'lucide-react';
import type { Comment, CommentScope, Country, FigureType } from '@/lib/types';
import { FIGURE_TYPES, FIGURE_META } from '@/lib/types';
import { useAuthStore } from '@/store/useAuthStore';
import { useNwaStore } from '@/store/useNwaStore';
import {
  deriveRecipients,
  visibleMessages,
  attentionForUser,
  commentNeedsAttention,
  unresolvedBlockingByAuthor,
  allowedCommentScopes,
} from '@/lib/derive';
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

const STATUS_BADGE = {
  open: { variant: 'warning' as const, label: 'Open' },
  responded: { variant: 'info' as const, label: 'Responded' },
  resolved: { variant: 'success' as const, label: 'Resolved' },
};

function canResolve(
  country: Country,
  c: Comment,
  user: { id: string; name: string; roles: readonly string[] },
  isAdmin: boolean,
): boolean {
  if (isAdmin) return true;
  if (c.scope === 'figure' && c.figureType) {
    const producer = country.figures.find((f) => f.type === c.figureType)
      ?.assignedTo;
    return !!producer && producer === user.id;
  }
  return (
    user.roles.includes('reviewer') ||
    country.reviews.some(
      (r) => r.reviewerName.toLowerCase() === user.name.toLowerCase(),
    )
  );
}

/** Top-level (stable identity) so typing in a reply box doesn't remount it. */
function CommentBlock({
  country,
  m,
  showCountry,
}: {
  country: Country;
  m: Comment;
  showCountry?: boolean;
}) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const replyComment = useNwaStore((s) => s.replyComment);
  const acknowledgeComment = useNwaStore((s) => s.acknowledgeComment);
  const resolveComment = useNwaStore((s) => s.resolveComment);
  const { toast } = useToast();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState('');

  if (!currentUser) return null;
  const author = {
    id: currentUser.id,
    name: currentUser.name,
    roles: currentUser.roles,
    isAdmin: currentUser.isAdmin,
  };

  const sb = STATUS_BADGE[m.status] ?? STATUS_BADGE.open;
  const scopeLabel =
    m.scope === 'figure' && m.figureType
      ? FIGURE_META[m.figureType].shortLabel
      : m.scope === 'report'
        ? 'Report'
        : 'General';
  const needsMe = commentNeedsAttention(m, currentUser.id);
  const mayResolve =
    m.status !== 'resolved' && canResolve(country, m, author, isAdmin);

  return (
    <div
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
        {needsMe && (
          <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
        )}
        <Avatar name={m.authorName} size="xs" />
        <span className="text-sm font-medium text-slate-900 dark:text-slate-50">
          {m.authorName}
        </span>
        <Badge variant="outline" className="text-[10px]">
          {m.authorRole}
        </Badge>
        {showCountry && (
          <Link
            to={`/countries/${country.id}`}
            className="text-xs text-ocean hover:underline"
          >
            {country.name}
          </Link>
        )}
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
        <div className="mt-1.5 text-[11px] text-slate-400">
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
                <span>· {formatRelative(r.createdAt)}</span>
              </div>
              <div className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">
                {r.body}
              </div>
            </div>
          ))}
        </div>
      )}
      {m.status !== 'resolved' && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            size="xs"
            variant="ghost"
            className="gap-1"
            onClick={() => setReplyOpen((v) => !v)}
          >
            <CornerDownRight className="h-3 w-3" />
            Reply
          </Button>
          {needsMe && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() =>
                acknowledgeComment(country.id, m.id, {
                  id: currentUser.id,
                  name: currentUser.name,
                })
              }
            >
              Acknowledge
            </Button>
          )}
          {mayResolve && (
            <Button
              size="xs"
              variant="ghost"
              className="gap-1 text-success"
              onClick={() => {
                resolveComment(country.id, m.id, {
                  id: currentUser.id,
                  name: currentUser.name,
                });
                toast({ title: 'Comment resolved', variant: 'success' });
              }}
            >
              <CheckCircle2 className="h-3 w-3" />
              Resolve
            </Button>
          )}
        </div>
      )}
      {replyOpen && (
        <div className="mt-2 flex flex-col gap-2">
          <Textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Write a reply…"
            rows={2}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="primary"
              disabled={!replyBody.trim()}
              onClick={() => {
                replyComment({
                  countryId: country.id,
                  commentId: m.id,
                  body: replyBody,
                  author,
                });
                setReplyBody('');
                setReplyOpen(false);
                toast({ title: 'Reply posted' });
              }}
            >
              Post reply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CommentsHub() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const countries = useNwaStore((s) => s.countries);
  const team = useNwaStore((s) => s.team);
  const addComment = useNwaStore((s) => s.addComment);
  const toggleReview = useNwaStore((s) => s.toggleReview);
  const { toast } = useToast();

  const [countryId, setCountryId] = useState('');
  const [scope, setScope] = useState<CommentScope>('figure');
  const [figureType, setFigureType] = useState<FigureType>(FIGURE_TYPES[0]);
  const [blocking, setBlocking] = useState(false);
  const [body, setBody] = useState('');

  const sortedCountries = useMemo(
    () => [...countries].sort((a, b) => a.name.localeCompare(b.name)),
    [countries],
  );

  const author = currentUser
    ? {
        id: currentUser.id,
        name: currentUser.name,
        roles: currentUser.roles,
        isAdmin: currentUser.isAdmin,
      }
    : null;

  const selectedCountry = useMemo(
    () => countries.find((c) => c.id === countryId) ?? null,
    [countries, countryId],
  );

  const allowedScopes = useMemo(
    () => (author ? allowedCommentScopes(author, selectedCountry) : []),
    [author, selectedCountry],
  );

  // keep the chosen scope within what this user is allowed to author
  useEffect(() => {
    if (allowedScopes.length > 0 && !allowedScopes.includes(scope)) {
      setScope(allowedScopes[0]);
    }
  }, [allowedScopes, scope]);

  const recipients = useMemo(() => {
    if (!author || !selectedCountry) return { ids: [], names: [] };
    const isReviewer =
      author.roles.includes('reviewer') ||
      selectedCountry.reviews.some(
        (r) => r.reviewerName.toLowerCase() === author.name.toLowerCase(),
      );
    const isReportWriter =
      author.roles.includes('report_writer') ||
      selectedCountry.report.assignedTo === author.id;
    return deriveRecipients({
      country: selectedCountry,
      team,
      scope,
      figureType: scope === 'figure' ? figureType : null,
      authorId: author.id,
      authorIsReviewer: isReviewer,
      authorIsReportWriter: isReportWriter,
    });
  }, [author, selectedCountry, team, scope, figureType]);

  const attention = useMemo(
    () => attentionForUser(countries, currentUser?.id ?? null),
    [countries, currentUser?.id],
  );

  const myReviewCountries = useMemo(() => {
    if (!currentUser) return [];
    return countries
      .map((c) => {
        const review = c.reviews.find(
          (r) =>
            r.reviewerName.toLowerCase() === currentUser.name.toLowerCase(),
        );
        return review ? { country: c, review } : null;
      })
      .filter(
        (x): x is { country: Country; review: Country['reviews'][number] } =>
          !!x,
      );
  }, [countries, currentUser]);

  const threads = useMemo(() => {
    if (!currentUser) return [];
    const out: { country: Country; comment: Comment }[] = [];
    for (const c of countries) {
      for (const m of visibleMessages(c, currentUser.id, currentUser.isAdmin)) {
        out.push({ country: c, comment: m });
      }
    }
    return out.sort((a, b) =>
      a.comment.createdAt < b.comment.createdAt ? 1 : -1,
    );
  }, [countries, currentUser]);

  if (!currentUser || !author) {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm text-slate-600 dark:text-slate-300">
          <MessagesSquare className="h-4 w-4 text-ocean" />
          <span>
            <strong>Comments &amp; sign-off</strong> — sign in (your name +
            shared password) to leave comments, respond to feedback and sign
            off.
          </span>
          <Button asChild size="sm" variant="primary" className="ml-auto">
            <Link to="/login">Sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  function send() {
    if (!countryId || !body.trim() || !author) return;
    addComment({
      countryId,
      scope,
      figureType: scope === 'figure' ? figureType : null,
      body,
      blocking,
      author,
    });
    setBody('');
    setBlocking(false);
    toast({
      title: recipients.names.length
        ? `${blocking ? 'Blocking comment' : 'Comment'} sent to ${recipients.names.join(', ')}`
        : 'Comment posted',
      variant: 'success',
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessagesSquare className="h-4 w-4 text-ocean" />
          Comments &amp; sign-off
          {attention.length > 0 && (
            <Badge variant="danger" className="gap-1">
              <Bell className="h-3 w-3 animate-pulse" />
              {attention.length} need attention
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {attention.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-danger">
              Needs your attention
            </div>
            {attention.map(({ country, comment, role }) => (
              <div
                key={comment.id}
                className="rounded-xl border border-danger/30 bg-danger/5 p-3"
              >
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
                  {role === 'recipient'
                    ? 'You were asked to respond'
                    : 'Your comment got a reply'}{' '}
                  ·{' '}
                  <Link
                    to={`/countries/${country.id}`}
                    className="text-ocean hover:underline"
                  >
                    {country.name}
                  </Link>
                </div>
                <CommentBlock country={country} m={comment} />
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 dark:border-white/10">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal">
            Leave a comment
          </div>
          {allowedScopes.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
              Your role can't start new comments — only reviewers (report &amp;
              figures) and report writers (figures) can. You can still reply to
              comments addressed to you below.
            </div>
          ) : (
            <>
          <div className="flex flex-wrap gap-2">
            <Select value={countryId} onValueChange={setCountryId}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Select a country…" />
              </SelectTrigger>
              <SelectContent>
                {sortedCountries.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={scope}
              onValueChange={(v) => setScope(v as CommentScope)}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedScopes.includes('report') && (
                  <SelectItem value="report">Report</SelectItem>
                )}
                {allowedScopes.includes('figure') && (
                  <SelectItem value="figure">A figure</SelectItem>
                )}
              </SelectContent>
            </Select>
            {scope === 'figure' && (
              <Select
                value={figureType}
                onValueChange={(v) => setFigureType(v as FigureType)}
              >
                <SelectTrigger className="w-full sm:w-60">
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
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={blocking}
                onChange={(e) => setBlocking(e.target.checked)}
                className="h-3.5 w-3.5 accent-danger"
              />
              <AlertOctagon className="h-3.5 w-3.5 text-danger" />
              Blocking — must be resolved before sign-off
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">
                {selectedCountry
                  ? recipients.names.length
                    ? `To: ${recipients.names.join(', ')}`
                    : 'No assignees on that section yet'
                  : 'Pick a country'}
              </span>
              <Button
                size="sm"
                variant="primary"
                className="gap-1.5"
                disabled={!countryId || !body.trim()}
                onClick={send}
              >
                <Send className="h-3.5 w-3.5" />
                Send
              </Button>
            </div>
          </div>
            </>
          )}
        </div>

        {myReviewCountries.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal">
              Your reviewer sign-offs
            </div>
            {myReviewCountries.map(({ country, review }) => {
              const blockers = unresolvedBlockingByAuthor(
                country,
                currentUser.id,
              );
              const gated = blockers.length > 0 && !review.done;
              return (
                <div
                  key={country.id}
                  className="rounded-xl border border-slate-200 p-3 dark:border-white/10"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      to={`/countries/${country.id}`}
                      className="text-sm font-medium text-slate-900 hover:text-ocean dark:text-slate-50"
                    >
                      {country.name}
                    </Link>
                    <div className="flex items-center gap-2">
                      <Badge variant={review.done ? 'success' : 'muted'}>
                        {review.done ? 'Signed off' : 'Pending'}
                      </Badge>
                      <Button
                        size="xs"
                        variant={review.done ? 'ghost' : 'primary'}
                        disabled={gated}
                        className="gap-1"
                        onClick={() => {
                          toggleReview(
                            country.id,
                            review.reviewerId,
                            !review.done,
                          );
                          toast({
                            title: review.done
                              ? `Reopened your review of ${country.name}`
                              : `Signed off ${country.name}`,
                            variant: review.done ? 'info' : 'success',
                          });
                        }}
                      >
                        <ShieldCheck className="h-3 w-3" />
                        {review.done ? 'Reopen' : 'Sign off'}
                      </Button>
                    </div>
                  </div>
                  {gated && (
                    <div className="mt-2 rounded-lg border border-danger/30 bg-danger/5 p-2 text-[11px] text-danger">
                      Sign-off pending resolution — you have {blockers.length}{' '}
                      unresolved blocking comment
                      {blockers.length > 1 ? 's' : ''} on this country.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Conversations ({threads.length})
          </div>
          {threads.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400">
              No comments yet. Use “Leave a comment” above to start one.
            </div>
          ) : (
            threads
              .slice(0, 40)
              .map(({ country, comment }) => (
                <CommentBlock
                  key={comment.id}
                  country={country}
                  m={comment}
                  showCountry
                />
              ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
