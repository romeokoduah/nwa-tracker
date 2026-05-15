import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Moon, Sun, ShieldCheck, LogIn, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';
import { useDarkMode } from '@/hooks/useDarkMode';
import { CommandPalette } from '@/components/common/CommandPalette';

interface TopbarProps {
  onOpenSidebar?: () => void;
}

export function Topbar({ onOpenSidebar }: TopbarProps) {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const navigate = useNavigate();
  const { dark, toggle } = useDarkMode();
  const [paletteOpen, setPaletteOpen] = useState(false);

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

        {isAdmin ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin')}
            className="gap-1.5"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-teal" />
            Admin
          </Button>
        ) : (
          <Button asChild variant="primary" size="sm" className="gap-1.5">
            <Link to="/admin/login">
              <LogIn className="h-3.5 w-3.5" />
              Admin
            </Link>
          </Button>
        )}
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  );
}
