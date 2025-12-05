import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';

export function useDeleteHistoryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('event_history')
        .delete()
        .eq('id', entryId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidiere alle Historie-Queries
      queryClient.invalidateQueries({ queryKey: ['event-history'] });
      toast.success('Historie-Eintrag gelöscht');
    },
    onError: (error: Error) => {
      toast.error(`Fehler: ${error.message}`);
    },
  });
}
