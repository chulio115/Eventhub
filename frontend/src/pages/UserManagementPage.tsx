import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../features/auth/AuthContext';
import { useUsers } from '../features/users/useUsers';
import { useUpdateUserRole } from '../features/users/useUpdateUserRole';
import { useDeleteUser } from '../features/users/useDeleteUser';
import { useInviteUser } from '../features/users/useInviteUser';

export function UserManagementPage() {
  const { profile } = useAuth();
  const { data: users = [], isLoading, error } = useUsers();
  const updateRole = useUpdateUserRole();
  const deleteUser = useDeleteUser();
  const inviteUser = useInviteUser();

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  async function handleDeleteUser(userId: string, email: string) {
    try {
      await deleteUser.mutateAsync(userId);
      toast.success(`Benutzer ${email} wurde gelöscht`);
      setDeleteConfirmId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Löschen fehlgeschlagen');
    }
  }

  async function handleRoleChange(userId: string, newRole: 'admin' | 'user') {
    try {
      await updateRole.mutateAsync({ id: userId, role: newRole });
      toast.success('Rolle wurde aktualisiert');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rollenänderung fehlgeschlagen');
    }
  }

  async function handleInviteUser(e: React.FormEvent) {
    e.preventDefault();
    try {
      await inviteUser.mutateAsync({ email: inviteEmail });
      toast.success(`Magic Link wurde an ${inviteEmail} gesendet!`);
      setInviteEmail('');
      setShowInviteForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Einladung fehlgeschlagen');
    }
  }

  const userToDelete = users.find((u) => u.id === deleteConfirmId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Benutzerverwaltung</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Nutzer:innen verwalten und Rollen zuweisen.
        </p>
      </div>

      {/* Einladungs-Bereich */}
      {!showInviteForm ? (
        <button
          onClick={() => setShowInviteForm(true)}
          className="flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-dark"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nutzer einladen
        </button>
      ) : (
        <form onSubmit={handleInviteUser} className="rounded-xl border border-brand/30 bg-brand/5 p-4">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Magic Link versenden</p>
              <p className="text-xs text-slate-500">Ein Login-Link wird an die E-Mail-Adresse gesendet</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="vorname.nachname@immomio.de"
              className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand dark:border-slate-700 dark:bg-slate-800"
              required
            />
            <button
              type="submit"
              disabled={inviteUser.isPending || !inviteEmail}
              className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
            >
              {inviteUser.isPending ? 'Sende…' : 'Senden'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowInviteForm(false);
                setInviteEmail('');
              }}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {/* Benutzer-Liste */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2 dark:border-slate-800 dark:bg-slate-800">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
            Benutzer ({users.length})
          </span>
        </div>
        <div className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
          {isLoading && (
            <div className="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
              <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand" />
              <p className="mt-2">Lade Benutzer…</p>
            </div>
          )}
          {error && (
            <div className="px-4 py-3 text-xs text-red-600">Fehler beim Laden: {error.message}</div>
          )}
          {!isLoading && !error && users.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
              Noch keine Benutzer vorhanden.
            </div>
          )}

          {!isLoading && !error &&
            users.map((u) => {
              const isSelf = profile?.id === u.id;

              return (
                <div key={u.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  {/* Avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark text-sm font-bold text-white">
                    {(u.name || u.email).charAt(0).toUpperCase()}
                  </div>
                  
                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-slate-900 dark:text-slate-50">
                        {u.name || u.email.split('@')[0]}
                      </span>
                      {isSelf && (
                        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                          Du
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {u.email}
                    </div>
                  </div>

                  {/* Rolle */}
                  <div className="flex items-center gap-2">
                    <select
                      className={`h-8 rounded-full border px-3 text-xs font-medium shadow-sm transition-colors ${
                        u.role === 'admin'
                          ? 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                          : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
                      }`}
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as 'admin' | 'user')}
                      disabled={updateRole.isPending || isSelf}
                    >
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                    </select>
                  </div>

                  {/* Datum */}
                  <div className="hidden text-xs text-slate-400 md:block dark:text-slate-500">
                    {new Date(u.created_at).toLocaleDateString('de-DE')}
                  </div>

                  {/* Löschen-Button */}
                  {!isSelf && (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(u.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-500 shadow-sm transition-colors hover:bg-rose-50 hover:text-rose-600 dark:border-rose-800 dark:bg-slate-800 dark:hover:bg-rose-900/20"
                      title="Benutzer löschen"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Rollen-Erklärung */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-50">Rollen-Übersicht</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-violet-50 p-3 dark:bg-violet-900/20">
            <div className="mb-1 flex items-center gap-2">
              <svg className="h-4 w-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">Admin</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Events erstellen, bearbeiten und löschen. Benutzer verwalten, alle Daten exportieren.
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
            <div className="mb-1 flex items-center gap-2">
              <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">User</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Nur Lesezugriff. Kann alle Events, Kalender und Finanzen einsehen.
            </p>
          </div>
        </div>
      </div>

      {/* Lösch-Bestätigung Modal */}
      {deleteConfirmId && userToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
              <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Benutzer löschen?
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Möchtest du <strong>{userToDelete.email}</strong> wirklich löschen? 
              Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 rounded-full border border-slate-200 bg-white py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => handleDeleteUser(userToDelete.id, userToDelete.email)}
                disabled={deleteUser.isPending}
                className="flex-1 rounded-full bg-rose-600 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {deleteUser.isPending ? 'Lösche…' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
