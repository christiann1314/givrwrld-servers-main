import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useErrorHandler, ErrorCategory, ErrorSeverity } from '@/utils/errorHandler';
import { 
  Shield, 
  ShieldAlert, 
  AlertTriangle,
  Eye,
  EyeOff,
  Download,
  Trash2
} from 'lucide-react';

interface ErrorLogEntry {
  id: string;
  timestamp: string;
  message: string;
  category: string;
  severity: string;
  userAgent?: string;
  userId?: string;
  context?: Record<string, any>;
}

export const ErrorLogViewer = () => {
  const { user } = useAuth();
  const { getRecentErrors, clearLogs, handleError } = useErrorHandler();
  const [errors, setErrors] = useState<ErrorLogEntry[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSensitive, setShowSensitive] = useState(false);

  useEffect(() => {
    if (user) {
      checkAdminStatus();
      loadErrors();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-management', {
        body: { action: 'check_admin_status' }
      });

      if (error) throw error;
      setIsAdmin(data?.isAdmin || false);
    } catch (error) {
      handleError(error, ErrorCategory.AUTH, ErrorSeverity.LOW);
    } finally {
      setLoading(false);
    }
  };

  const loadErrors = () => {
    try {
      const recentErrors = getRecentErrors();
      setErrors(recentErrors);
    } catch (error) {
      handleError(error, ErrorCategory.SYSTEM, ErrorSeverity.LOW);
    }
  };

  const handleClearLogs = () => {
    try {
      clearLogs();
      setErrors([]);
    } catch (error) {
      handleError(error, ErrorCategory.SYSTEM, ErrorSeverity.LOW);
    }
  };

  const exportLogs = () => {
    try {
      const logsData = {
        exportDate: new Date().toISOString(),
        errors: errors.map(error => ({
          ...error,
          // Remove sensitive context data for export
          context: error.context ? '[REDACTED]' : undefined
        }))
      };

      const blob = new Blob([JSON.stringify(logsData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `error-logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      handleError(error, ErrorCategory.SYSTEM, ErrorSeverity.LOW);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'security': return <Shield className="h-3 w-3" />;
      case 'authentication': return <ShieldAlert className="h-3 w-3" />;
      default: return <AlertTriangle className="h-3 w-3" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <span>Loading error logs...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          Access denied. Administrator privileges required to view error logs.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Error Log Viewer</span>
          </CardTitle>
          <CardDescription>
            Monitor application errors and security incidents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                {errors.length} errors logged
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSensitive(!showSensitive)}
              >
                {showSensitive ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Show Details
                  </>
                )}
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportLogs}
                disabled={errors.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearLogs}
                disabled={errors.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Logs
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadErrors}
              >
                Refresh
              </Button>
            </div>
          </div>

          {errors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No error logs found. This is a good sign!
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {errors.map((error) => (
                <div key={error.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge className={getSeverityColor(error.severity)}>
                        {getCategoryIcon(error.category)}
                        <span className="ml-1">{error.severity}</span>
                      </Badge>
                      <Badge variant="outline">
                        {error.category}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(error.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {error.id.slice(0, 8)}
                    </code>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium text-red-600">
                      {error.message}
                    </p>
                    
                    {showSensitive && error.context && (
                      <div className="text-xs">
                        <details className="mt-2">
                          <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                            Context Details
                          </summary>
                          <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                            {JSON.stringify(error.context, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                    
                    {showSensitive && error.userAgent && (
                      <p className="text-xs text-gray-500">
                        <span className="font-medium">User Agent:</span> {error.userAgent}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Error Handling Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>• All errors are logged with sanitized information</li>
            <li>• Sensitive data (passwords, tokens, keys) is automatically redacted</li>
            <li>• User-friendly messages are shown instead of technical details</li>
            <li>• Critical errors trigger immediate admin notifications</li>
            <li>• Error logs are automatically cleaned after 30 days</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};