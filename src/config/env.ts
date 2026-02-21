// Environment configuration for the app
// These values are set during build time via environment variables
// Use VITE_* prefix for Vite environment variables

export const ENV = {
  PANEL_URL: import.meta.env.VITE_PANEL_URL || 'http://localhost:8000',
  API_BASE: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
} as const;

// Type-safe access to environment variables
export const getEnvVar = (key: keyof typeof ENV): string => {
  const value = ENV[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value;
};