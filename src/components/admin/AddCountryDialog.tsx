import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNwaStore } from '@/store/useNwaStore';
import { FIGURE_TYPES, REVIEWERS } from '@/lib/types';
import { REGIONS } from '@/lib/constants';
import type { Region } from '@/lib/types';
import { slugifyPerson } from '@/lib/countryCodes';

interface AddCountryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCountryDialog({ open, onOpenChange }: AddCountryDialogProps) {
  const addCountry = useNwaStore((s) => s.addCountry);
  const countries = useNwaStore((s) => s.countries);
  const [name, setName] = useState('');
  const [iso3, setIso3] = useState('');
  const [region, setRegion] = useState<Region>('West');

  useEffect(() => {
    if (!open) {
      setName('');
      setIso3('');
      setRegion('West');
    }
  }, [open]);

  function submit() {
    if (!name.trim()) return;
    const no = countries.reduce((m, c) => Math.max(m, c.no), 0) + 1;
    addCountry({
      no,
      name: name.trim(),
      iso3: iso3.trim().toUpperCase(),
      region,
      figures: FIGURE_TYPES.map((type) => ({
        type,
        assignedTo: null,
        status: 'not_started',
        deadline: null,
        completedAt: null,
        notes: null,
      })),
      report: {
        assignedTo: null,
        status: 'not_started',
        deadline: null,
        completedAt: null,
        notes: null,
      },
      reviews: REVIEWERS.map((name) => ({
        reviewerId: slugifyPerson(name),
        reviewerName: name,
        status: 'not_started' as const,
        done: false,
        completedAt: null,
        comments: null,
      })),
      flags: [],
      comments: null,
      messages: [],
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add country</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label className="mb-1.5 block">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Country name"
              autoFocus
            />
          </div>
          <div>
            <Label className="mb-1.5 block">ISO-A3 code</Label>
            <Input
              value={iso3}
              onChange={(e) => setIso3(e.target.value.toUpperCase())}
              maxLength={3}
              placeholder="e.g. GHA"
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Region</Label>
            <Select value={region} onValueChange={(v) => setRegion(v as Region)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
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
          <Button variant="primary" onClick={submit} disabled={!name.trim()}>
            Add country
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
