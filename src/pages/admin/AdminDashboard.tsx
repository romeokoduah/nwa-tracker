import { Link } from 'react-router-dom';
import { useState } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  CircleSlash,
  Users,
  Plus,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { useMemo } from 'react';
import { useNwaStore } from '@/store/useNwaStore';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/common/StatCard';
import { ActivityFeed } from '@/components/common/ActivityFeed';
import { Button } from '@/components/ui/button';
import { downloadJson } from '@/lib/export';
import { useToast } from '@/components/ui/toast';
import { AddCountryDialog } from '@/components/admin/AddCountryDialog';
import { AddMemberDialog } from '@/components/admin/AddMemberDialog';
import { selectOverdueItems } from '@/store/selectors';

const QUICK_ACTIONS = [
  {
    to: '/admin/assignments',
    icon: ClipboardList,
    title: 'Open assignment matrix',
    description: 'Assign figure producers, report writers and reviewers.',
  },
  {
    to: '/admin/deadlines',
    icon: CheckCircle2,
    title: 'Manage deadlines',
    description: 'Edit and drag deadlines on the calendar.',
  },
  {
    to: '/admin/team',
    icon: Users,
    title: 'Manage team',
    description: 'Add, edit or remove team members.',
  },
];

export function AdminDashboard() {
  const countries = useNwaStore((s) => s.countries);
  const team = useNwaStore((s) => s.team);
  const activity = useNwaStore((s) => s.activity);
  const lastSyncedAt = useNwaStore((s) => s.lastSyncedAt);
  const exportJson = useNwaStore((s) => s.exportJson);
  const overdue = useMemo(
    () => selectOverdueItems({ countries, team, activity, lastSyncedAt }),
    [countries, team, activity, lastSyncedAt],
  );
  const { toast } = useToast();
  const [addCountryOpen, setAddCountryOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const unassignedFigures = countries.reduce(
    (acc, c) => acc + c.figures.filter((f) => !f.assignedTo).length,
    0,
  );
  const unassignedReports = countries.filter((c) => !c.report.assignedTo).length;
  const reviewsPending = countries.reduce(
    (acc, c) => acc + c.reviews.filter((r) => !r.done).length,
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Action centre"
        subtitle="Items requiring coordinator attention."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setAddMemberOpen(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Member
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAddCountryOpen(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Country
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                downloadJson(`nwa-tracker-export-${new Date().toISOString().slice(0, 10)}.json`, JSON.parse(exportJson()));
                toast({ title: 'Export downloaded' });
              }}
              className="gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Export JSON
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Unassigned figures"
          value={unassignedFigures}
          accent="amber"
          icon={<CircleSlash className="h-4 w-4" />}
        />
        <StatCard
          label="Unassigned reports"
          value={unassignedReports}
          accent="rose"
          icon={<CircleSlash className="h-4 w-4" />}
        />
        <StatCard
          label="Reviews pending"
          value={reviewsPending}
          accent="ocean"
        />
        <StatCard
          label="Overdue items"
          value={overdue.length}
          accent="rose"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </div>

      <div>
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
          Quick actions
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.to}
                to={a.to}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-elev transition-transform hover:-translate-y-0.5 dark:border-white/5 dark:bg-deep"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-ocean/10 p-2.5 text-ocean transition-colors group-hover:bg-ocean group-hover:text-white">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-display text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {a.title}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {a.description}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overdue items</CardTitle>
        </CardHeader>
        <CardContent>
          {overdue.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-white/10">
              Nothing is overdue. Nice.
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-slate-100 dark:divide-white/5">
              {overdue.slice(0, 12).map((it, i) => (
                <li key={i} className="flex items-center justify-between py-2.5 text-sm">
                  <Link to={`/countries/${it.country.id}`} className="hover:text-ocean">
                    <span className="font-medium text-slate-900 dark:text-slate-50">
                      {it.country.name}
                    </span>
                    <span className="ml-2 text-xs text-slate-500">{it.label}</span>
                  </Link>
                  <span className="text-xs text-danger">{it.deadline}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ActivityFeed limit={20} />

      <AddCountryDialog open={addCountryOpen} onOpenChange={setAddCountryOpen} />
      <AddMemberDialog open={addMemberOpen} onOpenChange={setAddMemberOpen} />
    </div>
  );
}
