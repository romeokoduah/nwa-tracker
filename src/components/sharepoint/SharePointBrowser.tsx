import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileText,
  Folder,
  Upload,
  RefreshCw,
  LogIn,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import {
  currentAccount,
  signIn,
  signOut,
  listFolder,
  uploadFile,
  type DriveItem,
} from '@/lib/graph';
import { SHAREPOINT_FOLDER_URL } from '@/lib/constants';

function fmtBytes(n: number): string {
  if (!n) return '—';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

function fmtDate(s: string | null): string {
  if (!s) return '';
  try {
    return new Date(s).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export function SharePointBrowser() {
  const [account, setAccount] = useState<string | null>(null);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listFolder());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the folder');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    currentAccount().then((acc) => {
      if (!active) return;
      if (acc) {
        setAccount(acc.username);
        void refresh();
      }
    });
    return () => {
      active = false;
    };
  }, [refresh]);

  async function handleSignIn() {
    setBusy(true);
    setError(null);
    try {
      const acc = await signIn();
      setAccount(acc.username);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      /* ignore */
    }
    setAccount(null);
    setItems([]);
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (fileRef.current) fileRef.current.value = '';
    if (files.length === 0) return;
    setBusy(true);
    let ok = 0;
    for (const f of files) {
      try {
        await uploadFile(f);
        ok++;
      } catch (err) {
        toast({
          title: `Couldn't upload ${f.name}`,
          description: err instanceof Error ? err.message : 'Upload failed',
          variant: 'error',
        });
      }
    }
    if (ok > 0) toast({ title: `Uploaded ${ok} file${ok === 1 ? '' : 's'}`, variant: 'success' });
    setBusy(false);
    await refresh();
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="max-w-md text-sm text-slate-600 dark:text-slate-300">
          Sign in with your CGIAR account to browse and upload files without leaving the app.
        </p>
        <Button variant="primary" className="gap-2" onClick={handleSignIn} disabled={busy}>
          <LogIn className="h-4 w-4" />
          {busy ? 'Signing in…' : 'Sign in with CGIAR'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-slate-500">Signed in as {account}</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()} disabled={busy}>
            <Upload className="h-3.5 w-3.5" />
            Upload
          </Button>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFiles} />
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={refresh} disabled={loading || busy}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-slate-500" onClick={handleSignOut}>
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-white/5">
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">
            This folder is empty. Use Upload to add the first file.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100 dark:divide-white/5">
            {items.map((it) => (
              <a
                key={it.id}
                href={it.webUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
              >
                {it.isFolder ? (
                  <Folder className="h-4 w-4 shrink-0 text-teal" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                )}
                <span className="min-w-0 flex-1 truncate font-medium text-slate-700 dark:text-slate-200">
                  {it.name}
                </span>
                <span className="hidden shrink-0 text-xs text-slate-400 sm:inline">
                  {it.isFolder ? 'Folder' : fmtBytes(it.size)}
                </span>
                <span className="hidden shrink-0 text-xs text-slate-400 md:inline">
                  {fmtDate(it.lastModified)}
                </span>
                <ExternalLink className="h-3 w-3 shrink-0 opacity-40" />
              </a>
            ))}
          </div>
        )}
      </div>

      <a
        href={SHAREPOINT_FOLDER_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start text-xs font-medium text-teal hover:underline"
      >
        Open the full folder in SharePoint →
      </a>
    </div>
  );
}
