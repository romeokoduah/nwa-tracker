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
import { Checkbox } from '@/components/ui/checkbox';
import { useNwaStore } from '@/store/useNwaStore';
import type { Role } from '@/lib/types';
import { AVATAR_PALETTE } from '@/lib/constants';
import { colorFromName } from '@/lib/format';
import { cn } from '@/lib/cn';

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'figure_producer', label: 'Figure producer' },
  { value: 'figure_lead', label: 'Figure lead' },
  { value: 'reviewer', label: 'Reviewer' },
  { value: 'report_writer', label: 'Report writer' },
];

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddMemberDialog({ open, onOpenChange }: AddMemberDialogProps) {
  const addMember = useNwaStore((s) => s.addMember);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roles, setRoles] = useState<Role[]>(['figure_producer']);
  const [color, setColor] = useState<string>(AVATAR_PALETTE[0]);

  useEffect(() => {
    if (!open) {
      setName('');
      setEmail('');
      setRoles(['figure_producer']);
      setColor(AVATAR_PALETTE[0]);
    }
  }, [open]);

  useEffect(() => {
    if (name) setColor(colorFromName(name, AVATAR_PALETTE));
  }, [name]);

  function toggleRole(r: Role) {
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  function submit() {
    if (!name.trim()) return;
    addMember({
      name: name.trim(),
      email: email.trim() || null,
      roles,
      avatarColor: color,
      active: true,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add team member</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label className="mb-1.5 block">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              autoFocus
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Email (optional)</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="person@example.org"
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Roles</Label>
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map((r) => (
                <label
                  key={r.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs transition-colors dark:border-white/10',
                    roles.includes(r.value)
                      ? 'border-ocean bg-ocean/5 text-ocean'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5',
                  )}
                >
                  <Checkbox
                    checked={roles.includes(r.value)}
                    onCheckedChange={() => toggleRole(r.value)}
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">Avatar colour</Label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-6 w-6 rounded-full ring-2 ring-offset-2',
                    color === c ? 'ring-ocean' : 'ring-transparent',
                  )}
                  style={{ background: c }}
                  aria-label="Choose colour"
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!name.trim()}>
            Add member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
