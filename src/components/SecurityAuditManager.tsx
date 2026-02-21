import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/components/ui/use-toast';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  RefreshCw
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

interface SecurityAudit {
  id: string;
  audit_type: string;
  status: string;
  findings: any[];
  severity_counts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  recommendations: string[];
  created_at: string;
  completed_at?: string;
  dependency_audits?: any[];
}

export const SecurityAuditManager = () => {
  const { user } = useAuth();
  // toast is now imported directly from sonner
  const [audits, setAudits] = useState<SecurityAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAudit, setRunningAudit] = useState(false);
  const [selectedAuditType, setSelectedAuditType] = useState('comprehensive');

  useEffect(() => {
    if (user) {
      loadAudits();
    }
  }, [user]);

  const loadAudits = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('security-audit', {
        body: { action: 'list_audits' }
      });

      if (error) throw error;
      setAudits(data || []);
    } catch (error) {
      console.error('Error loading audits:', error);
      toast({
        title: "Error",
        description: "Failed to load security audits",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const startAudit = async () => {
    try {
      setRunningAudit(true);
      const { data, error } = await supabase.functions.invoke('security-audit', {
        body: { 
          action: 'start_audit',
          audit_type: selectedAuditType
        }
      });

      if (error) throw error;

      toast({
        title: "Audit Started",
        description: `${selectedAuditType} security audit is running...`,
      });

      // Reload audits after a brief delay
      setTimeout(() => {
        loadAudits();
      }, 2000);

    } catch (error) {
      console.error('Error starting audit:', error);
      toast({
        title: "Error",
        description: "Failed to start security audit",
        variant: "destructive"
      });
    } finally {
      setRunningAudit(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTotalFindings = (audit: SecurityAudit) => {
    return audit.severity_counts.critical + 
           audit.severity_counts.high + 
           audit.severity_counts.medium + 
           audit.severity_counts.low;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Settings className="h-4 w-4 animate-spin" />
            <span>Loading security audits...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          Please log in to access security audit features.
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
            <span>Security Audit Manager</span>
          </CardTitle>
          <CardDescription>
            Run automated security audits and monitor your application's security posture
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Select 
                value={selectedAuditType} 
                onValueChange={setSelectedAuditType}
                disabled={runningAudit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select audit type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comprehensive">Comprehensive Audit</SelectItem>
                  <SelectItem value="dependency_scan">Dependency Scan</SelectItem>
                  <SelectItem value="rls_check">RLS Policy Check</SelectItem>
                  <SelectItem value="access_audit">Access Control Audit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={startAudit} 
              disabled={runningAudit}
              className="min-w-32"
            >
              {runningAudit ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Start Audit
                </>
              )}
            </Button>
          </div>

          <div className="text-sm text-gray-600">
            <p><strong>Comprehensive:</strong> Full security scan including dependencies, RLS, and access controls</p>
            <p><strong>Dependency Scan:</strong> Check for vulnerable packages and outdated dependencies</p>
            <p><strong>RLS Check:</strong> Verify Row Level Security policies are properly configured</p>
            <p><strong>Access Audit:</strong> Review authentication and authorization settings</p>
          </div>
        </CardContent>
      </Card>

      {audits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Security Audits</CardTitle>
            <CardDescription>
              Latest security audit results and findings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {audits.map((audit) => (
                <div key={audit.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(audit.status)}
                      <span className="font-medium capitalize">
                        {audit.audit_type.replace('_', ' ')} Audit
                      </span>
                      <Badge variant="outline">
                        {new Date(audit.created_at).toLocaleDateString()}
                      </Badge>
                    </div>
                    <Badge 
                      variant={audit.status === 'completed' ? 'default' : 
                              audit.status === 'running' ? 'secondary' : 'destructive'}
                    >
                      {audit.status}
                    </Badge>
                  </div>

                  {audit.status === 'completed' && (
                    <>
                      <div className="flex items-center space-x-4">
                        <div className="text-sm">
                          <span className="font-medium">Total Findings: </span>
                          {getTotalFindings(audit)}
                        </div>
                        {audit.dependency_audits && (
                          <div className="text-sm">
                            <span className="font-medium">Dependencies Scanned: </span>
                            {audit.dependency_audits.length}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {audit.severity_counts.critical > 0 && (
                          <Badge className={getSeverityColor('critical')}>
                            {audit.severity_counts.critical} Critical
                          </Badge>
                        )}
                        {audit.severity_counts.high > 0 && (
                          <Badge className={getSeverityColor('high')}>
                            {audit.severity_counts.high} High
                          </Badge>
                        )}
                        {audit.severity_counts.medium > 0 && (
                          <Badge className={getSeverityColor('medium')}>
                            {audit.severity_counts.medium} Medium
                          </Badge>
                        )}
                        {audit.severity_counts.low > 0 && (
                          <Badge className={getSeverityColor('low')}>
                            {audit.severity_counts.low} Low
                          </Badge>
                        )}
                        {getTotalFindings(audit) === 0 && (
                          <Badge className="bg-green-500 text-white">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            No Issues
                          </Badge>
                        )}
                      </div>

                      {audit.recommendations && audit.recommendations.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Recommendations:</h4>
                          <ul className="text-sm space-y-1">
                            {audit.recommendations.slice(0, 3).map((rec, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <AlertTriangle className="h-3 w-3 mt-0.5 text-yellow-500 flex-shrink-0" />
                                <span>{rec}</span>
                              </li>
                            ))}
                            {audit.recommendations.length > 3 && (
                              <li className="text-gray-500">
                                + {audit.recommendations.length - 3} more recommendations
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </>
                  )}

                  {audit.status === 'running' && (
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">
                        Security audit in progress...
                      </div>
                      <Progress value={undefined} className="w-full" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Audit Schedule</CardTitle>
          <CardDescription>
            Automated security audits run on a regular schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded">
              <div>
                <div className="font-medium">Dependency Scan</div>
                <div className="text-sm text-gray-600">Weekly automated scan</div>
              </div>
              <Badge variant="outline">Weekly</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <div>
                <div className="font-medium">RLS Policy Check</div>
                <div className="text-sm text-gray-600">Monthly security review</div>
              </div>
              <Badge variant="outline">Monthly</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <div>
                <div className="font-medium">Comprehensive Audit</div>
                <div className="text-sm text-gray-600">Full security assessment</div>
              </div>
              <Badge variant="outline">Monthly</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};