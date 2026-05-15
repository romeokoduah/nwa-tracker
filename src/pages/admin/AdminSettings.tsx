import { useRef, useState } from 'react';
import { Download, Upload, RotateCcw } from 'lucide-react';
import { useNwaStore } from '@/store/useNwaStore';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { downloadJson, readJsonFile, isAppStateLike } from '@/lib/export';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/components/ui/toast';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function AdminSettings() {
  const exportJson = useNwaStore((s) => s.exportJson);
  const importJson = useNwaStore((s) => s.importJson);
  const resetToSeed = useNwaStore((s) => s.resetToSeed);
  const fileRef = useRef<HTMLInputElement>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const { toast } = useToast();
  const { dark, toggle } = useDarkMode();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await readJsonFile(file);
      if (!isAppStateLike(parsed)) throw new Error('JSON does not match expected schema');
      setPendingImport(JSON.stringify(parsed));
      setImportOpen(true);
    } catch (err) {
      toast({
        title: 'Import failed',
        description: err instanceof Error ? err.message : 'Invalid JSON',
        variant: 'error',
      });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Settings"
        subtitle="Data management, theme and admin preferences."
      />

      <Card>
        <CardHeader>
          <CardTitle>Data</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Button
            variant="primary"
            className="gap-2"
            onClick={() => {
              downloadJson(
                `nwa-tracker-export-${new Date().toISOString().slice(0, 10)}.json`,
                JSON.parse(exportJson()),
              );
              toast({ title: 'Export downloaded', variant: 'success' });
            }}
          >
            <Download className="h-4 w-4" />
            Export JSON
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Import JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleFile}
          />
          <Button
            variant="destructive"
            className="gap-2"
            onClick={() => setResetOpen(true)}
          >
            <RotateCcw className="h-4 w-4" />
            Reset to seed data
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-white/5">
            <div>
              <Label className="text-sm font-medium normal-case tracking-normal text-slate-700 dark:text-slate-200">
                Dark mode
              </Label>
              <div className="text-xs text-slate-500">Preference persists across reloads.</div>
            </div>
            <Switch checked={dark} onCheckedChange={() => toggle()} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admin credentials</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-xs text-warning dark:bg-warning/10">
            Username and password are compiled into the bundle (
            <code className="rounded bg-warning/10 px-1">admin / nwa2026</code>) and are local to
            the browser session. Replace this with proper auth before any production deployment.
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset all data?"
        description="This restores the original seed data and clears any local changes — including all assignments, deadlines and activity log entries."
        destructive
        confirmLabel="Reset"
        onConfirm={() => {
          resetToSeed();
          toast({ title: 'Reset to seed data', variant: 'info' });
        }}
      />
      <ConfirmDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Replace current data with imported JSON?"
        description="The current tracker state will be replaced. You can re-import the previous export later if needed."
        confirmLabel="Import"
        onConfirm={() => {
          if (pendingImport) {
            try {
              importJson(pendingImport);
              toast({ title: 'Imported successfully', variant: 'success' });
            } catch (err) {
              toast({
                title: 'Import failed',
                description: err instanceof Error ? err.message : 'Invalid JSON',
                variant: 'error',
              });
            }
            setPendingImport(null);
          }
        }}
      />
    </div>
  );
}
