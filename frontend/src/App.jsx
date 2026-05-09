import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './components/ToastProvider';

import PublicDashboard from './pages/PublicDashboard';
import ContributePage from './pages/ContributePage';
import AdminDashboard from './pages/AdminDashboard';
import NewIncidentPage from './pages/NewIncidentPage';
import AuditLogPage from './pages/AuditLogPage';
import AdminLogin from './pages/AdminLogin';
import NotFound from './pages/NotFound';

function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<PublicDashboard />} />
            <Route path="/contribute" element={<ContributePage />} />
            <Route path="/contribute/:needCardId" element={<ContributePage />} />
          </Route>

          {/* Admin Login Route */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="new-incident" element={<NewIncidentPage />} />
              {/* Placeholder routes for layout links */}
              <Route path="audit-log" element={<AuditLogPage />} />
            </Route>
          </Route>

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;
