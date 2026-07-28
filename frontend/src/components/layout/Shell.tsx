import Sidebar from './Sidebar';
import Dashboard from '../../pages/Dashboard';

export default function Shell() {
  return (
    <div className="flex h-screen overflow-hidden bg-navy text-cream font-body">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-cream/5">
        <Dashboard />
      </main>
    </div>
  );
}
