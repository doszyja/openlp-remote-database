import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import './utils/cache-debug'; // Initialize cache debug utilities
import './index.css';

// Disable browser's automatic scroll restoration
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

// Global error handlers for unhandled errors and promise rejections
// These catch errors that ErrorBoundary cannot catch (async code, event handlers, etc.)
window.addEventListener('error', event => {
  console.error('[Global Error Handler] Unhandled error:', event.error);
  // You can log to error reporting service here
  // Example: logErrorToService(event.error, { type: 'error', filename: event.filename, lineno: event.lineno });
});

window.addEventListener('unhandledrejection', event => {
  console.error('[Global Error Handler] Unhandled promise rejection:', event.reason);
  // You can log to error reporting service here
  // Example: logErrorToService(event.reason, { type: 'unhandledrejection' });
  // Prevent default browser behavior (console error)
  event.preventDefault();
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch on mount if data exists
      refetchOnReconnect: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes (formerly cacheTime)
    },
  },
});

if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onRegisteredSW(swUrl?: string, registration?: ServiceWorkerRegistration) {
      if (import.meta.env.DEV) {
        console.log('PWA service worker registered:', swUrl, registration);
      }
    },
    onOfflineReady() {
      console.log('Aplikacja gotowa do pracy offline.');
    },
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ErrorBoundary>
          <NotificationProvider>
            <AuthProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </AuthProvider>
          </NotificationProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
