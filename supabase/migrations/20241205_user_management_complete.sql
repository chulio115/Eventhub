-- Migration: Vollständige User-Verwaltung
-- Datum: 2024-12-05
-- Features: 
--   - Automatische User-Erstellung bei Auth-Signup
--   - has_password Flag für Passwort-Prompt
--   - Vollständige User-Löschung (public.users + auth.users)

-- 1. has_password Feld hinzufügen (für Passwort-Prompt nach erstem Login)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS has_password boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.users.has_password IS 'Ob der User bereits ein Passwort gesetzt hat';

-- 2. Funktion für neue User (bei Auth-Signup)
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
      false  -- Neuer User hat noch kein Passwort
    )
    ON CONFLICT (email) DO UPDATE SET
      external_id = EXCLUDED.external_id;  -- Update external_id falls User neu eingeladen wird
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger für neue Auth-User
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Funktion zum vollständigen Löschen eines Users (aus beiden Tabellen)
-- ACHTUNG: Diese Funktion löscht auch aus auth.users!
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

-- 5. Bestehende Auth-User nachträglich in public.users einfügen
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
ON CONFLICT (email) DO NOTHING;

-- 6. RLS Policy für users-Tabelle aktualisieren (damit Admins User löschen können)
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
CREATE POLICY "Admins can manage all users"
  ON public.users
  FOR ALL
  USING (public.current_app_user_role() = 'admin')
  WITH CHECK (public.current_app_user_role() = 'admin');

-- 7. RLS Policy damit User ihr eigenes Profil sehen und aktualisieren können
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (external_id = auth.uid() OR public.current_app_user_role() = 'admin');

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (external_id = auth.uid())
  WITH CHECK (external_id = auth.uid());

-- 8. Kommentar
COMMENT ON FUNCTION public.delete_user_completely(uuid) IS 'Löscht User komplett aus public.users UND auth.users';
