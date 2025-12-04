import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

export type EventCostRow = {
  id: string;
  title: string;
  organizer: string | null;
  start_date: string | null;
  cost_type: 'participant' | 'booth';
  cost_value: number;
  colleagues: string[];
  colleagues_count: number;
  total_cost: number | null;
  cost_per_participant: number | null;
};

export function useEventCosts() {
  return useQuery<EventCostRow[], Error>({
    queryKey: ['event-costs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_costs')
        .select(
          [
            'id',
            'title',
            'organizer',
            'start_date',
            'cost_type',
            'cost_value',
            'colleagues',
            'colleagues_count',
            'total_cost',
            'cost_per_participant',
          ].join(', '),
        )
        .order('start_date', { ascending: true });

      if (error) {
        throw error as Error;
      }

      return (data ?? []) as unknown as EventCostRow[];
    },
  });
}
