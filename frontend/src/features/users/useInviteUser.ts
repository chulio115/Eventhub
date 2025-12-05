import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

interface InviteUserInput {
  email: string;
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

      // Sende Magic Link
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/events`,
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
