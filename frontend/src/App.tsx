import { Route, Routes, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { EventsPage } from './pages/EventsPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { SharePage } from './pages/SharePage';
import { CalendarPage } from './pages/CalendarPage';
import { CostsPage } from './pages/CostsPage';
import { SettingsPage } from './pages/SettingsPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { RequireAuth } from './features/auth/RequireAuth';
import { RequireAdmin } from './features/auth/RequireAdmin';

export default function App() {
  return (
    <AppLayout>
      <Routes>
        {/* Öffentliche Routen */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/share/:token" element={<SharePage />} />

        {/* Geschützte App-Routen */}
        <Route element={<RequireAuth />}>
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/calendar" element={<CalendarPage />} />
          <Route path="/events/costs" element={<CostsPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />

          {/* Admin-Bereich */}
          <Route element={<RequireAdmin />}>
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/users" element={<UserManagementPage />} />
          </Route>
        </Route>

        {/* Fallback: immer auf Events leiten (Auth greift dann automatisch) */}
        <Route path="*" element={<Navigate to="/events" replace />} />
      </Routes>
    </AppLayout>
  );
}
