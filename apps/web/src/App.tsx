import { Routes, Route } from 'react-router-dom';
import { useEffect, Suspense, lazy } from 'react';
import { CircularProgress, Box } from '@mui/material';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const SongListPage = lazy(() => import('./pages/SongListPage'));
const SongCreatePage = lazy(() => import('./pages/SongCreatePage'));
const SongEditPage = lazy(() => import('./pages/SongEditPage'));
const SongDetailPage = lazy(() => import('./pages/SongDetailPage'));
const PresentationPage = lazy(() => import('./pages/PresentationPage'));
const ServicePlanPage = lazy(() => import('./pages/ServicePlanPage'));
const LivePage = lazy(() => import('./pages/LivePage'));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const ErrorTestPage = lazy(() => import('./pages/ErrorTestPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Loading fallback component
const PageLoader = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
    }}
  >
    <CircularProgress />
  </Box>
);

function App() {
  // Global Esc key handler to close modals/dialogs
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Find all open Material UI dialogs
        const dialogs = document.querySelectorAll('[role="dialog"]');
        if (dialogs.length > 0) {
          // Get the topmost dialog (last in DOM)
          const topDialog = dialogs[dialogs.length - 1] as HTMLElement;

          // Try to find close button or trigger close event
          const closeButton = topDialog.querySelector(
            '[aria-label*="close" i], [aria-label*="zamknij" i]'
          ) as HTMLElement;
          if (closeButton) {
            closeButton.click();
          } else {
            // Try to find Dialog's onClose handler by checking for MUI Dialog
            const dialogContent = topDialog.closest('.MuiDialog-root');
            if (dialogContent) {
              // Dispatch escape event that MUI Dialog should handle
              const escapeEvent = new KeyboardEvent('keydown', {
                key: 'Escape',
                code: 'Escape',
                keyCode: 27,
                which: 27,
                bubbles: true,
                cancelable: true,
              });
              dialogContent.dispatchEvent(escapeEvent);
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route
          path="/auth/callback"
          element={
            <Suspense fallback={<PageLoader />}>
              <AuthCallbackPage />
            </Suspense>
          }
        />
        <Route
          path="/songs/:id/presentation"
          element={
            <Suspense fallback={<PageLoader />}>
              <PresentationPage />
            </Suspense>
          }
        />
        <Route
          path="/live"
          element={
            <Suspense fallback={<PageLoader />}>
              <LivePage />
            </Suspense>
          }
        />
        <Route
          path="/*"
          element={
            <Layout>
              <ScrollToTop />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/help" element={<HelpPage />} />
                  <Route path="/error-test" element={<ErrorTestPage />} />
                  <Route path="/songs" element={<SongListPage />} />
                  <Route
                    path="/songs/new"
                    element={
                      <ProtectedRoute>
                        <SongCreatePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/songs/:id" element={<SongDetailPage />} />
                  <Route
                    path="/songs/:id/edit"
                    element={
                      <ProtectedRoute>
                        <SongEditPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/service-plans" element={<ServicePlanPage />} />
                  <Route path="/service-plans/:id" element={<ServicePlanPage />} />
                  <Route path="/service-plans/shared/:token" element={<ServicePlanPage />} />
                  <Route
                    path="/audit-logs"
                    element={
                      <AdminRoute>
                        <AuditLogPage />
                      </AdminRoute>
                    }
                  />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </Layout>
          }
        />
      </Routes>
    </Suspense>
  );
}

export default App;
