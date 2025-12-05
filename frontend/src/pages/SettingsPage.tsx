import { Link } from 'react-router-dom';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Einstellungen</h1>
        <p className="text-sm text-slate-500">
          Zentrale Konfiguration für EventHub. Hier legen wir nach und nach alle Admin-Funktionen ab.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">Benutzerverwaltung</h2>
          <p className="mb-3 text-xs text-slate-500">
            Nutzer:innen verwalten, Rollen (Admin, User, Extern) setzen und Zugriffe steuern.
          </p>
          <Link
            to="/settings/users"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            Benutzerverwaltung öffnen
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">Systemeinstellungen</h2>
          <p className="mb-3 text-xs text-slate-500">
            Platzhalter für spätere Features wie E-Mail-Templates, CSV-Import/Export-Defaults und Sharing-Optionen.
          </p>
          <p className="text-xs text-slate-400">Aktuell noch ohne Funktion, dient als Strukturrahmen.</p>
        </div>
      </div>
    </div>
  );
}
