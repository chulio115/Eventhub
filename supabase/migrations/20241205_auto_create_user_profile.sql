-- Migration: Automatische User-Profil-Erstellung bei Auth-Signup
-- Datum: 2024-12-05

-- 1. Funktion die bei neuem Auth-User automatisch public.users Eintrag erstellt
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Nur für @immomio.de E-Mails
  IF NEW.email LIKE '%@immomio.de' THEN
    INSERT INTO public.users (external_id, email, name, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      'user'
    )
    ON CONFLICT (email) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger auf auth.users Tabelle
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Bestehende Auth-User nachträglich in public.users einfügen (falls noch nicht vorhanden)
INSERT INTO public.users (external_id, email, name, role)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email::text, '@', 1)),
  'user'
FROM auth.users au
WHERE au.email LIKE '%@immomio.de'
  AND NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.external_id = au.id
  )
ON CONFLICT (email) DO NOTHING;

-- 4. Info-Kommentar
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatisch public.users Eintrag erstellen wenn sich ein @immomio.de User registriert';
