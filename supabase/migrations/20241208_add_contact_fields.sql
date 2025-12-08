-- Migration: Add contact fields for event organizer contact person
-- Date: 2024-12-08

-- Add contact fields to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS contact_name TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- Comment on columns
COMMENT ON COLUMN events.contact_name IS 'Name des Ansprechpartners beim Veranstalter';
COMMENT ON COLUMN events.contact_email IS 'E-Mail des Ansprechpartners';
COMMENT ON COLUMN events.contact_phone IS 'Telefon des Ansprechpartners';
