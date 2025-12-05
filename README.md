# EventHub

Cloud-basierte Event-Management-App für Mitarbeiter von Immomio.

## Features

- **Event-Verwaltung** – Events erstellen, bearbeiten, filtern und durchsuchen
- **Kalenderansicht** – Übersichtliche Monats- und Jahresansicht aller Events
- **Finanzübersicht** – Kostenanalyse mit Filtern, Charts und Export (CSV/PDF)
- **Team-Verwaltung** – Benutzer und Rollen verwalten (Admin-Bereich)
- **Event-Sharing** – Events per Link mit externen Stakeholdern teilen
- **Dark Mode** – Automatische Anpassung an Systemeinstellungen

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, TanStack Query
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Hosting**: Netlify (mit Security Headers)

## Schnellstart

```bash
# 1. Repository klonen
git clone <repo-url>
cd windsurf-project

# 2. Frontend-Abhängigkeiten installieren
cd frontend
npm install

# 3. Umgebungsvariablen konfigurieren
cp .env.example .env
# VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY eintragen

# 4. Entwicklungsserver starten
npm run dev
```

Dann im Browser öffnen: http://localhost:5173

## Projektstruktur

```
├── frontend/          # React SPA
│   ├── src/
│   │   ├── components/   # UI-Komponenten
│   │   ├── features/     # Feature-Module (auth, events, users)
│   │   ├── pages/        # Seiten-Komponenten
│   │   └── lib/          # Utilities, Supabase-Client
│   └── public/
├── supabase/          # Datenbank-Schema & Migrationen
├── docs/              # Projekt-Dokumentation
└── netlify.toml       # Deployment-Konfiguration
```

## Dokumentation

- [Vision](docs/VISION.md) – Projektziele und Designprinzipien
- [Architektur](docs/ARCHITECTURE.md) – Technische Übersicht
- [Roadmap](docs/ROADMAP.md) – Entwicklungsphasen
- [Security Audit](SECURITY_AUDIT.md) – Sicherheitsanalyse

## Rollen

| Rolle | Rechte |
|-------|--------|
| **Admin** | Vollzugriff, Benutzerverwaltung, alle Events |
| **User** | Eigene Events erstellen/bearbeiten, alle Events sehen |

## Deployment

Die App wird automatisch über Netlify deployed. Security Headers sind konfiguriert:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
