import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Droplets, ShieldAlert, LogIn, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useNwaStore } from '@/store/useNwaStore';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ADMIN_USERNAME, SHARED_PASSWORD, PROGRAMME_NAME } from '@/lib/constants';
import { useToast } from '@/components/ui/toast';

export function Login() {
  const login = useAuthStore((s) => s.login);
  const team = useNwaStore((s) => s.team);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [error, setError] = useState<string | null>(null);

  const sampleNames = useMemo(
    () =>
      [...team]
        .map((m) => m.name)
        .sort((a, b) => a.localeCompare(b)),
    [team],
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const ok = login(u, p);
    if (!ok) {
      setError('Invalid username or password.');
      return;
    }
    const isAdmin = u.trim().toLowerCase() === ADMIN_USERNAME;
    toast({
      title: isAdmin ? 'Signed in as admin' : `Signed in as ${u.trim()}`,
      variant: 'success',
    });
    const from = (location.state as { from?: string } | null)?.from;
    navigate(from ?? (isAdmin ? '/admin' : '/me'));
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 dark:bg-abyss">
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
              Sign in
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
              placeholder="your name, or 'admin'"
              autoComplete="username"
              list="user-names"
            />
            <datalist id="user-names">
              <option value="admin" />
              {sampleNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
          <div>
            <Label className="mb-1.5 block">Password</Label>
            <Input
              type="password"
              value={p}
              onChange={(e) => setP(e.target.value)}
              autoComplete="current-password"
              placeholder={SHARED_PASSWORD}
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

        <div className="mt-5 grid gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
            <div className="mb-1 font-semibold text-slate-700 dark:text-slate-200">
              How to sign in
            </div>
            Use your <strong>name</strong> as the username (case-insensitive) and the
            shared password <code className="rounded bg-slate-200 px-1 dark:bg-white/10">{SHARED_PASSWORD}</code>.
            Administrators sign in as <code className="rounded bg-slate-200 px-1 dark:bg-white/10">admin</code>.
            You'll only be able to tick off work that's assigned to you.
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-warning dark:bg-warning/10">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div>
              <div className="font-semibold">v1 — local-only authentication</div>
              <div className="text-warning/80">
                One shared password, validated in the browser. Replace with real
                per-user auth before any production deployment.
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
