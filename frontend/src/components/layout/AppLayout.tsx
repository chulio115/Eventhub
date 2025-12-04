import { Link, NavLink, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { useTheme } from '../../features/theme/ThemeProvider';

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
  const { profile, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  const showChrome = !location.pathname.startsWith('/share/');

  if (!showChrome) {
    return <div className="min-h-screen bg-slate-50">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link to="/events" className="flex items-center gap-2">
            <span className="rounded-lg bg-brand/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-brand-dark">
              Internal
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">EventHub</span>
          </Link>
          <div className="flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <nav className="flex items-center gap-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `rounded-full px-3 py-1 transition-colors ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              {profile?.role === 'admin' && (
                <>
                  <NavLink
                    to="/settings"
                    className={({ isActive }) =>
                      `rounded-full px-3 py-1 transition-colors ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                  >
                    Einstellungen
                  </NavLink>
                  <NavLink
                    to="/settings/users"
                    className={({ isActive }) =>
                      `rounded-full px-3 py-1 transition-colors ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                  >
                    Benutzer
                  </NavLink>
                </>
              )}
            </nav>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center gap-1 rounded-full border border-slate-200 bg-white/70 px-2 py-1 text-[11px] font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <span
                  className="inline-block h-4 w-4 rounded-full border border-slate-300 bg-slate-50 dark:border-slate-500 dark:bg-slate-900"
                />
                <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
              </button>

              {user && (
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-300">
                  <div className="flex flex-col text-right">
                    <span className="font-medium text-slate-700 dark:text-slate-100">
                      {profile?.name || user.email}
                    </span>
                    <span className="text-[11px] uppercase tracking-wide">
                      {profile?.role === 'admin'
                        ? 'Admin'
                        : profile?.role === 'extern'
                          ? 'Extern'
                          : 'User'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-6">
        {children}
      </main>
    </div>
  );
}
