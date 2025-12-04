import { Route, Routes, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { EventsPage } from './pages/EventsPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { SharePage } from './pages/SharePage';
import { CalendarPage } from './pages/CalendarPage';
import { CostsPage } from './pages/CostsPage';

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/calendar" element={<CalendarPage />} />
        <Route path="/events/costs" element={<CostsPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/share/:token" element={<SharePage />} />
        <Route path="*" element={<Navigate to="/events" replace />} />
      </Routes>
    </AppLayout>
  );
}
