import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AssignmentMatrix } from '@/components/admin/AssignmentMatrix';
import { useNwaStore } from '@/store/useNwaStore';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { ReportStatus } from '@/lib/types';
import { REPORT_STATUS_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import { useToast } from '@/components/ui/toast';
import { ReviewerHeatmap } from '@/components/charts/ReviewerHeatmap';

const REPORT_STATUSES: ReportStatus[] = ['not_started', 'in_progress', 'in_review', 'met', 'not_met'];

export function AdminAssignments() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Assignment matrix"
        subtitle="Delegate figures, reports and reviewer sign-offs to the team."
      />
      <Tabs defaultValue="figures">
        <TabsList>
          <TabsTrigger value="figures">Figures</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>
        <TabsContent value="figures">
          <AssignmentMatrix />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsAssignment />
        </TabsContent>
        <TabsContent value="reviews">
          <ReviewsAssignment />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportsAssignment() {
  const countries = useNwaStore((s) => s.countries);
  const team = useNwaStore((s) => s.team);
  const updateReport = useNwaStore((s) => s.updateReport);
  const { toast } = useToast();

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Country</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Deadline</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {countries.map((c) => {
            return (
              <TableRow key={c.id}>
                <TableCell>
                  <Link
                    to={`/countries/${c.id}`}
                    className="font-medium text-slate-900 hover:text-ocean dark:text-slate-50"
                  >
                    {c.name}
                  </Link>
                  <div className="text-[10px] font-mono text-slate-400">{c.iso3}</div>
                </TableCell>
                <TableCell>
                  <Select
                    value={c.report.assignedTo ?? '__none__'}
                    onValueChange={(v) => {
                      updateReport(c.id, { assignedTo: v === '__none__' ? null : v });
                      toast({ title: `Updated assignee for ${c.name}` });
                    }}
                  >
                    <SelectTrigger className="h-8 w-44 text-sm">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Unassigned</SelectItem>
                      {team.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="date"
                    value={c.report.deadline ?? ''}
                    onChange={(e) =>
                      updateReport(c.id, { deadline: e.target.value || null })
                    }
                    className="h-8 w-36 text-xs"
                  />
                  <div className="mt-0.5 text-[10px] text-slate-400">
                    {formatDate(c.report.deadline)}
                  </div>
                </TableCell>
                <TableCell>
                  <Select
                    value={c.report.status}
                    onValueChange={(v) => {
                      updateReport(c.id, { status: v as ReportStatus });
                    }}
                  >
                    <SelectTrigger className="h-8 w-32 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {REPORT_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Textarea
                    rows={1}
                    value={c.report.notes ?? ''}
                    onChange={(e) =>
                      updateReport(c.id, { notes: e.target.value || null })
                    }
                    className="min-h-[32px] max-w-xs text-xs"
                    placeholder="Optional notes"
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

function ReviewsAssignment() {
  const countries = useNwaStore((s) => s.countries);
  const toggleReview = useNwaStore((s) => s.toggleReview);
  const { toast } = useToast();

  const reviewers = countries[0]?.reviews ?? [];

  return (
    <Card className="overflow-auto p-3">
      <p className="px-2 py-2 text-xs text-slate-500">
        Flip checkboxes to mark sign-offs. Changes save immediately.
      </p>
      <table className="w-full border-separate" style={{ borderSpacing: 0 }}>
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-deep">
              Country
            </th>
            {reviewers.map((r) => (
              <th
                key={r.reviewerId}
                className="bg-slate-50 px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-deep"
              >
                <div className="mx-auto flex w-fit flex-col items-center gap-1">
                  <Avatar name={r.reviewerName} size="xs" />
                  {r.reviewerName}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {countries.map((c) => (
            <tr key={c.id} className="border-t border-slate-100 dark:border-white/5">
              <td className="sticky left-0 z-10 bg-white px-3 py-2 dark:bg-deep">
                <Link
                  to={`/countries/${c.id}`}
                  className="text-sm font-medium hover:text-ocean"
                >
                  {c.name}
                </Link>
                <div className="text-[10px] font-mono text-slate-400">{c.iso3}</div>
              </td>
              {c.reviews.map((r) => (
                <td key={r.reviewerId} className="px-2 py-2 text-center">
                  <Checkbox
                    checked={r.done}
                    onCheckedChange={(checked) => {
                      toggleReview(c.id, r.reviewerId, !!checked);
                      toast({
                        title: `${checked ? 'Marked' : 'Cleared'} ${r.reviewerName}'s review of ${c.name}${checked ? ' as done' : ''}`,
                      });
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 px-1">
        <ReviewerHeatmap />
      </div>
    </Card>
  );
}
