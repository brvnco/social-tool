import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import RunDetail from './pages/RunDetail';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

function NavBar() {
  const location = useLocation();
  const isActive = (path: string) =>
    location.pathname === path ? 'text-delta-green' : 'text-gray-400 hover:text-white';

  return (
    <nav className="border-b border-delta-border bg-delta-navy/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-delta-green font-bold text-xl">▲</span>
          <span className="font-semibold text-white text-lg">Delta Social</span>
        </Link>
        <div className="flex gap-6 text-sm font-medium">
          <Link to="/" className={isActive('/')}>Dashboard</Link>
          <Link to="/analytics" className={isActive('/analytics')}>Analytics</Link>
          <Link to="/settings" className={isActive('/settings')}>Settings</Link>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-delta-navy">
        <NavBar />
        <main className="max-w-7xl mx-auto px-6 py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/runs/:id" element={<RunDetail />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
