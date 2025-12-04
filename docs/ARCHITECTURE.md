# EventHub – Architekturübersicht

## Zielbild

EventHub ist eine Cloud-native Webanwendung zur Verwaltung externer Veranstaltungen für Mitarbeitende von Immomio.

- **Frontend**: React SPA mit Tailwind CSS, React Router und TanStack Query, gehostet auf Netlify.
- **Backend/Functions**: Leichtgewichtige Serverless Functions (Netlify Functions und/oder Supabase Edge Functions) für komplexe Logik (CSV, Kostenaggregation, Sharing).
- **Datenbank & Auth**: Supabase (PostgreSQL) inklusive Supabase Auth mit Domain-Restriction auf `@immomio.de` und Row Level Security (RLS).

## Verzeichnisstruktur (Monorepo)

- `frontend/` – React-App (SPA, Komponenten, Routing, State-Management).
- `functions/` – Serverless Functions für REST-API-Endpunkte.
- `supabase/` – SQL-Skripte für Schema & Migrationen (z. B. `schema.sql`).
- `docs/` – Projektdokumentation (Vision, Roadmap, Architektur, API-Specs).

## Kernkomponenten

- **EventList**: Tabellenansicht mit Filtern (Status, Zeitraum, Stadt, Tags).
- **EventDetail**: Formular zum Erstellen/Bearbeiten eines Events inkl. Historie.
- **CalendarView**: Monatsansicht mit FullCalendar.
- **CostOverview**: Aggregierte Kostenübersicht über Events.
- **SharingView**: Read-only-Ansicht für Events via Token (`/share/:token`).

## Datenmodell (Kurzüberblick)

- `users`:
  - `id` (UUID, PK)
  - `external_id` (UUID, FK zu `auth.users.id`)
  - `email` (nur `@immomio.de`)
  - `name`
  - `role` (`user` | `admin`)

- `events`:
  - Metadaten (Titel, Organisator, Zeitraum, Ort, Status)
  - `colleagues` (Text-Array)
  - `tags` (Text-Array)
  - Kostenfelder (`cost_type`, `cost_value`)
  - LinkedIn-Planung, Notizen, Attachments, Publikationsstatus

- `event_history`:
  - Änderungen/Aktionen an Events mit Userbezug und Zeitstempel.

- `share_tokens`:
  - Token-basierter Zugriff auf Events (Read-only, optional mit Ablaufdatum).

## Sicherheit

- **Auth**: Supabase Auth (E-Mail/Passwort oder Magic Links), Domain-Restriction auf `@immomio.de`.
- **RLS**:
  - Normale User sehen nur eigene Events und deren Historie.
  - Admins sehen alle Events und alle User.
- **Sharing**:
  - Öffentliche Read-only-Ansicht nur über `share_tokens`.
  - Internes RLS bleibt bestehen; Functions nutzen ggf. Service-Role-Key für Token-Validierung.

## Kommunikation & Flows (vereinfacht)

- **Login**: Frontend → Supabase Auth → JWT → Speicherung in `sessionStorage` → Nutzung im Supabase-Client / bei API-Calls.
- **Event-CRUD**: Frontend → Supabase-Client (direkte Tabellenzugriffe mit RLS) oder → Serverless Function (für komplexere Operationen).
- **CSV-Import/-Export**: Frontend lädt Dateien hoch / triggert Export → Function (Node.js mit PapaParse) → DB.
- **Kostenübersicht**: Frontend → Function `GET /events/summary` → Aggregations-Query auf Basis des `events`-Schemas.
