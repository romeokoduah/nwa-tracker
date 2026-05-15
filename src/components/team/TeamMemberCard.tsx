import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { TeamMember } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useNwaStore } from '@/store/useNwaStore';
import { selectWorkloads } from '@/store/selectors';
import { ProgressBar } from '@/components/common/ProgressBar';
import { formatPercent } from '@/lib/format';

const ROLE_LABEL: Record<TeamMember['roles'][number], string> = {
  admin: 'Admin',
  figure_producer: 'Producer',
  figure_lead: 'Figure lead',
  reviewer: 'Reviewer',
  report_writer: 'Report writer',
};

interface TeamMemberCardProps {
  member: TeamMember;
}

export function TeamMemberCard({ member }: TeamMemberCardProps) {
  const countries = useNwaStore((s) => s.countries);
  const team = useNwaStore((s) => s.team);
  const activity = useNwaStore((s) => s.activity);
  const lastSyncedAt = useNwaStore((s) => s.lastSyncedAt);
  const wl = useMemo(() => {
    const all = selectWorkloads({ countries, team, activity, lastSyncedAt });
    return all.find((w) => w.memberId === member.id) ?? null;
  }, [countries, team, activity, lastSyncedAt, member.id]);

  return (
    <Link
      to={`/team/${member.id}`}
      className="group block transition-transform hover:-translate-y-0.5"
    >
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <Avatar name={member.name} color={member.avatarColor} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="font-display text-base font-semibold text-slate-900 dark:text-slate-50">
              {member.name}
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {member.roles.map((r) => (
                <Badge key={r} variant="outline" className="text-[10px]">
                  {ROLE_LABEL[r]}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Total" value={wl?.total ?? 0} />
          <Stat label="Done" value={wl?.done ?? 0} />
          <Stat label="Figures" value={wl?.figureCount ?? 0} />
        </div>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="font-medium text-slate-500">Completion</span>
            <span className="font-mono tabular-nums text-slate-500">
              {formatPercent(wl?.pct ?? 0, 0)}
            </span>
          </div>
          <ProgressBar value={wl?.pct ?? 0} />
        </div>
      </Card>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-display text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
        {value}
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
    </div>
  );
}
