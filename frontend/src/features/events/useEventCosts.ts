import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

export type EventCostRow = {
  id: string;
  title: string;
  organizer: string | null;
  city: string | null;
  status: 'planned' | 'attended' | 'cancelled' | 'consider';
  booked: boolean;
  start_date: string | null;
  cost_type: 'participant' | 'booth';
  cost_value: number;
  colleagues: string[];
  colleagues_count: number;
  total_cost: number;
  cost_per_participant: number;
};

export function useEventCosts() {
  return useQuery<EventCostRow[], Error>({
    queryKey: ['event-costs'],
    queryFn: async () => {
      // Lade direkt von events-Tabelle für erweiterte Felder
      const { data, error } = await supabase
        .from('events')
        .select('id, title, organizer, city, status, booked, start_date, cost_type, cost_value, colleagues')
        .order('start_date', { ascending: true });

      if (error) {
        throw error as Error;
      }

      // Berechne Kosten im Frontend
      return (data ?? []).map((row) => {
        const colleagues = row.colleagues ?? [];
        const colleaguesCount = colleagues.length;
        const costValue = row.cost_value ?? 0;
        
        // Gesamtkosten berechnen
        let totalCost = 0;
        if (row.cost_type === 'participant') {
          totalCost = costValue * Math.max(colleaguesCount, 0);
        } else if (row.cost_type === 'booth') {
          totalCost = costValue;
        }
        
        // Kosten pro Teilnehmer
        let costPerParticipant = 0;
        if (row.cost_type === 'booth' && colleaguesCount > 0) {
          costPerParticipant = costValue / colleaguesCount;
        } else if (row.cost_type === 'participant' && colleaguesCount > 0) {
          costPerParticipant = costValue;
        }

        return {
          ...row,
          colleagues,
          colleagues_count: colleaguesCount,
          total_cost: totalCost,
          cost_per_participant: costPerParticipant,
        } as EventCostRow;
      });
    },
  });
}
