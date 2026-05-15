import * as React from 'react';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const SIZE_CLASS: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'h-5 w-5 text-[10px]',
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
};

export function Avatar({ name, color, size = 'sm', className, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-1 ring-inset ring-black/5',
        SIZE_CLASS[size],
        className,
      )}
      style={{ background: color ?? '#1E5A8A' }}
      title={name}
      {...props}
    >
      {initials(name)}
    </div>
  );
}
