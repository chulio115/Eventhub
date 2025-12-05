import { useState, FormEvent } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { useUsers } from '../features/users/useUsers';
import { useUpdateUserRole } from '../features/users/useUpdateUserRole';
import { useInviteUser } from '../features/users/useInviteUser';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function UserManagementPage() {
  const { profile } = useAuth();
  const { data: users = [], isLoading, error } = useUsers();
  const updateRole = useUpdateUserRole();
  const inviteUser = useInviteUser();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setInviteSuccess(null);
    setInviteError(null);

    if (!inviteEmail.trim()) return;

    try {
      await inviteUser.mutateAsync({ email: inviteEmail.trim() });
      setInviteSuccess(`Einladung an ${inviteEmail} wurde versendet.`);
      setInviteEmail('');
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Einladung fehlgeschlagen');
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Benutzerverwaltung</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Nutzer:innen verwalten und Rollen (Admin, User, Extern) setzen. Änderungen wirken direkt in Supabase.
        </p>
      </div>

      {/* Invite-Formular */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-50">
          Neuen Benutzer einladen
        </h2>
        <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">
              E-Mail-Adresse (@immomio.de)
            </label>
            <Input
              type="email"
              placeholder="vorname.nachname@immomio.de"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
          </div>
          <Button
            type="submit"
            disabled={inviteUser.isPending || !inviteEmail.trim()}
          >
            {inviteUser.isPending ? 'Sende…' : 'Einladung senden'}
          </Button>
        </form>
        {inviteSuccess && (
          <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            {inviteSuccess}
          </div>
        )}
        {inviteError && (
          <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
            {inviteError}
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Der eingeladene Benutzer erhält einen Magic Link per E-Mail und wird bei erstmaliger Anmeldung automatisch registriert.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
          Benutzer (Supabase public.users)
        </div>
        <div className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
          {isLoading && (
            <div className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500">Lade Benutzer…</div>
          )}
          {error && (
            <div className="px-4 py-3 text-xs text-red-600">Fehler beim Laden: {error.message}</div>
          )}
          {!isLoading && !error && users.length === 0 && (
            <div className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500">
              Noch keine Benutzer vorhanden.
            </div>
          )}

          {!isLoading && !error &&
            users.map((u) => {
              const isSelf = profile?.id === u.id;

              return (
                <div key={u.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-slate-900 dark:text-slate-50">
                        {u.email}
                      </span>
                      {isSelf && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          Du
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {u.name || 'Kein Name hinterlegt'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>Rolle</span>
                    <select
                      className="h-8 rounded-full border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      value={u.role}
                      onChange={(e) =>
                        updateRole.mutate({ id: u.id, role: e.target.value as typeof u.role })
                      }
                      disabled={updateRole.isPending || isSelf}
                    >
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                      <option value="extern">Extern</option>
                    </select>
                  </div>
                  <div className="hidden text-xs text-slate-400 md:block dark:text-slate-500">
                    {new Date(u.created_at).toLocaleDateString('de-DE')}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
