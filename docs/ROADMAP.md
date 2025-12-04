# EventHub – Roadmap (MVP-orientiert)

## Phase 0 – Grundlagen & Migration

- Bestehendes LocalStorage-Tool analysieren (Datenstruktur, Use Cases).
- MVP-Funktionalität und Datenmodell finalisieren.
- Supabase-Projekt anlegen (PostgreSQL, Auth, RLS-Basis).

## Phase 1 – Infrastruktur & Datenbank

- `supabase/schema.sql` erstellen und im Supabase-SQL-Editor ausführen.
- RLS-Regeln für `users`, `events`, `event_history`, `share_tokens` definieren.
- E-Mail-Domain-Restriction auf `@immomio.de` in Supabase Auth konfigurieren.

## Phase 2 – Auth & Basis-Frontend

- React-Frontend mit Tailwind CSS und React Router aufsetzen (`/frontend`).
- Supabase-Client integrieren (Auth + einfache CRUD-Operationen).
- Login-/Logout-Fluss umsetzen (Session-Verwaltung, Token-Speicherung in `sessionStorage`).
- Basis-Views:
  - `/events`: Event-Liste mit einfachen Filtern.
  - `/events/:id`: Detail-/Edit-Ansicht.

## Phase 3 – API & Business-Logik

- Serverless Functions für komplexere Logik:
  - `GET /events/summary` (Kostenaggregation).
  - `POST /events/import-csv` und `GET /events/export-csv` (mit PapaParse).
  - `POST /shares` und `GET /share/:token` (Read-only-Ansicht ohne Login).
- OpenAPI 3.0 Spec erstellen und im Repo unter `docs/api/openapi.yaml` ablegen.
- TanStack Query für Caching, Error-Handling und Refetching im Frontend nutzen.

## Phase 4 – Admin-Features & Feinschliff

- Admin-UI für User-/Rollenverwaltung (`/admin/users`).
- Erweiterte Filter, Pagination und Lazy Loading in Event-Liste.
- Kalender-Ansicht (FullCalendar) für Monatsübersicht.
- Kostenübersicht mit Summen und Detail-Breakdown.

## Phase 5 – Qualität, Sicherheit & Rollout

- Unit-Tests (Jest) für Business-Logik und Utility-Funktionen.
- E2E-Tests (Cypress) für zentrale Flows (Login, Event anlegen/bearbeiten, Sharing).
- Security-Check (RLS, Auth-Claims, Rate-Limiting auf Functions).
- Staging-Umgebung auf Netlify (Branch-Deploys) + Production-Deploy.

## Spätere Erweiterungen (Post-MVP)

- Supabase Storage für Dateiuploads (Anhänge zu Events).
- LinkedIn OAuth-Integration für geplante Posts.
- Integration mit Monitoring/Tracing (z. B. Sentry) für Fehler-Tracking.
