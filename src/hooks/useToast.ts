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
      `${prefix} ${options.title}${options.description ? `: ${options.description}` : ''}`
    );

    // In a real app, this would dispatch a toast event or use a toast library
    // For now, we'll also show an alert for important notifications
    if (
      options.title.includes('Successfully authenticated') ||
      options.title.includes('models available')
    ) {
      alert(`${options.title}\n${options.description || ''}`);
    }
  };

  return { toast };
}
