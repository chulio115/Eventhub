import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';

export type AppRole = 'admin' | 'user' | 'extern';

export interface AppUser {
  id: string;
  email: string;
  name: string | null;
  role: AppRole;
  hasPassword: boolean;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: AppUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile(user: User) {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role, has_password')
        .eq('external_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (!data || error) {
        setProfile(null);
        return;
      }

      setProfile({
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        hasPassword: data.has_password ?? false,
      });
    }

    async function init() {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      setSession(session);

      if (session?.user) {
        await fetchProfile(session.user);
      } else {
        setProfile(null);
      }

      if (!cancelled) {
        setLoading(false);
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        fetchProfile(newSession.user);
      } else {
        setProfile(null);
      }
    });

    init();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
