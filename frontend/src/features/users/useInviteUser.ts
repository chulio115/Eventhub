import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

interface InviteUserParams {
  email: string;
}

export function useInviteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email }: InviteUserParams) => {
      // Validiere E-Mail-Domain
      if (!email.endsWith('@immomio.de')) {
        throw new Error('Nur @immomio.de E-Mail-Adressen können eingeladen werden.');
      }

      // Sende Magic Link zur Einladung
      // Der Benutzer wird bei Klick auf den Link automatisch registriert
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // Nach Login zur App weiterleiten
          emailRedirectTo: `${window.location.origin}/events`,
          // Markiere als Einladung für neuen Benutzer
          data: {
            invited: true,
          },
        },
      });

      if (error) {
        throw error;
      }

      return { email };
    },
    onSuccess: () => {
      // Refresh user list nach erfolgreicher Einladung
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
