-- Migration: Bewertungssystem und Besucher-Notizen
-- Datum: 2024-12-05

-- Bewertungsfelder hinzufügen (1-5 Sterne, nullable)
ALTER TABLE events ADD COLUMN IF NOT EXISTS rating_sales smallint CHECK (rating_sales >= 1 AND rating_sales <= 5);
ALTER TABLE events ADD COLUMN IF NOT EXISTS rating_kam smallint CHECK (rating_kam >= 1 AND rating_kam <= 5);
ALTER TABLE events ADD COLUMN IF NOT EXISTS rating_marketing smallint CHECK (rating_marketing >= 1 AND rating_marketing <= 5);
ALTER TABLE events ADD COLUMN IF NOT EXISTS rating_clevel smallint CHECK (rating_clevel >= 1 AND rating_clevel <= 5);

-- Besucher-Notizen Feld hinzufügen
ALTER TABLE events ADD COLUMN IF NOT EXISTS visitor_notes text;

-- Kommentare für Dokumentation
COMMENT ON COLUMN events.rating_sales IS 'Sales-Bewertung (1-5 Sterne)';
COMMENT ON COLUMN events.rating_kam IS 'KAM-Bewertung (1-5 Sterne)';
COMMENT ON COLUMN events.rating_marketing IS 'Marketing-Bewertung (1-5 Sterne)';
COMMENT ON COLUMN events.rating_clevel IS 'C-Level-Bewertung (1-5 Sterne)';
COMMENT ON COLUMN events.visitor_notes IS 'Notizen zu Besuchern des Events';

-- Event History Tabelle um user_email erweitern (falls nicht vorhanden)
ALTER TABLE event_history ADD COLUMN IF NOT EXISTS user_email text;
