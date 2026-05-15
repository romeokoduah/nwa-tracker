import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Droplets, ShieldAlert, LogIn, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ADMIN_USERNAME, ADMIN_PASSWORD, PROGRAMME_NAME } from '@/lib/constants';
import { useToast } from '@/components/ui/toast';

export function AdminLogin() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const ok = login(u, p);
    if (ok) {
      toast({ title: 'Signed in as admin', variant: 'success' });
      const target = (location.state as { from?: string } | null)?.from ?? '/admin';
      navigate(target);
    } else {
      setError('Invalid username or password.');
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-abyss">
      <div className="absolute inset-0 bg-water-grid opacity-50" aria-hidden />
      <Card className="relative w-full max-w-md p-7">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to dashboard
        </Link>
        <div className="mt-4 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-ocean to-navy text-white shadow-sm">
            <Droplets className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-base font-semibold text-slate-900 dark:text-slate-50">
              {PROGRAMME_NAME}
            </div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Admin sign-in
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="mt-6 grid gap-4">
          <div>
            <Label className="mb-1.5 block">Username</Label>
            <Input
              autoFocus
              value={u}
              onChange={(e) => setU(e.target.value)}
              placeholder="admin"
              autoComplete="username"
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Password</Label>
            <Input
              type="password"
              value={p}
              onChange={(e) => setP(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/5 p-2.5 text-xs text-danger">
              {error}
            </div>
          )}
          <Button variant="primary" type="submit" className="gap-1.5">
            <LogIn className="h-3.5 w-3.5" />
            Sign in
          </Button>
        </form>

        <div className="mt-5 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-warning dark:bg-warning/10">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <div className="font-semibold">v1 — local-only authentication</div>
            <div className="text-warning/80">
              Credentials are hardcoded ({ADMIN_USERNAME} / {ADMIN_PASSWORD}) and validated in
              the browser. Replace with real auth before any production deployment.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
