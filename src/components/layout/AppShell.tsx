import { useState, useEffect } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, CloudOff } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { SheetContent, Sheet } from '@/components/ui/sheet';
import { useNwaStore } from '@/store/useNwaStore';
import { cn } from '@/lib/cn';

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-abyss dark:text-slate-100">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenSidebar={() => setMobileOpen(true)} />
        <SyncBanner />
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-1 p-4 md:p-8"
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
}

function SyncBanner() {
  const status = useNwaStore((s) => s.syncStatus);
  const error = useNwaStore((s) => s.syncError);
  if (status === 'live') return null;

  const connecting = status === 'connecting';
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 border-b px-4 py-1.5 text-xs font-medium',
        connecting
          ? 'border-slate-200 bg-slate-50 text-slate-500 dark:border-white/5 dark:bg-white/[0.03] dark:text-slate-400'
          : 'border-warning/30 bg-warning/10 text-warning',
      )}
      role="status"
      aria-live="polite"
    >
      {connecting ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Connecting to live data…
        </>
      ) : (
        <>
          <CloudOff className="h-3.5 w-3.5" />
          {error ?? 'Offline'} — changes are saved locally and will sync when reconnected.
        </>
      )}
    </div>
  );
}
