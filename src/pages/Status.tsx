
import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ENV } from '@/config/env';

type HealthState = {
  loading: boolean;
  error: string | null;
  db: boolean | null;
  panel: boolean | null;
};

type OpsSummary = {
  loading: boolean;
  error: string | null;
  ordersByStatus: Record<string, number>;
  stuckOrdersCount: number;
  lastWebhookReceivedAt: string | null;
};

type ProvisioningStats = {
  loading: boolean;
  error: string | null;
  median_provisioning_seconds: number | null;
  provision_success_rate_24h: number | null;
  provision_count_24h: number | null;
};

const Status = () => {
  const [health, setHealth] = useState<HealthState>({
    loading: true,
    error: null,
    db: null,
    panel: null,
  });

  const [ops, setOps] = useState<OpsSummary>({
    loading: true,
    error: null,
    ordersByStatus: {},
    stuckOrdersCount: 0,
    lastWebhookReceivedAt: null,
  });

  const [provisioningStats, setProvisioningStats] = useState<ProvisioningStats>({
    loading: true,
    error: null,
    median_provisioning_seconds: null,
    provision_success_rate_24h: null,
    provision_count_24h: null,
  });

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch(`${ENV.API_BASE.replace(/\/+$/, '')}/ready`);
        const data = await res.json().catch(() => ({}));
        const checks = data.checks || {};
        setHealth({
          loading: false,
          error: null,
          db: checks.db ?? null,
          panel: checks.panel ?? null,
        });
      } catch (e: any) {
        setHealth({
          loading: false,
          error: e?.message || 'Unable to fetch API health',
          db: null,
          panel: null,
        });
      }
    };
    fetchHealth();
  }, []);

  useEffect(() => {
    const fetchOps = async () => {
      try {
        const res = await fetch(`${ENV.API_BASE.replace(/\/+$/, '')}/ops/summary`);
        if (!res.ok) {
          throw new Error('Failed to load ops summary');
        }
        const data = await res.json();
        setOps({
          loading: false,
          error: null,
          ordersByStatus: data.ordersByStatus || {},
          stuckOrdersCount: Number(data.stuckOrdersCount || 0),
          lastWebhookReceivedAt: data.lastWebhookReceivedAt ?? null,
        });
      } catch (e: any) {
        setOps((prev) => ({
          ...prev,
          loading: false,
          error: e?.message || 'Unable to load ops summary',
        }));
      }
    };
    fetchOps();
  }, []);

  useEffect(() => {
    const fetchProvisioningStats = async () => {
      try {
        const res = await fetch(`${ENV.API_BASE.replace(/\/+$/, '')}/api/public/provisioning-stats`);
        const data = await res.json().catch(() => ({}));
        setProvisioningStats({
          loading: false,
          error: null,
          median_provisioning_seconds: data.median_provisioning_seconds ?? null,
          provision_success_rate_24h: data.provision_success_rate_24h ?? null,
          provision_count_24h: data.provision_count_24h ?? null,
        });
      } catch (e: any) {
        setProvisioningStats((prev) => ({
          ...prev,
          loading: false,
          error: e?.message || 'Unable to load provisioning stats',
        }));
      }
    };
    fetchProvisioningStats();
  }, []);

  const typicalMinutes =
    provisioningStats.median_provisioning_seconds != null && provisioningStats.median_provisioning_seconds >= 0
      ? Math.max(1, Math.round(provisioningStats.median_provisioning_seconds / 60))
      : null;

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      {/* Fantasy Forest Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("/images/d7519b8a-ef97-4e1a-a24e-a446d044f2ac.png")',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/60 to-gray-900/90"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-transparent to-emerald-900/20"></div>
      </div>
      
      <div className="relative z-10">
        
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                GIVRwrld Service Status
              </span>
            </h1>
            <p className="text-xl text-gray-100 max-w-3xl mx-auto mb-8">
              Check GIVRwrld server status, view GIVRwrld outages and infrastructure reports.
            </p>
            
            {/* All Systems Status */}
            <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-lg p-6 mb-8 max-w-2xl mx-auto">
              <div className="flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-400 mr-3" />
                <div>
                  <h2 className="text-2xl font-bold text-emerald-400">
                    {health.error ? 'Status Unknown' : '🟢 All Systems Operational'}
                  </h2>
                  <p className="text-gray-100">
                    Last updated: {new Date().toLocaleString()}
                  </p>
                  <p className="text-base text-gray-100 mt-1">
                    API/DB:{" "}
                    {health.loading
                      ? 'Checking...'
                      : health.error
                        ? 'Unable to reach health endpoint'
                        : health.db
                          ? 'OK'
                          : 'Issue detected'}{" "}
                    · Panel:{" "}
                    {health.loading
                      ? 'Checking...'
                      : health.panel === null
                        ? 'Not configured'
                        : health.panel
                          ? 'OK'
                          : 'Issue detected'}
                  </p>
                  <p className="text-base text-gray-100 mt-2">
                    Typical time to server ready:{" "}
                    {provisioningStats.loading
                      ? '…'
                      : typicalMinutes != null
                        ? `~${typicalMinutes} minute${typicalMinutes !== 1 ? 's' : ''}`
                        : '—'}
                    {" · "}
                    DDoS mitigation: included for all game servers.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Server Status + Ops Overview */}
          <div className="mb-16 grid lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-3xl font-bold text-center mb-8">Server Status</h2>
              
              <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-600/30">
                      <TableHead className="text-gray-100 font-semibold">Component</TableHead>
                      <TableHead className="text-gray-100 font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="border-gray-600/30">
                      <TableCell className="text-white font-medium">Infrastructure (API &amp; panel)</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {health.loading ? (
                            <Clock className="w-4 h-4 text-amber-400 mr-2" />
                          ) : health.error || health.db === false ? (
                            <AlertCircle className="w-4 h-4 text-red-400 mr-2" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-emerald-400 mr-2" />
                          )}
                          <span className={
                            health.loading ? 'text-amber-400' : health.db ? 'text-emerald-400' : 'text-red-400'
                          }>
                            {health.loading
                              ? 'Checking…'
                              : health.error
                                ? 'Unavailable'
                                : health.db
                                  ? 'Operational'
                                  : 'Issue detected'}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow className="border-gray-600/30">
                      <TableCell className="text-gray-100 text-sm pt-1 pb-2" colSpan={2}>
                        Region and uptime metrics will be updated as we add regions.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-bold text-center mb-8">Ops Overview</h2>
              <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl p-6 space-y-4">
                {ops.loading ? (
                  <p className="text-gray-100 text-center">Loading ops summary…</p>
                ) : ops.error ? (
                  <p className="text-red-400 text-sm text-center">{ops.error}</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {Object.entries(ops.ordersByStatus).map(([status, count]) => (
                        <div key={status} className="flex justify-between">
                          <span className="text-gray-100 capitalize">{status}</span>
                          <span className="text-emerald-400 font-semibold">{count}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-gray-700/50 pt-4 text-base text-gray-100 space-y-1">
                      <p>
                        <span className="font-semibold">Stuck orders:</span>{' '}
                        <span className={ops.stuckOrdersCount > 0 ? 'text-orange-300' : 'text-emerald-400'}>
                          {ops.stuckOrdersCount}
                        </span>
                      </p>
                      <p>
                        <span className="font-semibold">Last PayPal webhook:</span>{' '}
                        {ops.lastWebhookReceivedAt ? new Date(ops.lastWebhookReceivedAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Incident log */}
          <div>
            <h2 className="text-3xl font-bold text-center mb-8">Incident log</h2>
            <div className="bg-gray-800/60 backdrop-blur-md border border-gray-600/30 rounded-xl overflow-hidden">
              <div className="p-6 space-y-6">
                <div className="border-l-4 border-emerald-500/50 pl-4">
                  <p className="text-sm text-gray-200 font-medium">No major incidents recorded</p>
                  <p className="text-gray-100 mt-1">
                    We haven’t had any major outages since launch. When we do, we’ll post short updates here: what you might have seen, what we did, and how we’re reducing the chance of it happening again.
                  </p>
                </div>
                <p className="text-sm text-gray-300 italic">
                  Example of a future entry: “Brief API latency spike — we saw slow responses for about 10 minutes due to a DB backup. We’ve moved backups to a low-traffic window. No data loss.”
                </p>
              </div>
            </div>
          </div>
        </div>
        
        
      </div>
    </div>
  );
};

export default Status;
