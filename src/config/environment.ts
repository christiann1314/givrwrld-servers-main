// Environment configuration for GIVRWRLD Servers
export const config = {
  // API Configuration (MySQL-backed API server)
  api: {
    // Use VITE_API_URL for consistency with api.ts
    baseUrl: import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
  },
  
  // Stripe Configuration
  stripe: {
    // IMPORTANT: Set VITE_STRIPE_PUBLISHABLE_KEY environment variable
    // Do NOT hardcode keys in source code
    publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''
  },
  
  // App Configuration
  app: {
    name: import.meta.env.VITE_APP_NAME || 'GIVRWRLD Servers',
    url: import.meta.env.VITE_APP_URL || 'https://givrwrldservers.com'
  },
  
  // Pterodactyl Configuration
  pterodactyl: {
    panelUrl:
      import.meta.env.VITE_PANEL_URL ||
      (import.meta.env.DEV ? 'http://localhost:8000' : 'https://panel.givrwrldservers.com'),
    clientKey: import.meta.env.VITE_PTERO_CLIENT_KEY || ''
  }
};

export default config;
