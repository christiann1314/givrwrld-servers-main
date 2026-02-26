// PM2 ecosystem: API + Agents (for local or VPS)
// Run from repo root: pm2 start ecosystem.config.cjs
// On VPS: run agents here too so OpsWatchdog, ProvisioningAuditor, GrowthAdsGenerator run 24/7.

module.exports = {
  apps: [
    {
      name: 'givrwrld-api',
      cwd: './api',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production', PORT: 3001 },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M',
      watch: false,
    },
    {
      name: 'givrwrld-agents',
      cwd: './api',
      script: 'dist/agents/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      error_file: './logs/agents-err.log',
      out_file: './logs/agents-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '500M',
      watch: false,
    },
  ],
};
