import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { useAuthStore } from './store/authStore';
import { authApi } from './api/api';
import Shell from './components/layout/Shell';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Workspaces from './pages/Workspaces';
import Sites from './pages/Sites';
import AuditPage from './pages/AuditPage';
import KeywordPage from './pages/KeywordPage';
import ContentReviewPage from './pages/ContentReviewPage';
import CompetitorPage from './pages/CompetitorPage';
import RankingsPage from './pages/RankingsPage';
import ActionPlanPage from './pages/ActionPlanPage';
import BillingPage from './pages/BillingPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import SecurityPage from './pages/SecurityPage';
import CookiePolicy from './pages/CookiePolicy';
import ContactPage from './pages/ContactPage';

function AuthHydrator({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const { setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    authApi.me().then(res => {
      if (res.success && res.data?.user) {
        // Re-hydrate both user AND the in-memory token so all subsequent
        // API requests can include it as Authorization header even if the
        // Vite dev proxy has cookie-forwarding quirks.
        setAuth(res.data.user, (res.data as any).token ?? null, res.data.billingEnabled);
      } else {
        clearAuth();
      }
      setLoading(false);
    });
  }, [setAuth, clearAuth]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">Loading...</div>;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthHydrator>
      <BrowserRouter>
        <Routes>
          {/* Public landing page */}
          <Route path="/" element={<LandingPage />} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Legal / static pages — public, no auth required */}
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="/contact" element={<ContactPage />} />

          {/* Protected — wrapped in Shell (sidebar layout) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Shell />}>
              <Route path="/app" element={<Workspaces />} />
              <Route path="/app/workspaces/:id/sites" element={<Sites />} />
              <Route path="/app/sites/:siteId/audit" element={<AuditPage />} />
              <Route path="/app/sites/:siteId/keywords" element={<KeywordPage />} />
              <Route path="/app/sites/:siteId/content" element={<ContentReviewPage />} />
              <Route path="/app/sites/:siteId/competitors" element={<CompetitorPage />} />
              <Route path="/app/sites/:siteId/rankings" element={<RankingsPage />} />
              <Route path="/app/sites/:siteId/action-plan" element={<ActionPlanPage />} />
              <Route path="/app/billing" element={<BillingPage />} />
              <Route path="/app/command-center" element={<Dashboard />} />
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthHydrator>
  );
}
