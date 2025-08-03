/**
 * Simple toast hook
 */

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const toast = (options: ToastOptions) => {
    // For now, just log to console
    // In a real implementation, this would show a toast notification
    const prefix = options.variant === 'destructive' ? '❌' : '✅';
    console.log(
      `${prefix} ${options.title}${options.description ? ': ' + options.description : ''}`
    );
  };

  return { toast };
}
