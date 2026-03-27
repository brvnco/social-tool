import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import RunDetail from './pages/RunDetail';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

function useTheme() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('delta-theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('delta-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return { dark, toggle: () => setDark(d => !d) };
}

function NavBar({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  const location = useLocation();
  const isActive = (path: string) =>
    location.pathname === path
      ? 'text-delta-green font-semibold'
      : 'text-delta-muted hover:text-delta-text';

  return (
    <nav className="bg-delta-card/80 backdrop-blur-md border-b border-delta-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="text-xl">🏭</span>
          <span className="font-bold text-delta-text text-lg tracking-tight">Content Factory</span>
        </Link>
        <div className="flex items-center gap-8">
          <div className="flex gap-8 text-sm">
            <Link to="/" className={`transition ${isActive('/')}`}>Dashboard</Link>
            <Link to="/analytics" className={`transition ${isActive('/analytics')}`}>Analytics</Link>
            <Link to="/settings" className={`transition ${isActive('/settings')}`}>Settings</Link>
          </div>
          <button
            onClick={onToggle}
            className="w-9 h-9 rounded-xl bg-delta-subtle border border-delta-border flex items-center justify-center text-delta-muted hover:text-delta-text transition"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  const { dark, toggle } = useTheme();

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-delta-bg">
        <NavBar dark={dark} onToggle={toggle} />
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
