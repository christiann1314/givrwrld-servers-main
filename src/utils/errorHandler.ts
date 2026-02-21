import { toast } from '@/components/ui/use-toast';

/**
 * Sanitized error messages that are safe to show to users
 */
export const ERROR_MESSAGES = {
  // Authentication & Authorization
  UNAUTHORIZED: 'Please log in to continue',
  FORBIDDEN: 'You do not have permission to perform this action',
  SESSION_EXPIRED: 'Your session has expired. Please log in again',
  
  // Network & API
  NETWORK_ERROR: 'Connection error. Please check your internet connection',
  SERVER_ERROR: 'Server is temporarily unavailable. Please try again later',
  TIMEOUT: 'Request timed out. Please try again',
  
  // Data & Validation
  INVALID_INPUT: 'Please check your input and try again',
  DATA_NOT_FOUND: 'Requested information could not be found',
  DUPLICATE_ENTRY: 'This item already exists',
  
  // Payment & Billing
  PAYMENT_FAILED: 'Payment could not be processed. Please try again',
  SUBSCRIPTION_ERROR: 'Unable to manage subscription. Please contact support',
  BILLING_ERROR: 'Billing information could not be updated',
  
  // Server Management
  SERVER_UNAVAILABLE: 'Server management is temporarily unavailable',
  DEPLOYMENT_ERROR: 'Server deployment failed. Please try again',
  CONFIGURATION_ERROR: 'Server configuration could not be saved',
  
  // Security
  SECURITY_ERROR: 'Security check failed. Please contact support if this persists',
  AUDIT_ERROR: 'Security audit could not be completed',
  
  // File & Upload
  UPLOAD_ERROR: 'File upload failed. Please try again',
  FILE_TOO_LARGE: 'File size exceeds the maximum limit',
  INVALID_FILE_TYPE: 'File type is not supported',
  
  // Generic
  UNKNOWN_ERROR: 'Something went wrong. Please try again',
  MAINTENANCE: 'System is under maintenance. Please try again later',
} as const;

/**
 * Error severity levels for logging
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error categories for better organization
 */
export enum ErrorCategory {
  AUTH = 'authentication',
  NETWORK = 'network',
  VALIDATION = 'validation',
  PAYMENT = 'payment',
  SERVER = 'server',
  SECURITY = 'security',
  SYSTEM = 'system'
}

/**
 * Secure error logging interface
 */
interface ErrorLogEntry {
  id: string;
  timestamp: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  userAgent?: string;
  userId?: string;
  context?: Record<string, any>;
  stackTrace?: string;
}

class SecureErrorHandler {
  private static instance: SecureErrorHandler;
  private errorLogs: ErrorLogEntry[] = [];

  private constructor() {}

  static getInstance(): SecureErrorHandler {
    if (!SecureErrorHandler.instance) {
      SecureErrorHandler.instance = new SecureErrorHandler();
    }
    return SecureErrorHandler.instance;
  }

  /**
   * Log error securely without exposing sensitive information
   */
  private logError(error: Error | unknown, category: ErrorCategory, severity: ErrorSeverity, context?: Record<string, any>): string {
    const errorId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    const logEntry: ErrorLogEntry = {
      id: errorId,
      timestamp,
      message: error instanceof Error ? error.message : 'Unknown error',
      category,
      severity,
      userAgent: window.navigator.userAgent,
      context: this.sanitizeContext(context),
      stackTrace: error instanceof Error ? error.stack : undefined
    };

    // Store locally (in production, this would go to a secure logging service)
    this.errorLogs.push(logEntry);

    // Keep only last 100 errors to prevent memory issues
    if (this.errorLogs.length > 100) {
      this.errorLogs = this.errorLogs.slice(-100);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${errorId}] ${category}:${severity}`, error);
    }

    return errorId;
  }

  /**
   * Sanitize context to remove sensitive information
   */
  private sanitizeContext(context?: Record<string, any>): Record<string, any> | undefined {
    if (!context) return undefined;

    const sanitized: Record<string, any> = {};
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth', 'session', 'credential'];

    for (const [key, value] of Object.entries(context)) {
      const isSensitive = sensitiveKeys.some(sensitive => 
        key.toLowerCase().includes(sensitive)
      );

      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = '[OBJECT]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Get user-friendly error message based on error type
   */
  private getUserFriendlyMessage(error: Error | unknown): string {
    if (!(error instanceof Error)) {
      return ERROR_MESSAGES.UNKNOWN_ERROR;
    }

    const message = error.message.toLowerCase();

    // Authentication errors
    if (message.includes('unauthorized') || message.includes('authentication')) {
      return ERROR_MESSAGES.UNAUTHORIZED;
    }
    if (message.includes('forbidden') || message.includes('permission')) {
      return ERROR_MESSAGES.FORBIDDEN;
    }
    if (message.includes('session') || message.includes('expired')) {
      return ERROR_MESSAGES.SESSION_EXPIRED;
    }

    // Network errors
    if (message.includes('network') || message.includes('connection')) {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }
    if (message.includes('timeout')) {
      return ERROR_MESSAGES.TIMEOUT;
    }
    if (message.includes('server') && (message.includes('500') || message.includes('503'))) {
      return ERROR_MESSAGES.SERVER_ERROR;
    }

    // Validation errors
    if (message.includes('invalid') || message.includes('validation')) {
      return ERROR_MESSAGES.INVALID_INPUT;
    }
    if (message.includes('not found') || message.includes('404')) {
      return ERROR_MESSAGES.DATA_NOT_FOUND;
    }
    if (message.includes('duplicate') || message.includes('already exists')) {
      return ERROR_MESSAGES.DUPLICATE_ENTRY;
    }

    // Payment errors
    if (message.includes('payment') || message.includes('stripe')) {
      return ERROR_MESSAGES.PAYMENT_FAILED;
    }

    // Security errors
    if (message.includes('security') || message.includes('audit')) {
      return ERROR_MESSAGES.SECURITY_ERROR;
    }

    return ERROR_MESSAGES.UNKNOWN_ERROR;
  }

  /**
   * Handle error with secure logging and user-friendly messaging
   */
  handleError(
    error: Error | unknown,
    category: ErrorCategory = ErrorCategory.SYSTEM,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, any>,
    showToast: boolean = true
  ): { errorId: string; userMessage: string } {
    const errorId = this.logError(error, category, severity, context);
    const userMessage = this.getUserFriendlyMessage(error);

    if (showToast && typeof window !== 'undefined') {
      // We'll handle toast in the hook wrapper
    }

    return { errorId, userMessage };
  }

  /**
   * Handle async operations with proper error handling
   */
  async handleAsync<T>(
    operation: () => Promise<T>,
    category: ErrorCategory = ErrorCategory.SYSTEM,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, any>
  ): Promise<{ data?: T; error?: { errorId: string; userMessage: string } }> {
    try {
      const data = await operation();
      return { data };
    } catch (error) {
      const errorResult = this.handleError(error, category, severity, context, false);
      return { error: errorResult };
    }
  }

  /**
   * Get recent error logs (for admin debugging)
   */
  getRecentErrors(limit: number = 20): ErrorLogEntry[] {
    return this.errorLogs.slice(-limit);
  }

  /**
   * Clear error logs
   */
  clearLogs(): void {
    this.errorLogs = [];
  }
}

// Export singleton instance
export const errorHandler = SecureErrorHandler.getInstance();

/**
 * Hook for handling errors with toast notifications
 */
export const useErrorHandler = () => {
  // toast is now imported directly from sonner

  const handleError = (
    error: Error | unknown,
    category: ErrorCategory = ErrorCategory.SYSTEM,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, any>,
    customMessage?: string
  ) => {
    const { errorId, userMessage } = errorHandler.handleError(error, category, severity, context, false);

    toast({
      title: "Error",
      description: customMessage || userMessage,
      variant: "destructive",
    });

    return { errorId, userMessage };
  };

  const handleAsyncWithToast = async <T>(
    operation: () => Promise<T>,
    category: ErrorCategory = ErrorCategory.SYSTEM,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, any>,
    successMessage?: string
  ): Promise<T | null> => {
    try {
      const result = await operation();
      
      if (successMessage) {
        toast({
          title: "Success",
          description: successMessage,
        });
      }
      
      return result;
    } catch (error) {
      handleError(error, category, severity, context);
      return null;
    }
  };

  return {
    handleError,
    handleAsyncWithToast,
    getRecentErrors: () => errorHandler.getRecentErrors(),
    clearLogs: () => errorHandler.clearLogs(),
  };
};

/**
 * Wrapper for API calls that automatically handles errors
 */
export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  category: ErrorCategory = ErrorCategory.NETWORK,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM
) => {
  return async (...args: T): Promise<R> => {
    const result = await errorHandler.handleAsync(
      () => fn(...args),
      category,
      severity,
      { functionName: fn.name, args: args.length }
    );

    if (result.error) {
      throw new Error(result.error.userMessage);
    }

    return result.data!;
  };
};
