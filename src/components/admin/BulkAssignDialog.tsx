import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FIGURE_TYPES, FIGURE_META, type FigureType } from '@/lib/types';
import { useNwaStore } from '@/store/useNwaStore';

interface BulkAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCountryIds: string[];
  initialFigureType?: FigureType;
  onAssigned?: (figureType: FigureType, memberName: string | null) => void;
}

export function BulkAssignDialog({
  open,
  onOpenChange,
  selectedCountryIds,
  initialFigureType,
  onAssigned,
}: BulkAssignDialogProps) {
  const team = useNwaStore((s) => s.team);
  const bulkAssignFigure = useNwaStore((s) => s.bulkAssignFigure);
  const [figureType, setFigureType] = useState<FigureType>(
    initialFigureType ?? FIGURE_TYPES[0],
  );
  const [memberId, setMemberId] = useState<string>('__none__');

  useEffect(() => {
    if (open) {
      setFigureType(initialFigureType ?? FIGURE_TYPES[0]);
      setMemberId('__none__');
    }
  }, [open, initialFigureType]);

  function apply() {
    const m = memberId === '__none__' ? null : memberId;
    bulkAssignFigure(selectedCountryIds, figureType, m);
    onAssigned?.(figureType, m ? team.find((t) => t.id === m)?.name ?? null : null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk assign figure</DialogTitle>
          <DialogDescription>
            Apply the same producer to {selectedCountryIds.length} selected{' '}
            {selectedCountryIds.length === 1 ? 'country' : 'countries'}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label className="mb-1.5 block">Figure type</Label>
            <Select value={figureType} onValueChange={(v) => setFigureType(v as FigureType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIGURE_TYPES.map((f) => (
                  <SelectItem key={f} value={f}>
                    {FIGURE_META[f].order}. {FIGURE_META[f].shortLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">Producer</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a producer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Unassigned (clear assignee)</SelectItem>
                {team.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={apply}
            disabled={selectedCountryIds.length === 0}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
