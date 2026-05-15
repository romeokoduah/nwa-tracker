import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FigureType, TaskStatus } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/constants';
import { useNwaStore } from '@/store/useNwaStore';
import { useToast } from '@/components/ui/toast';

const STATUSES: TaskStatus[] = ['not_started', 'in_progress', 'in_review', 'done', 'blocked'];

interface FigureCellEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  countryId: string;
  figureType: FigureType;
}

export function FigureCellEditor({
  open,
  onOpenChange,
  countryId,
  figureType,
}: FigureCellEditorProps) {
  const country = useNwaStore((s) => s.countries.find((c) => c.id === countryId));
  const team = useNwaStore((s) => s.team);
  const updateFigure = useNwaStore((s) => s.updateFigure);
  const { toast } = useToast();

  const figure = country?.figures.find((f) => f.type === figureType);

  const [assignedTo, setAssignedTo] = useState<string>(figure?.assignedTo ?? '__none__');
  const [status, setStatus] = useState<TaskStatus>(figure?.status ?? 'not_started');
  const [deadline, setDeadline] = useState<string>(figure?.deadline ?? '');
  const [notes, setNotes] = useState<string>(figure?.notes ?? '');

  useEffect(() => {
    if (open) {
      setAssignedTo(figure?.assignedTo ?? '__none__');
      setStatus(figure?.status ?? 'not_started');
      setDeadline(figure?.deadline ?? '');
      setNotes(figure?.notes ?? '');
    }
  }, [open, figure?.assignedTo, figure?.status, figure?.deadline, figure?.notes]);

  if (!country || !figure) return null;

  function save() {
    updateFigure(countryId, figureType, {
      assignedTo: assignedTo === '__none__' ? null : assignedTo,
      status,
      deadline: deadline || null,
      notes: notes || null,
    });
    toast({
      title: `Saved ${figureType} for ${country!.name}`,
      variant: 'success',
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{country.name}</DialogTitle>
          <DialogDescription>{figureType}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label className="mb-1.5 block">Producer</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a producer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Unassigned</SelectItem>
                {team.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">Deadline</Label>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional notes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
