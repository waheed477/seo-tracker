import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Shell from './components/layout/Shell';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Workspaces from './pages/Workspaces';
import Sites from './pages/Sites';
import AuditPage from './pages/AuditPage';
import KeywordPage from './pages/KeywordPage';
import ContentReviewPage from './pages/ContentReviewPage';
import CompetitorPage from './pages/CompetitorPage';
import RankingsPage from './pages/RankingsPage';
import ActionPlanPage from './pages/ActionPlanPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import SecurityPage from './pages/SecurityPage';
import CookiePolicy from './pages/CookiePolicy';
import ContactPage from './pages/ContactPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public landing page */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

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
            <Route path="/app/command-center" element={<Dashboard />} />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
