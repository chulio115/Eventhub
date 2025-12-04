import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import type { EventStatus, CostType } from './useEvents';

export interface UpdateEventInput {
  id: string;
  title: string;
  organizer: string | null;
  city: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  status: EventStatus;
  booked: boolean;
  colleagues: string[];
  tags: string[];
  cost_type: CostType;
  cost_value: number;
  event_url: string | null;
  notes: string | null;
  attachments: string[];
  linkedin_plan: boolean;
  linkedin_note: string | null;
  publication_status: boolean;
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateEventInput) => {
      const { id, ...patch } = input;

      const { data, error } = await supabase
        .from('events')
        .update({
          ...patch,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
