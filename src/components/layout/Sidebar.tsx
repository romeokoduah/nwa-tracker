import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Globe2,
  Users,
  BarChart3,
  FileText,
  CheckCircle2,
  Settings,
  Calendar,
  History,
  ClipboardList,
  Droplets,
  LogOut,
  LayoutDashboard,
  Mail,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useNwaStore } from '@/store/useNwaStore';
import { selectOverallCompletion } from '@/store/selectors';
import { cn } from '@/lib/cn';
import { PROGRAMME_NAME, PROGRAMME_OWNER } from '@/lib/constants';
import { formatPercent } from '@/lib/format';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

const PROGRAMME: NavItem[] = [
  { to: '/', label: 'Overview', icon: Home, end: true },
  { to: '/countries', label: 'Countries', icon: Globe2 },
  { to: '/team', label: 'Team', icon: Users },
];
const WORKSTREAMS: NavItem[] = [
  { to: '/figures', label: 'Figures', icon: BarChart3 },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/reviews', label: 'Reviews', icon: CheckCircle2 },
];
const ADMIN: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: Home, end: true },
  { to: '/admin/assignments', label: 'Assignments', icon: ClipboardList },
  { to: '/admin/countries', label: 'Countries', icon: Globe2 },
  { to: '/admin/team', label: 'Team', icon: Users },
  { to: '/admin/deadlines', label: 'Deadlines', icon: Calendar },
  { to: '/admin/mailing', label: 'Mailing', icon: Mail },
  { to: '/admin/activity', label: 'Activity', icon: History },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const completion = useNwaStore((s) =>
    selectOverallCompletion({
      countries: s.countries,
      team: s.team,
      activity: s.activity,
      lastSyncedAt: s.lastSyncedAt,
    }),
  );

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-white/5 dark:bg-deep">
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-5 dark:border-white/5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-ocean to-navy text-white shadow-sm">
          <Droplets className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate font-display text-sm font-semibold text-slate-900 dark:text-slate-50">
            {PROGRAMME_NAME}
          </div>
          <div className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {PROGRAMME_OWNER}
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {currentUser && (
          <NavGroup
            label="My space"
            items={[{ to: '/me', label: 'My workspace', icon: LayoutDashboard }]}
            onNavigate={onNavigate}
          />
        )}
        <NavGroup label="Programme" items={PROGRAMME} onNavigate={onNavigate} />
        <NavGroup label="Workstreams" items={WORKSTREAMS} onNavigate={onNavigate} />
        {isAdmin && (
          <NavGroup
            label="Admin"
            items={ADMIN}
            adminHeader
            onNavigate={onNavigate}
          />
        )}
      </nav>

      <div className="border-t border-slate-200 p-4 dark:border-white/5">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium uppercase tracking-wide text-slate-400">
            Programme
          </span>
          <span className="font-mono text-slate-700 dark:text-slate-200">
            {formatPercent(completion, 1)}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal to-cyan"
            style={{ width: `${(completion * 100).toFixed(2)}%` }}
          />
        </div>
        {currentUser ? (
          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out{currentUser.isAdmin ? ' of admin' : ''}
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
          >
            Sign in
          </button>
        )}
      </div>
    </aside>
  );
}

function NavGroup({
  label,
  items,
  adminHeader,
  onNavigate,
}: {
  label: string;
  items: NavItem[];
  adminHeader?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="mb-4">
      <div
        className={cn(
          'mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.12em]',
          adminHeader ? 'text-teal' : 'text-slate-400',
        )}
      >
        {label}
      </div>
      <div className="flex flex-col gap-0.5">
        {items.map((item) => (
          <NavItemLink key={item.to} item={item} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}

function NavItemLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-gradient-to-r from-ocean/10 to-transparent text-ocean ring-1 ring-inset ring-ocean/10 dark:from-cyan/10 dark:text-cyan'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-slate-50',
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0 opacity-80" />
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
}
