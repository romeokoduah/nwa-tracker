import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Search, Globe2, Users, ClipboardList, Settings, Calendar } from 'lucide-react';
import { useNwaStore } from '@/store/useNwaStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Avatar } from '@/components/ui/avatar';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/cn';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  to: string;
  group: 'Countries' | 'Team' | 'Admin actions' | 'Navigate';
  icon: React.ReactNode;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [q, setQ] = useState('');
  const dq = useDebounce(q, 80);
  const countries = useNwaStore((s) => s.countries);
  const team = useNwaStore((s) => s.team);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const navigate = useNavigate();

  const items: CommandItem[] = useMemo(() => {
    const arr: CommandItem[] = [];
    arr.push({
      id: 'overview',
      label: 'Overview',
      to: '/',
      group: 'Navigate',
      icon: <Search className="h-4 w-4" />,
    });
    arr.push({
      id: 'countries-all',
      label: 'All countries',
      to: '/countries',
      group: 'Navigate',
      icon: <Globe2 className="h-4 w-4" />,
    });
    arr.push({
      id: 'reviews',
      label: 'Reviewer matrix',
      to: '/reviews',
      group: 'Navigate',
      icon: <ClipboardList className="h-4 w-4" />,
    });
    for (const c of countries) {
      arr.push({
        id: `country-${c.id}`,
        label: c.name,
        hint: `${c.region} • #${c.no}`,
        to: `/countries/${c.id}`,
        group: 'Countries',
        icon: <Globe2 className="h-4 w-4" />,
      });
    }
    for (const m of team) {
      arr.push({
        id: `member-${m.id}`,
        label: m.name,
        hint: m.roles.join(', '),
        to: `/team/${m.id}`,
        group: 'Team',
        icon: <Avatar name={m.name} color={m.avatarColor} size="xs" />,
      });
    }
    if (isAdmin) {
      arr.push({
        id: 'admin-assignments',
        label: 'Open assignment matrix',
        to: '/admin/assignments',
        group: 'Admin actions',
        icon: <ClipboardList className="h-4 w-4" />,
      });
      arr.push({
        id: 'admin-team',
        label: 'Manage team',
        to: '/admin/team',
        group: 'Admin actions',
        icon: <Users className="h-4 w-4" />,
      });
      arr.push({
        id: 'admin-deadlines',
        label: 'View deadline calendar',
        to: '/admin/deadlines',
        group: 'Admin actions',
        icon: <Calendar className="h-4 w-4" />,
      });
      arr.push({
        id: 'admin-settings',
        label: 'Settings & data',
        to: '/admin/settings',
        group: 'Admin actions',
        icon: <Settings className="h-4 w-4" />,
      });
    }
    return arr;
  }, [countries, team, isAdmin]);

  const filtered = useMemo(() => {
    const term = dq.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(term) ||
        (i.hint?.toLowerCase().includes(term) ?? false),
    );
  }, [items, dq]);

  const grouped = useMemo(() => {
    const m = new Map<string, CommandItem[]>();
    for (const i of filtered) {
      const cur = m.get(i.group) ?? [];
      cur.push(i);
      m.set(i.group, cur);
    }
    return Array.from(m.entries());
  }, [filtered]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-white/5">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type to search countries, team or actions…"
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-50"
          />
          <kbd className="hidden font-mono text-[10px] text-slate-400 sm:inline">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {grouped.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-slate-500">
              No results for "{q}"
            </div>
          )}
          {grouped.map(([group, items]) => (
            <div key={group} className="mb-2">
              <div className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group}
              </div>
              {items.slice(0, 25).map((i) => (
                <button
                  key={i.id}
                  onClick={() => {
                    navigate(i.to);
                    onOpenChange(false);
                    setQ('');
                  }}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-white/5',
                  )}
                >
                  <div className="text-slate-500">{i.icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-slate-900 dark:text-slate-50">
                      {i.label}
                    </div>
                    {i.hint && (
                      <div className="truncate text-xs text-slate-400">{i.hint}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
