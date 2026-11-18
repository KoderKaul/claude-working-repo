import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { Icon, ToastProvider } from './components/ui';
import { requestPersistence } from './db/db';
import LogPage from './pages/LogPage';
import HistoryPage from './pages/HistoryPage';
import MorePage from './pages/MorePage';

const InsightsPage = lazy(() => import('./pages/InsightsPage'));

const NAV = [
  { to: '/', label: 'Log', icon: 'log', end: true },
  { to: '/history', label: 'History', icon: 'history' },
  { to: '/insights', label: 'Insights', icon: 'insights' },
  { to: '/more', label: 'More', icon: 'more' },
];

export default function App() {
  useEffect(() => {
    requestPersistence();
  }, []);
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <ToastProvider>
        <div className="app">
          <nav className="nav" aria-label="Main">
            <div className="brand" aria-hidden>
              <img src={`${import.meta.env.BASE_URL}icon.svg`} width={40} height={40} alt="" />
            </div>
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
                <Icon name={n.icon} />
                {n.label}
              </NavLink>
            ))}
          </nav>
          <main>
            <Suspense fallback={<div className="page"><div className="spinner" /></div>}>
              <Routes>
                <Route path="/" element={<LogPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/insights" element={<InsightsPage />} />
                <Route path="/more" element={<MorePage />} />
                <Route path="*" element={<LogPage />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </ToastProvider>
    </BrowserRouter>
  );
}
