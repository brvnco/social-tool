import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import RunDetail from './pages/RunDetail';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

function NavBar() {
  const location = useLocation();
  const isActive = (path: string) =>
    location.pathname === path
      ? 'text-delta-green font-semibold'
      : 'text-delta-muted hover:text-delta-text';

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-delta-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-delta-navy flex items-center justify-center">
            <span className="text-delta-green font-bold text-sm">▲</span>
          </div>
          <span className="font-bold text-delta-text text-lg tracking-tight">Delta Social</span>
        </Link>
        <div className="flex gap-8 text-sm">
          <Link to="/" className={`transition ${isActive('/')}`}>Dashboard</Link>
          <Link to="/analytics" className={`transition ${isActive('/analytics')}`}>Analytics</Link>
          <Link to="/settings" className={`transition ${isActive('/settings')}`}>Settings</Link>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-delta-bg">
        <NavBar />
        <main className="max-w-7xl mx-auto px-8 py-8">
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
