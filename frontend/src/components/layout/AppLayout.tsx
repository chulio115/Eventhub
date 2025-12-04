import { Link, NavLink, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

const navItems = [
  { to: '/events', label: 'Events' },
  { to: '/events/calendar', label: 'Kalender' },
  { to: '/events/costs', label: 'Kosten & Teilnahmen' },
];

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();

  const showChrome = !location.pathname.startsWith('/share/');

  if (!showChrome) {
    return <div className="min-h-screen bg-slate-50">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link to="/events" className="flex items-center gap-2">
            <span className="rounded-lg bg-brand/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-brand-dark">
              Internal
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-900">EventHub</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-full px-3 py-1 transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-6">
        {children}
      </main>
    </div>
  );
}
