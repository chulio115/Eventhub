import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

interface InviteUserInput {
  email: string;
}

// Produktions-URL für Redirects - NIEMALS localhost verwenden
function getAppUrl(): string {
  // 1. Prüfe Umgebungsvariable
  const envUrl = import.meta.env.VITE_APP_URL;
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl;
  }
  
  // 2. Fallback: Wenn wir auf der Produktionsseite sind, nutze diese
  if (typeof window !== 'undefined' && !window.location.origin.includes('localhost')) {
    return window.location.origin;
  }
  
  // 3. Fehler wenn keine gültige URL gefunden
  throw new Error('Keine gültige Produktions-URL konfiguriert. Bitte VITE_APP_URL in .env setzen.');
}

export function useInviteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email }: InviteUserInput) => {
      // Prüfe ob Email gültig ist
      if (!email || !email.includes('@')) {
        throw new Error('Bitte gib eine gültige E-Mail-Adresse ein');
      }

      // Prüfe ob Email @immomio.de Domain hat
      if (!email.endsWith('@immomio.de')) {
        throw new Error('Nur @immomio.de E-Mail-Adressen sind erlaubt');
      }

      // Hole Produktions-URL
      const appUrl = getAppUrl();

      // Sende Magic Link mit Produktions-URL
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${appUrl}/events`,
        },
      });

      if (error) {
        throw error;
      }

      return { email };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
