import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap = {
  success:
    'bg-primary/10 text-primary border-primary/30 dark:bg-primary/20 dark:text-primary dark:border-primary/40',
  error:
    'bg-destructive/10 text-destructive border-destructive/30 dark:bg-destructive/20 dark:text-destructive dark:border-destructive/40',
  warning:
    'bg-accent/10 text-accent border-accent/30 dark:bg-accent/20 dark:text-accent dark:border-accent/40',
  info: 'bg-secondary/10 text-secondary-foreground border-secondary/30 dark:bg-secondary/20 dark:text-secondary-foreground dark:border-secondary/40',
};

export function Toaster() {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type];

        return (
          <div
            key={toast.id}
            className={cn(
              'flex items-start gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm glass',
              'animate-in slide-in-from-bottom-2 fade-in duration-300',
              'max-w-sm hover-lift',
              colorMap[toast.type]
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm">{toast.title}</h3>
              {toast.description && <p className="mt-1 text-sm opacity-90">{toast.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 hover:opacity-70 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
