import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

export type EventStatus = 'planned' | 'consider' | 'attended' | 'cancelled';
export type CostType = 'participant' | 'booth' | 'sponsoring';

export interface EventRow {
  id: string;
  title: string;
  organizer: string | null;
  start_date: string | null;
  end_date: string | null;
  city: string | null;
  location: string | null;
  status: EventStatus;
  booked: boolean;
  cost_type: CostType;
  cost_value: number;
  colleagues: string[];
  tags: string[];
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

export function useEvents() {
  return useQuery<EventRow[], Error>({
    queryKey: ['events'],
    queryFn: async (): Promise<EventRow[]> => {
      const { data, error } = await supabase
        .from('events')
        .select(
          [
            'id',
            'title',
            'organizer',
            'start_date',
            'end_date',
            'city',
            'location',
            'status',
            'booked',
            'colleagues',
            'tags',
            'cost_type',
            'cost_value',
            'event_url',
            'notes',
            'visitor_notes',
            'attachments',
            'linkedin_plan',
            'linkedin_note',
            'publication_status',
            'rating_sales',
            'rating_kam',
            'rating_marketing',
            'rating_clevel',
          ].join(', '),
        )
        .order('start_date', { ascending: true });

      if (error) {
        throw error as Error;
      }

      return (data ?? []) as EventRow[];
    },
  });
}
