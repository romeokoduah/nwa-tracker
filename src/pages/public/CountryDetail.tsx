import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MessageSquare,
  Calendar,
  Edit3,
  ArrowLeft,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { useNwaStore } from '@/store/useNwaStore';
import { useAuthStore } from '@/store/useAuthStore';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ProgressRing } from '@/components/common/ProgressRing';
import {
  TaskStatusBadge,
  ReportStatusBadge,
} from '@/components/common/StatusBadge';
import { Avatar } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  figuresCompletion,
  isFigureOverdue,
  isReportOverdue,
  overallCompletion,
} from '@/lib/derive';
import { formatDate, formatRelative } from '@/lib/format';
import { FIGURE_TYPES, FIGURE_META } from '@/lib/types';
import { FigureCellEditor } from '@/components/admin/FigureCellEditor';
import type { FigureType } from '@/lib/types';
import { useToast } from '@/components/ui/toast';

export function CountryDetail() {
  const { id } = useParams<{ id: string }>();
  const country = useNwaStore((s) => s.countries.find((c) => c.id === id));
  const team = useNwaStore((s) => s.team);
  const setCountryComment = useNwaStore((s) => s.setCountryComment);
  const updateReport = useNwaStore((s) => s.updateReport);
  const toggleReview = useNwaStore((s) => s.toggleReview);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const { toast } = useToast();
  const [editing, setEditing] = useState<FigureType | null>(null);
  const [commentDraft, setCommentDraft] = useState<string>(country?.comments ?? '');
  const [editingReport, setEditingReport] = useState(false);

  if (!country) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 py-20 text-center">
        <div className="font-display text-xl font-semibold">Country not found</div>
        <Button asChild variant="outline">
          <Link to="/countries">Back to all countries</Link>
        </Button>
      </div>
    );
  }

  const overall = overallCompletion(country);

  function getMember(id: string | null) {
    if (!id) return null;
    return team.find((t) => t.id === id) ?? null;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <Link
          to="/countries"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
        >
          <ArrowLeft className="h-3 w-3" />
          All countries
        </Link>
      </div>
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-ocean/10 via-transparent to-teal/10 dark:from-ocean/20" />
        <div className="relative flex flex-col items-start gap-6 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ocean dark:text-cyan">
              <span className="font-mono tabular-nums">#{country.no}</span>
              <span>·</span>
              <span>{country.region}</span>
              <span>·</span>
              <span className="font-mono">{country.iso3}</span>
            </div>
            <h1 className="mt-1 font-display text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {country.name}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline">{country.region} Africa</Badge>
              <Badge variant="muted">{country.iso3}</Badge>
              {country.flags.map((f) => (
                <Badge key={f} variant="info">
                  {f}
                </Badge>
              ))}
            </div>
          </div>
          <ProgressRing value={overall} size={140} stroke={11} label="Overall" />
        </div>
      </Card>

      <PageHeader title="Workstreams" subtitle="Figures, report and reviewer sign-offs." />

      <Tabs defaultValue="figures">
        <TabsList>
          <TabsTrigger value="figures">Figures</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="figures">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Eight figures · {Math.round(figuresCompletion(country) * 100)}% done</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col divide-y divide-slate-100 dark:divide-white/5">
                {FIGURE_TYPES.map((type) => {
                  const f = country.figures.find((x) => x.type === type)!;
                  const meta = FIGURE_META[type];
                  const lead = meta.lead;
                  const producer = getMember(f.assignedTo);
                  const overdue = isFigureOverdue(f);
                  return (
                    <div
                      key={type}
                      className="grid grid-cols-1 gap-3 py-4 md:grid-cols-[40px_1fr_auto] md:items-start"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ocean/10 font-display text-sm font-bold text-ocean">
                        {meta.order}
                      </div>
                      <div>
                        <div className="font-display text-sm font-semibold text-slate-900 dark:text-slate-50">
                          {type}
                        </div>
                        <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          {meta.shortLabel}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                          <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              Lead
                            </span>
                            {lead ? (
                              <Badge variant="outline">{lead}</Badge>
                            ) : (
                              <Badge variant="warning">Unassigned — admin needed</Badge>
                            )}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              Producer
                            </span>
                            {producer ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Avatar
                                  name={producer.name}
                                  color={producer.avatarColor}
                                  size="xs"
                                />
                                {producer.name}
                              </span>
                            ) : (
                              <Badge variant="muted">Unassigned</Badge>
                            )}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span className="text-slate-600 dark:text-slate-300">
                              {formatDate(f.deadline)}
                            </span>
                            {f.deadline && (
                              <span className="text-slate-400">·</span>
                            )}
                            {f.deadline && (
                              <span className="text-slate-400">
                                {formatRelative(f.deadline)}
                              </span>
                            )}
                          </span>
                          {f.completedAt && (
                            <span className="inline-flex items-center gap-1.5 text-success">
                              <CheckCircle2 className="h-3 w-3" />
                              Completed {formatDate(f.completedAt)}
                            </span>
                          )}
                        </div>
                        {f.notes && (
                          <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-300">
                            {f.notes}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <TaskStatusBadge status={f.status} overdue={overdue} />
                        {isAdmin && (
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => setEditing(type)}
                            className="gap-1"
                          >
                            <Edit3 className="h-3 w-3" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report">
          <Card>
            <CardHeader>
              <CardTitle>National Water Accounting Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Assignee">
                  {(() => {
                    const m = getMember(country.report.assignedTo);
                    return m ? (
                      <span className="inline-flex items-center gap-2">
                        <Avatar name={m.name} color={m.avatarColor} size="sm" />
                        <span className="text-sm">{m.name}</span>
                      </span>
                    ) : (
                      <Badge variant="muted">Unassigned</Badge>
                    );
                  })()}
                </Field>
                <Field label="Status">
                  <ReportStatusBadge
                    status={country.report.status}
                    overdue={isReportOverdue(country.report)}
                  />
                </Field>
                <Field label="Deadline">
                  <span className="text-sm">
                    {formatDate(country.report.deadline)}
                    {country.report.deadline && (
                      <span className="ml-1.5 text-xs text-slate-400">
                        ({formatRelative(country.report.deadline)})
                      </span>
                    )}
                  </span>
                </Field>
                <Field label="Completed">
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {formatDate(country.report.completedAt)}
                  </span>
                </Field>
                {country.report.notes && (
                  <Field label="Notes" full>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-white/5 dark:bg-white/[0.02]">
                      {country.report.notes}
                    </div>
                  </Field>
                )}
              </div>
              {isAdmin && (
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      updateReport(country.id, { status: 'met' });
                      toast({
                        title: `Marked report for ${country.name} as Met`,
                        variant: 'success',
                      });
                    }}
                    disabled={country.report.status === 'met'}
                  >
                    Mark as Met
                  </Button>
                  <Button asChild size="sm" variant="primary">
                    <Link to="/admin/assignments">Edit in admin</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          {editingReport && null}
        </TabsContent>

        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle>Reviewer sign-offs · {country.reviews.filter((r) => r.done).length}/{country.reviews.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <TooltipProvider>
                <div className="flex flex-col divide-y divide-slate-100 dark:divide-white/5">
                  {country.reviews.map((r) => (
                    <div key={r.reviewerId} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.reviewerName} size="sm" />
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-50">
                            {r.reviewerName}
                          </div>
                          {r.completedAt && (
                            <div className="text-[11px] text-slate-400">
                              Completed {formatDate(r.completedAt)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={r.done ? 'success' : 'muted'}>
                          {r.done ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <Circle className="h-3 w-3" />
                          )}
                          {r.done ? 'Done' : 'Pending'}
                        </Badge>
                        {isAdmin && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => {
                                  toggleReview(country.id, r.reviewerId, !r.done);
                                  toast({
                                    title: `${r.done ? 'Cleared' : 'Marked'} ${r.reviewerName}'s review${
                                      r.done ? '' : ' as done'
                                    }`,
                                  });
                                }}
                              >
                                Toggle
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Admin: flip sign-off</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </TooltipProvider>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-ocean" />
            Country notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            placeholder="Add programme-level notes for this country…"
            rows={3}
          />
          <Separator className="my-3" />
          <div className="flex items-center justify-end">
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setCountryComment(country.id, commentDraft);
                toast({ title: `Notes saved for ${country.name}` });
              }}
            >
              Save notes
            </Button>
          </div>
        </CardContent>
      </Card>

      {editing && (
        <FigureCellEditor
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          countryId={country.id}
          figureType={editing}
        />
      )}
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
