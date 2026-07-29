import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NotificationBell from '../ui/NotificationBell';
import ToastContainer from '../ui/Toast';
import ErrorBoundary from '../ui/ErrorBoundary';
import Logo from '../Logo';
import Footer from '../Footer';

export default function Shell() {
  return (
    <div className="bg-navy text-cream flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header bar — notification bell */}
        <header className="bg-navy/80 flex flex-shrink-0 items-center justify-between border-b border-white/[0.06] px-6 py-3">
          <Logo variant="compact" theme="dark" />
          <NotificationBell />
        </header>
        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
        {/* Footer */}
        <Footer />
      </div>
      <ToastContainer />
    </div>
  );
}
