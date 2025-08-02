import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Loader2, XCircle } from 'lucide-react';

interface StreamProgressProps {
  status: 'idle' | 'connecting' | 'streaming' | 'completed' | 'error';
  message?: string;
  progress?: number;
  className?: string;
}

export function StreamProgress({ status, message, progress, className }: StreamProgressProps) {
  const getIcon = () => {
    switch (status) {
      case 'connecting':
      case 'streaming':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'error':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getColorClass = () => {
    switch (status) {
      case 'connecting':
      case 'streaming':
        return 'text-primary border-primary/30 bg-primary/10';
      case 'completed':
        return 'text-primary border-primary/30 bg-primary/10';
      case 'error':
        return 'text-destructive border-destructive/30 bg-destructive/10';
      default:
        return 'text-muted-foreground border-border bg-muted/50';
    }
  };

  const getStatusText = () => {
    if (message) return message;
    switch (status) {
      case 'idle':
        return 'Ready to start';
      case 'connecting':
        return 'Connecting to AI...';
      case 'streaming':
        return 'Receiving response...';
      case 'completed':
        return 'Response complete';
      case 'error':
        return 'An error occurred';
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2 rounded-lg border transition-all duration-300',
        getColorClass(),
        className
      )}
    >
      {getIcon()}
      <div className="flex-1">
        <p className="text-sm font-medium">{getStatusText()}</p>
        {progress !== undefined && status === 'streaming' && (
          <div className="mt-1 h-1 bg-primary/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
