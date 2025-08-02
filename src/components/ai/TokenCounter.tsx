import { cn } from '@/lib/utils';
import { Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TokenCounterProps {
  current: number;
  max?: number;
  showCost?: boolean;
  costPerToken?: number;
  className?: string;
}

export function TokenCounter({
  current,
  max = 4096,
  showCost = false,
  costPerToken = 0.00002, // Default GPT-4 pricing
  className,
}: TokenCounterProps) {
  const [animatedCurrent, setAnimatedCurrent] = useState(0);
  const percentage = (current / max) * 100;
  const cost = showCost ? current * costPerToken : 0;

  useEffect(() => {
    const duration = 500; // Animation duration in ms
    const steps = 30;
    const startValue = animatedCurrent;
    const increment = (current - startValue) / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      if (currentStep < steps) {
        setAnimatedCurrent(Math.round(startValue + increment * (currentStep + 1)));
        currentStep++;
      } else {
        setAnimatedCurrent(current);
        clearInterval(timer);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [current, animatedCurrent]);

  const getColorClass = () => {
    if (percentage < 50) return 'text-primary';
    if (percentage < 80) return 'text-accent';
    return 'text-destructive';
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Zap className={cn('w-4 h-4', getColorClass())} />
          <span className="font-medium">Tokens Used</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('font-mono', getColorClass())}>
            {animatedCurrent.toLocaleString()} / {max.toLocaleString()}
          </span>
          {showCost && <span className="text-muted-foreground">${cost.toFixed(4)}</span>}
        </div>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-500 ease-out rounded-full',
            percentage < 50 && 'bg-gradient-primary',
            percentage >= 50 && percentage < 80 && 'bg-accent',
            percentage >= 80 && 'bg-destructive'
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {percentage > 90 && (
        <p className="text-xs text-destructive animate-pulse">Approaching token limit</p>
      )}
    </div>
  );
}
