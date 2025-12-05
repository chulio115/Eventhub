import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
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
  visitor_notes: string | null;
  attachments: string[];
  linkedin_plan: boolean;
  linkedin_note: string | null;
  publication_status: boolean;
  rating_sales: number | null;
  rating_kam: number | null;
  rating_marketing: number | null;
  rating_clevel: number | null;
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

      return { id, ...patch };
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['events'], (old) => {
        if (!old) return old;

        return (old as any[]).map((event) =>
          (event as any).id === updated.id ? { ...event, ...updated } : event,
        );
      });

      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Änderungen gespeichert');
    },
    onError: (error) => {
      toast.error(`Fehler beim Speichern: ${error.message}`);
    },
  });
}
