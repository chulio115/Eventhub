import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabaseClient';
import type { EventRow } from './useEvents';

/** Datum (YYYY-MM-DD) um ein Jahr verschieben; 29.02. wird im Nicht-Schaltjahr zum 28.02. */
export function shiftDateOneYear(value: string | null): string | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const year = Number(match[1]) + 1;
  const month = match[2];
  let day = match[3];
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  if (month === '02' && day === '29' && !isLeap) day = '28';
  return `${year}-${month}-${day}`;
}

/** Jahreszahl im Titel hochzählen (z. B. „ImmomioCon 2026“ → „ImmomioCon 2027“). */
export function nextYearTitle(event: Pick<EventRow, 'title' | 'start_date' | 'end_date'>): string {
  const baseDate = event.start_date ?? event.end_date;
  if (!baseDate) return `${event.title} (Kopie)`;
  const year = baseDate.slice(0, 4);
  const yearRe = new RegExp(`\\b${year}\\b`, 'g');
  return yearRe.test(event.title) ? event.title.replace(yearRe, String(Number(year) + 1)) : event.title;
}

export function useDuplicateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: EventRow) => {
      // Alles übernehmen, nur Datum (+1 Jahr), Titel-Jahr und Status anpassen
      const { id: _id, ...rest } = event;
      const payload = {
        ...rest,
        title: nextYearTitle(event),
        start_date: shiftDateOneYear(event.start_date),
        end_date: shiftDateOneYear(event.end_date),
        status: 'consider' as const,
        booked: false,
      };

      const { data, error } = await supabase
        .from('events')
        .insert(payload)
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      return data as { id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event_costs'] });
      toast.success('Event wurde dupliziert');
    },
    onError: (error) => {
      toast.error(`Fehler beim Duplizieren: ${error.message}`);
    },
  });
}
