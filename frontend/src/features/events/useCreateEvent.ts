import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import type { CostType } from './useEvents';

export interface CreateEventInput {
  title: string;
  organizer?: string | null;
  city?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  cost_type: CostType;
  cost_value: number;
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEventInput) => {
      const { data, error } = await supabase
        .from('events')
        .insert({
          title: input.title,
          organizer: input.organizer ?? null,
          city: input.city ?? null,
          start_date: input.start_date ?? null,
          end_date: input.end_date ?? null,
          cost_type: input.cost_type,
          cost_value: input.cost_value,
        })
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
