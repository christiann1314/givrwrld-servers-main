// Temporary compatibility shim for old toast calls
import { toast as sonnerToast } from 'sonner';

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export const toast = (options: ToastOptions | string) => {
  if (typeof options === 'string') {
    return sonnerToast(options);
  }
  
  const { title = '', description = '', variant = 'default' } = options;
  const message = title + (description ? ` - ${description}` : '');
  
  if (variant === 'destructive') {
    return sonnerToast.error(message);
  } else {
    return sonnerToast.success(message);
  }
};