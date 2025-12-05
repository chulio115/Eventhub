-- Migration: Backfill Event History für bestehende Events
-- Fügt einen initialen "Event angelegt" Eintrag für alle Events hinzu, die noch keinen Historie-Eintrag haben

INSERT INTO public.event_history (event_id, action, timestamp, user_id)
SELECT 
  e.id as event_id,
  'Event angelegt' as action,
  COALESCE(e.created_at, timezone('utc', now())) as timestamp,
  e.created_by as user_id
FROM public.events e
WHERE NOT EXISTS (
  SELECT 1 FROM public.event_history h WHERE h.event_id = e.id
);

-- Ausgabe der Anzahl der hinzugefügten Einträge
-- SELECT COUNT(*) as backfilled_events FROM public.event_history WHERE action = 'Event angelegt';
