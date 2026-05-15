import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-navy text-white shadow-sm hover:bg-ocean active:bg-navy dark:bg-ocean dark:hover:bg-cyan/80 dark:hover:text-navy',
        primary:
          'bg-gradient-to-br from-ocean to-navy text-white shadow-sm hover:shadow-md hover:from-navy hover:to-navy/90',
        outline:
          'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-deep dark:text-slate-100 dark:hover:bg-white/5',
        ghost:
          'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5',
        destructive:
          'bg-danger text-white hover:bg-danger/90',
        secondary:
          'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10',
        link: 'text-ocean underline-offset-4 hover:underline dark:text-cyan',
        success: 'bg-success text-white hover:bg-success/90',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-6',
        icon: 'h-9 w-9',
        xs: 'h-7 px-2 text-xs',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };
