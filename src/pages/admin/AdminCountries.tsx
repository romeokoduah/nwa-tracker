import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useNwaStore } from '@/store/useNwaStore';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { AddCountryDialog } from '@/components/admin/AddCountryDialog';
import { useToast } from '@/components/ui/toast';

export function AdminCountries() {
  const countries = useNwaStore((s) => s.countries);
  const removeCountry = useNwaStore((s) => s.removeCountry);
  const [addOpen, setAddOpen] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const target = toDelete ? countries.find((c) => c.id === toDelete) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Countries"
        subtitle="Manage the countries included in the programme."
        actions={
          <Button variant="primary" size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add country
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>ISO-A3</TableHead>
              <TableHead>Region</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {countries.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs text-slate-400">{c.no}</TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="font-mono text-xs">{c.iso3}</TableCell>
                <TableCell>
                  <Badge variant="outline">{c.region}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-danger hover:bg-danger/10 hover:text-danger"
                    onClick={() => setToDelete(c.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <AddCountryDialog open={addOpen} onOpenChange={setAddOpen} />
      {target && (
        <ConfirmDialog
          open={!!target}
          onOpenChange={(o) => !o && setToDelete(null)}
          title={`Remove ${target.name}?`}
          description="This deletes all figures, report and review records for the country."
          confirmLabel="Remove"
          destructive
          onConfirm={() => {
            removeCountry(target.id);
            toast({ title: `Removed ${target.name}`, variant: 'info' });
          }}
        />
      )}
    </div>
  );
}
