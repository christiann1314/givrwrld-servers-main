import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { errorHandler, ErrorCategory, ErrorSeverity } from '@/utils/errorHandler';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  // Log the error securely without exposing sensitive information
  const { errorId } = errorHandler.handleError(
    error,
    ErrorCategory.SYSTEM,
    ErrorSeverity.HIGH,
    { component: 'ErrorBoundary' },
    false
  );

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-gray-800/60 backdrop-blur-md border border-gray-600/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <CardTitle className="text-xl text-white">Something went wrong</CardTitle>
          <CardDescription className="text-gray-300">
            We encountered an unexpected error. Our team has been notified.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-4">
              Error ID: <code className="bg-gray-700/50 px-2 py-1 rounded text-xs">{errorId}</code>
            </p>
            <p className="text-sm text-gray-400">
              If this problem persists, please contact support with the error ID above.
            </p>
          </div>
          
          <div className="flex flex-col space-y-2">
            <Button 
              onClick={resetErrorBoundary}
              className="w-full bg-emerald-500 hover:bg-emerald-600"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button 
              onClick={handleReload}
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Page
            </Button>
            <Button 
              onClick={handleGoHome}
              variant="ghost"
              className="w-full text-gray-400 hover:text-white hover:bg-gray-700/30"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface SecureErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
}

export const SecureErrorBoundary: React.FC<SecureErrorBoundaryProps> = ({
  children,
  fallback: Fallback = ErrorFallback,
  onError,
}) => {
  const handleError = (error: Error, errorInfo: { componentStack: string }) => {
    // Log error securely
    errorHandler.handleError(
      error,
      ErrorCategory.SYSTEM,
      ErrorSeverity.HIGH,
      { 
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      },
      false
    );

    // Call custom error handler if provided
    onError?.(error, errorInfo);
  };

  return (
    <ErrorBoundary
      FallbackComponent={Fallback}
      onError={handleError}
      onReset={() => {
        // Clear any error state and reload if necessary
        window.location.reload();
      }}
    >
      {children}
    </ErrorBoundary>
  );
};