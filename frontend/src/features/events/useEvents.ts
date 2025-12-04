import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

export type EventStatus = 'planned' | 'consider' | 'attended' | 'cancelled';
export type CostType = 'participant' | 'booth';

export interface EventRow {
  id: string;
  title: string;
  organizer: string | null;
  start_date: string | null;
  end_date: string | null;
  city: string | null;
  status: EventStatus;
  booked: boolean;
  cost_type: CostType;
  cost_value: number;
}

export function useEvents() {
  return useQuery<EventRow[], Error>({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, organizer, start_date, end_date, city, status, booked, cost_type, cost_value')
        .order('start_date', { ascending: true });

      if (error) {
        throw error;
      }

      return data ?? [];
    },
  });
}
