import { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { useNwaStore } from '@/store/useNwaStore';
import { PageHeader } from '@/components/common/PageHeader';
import { TeamMemberCard } from '@/components/team/TeamMemberCard';
import { SearchInput } from '@/components/common/SearchInput';
import { FilterBar } from '@/components/common/FilterBar';
import { EmptyState } from '@/components/common/EmptyState';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Role } from '@/lib/types';

const ROLE_OPTS: { value: Role | 'all'; label: string }[] = [
  { value: 'all', label: 'All roles' },
  { value: 'figure_producer', label: 'Producers' },
  { value: 'figure_lead', label: 'Leads' },
  { value: 'reviewer', label: 'Reviewers' },
  { value: 'report_writer', label: 'Report writers' },
];

export function Team() {
  const team = useNwaStore((s) => s.team);
  const [q, setQ] = useState('');
  const [role, setRole] = useState<Role | 'all'>('all');
  const dq = useDebounce(q);

  const filtered = useMemo(() => {
    return team.filter((m) => {
      if (dq && !m.name.toLowerCase().includes(dq.toLowerCase())) return false;
      if (role !== 'all' && !m.roles.includes(role)) return false;
      return true;
    });
  }, [team, dq, role]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        eyebrow="Programme"
        title="Team"
        subtitle={`${team.length} contributors to the programme.`}
      />

      <FilterBar>
        <SearchInput
          placeholder="Search team…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          containerClassName="w-full sm:max-w-sm sm:flex-1"
        />
        <Select value={role} onValueChange={(v) => setRole(v as Role | 'all')}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto font-mono text-xs tabular-nums text-slate-500">
          {filtered.length} / {team.length}
        </span>
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState
          title="No team members match"
          description="Try clearing the role filter."
          icon={Users}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((m) => (
            <TeamMemberCard key={m.id} member={m} />
          ))}
        </div>
      )}
    </div>
  );
}
