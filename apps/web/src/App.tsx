import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import HomePage from './pages/HomePage';
import SongListPage from './pages/SongListPage';
import SongCreatePage from './pages/SongCreatePage';
import SongEditPage from './pages/SongEditPage';
import SongDetailPage from './pages/SongDetailPage';
import PresentationPage from './pages/PresentationPage';
import ServicePlanPage from './pages/ServicePlanPage';
import LivePage from './pages/LivePage';
import AuditLogPage from './pages/AuditLogPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import AboutPage from './pages/AboutPage';
import HelpPage from './pages/HelpPage';

function App() {
  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/songs/:id/presentation" element={<PresentationPage />} />
      <Route path="/live" element={<LivePage />} />
      <Route
        path="/*"
        element={
          <Layout>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/help" element={<HelpPage />} />
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
              <Route
                path="/audit-logs"
                element={
                  <AdminRoute>
                    <AuditLogPage />
                  </AdminRoute>
                }
              />
            </Routes>
          </Layout>
        }
      />
    </Routes>
  );
}

export default App;
