import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

export interface EventHistoryRow {
  id: string;
  event_id: string;
  action: string;
  timestamp: string;
}

export function useEventHistory(eventId: string | null) {
  return useQuery<EventHistoryRow[], Error>({
    queryKey: ['event-history', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_history')
        .select('id, event_id, action, timestamp')
        .eq('event_id', eventId)
        .order('timestamp', { ascending: false });

      if (error) {
        throw error as Error;
      }

      return (data ?? []) as EventHistoryRow[];
    },
  });
}

export function useAddHistoryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { eventId: string; action: string }) => {
      const { eventId, action } = input;

      const { data, error } = await supabase
        .from('event_history')
        .insert({
          event_id: eventId,
          action,
        })
        .select('id, event_id, action, timestamp')
        .single();

      if (error) {
        throw error as Error;
      }

      return data as EventHistoryRow;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['event-history', variables.eventId] });
    },
  });
}
