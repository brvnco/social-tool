import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
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

  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  return (
    <nav className="bg-white/80 dark:bg-delta-card/80 backdrop-blur-md border-b border-delta-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="text-xl">🏭</span>
          <span className="font-bold text-delta-text text-lg tracking-tight">Content Factory</span>
        </Link>
        <div className="flex items-center gap-8 text-sm">
          <Link to="/" className={`transition ${isActive('/')}`}>Dashboard</Link>
          <Link to="/analytics" className={`transition ${isActive('/analytics')}`}>Analytics</Link>
          <Link to="/settings" className={`transition ${isActive('/settings')}`}>Settings</Link>
          <button
            onClick={() => setDark(d => !d)}
            className="ml-2 p-2 rounded-lg hover:bg-delta-subtle transition text-lg"
            title="Toggle dark mode"
          >
            {dark ? '☀️' : '🌙'}
          </button>
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
