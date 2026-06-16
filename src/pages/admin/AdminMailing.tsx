import { useMemo, useState } from 'react';
import { Send, AlarmClock, Mail } from 'lucide-react';
import { useNwaStore, type CommentAuthor } from '@/store/useNwaStore';
import { useAuthStore } from '@/store/useAuthStore';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { postSendMail } from '@/lib/api';

interface Laggard {
  countryId: string;
  countryName: string;
  memberId: string;
  memberName: string;
  hasEmail: boolean;
}

export function AdminMailing() {
  const countries = useNwaStore((s) => s.countries);
  const team = useNwaStore((s) => s.team);
  const sendReminder = useNwaStore((s) => s.sendReminder);
  const notificationsEnabled = useNwaStore((s) => s.settings?.notificationsEnabled ?? true);
  const currentUser = useAuthStore((s) => s.currentUser);
  const { toast } = useToast();

  const author: CommentAuthor = currentUser
    ? {
        id: currentUser.id,
        name: currentUser.name,
        roles: currentUser.roles,
        isAdmin: currentUser.isAdmin,
      }
    : { id: 'admin', name: 'Administrator', roles: ['admin'], isAdmin: true };
  const actorId = currentUser?.id ?? 'admin';

  const mailable = useMemo(
    () =>
      team
        .filter((m) => m.active && m.email)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [team],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [sending, setSending] = useState(false);

  const reportLaggards = useMemo<Laggard[]>(
    () =>
      countries
        .filter((c) => c.report.assignedTo && c.report.status === 'not_started')
        .map((c) => {
          const m = team.find((t) => t.id === c.report.assignedTo);
          return {
            countryId: c.id,
            countryName: c.name,
            memberId: c.report.assignedTo as string,
            memberName: m?.name ?? 'Unknown',
            hasEmail: !!m?.email,
          };
        })
        .sort((a, b) => a.memberName.localeCompare(b.memberName)),
    [countries, team],
  );

  const reviewLaggards = useMemo<Laggard[]>(() => {
    const out: Laggard[] = [];
    for (const c of countries) {
      for (const rv of c.reviews) {
        if (!rv.done && rv.reviewerId) {
          const m = team.find((t) => t.id === rv.reviewerId);
          out.push({
            countryId: c.id,
            countryName: c.name,
            memberId: rv.reviewerId,
            memberName: rv.reviewerName || m?.name || 'Reviewer',
            hasEmail: !!m?.email,
          });
        }
      }
    }
    return out.sort((a, b) => a.memberName.localeCompare(b.memberName));
  }, [countries, team]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSend() {
    const recipientIds = [...selected];
    if (recipientIds.length === 0 || !subject.trim() || !bodyText.trim()) {
      toast({ title: 'Add recipients, a subject and a message.', variant: 'error' });
      return;
    }
    setSending(true);
    try {
      const res = await postSendMail({
        recipientIds,
        subject: subject.trim(),
        body: bodyText.trim(),
        actorId,
      });
      if (res.disabled) {
        toast({
          title: 'Notifications are off',
          description: 'Turn them on in Settings to send mail.',
          variant: 'info',
        });
      } else {
        toast({
          title: `Sent to ${res.sent} ${res.sent === 1 ? 'person' : 'people'}`,
          variant: 'success',
        });
        setSubject('');
        setBodyText('');
        setSelected(new Set());
      }
    } catch (e) {
      toast({
        title: 'Send failed',
        description: e instanceof Error ? e.message : 'Error',
        variant: 'error',
      });
    } finally {
      setSending(false);
    }
  }

  function remindReport(l: Laggard) {
    sendReminder({
      countryId: l.countryId,
      recipientId: l.memberId,
      recipientName: l.memberName,
      scope: 'report',
      body: `Your assigned report for ${l.countryName} hasn't been started yet. Please begin work on it when you can.`,
      author,
    });
  }

  function remindReview(l: Laggard) {
    sendReminder({
      countryId: l.countryId,
      recipientId: l.memberId,
      recipientName: l.memberName,
      scope: 'general',
      body: `Your review of ${l.countryName} is still pending. Please complete it when you can.`,
      author,
    });
  }

  function remindAll(list: Laggard[], fn: (l: Laggard) => void, label: string) {
    if (list.length === 0) return;
    list.forEach(fn);
    toast({
      title: `Reminder${list.length === 1 ? '' : 's'} sent for ${list.length} ${label}`,
      description: notificationsEnabled
        ? 'Each appears on their dashboard and an email was dispatched.'
        : 'Shown on their dashboard. Emails are off (enable in Settings).',
      variant: 'success',
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Mailing"
        subtitle="Send messages and reminders to the team. Reminders also appear on recipients' dashboards."
      />

      {!notificationsEnabled && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs text-warning dark:bg-warning/10">
          Email notifications are currently <strong>off</strong>. Reminders will still show on
          dashboards, but no emails will be sent until you turn notifications on in Settings.
        </div>
      )}

      {/* Compose */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-teal" /> Compose a message
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Recipients ({selected.size} selected)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-xs font-medium text-teal hover:underline"
                  onClick={() => setSelected(new Set(mailable.map((m) => m.id)))}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="text-xs font-medium text-slate-400 hover:underline"
                  onClick={() => setSelected(new Set())}
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="grid max-h-56 grid-cols-1 gap-1 overflow-y-auto rounded-xl border border-slate-200 p-2 sm:grid-cols-2 dark:border-white/5">
              {mailable.map((m) => (
                <label
                  key={m.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <Checkbox checked={selected.has(m.id)} onCheckedChange={() => toggle(m.id)} />
                  <span className="truncate text-slate-700 dark:text-slate-200">{m.name}</span>
                  <span className="truncate text-xs text-slate-400">{m.email}</span>
                </label>
              ))}
            </div>
          </div>

          <Input
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <Textarea
            placeholder="Write your message… (blank lines separate paragraphs)"
            rows={6}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Signed “Coordinating Team, National Water Accounts Atlas”.
            </span>
            <Button className="gap-2" onClick={handleSend} disabled={sending}>
              <Send className="h-4 w-4" />
              {sending ? 'Sending…' : 'Send message'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report reminders */}
      <ReminderCard
        title="Report writers who haven't started"
        empty="Every assigned report has been started. 🎉"
        list={reportLaggards}
        onRemindAll={() => remindAll(reportLaggards, remindReport, 'report')}
        onRemind={remindReport}
      />

      {/* Reviewer reminders */}
      <ReminderCard
        title="Reviewers with pending reviews"
        empty="All reviews are complete. 🎉"
        list={reviewLaggards}
        onRemindAll={() => remindAll(reviewLaggards, remindReview, 'review')}
        onRemind={remindReview}
      />
    </div>
  );
}

function ReminderCard({
  title,
  empty,
  list,
  onRemindAll,
  onRemind,
}: {
  title: string;
  empty: string;
  list: Laggard[];
  onRemindAll: () => void;
  onRemind: (l: Laggard) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <AlarmClock className="h-4 w-4 text-teal" /> {title}
          <Badge variant="default">{list.length}</Badge>
        </CardTitle>
        <Button size="sm" className="gap-2" onClick={onRemindAll} disabled={list.length === 0}>
          <Send className="h-3.5 w-3.5" />
          Remind all ({list.length})
        </Button>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-400">{empty}</div>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-white/5">
            {list.map((l) => (
              <div
                key={`${l.countryId}:${l.memberId}`}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                    {l.memberName}
                    {!l.hasEmail && (
                      <span className="ml-2 text-xs text-warning">(no email on file)</span>
                    )}
                  </div>
                  <div className="truncate text-xs text-slate-400">{l.countryName}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => onRemind(l)}>
                  Remind
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
