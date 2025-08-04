/**
 * Progress Component
 *
 * Progress bar for showing completion status
 */

import { cn } from '@/lib/utils';
import * as React from 'react';

const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: number;
    max?: number;
  }
>(({ className, value = 0, max = 100, ...props }, ref) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      ref={ref}
      role="progressbar"
      tabIndex={0}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn('relative h-4 w-full overflow-hidden rounded-full bg-secondary', className)}
      {...props}
    >
      <div
        className="h-full w-full flex-1 bg-primary transition-all duration-300 ease-in-out"
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  );
});
Progress.displayName = 'Progress';

export { Progress };
