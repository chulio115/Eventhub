-- Migration: Erweitere event_costs View um city und status
-- Ermöglicht erweiterte Filterung in der Kostenübersicht

CREATE OR REPLACE VIEW public.event_costs AS
SELECT
  e.id,
  e.title,
  e.organizer,
  e.city,
  e.status,
  e.booked,
  e.start_date,
  e.cost_type,
  e.cost_value,
  e.colleagues,
  cardinality(e.colleagues) AS colleagues_count,
  CASE
    WHEN e.cost_type = 'participant' THEN e.cost_value * GREATEST(cardinality(e.colleagues), 0)
    WHEN e.cost_type = 'booth' THEN e.cost_value
  END AS total_cost,
  CASE
    WHEN e.cost_type = 'booth' AND cardinality(e.colleagues) > 0 THEN e.cost_value / cardinality(e.colleagues)
    WHEN e.cost_type = 'participant' AND cardinality(e.colleagues) > 0 THEN e.cost_value
    ELSE 0
  END AS cost_per_participant
FROM public.events e;
