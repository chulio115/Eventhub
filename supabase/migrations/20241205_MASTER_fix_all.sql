-- =====================================================
-- MASTER MIGRATION: Alle User-Management Fixes
-- Datum: 2024-12-05
-- =====================================================
-- Diese Migration behebt alle bekannten Probleme:
-- 1. User werden nicht automatisch in public.users angelegt
-- 2. Events sind für normale User nicht sichtbar
-- 3. User können nicht vollständig gelöscht werden
-- 4. Passwort-Prompt nach erstem Login
-- =====================================================

-- =====================================================
-- TEIL 1: has_password Feld hinzufügen
-- =====================================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS has_password boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.users.has_password IS 'Ob der User bereits ein Passwort gesetzt hat';

-- =====================================================
-- TEIL 2: Automatische User-Erstellung bei Auth-Signup
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Nur für @immomio.de E-Mails
  IF NEW.email LIKE '%@immomio.de' THEN
    INSERT INTO public.users (external_id, email, name, role, has_password)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      'user',
      false
    )
    ON CONFLICT (email) DO UPDATE SET
      external_id = EXCLUDED.external_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger für neue Auth-User
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- TEIL 3: Bestehende Auth-User nachträglich einfügen
-- =====================================================
INSERT INTO public.users (external_id, email, name, role, has_password)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email::text, '@', 1)),
  'user',
  false
FROM auth.users au
WHERE au.email LIKE '%@immomio.de'
  AND NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.external_id = au.id
  )
ON CONFLICT (email) DO UPDATE SET
  external_id = EXCLUDED.external_id;

-- =====================================================
-- TEIL 4: Funktion zum vollständigen Löschen eines Users
-- =====================================================
CREATE OR REPLACE FUNCTION public.delete_user_completely(user_id uuid)
RETURNS void AS $$
DECLARE
  auth_user_id uuid;
BEGIN
  -- Hole die auth.users ID
  SELECT external_id INTO auth_user_id FROM public.users WHERE id = user_id;
  
  IF auth_user_id IS NULL THEN
    RAISE EXCEPTION 'User nicht gefunden';
  END IF;
  
  -- Lösche aus public.users (cascaded zu events etc.)
  DELETE FROM public.users WHERE id = user_id;
  
  -- Lösche aus auth.users
  DELETE FROM auth.users WHERE id = auth_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.delete_user_completely(uuid) IS 'Löscht User komplett aus public.users UND auth.users';

-- =====================================================
-- TEIL 5: RLS Policies für Events - ALLE User können ALLES sehen
-- =====================================================

-- Events: Alle authentifizierten User können alle Events sehen
DROP POLICY IF EXISTS "Users can view own events or admins all" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can view all events" ON public.events;
CREATE POLICY "Authenticated users can view all events"
  ON public.events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.external_id = auth.uid()
    )
  );

-- Events: Alle authentifizierten User können Events erstellen
DROP POLICY IF EXISTS "Users can insert events for themselves" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can insert events" ON public.events;
CREATE POLICY "Authenticated users can insert events"
  ON public.events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.external_id = auth.uid()
    )
  );

-- Events: Alle authentifizierten User können Events bearbeiten
DROP POLICY IF EXISTS "Users can update own events or admins all" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can update all events" ON public.events;
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

-- Events: Alle authentifizierten User können Events löschen
DROP POLICY IF EXISTS "Admins can delete events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can delete events" ON public.events;
CREATE POLICY "Authenticated users can delete events"
  ON public.events
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.external_id = auth.uid()
    )
  );

-- =====================================================
-- TEIL 6: RLS Policies für Event History
-- =====================================================

DROP POLICY IF EXISTS "Users can view history for own events or admins all" ON public.event_history;
DROP POLICY IF EXISTS "Authenticated users can view all event history" ON public.event_history;
CREATE POLICY "Authenticated users can view all event history"
  ON public.event_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.external_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert history for own events or admins all" ON public.event_history;
DROP POLICY IF EXISTS "Authenticated users can insert event history" ON public.event_history;
CREATE POLICY "Authenticated users can insert event history"
  ON public.event_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.external_id = auth.uid()
    )
  );

-- =====================================================
-- TEIL 7: RLS Policies für Users-Tabelle
-- =====================================================

-- Admins können alle User sehen und verwalten
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
CREATE POLICY "Admins can manage all users"
  ON public.users
  FOR ALL
  USING (public.current_app_user_role() = 'admin')
  WITH CHECK (public.current_app_user_role() = 'admin');

-- User können ihr eigenes Profil sehen (auch ohne Admin)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (external_id = auth.uid());

-- User können ihr eigenes Profil aktualisieren (z.B. has_password)
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (external_id = auth.uid())
  WITH CHECK (external_id = auth.uid());

-- =====================================================
-- TEIL 8: Bewertungsfelder und visitor_notes hinzufügen
-- =====================================================

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS rating_sales smallint CHECK (rating_sales >= 1 AND rating_sales <= 5);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS rating_kam smallint CHECK (rating_kam >= 1 AND rating_kam <= 5);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS rating_marketing smallint CHECK (rating_marketing >= 1 AND rating_marketing <= 5);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS rating_clevel smallint CHECK (rating_clevel >= 1 AND rating_clevel <= 5);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS visitor_notes text;

COMMENT ON COLUMN public.events.rating_sales IS 'Sales-Bewertung (1-5 Sterne)';
COMMENT ON COLUMN public.events.rating_kam IS 'KAM-Bewertung (1-5 Sterne)';
COMMENT ON COLUMN public.events.rating_marketing IS 'Marketing-Bewertung (1-5 Sterne)';
COMMENT ON COLUMN public.events.rating_clevel IS 'C-Level-Bewertung (1-5 Sterne)';
COMMENT ON COLUMN public.events.visitor_notes IS 'Notizen zu Besuchern des Events';

-- Event History user_email
ALTER TABLE public.event_history ADD COLUMN IF NOT EXISTS user_email text;

-- =====================================================
-- FERTIG!
-- =====================================================
SELECT 'Migration erfolgreich abgeschlossen!' AS status;
