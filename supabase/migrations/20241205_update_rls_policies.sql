-- Migration: RLS-Policies aktualisieren
-- Alle authentifizierten Benutzer können alle Events sehen und bearbeiten
-- Datum: 2024-12-05

-- Events: Alle authentifizierten Benutzer können alle Events sehen
DROP POLICY IF EXISTS "Users can view own events or admins all" ON public.events;
CREATE POLICY "Authenticated users can view all events"
  ON public.events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.external_id = auth.uid()
    )
  );

-- Events: Alle authentifizierten Benutzer können Events erstellen
DROP POLICY IF EXISTS "Users can insert events for themselves" ON public.events;
CREATE POLICY "Authenticated users can insert events"
  ON public.events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.external_id = auth.uid()
    )
  );

-- Events: Alle authentifizierten Benutzer können Events bearbeiten
DROP POLICY IF EXISTS "Users can update own events or admins all" ON public.events;
CREATE POLICY "Authenticated users can update all events"
  ON public.events
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.external_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.external_id = auth.uid()
    )
  );

-- Events: Alle authentifizierten Benutzer können Events löschen (nicht nur Admins)
DROP POLICY IF EXISTS "Admins can delete events" ON public.events;
CREATE POLICY "Authenticated users can delete events"
  ON public.events
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.external_id = auth.uid()
    )
  );

-- Event History: Alle authentifizierten Benutzer können History sehen
DROP POLICY IF EXISTS "Users can view history for own events or admins all" ON public.event_history;
CREATE POLICY "Authenticated users can view all event history"
  ON public.event_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.external_id = auth.uid()
    )
  );

-- Event History: Alle authentifizierten Benutzer können History-Einträge erstellen
DROP POLICY IF EXISTS "Users can insert history for own events or admins all" ON public.event_history;
CREATE POLICY "Authenticated users can insert event history"
  ON public.event_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.external_id = auth.uid()
    )
  );
