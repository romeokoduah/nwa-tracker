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
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { AddMemberDialog } from '@/components/admin/AddMemberDialog';
import { useToast } from '@/components/ui/toast';
import type { Role } from '@/lib/types';

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  figure_producer: 'Producer',
  figure_lead: 'Figure lead',
  reviewer: 'Reviewer',
  report_writer: 'Report writer',
};

export function AdminTeam() {
  const team = useNwaStore((s) => s.team);
  const removeMember = useNwaStore((s) => s.removeMember);
  const [addOpen, setAddOpen] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const target = toDelete ? team.find((m) => m.id === toDelete) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Admin"
        title="Team"
        subtitle="Manage team members. Removing someone returns their work to Unassigned."
        actions={
          <Button variant="primary" size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add member
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {team.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={m.name} color={m.avatarColor} size="sm" />
                    <span className="font-medium">{m.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  {m.email ?? '—'}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {m.roles.map((r) => (
                      <Badge key={r} variant="outline" className="text-[10px]">
                        {ROLE_LABEL[r]}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="xs"
                    className="text-danger hover:bg-danger/10 hover:text-danger"
                    onClick={() => setToDelete(m.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <AddMemberDialog open={addOpen} onOpenChange={setAddOpen} />
      {target && (
        <ConfirmDialog
          open={!!target}
          onOpenChange={(o) => !o && setToDelete(null)}
          title={`Remove ${target.name}?`}
          description="Their figure and report assignments will be cleared."
          confirmLabel="Remove"
          destructive
          onConfirm={() => {
            removeMember(target.id);
            toast({ title: `Removed ${target.name}`, variant: 'info' });
          }}
        />
      )}
    </div>
  );
}
