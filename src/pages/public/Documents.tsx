import { FolderOpen, ExternalLink, Upload, Eye } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SHAREPOINT_FOLDER_URL } from '@/lib/constants';

export function Documents() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader
        eyebrow="Shared workspace"
        title="Atlas folder"
        subtitle="Review and upload National Water Accounts Atlas files on SharePoint."
      />

      <Card>
        <CardContent className="flex flex-col gap-5 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal/10 text-teal">
              <FolderOpen className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-50">
                National Water Accounts Atlas — shared folder
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                The team's shared SharePoint folder. Anyone with a CGIAR account can open it to
                review documents and upload new files. It opens in SharePoint, where Microsoft
                handles sign-in and file uploads securely.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="primary" className="gap-2">
              <a href={SHAREPOINT_FOLDER_URL} target="_blank" rel="noopener noreferrer">
                <Eye className="h-4 w-4" />
                Open folder to review
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </a>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <a href={SHAREPOINT_FOLDER_URL} target="_blank" rel="noopener noreferrer">
                <Upload className="h-4 w-4" />
                Upload files
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </a>
            </Button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-white/5 dark:bg-white/5 dark:text-slate-400">
            Access is restricted to CGIAR accounts. To upload, open the folder and use SharePoint's
            <span className="font-medium"> Upload </span> button (or drag files in). You can also
            reach this folder from the <span className="font-medium">Atlas folder</span> button at
            the top of every page.
          </div>
        </CardContent>
      </Card>

      {/* Best-effort inline preview. SharePoint may block embedding; the buttons above always work. */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500 dark:border-white/5 dark:bg-white/5 dark:text-slate-400">
          Inline preview — if it stays blank, your browser/SharePoint has blocked embedding; use
          “Open folder to review” above.
        </div>
        <iframe
          title="National Water Accounts Atlas folder"
          src={SHAREPOINT_FOLDER_URL}
          className="h-[640px] w-full border-0 bg-white"
          loading="lazy"
        />
      </Card>
    </div>
  );
}
