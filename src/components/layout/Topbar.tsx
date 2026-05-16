import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Moon, Sun, LogIn, LogOut, Menu, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/useAuthStore';
import { useNwaStore } from '@/store/useNwaStore';
import { useDarkMode } from '@/hooks/useDarkMode';
import { CommandPalette } from '@/components/common/CommandPalette';

interface TopbarProps {
  onOpenSidebar?: () => void;
}

export function Topbar({ onOpenSidebar }: TopbarProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);
  const team = useNwaStore((s) => s.team);
  const navigate = useNavigate();
  const { dark, toggle } = useDarkMode();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const member = currentUser
    ? team.find((m) => m.id === currentUser.id)
    : undefined;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-white/5 dark:bg-deep/80 md:px-6">
      <button
        onClick={onOpenSidebar}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 md:hidden"
        aria-label="Open sidebar"
      >
        <Menu className="h-4 w-4" />
      </button>

      <button
        onClick={() => setPaletteOpen(true)}
        className="group flex h-9 max-w-md flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-sm text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-deep dark:text-slate-500 dark:hover:bg-white/5"
        aria-label="Open search"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Search countries, team, actions…</span>
        <span className="md:hidden">Search…</span>
        <span className="ml-auto hidden font-mono text-[11px] text-slate-400 md:inline">
          ⌘K
        </span>
      </button>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {currentUser ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg border border-slate-200 py-1 pl-1 pr-2.5 text-sm transition-colors hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5">
                <Avatar
                  name={currentUser.name}
                  color={member?.avatarColor}
                  size="sm"
                />
                <span className="hidden max-w-[140px] truncate font-medium text-slate-700 dark:text-slate-200 sm:inline">
                  {currentUser.name}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                {currentUser.isAdmin ? 'Administrator' : currentUser.name}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/me')}>
                <LayoutDashboard className="h-4 w-4" />
                My workspace
              </DropdownMenuItem>
              {currentUser.isAdmin && (
                <DropdownMenuItem onClick={() => navigate('/admin')}>
                  <ShieldCheck className="h-4 w-4 text-teal" />
                  Admin dashboard
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="text-danger focus:bg-danger/10"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild variant="primary" size="sm" className="gap-1.5">
            <Link to="/login">
              <LogIn className="h-3.5 w-3.5" />
              Sign in
            </Link>
          </Button>
        )}
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  );
}
