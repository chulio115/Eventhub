-- Migration: Add 'sponsoring' to cost_type enum
-- Datum: 2024-12-05
-- Beschreibung: Erweitert den cost_type ENUM um die Option 'sponsoring'

-- ENUM-Wert hinzufügen (PostgreSQL 9.1+)
ALTER TYPE public.cost_type ADD VALUE IF NOT EXISTS 'sponsoring';

-- Hinweis: Diese Änderung ist nicht transaktional und kann nicht rückgängig gemacht werden.
-- Nach Ausführung muss ggf. ein COMMIT erfolgen.
