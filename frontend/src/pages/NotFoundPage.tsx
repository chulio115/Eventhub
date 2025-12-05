import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-6 text-8xl font-bold text-slate-200 dark:text-slate-800">404</div>
      <h1 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-slate-50">
        Seite nicht gefunden
      </h1>
      <p className="mb-6 max-w-md text-slate-500 dark:text-slate-400">
        Die angeforderte Seite existiert nicht oder wurde verschoben.
      </p>
      <Link
        to="/events"
        className="rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand/90"
      >
        Zurück zur Übersicht
      </Link>
    </div>
  );
}
