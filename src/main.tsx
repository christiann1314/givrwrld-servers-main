import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from "./context/AuthContext";

import App from './App.tsx'
import './index.css'
import { SecureErrorBoundary } from './components/SecureErrorBoundary'
import { setupAutomaticCacheRefresh, prefetchCommonData } from '@/lib/cacheUtils'

// Unregister any existing service workers to prevent caching issues
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().then((success) => {
        if (success) {
          console.log('Service worker unregistered');
        }
      });
    }
  });
}

// Service worker is disabled - caching is handled via HTTP headers and API client
// If you want to re-enable, uncomment below and ensure sw.js only caches GET requests
// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker.register('/sw.js')
//       .then((registration) => {
//         console.log('SW registered: ', registration);
//       })
//       .catch((registrationError) => {
//         console.log('SW registration failed: ', registrationError);
//       });
//   });
// }

// Initialize cache strategies
setupAutomaticCacheRefresh();

// Prefetch common data on app startup
prefetchCommonData().then(() => {
  console.log('Common data prefetched');
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SecureErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </SecureErrorBoundary>
  </React.StrictMode>
);
