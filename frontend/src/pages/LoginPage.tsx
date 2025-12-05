import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

// Produktions-URL für Passwort-Reset
function getAppUrl(): string {
  const envUrl = import.meta.env.VITE_APP_URL;
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl;
  }
  if (typeof window !== 'undefined' && !window.location.origin.includes('localhost')) {
    return window.location.origin;
  }
  return window.location.origin; // Fallback für lokale Entwicklung
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/events';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate(from, { replace: true });
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email.endsWith('@immomio.de')) {
      setError('Bitte gib eine gültige @immomio.de E-Mail-Adresse ein');
      setLoading(false);
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getAppUrl()}/events`,
    });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setResetSent(true);
  }

  // Passwort-Reset erfolgreich gesendet
  if (mode === 'reset' && resetSent) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-semibold text-slate-900">E-Mail gesendet!</h1>
          <p className="mb-6 text-sm text-slate-500">
            Wir haben dir einen Link zum Zurücksetzen deines Passworts an <span className="font-medium">{email}</span> gesendet.
          </p>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setResetSent(false);
            }}
            className="text-sm font-medium text-violet-600 hover:text-violet-700"
          >
            ← Zurück zum Login
          </button>
        </div>
      </div>
    );
  }

  // Passwort vergessen Formular
  if (mode === 'reset') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-xl font-semibold text-slate-900">Passwort vergessen?</h1>
          <p className="mb-6 text-sm text-slate-500">
            Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen.
          </p>
          <form className="space-y-4" onSubmit={handleResetPassword}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="reset-email">
                E-Mail
              </label>
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="du@immomio.de"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sende…' : 'Link senden'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setMode('login')}
              className="text-sm font-medium text-violet-600 hover:text-violet-700"
            >
              ← Zurück zum Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Login Formular
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-slate-900">Login</h1>
        <p className="mb-6 text-sm text-slate-500">
          Bitte mit deiner <span className="font-medium">@immomio.de</span>-Adresse anmelden.
        </p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="email">
              E-Mail
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="du@immomio.de"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700" htmlFor="password">
                Passwort
              </label>
              <button
                type="button"
                onClick={() => setMode('reset')}
                className="text-xs font-medium text-violet-600 hover:text-violet-700"
              >
                Passwort vergessen?
              </button>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Anmelden…' : 'Anmelden'}
          </Button>
        </form>
      </div>
    </div>
  );
}
