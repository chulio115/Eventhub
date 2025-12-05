# EventHub

Cloud-basierte Event-Management-App für Mitarbeiter von Immomio.

- **frontend** – React SPA mit Tailwind CSS (Netlify Hosting)
- **functions** – Serverless Functions (Netlify Functions / Supabase Edge Functions)
- **supabase** – Datenbank-Schema & SQL-Migrationen für Supabase/PostgreSQL
- **docs** – Projekt-Dokumentation (Vision, Roadmap, Architektur, API)

## Schnellstart (lokale Entwicklung)

### Frontend starten

1. Terminal im Projektordner öffnen und ins Frontend wechseln:
   ```bash
   cd frontend
   ```
2. Abhängigkeiten installieren (nur beim ersten Mal nötig):
   ```bash
   npm install
   ```
3. Entwicklungsserver starten:
   ```bash
   npm run dev
   ```
4. Browser öffnen und aufrufen:
   ```text
   http://localhost:5173
   ```

### Hinweise

- Für die Verbindung zu Supabase brauchst du eine `.env` im Ordner `frontend` mit z.B.:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Deployment (Netlify + Functions) folgt separat in der Projekt-Dokumentation.
