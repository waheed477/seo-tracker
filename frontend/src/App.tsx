import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Shell from './components/layout/Shell';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Workspaces from './pages/Workspaces';
import Sites from './pages/Sites';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected — wrapped in Shell (sidebar layout) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Shell />}>
            <Route path="/"                          element={<Workspaces />} />
            <Route path="/workspaces/:id/sites"      element={<Sites />} />
            <Route path="/command-center"            element={<Dashboard />} />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
