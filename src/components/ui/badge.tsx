import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ocean/40',
  {
    variants: {
      variant: {
        default:
          'bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-200',
        success: 'bg-success/10 text-success ring-1 ring-inset ring-success/20',
        info: 'bg-info/10 text-info ring-1 ring-inset ring-info/20',
        warning: 'bg-warning/10 text-warning ring-1 ring-inset ring-warning/20',
        danger: 'bg-danger/10 text-danger ring-1 ring-inset ring-danger/20',
        teal: 'bg-teal/10 text-teal ring-1 ring-inset ring-teal/20',
        muted: 'bg-slate-200/70 text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/5',
        outline:
          'border border-slate-200 text-slate-700 dark:border-white/10 dark:text-slate-200',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
