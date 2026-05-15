import * as React from 'react';
import { cn } from '@/lib/cn';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[80px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-deep dark:text-slate-100 dark:placeholder:text-slate-500',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
