import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      // Nutze die DB-Funktion um User vollständig zu löschen (public.users + auth.users)
      const { error } = await supabase.rpc('delete_user_completely', {
        user_id: userId,
      });

      if (error) {
        throw error;
      }

      return { userId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Benutzer wurde vollständig entfernt');
    },
    onError: (error: Error) => {
      toast.error(`Fehler beim Löschen: ${error.message}`);
    },
  });
}
