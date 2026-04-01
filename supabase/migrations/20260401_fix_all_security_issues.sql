-- Migration: Fix all security issues reported by Supabase Security Advisor
-- Date: 2026-04-01
-- This migration addresses:
-- 1. SECURITY DEFINER views (event_costs, event_costs_old)
-- 2. Function search_path issues (handle_new_user, delete_user_completely)
-- 3. RLS disabled on backup tables
-- 4. RLS disabled on public.Data table (if exists)

-- ============================================================================
-- 1. FIX SECURITY DEFINER VIEWS
-- ============================================================================

-- Drop and recreate event_costs view without SECURITY DEFINER
DROP VIEW IF EXISTS public.event_costs;

CREATE VIEW public.event_costs AS
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
    WHEN e.cost_type IN ('booth', 'sponsoring') THEN e.cost_value
    ELSE 0
  END AS total_cost,
  CASE
    WHEN e.cost_type IN ('booth', 'sponsoring') AND cardinality(e.colleagues) > 0 THEN e.cost_value / cardinality(e.colleagues)
    WHEN e.cost_type = 'participant' AND cardinality(e.colleagues) > 0 THEN e.cost_value
    ELSE 0
  END AS cost_per_participant
FROM public.events e;

-- Drop event_costs_old if it exists (appears to be unused)
DROP VIEW IF EXISTS public.event_costs_old;

-- ============================================================================
-- 2. FIX FUNCTION SEARCH_PATH ISSUES
-- ============================================================================

-- Recreate handle_new_user with explicit search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;

-- Recreate delete_user_completely with explicit search_path
CREATE OR REPLACE FUNCTION public.delete_user_completely(user_id uuid)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;

-- ============================================================================
-- 3. FIX RLS ON BACKUP TABLES
-- ============================================================================

-- Enable RLS on backup tables (these should be admin-only or removed if unused)
ALTER TABLE IF EXISTS public.events_backup_20260304_1133 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.events_backup_20260304_1137 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.events_backup_registry ENABLE ROW LEVEL SECURITY;

-- Create restrictive policies (only admins can access backup tables)
DO $$
BEGIN
  -- events_backup_20260304_1133
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events_backup_20260304_1133') THEN
    DROP POLICY IF EXISTS "Only admins can access backup" ON public.events_backup_20260304_1133;
    CREATE POLICY "Only admins can access backup"
      ON public.events_backup_20260304_1133
      FOR ALL
      USING (public.current_app_user_role() = 'admin')
      WITH CHECK (public.current_app_user_role() = 'admin');
  END IF;

  -- events_backup_20260304_1137
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events_backup_20260304_1137') THEN
    DROP POLICY IF EXISTS "Only admins can access backup" ON public.events_backup_20260304_1137;
    CREATE POLICY "Only admins can access backup"
      ON public.events_backup_20260304_1137
      FOR ALL
      USING (public.current_app_user_role() = 'admin')
      WITH CHECK (public.current_app_user_role() = 'admin');
  END IF;

  -- events_backup_registry
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events_backup_registry') THEN
    DROP POLICY IF EXISTS "Only admins can access backup" ON public.events_backup_registry;
    CREATE POLICY "Only admins can access backup"
      ON public.events_backup_registry
      FOR ALL
      USING (public.current_app_user_role() = 'admin')
      WITH CHECK (public.current_app_user_role() = 'admin');
  END IF;
END $$;

-- ============================================================================
-- 4. FIX RLS ON public.Data TABLE (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Data') THEN
    ALTER TABLE public."Data" ENABLE ROW LEVEL SECURITY;
    
    -- Create policy for authenticated users
    DROP POLICY IF EXISTS "Authenticated users can access Data" ON public."Data";
    CREATE POLICY "Authenticated users can access Data"
      ON public."Data"
      FOR ALL
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
  END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON VIEW public.event_costs IS 'Event costs view - runs with caller privileges (SECURITY INVOKER)';
COMMENT ON FUNCTION public.handle_new_user() IS 'Auto-create public.users entry for @immomio.de signups - uses explicit search_path for security';
COMMENT ON FUNCTION public.delete_user_completely(uuid) IS 'Delete user from public.users AND auth.users - uses explicit search_path for security';
