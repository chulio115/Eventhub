import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function RequireAdmin() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
        Lade Sitzung…
      </div>
    );
  }

  if (!profile || profile.role !== 'admin') {
    return <Navigate to="/events" replace />;
  }

  return <Outlet />;
}
