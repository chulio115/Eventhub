# EventHub – Vision

## Zweck

EventHub ersetzt das bestehende lokale HTML/JS-Tool (LocalStorage) durch eine sichere, mehrbenutzerfähige Cloud-Anwendung.

## Ziele

- **Zentrale Datenhaltung**: Alle relevanten externen Veranstaltungen werden in einer zentralen PostgreSQL-Datenbank (Supabase) verwaltet.
- **Sichere Nutzung im Unternehmen**: Login ausschließlich mit `@immomio.de`-Adressen (Supabase Auth, Domain-Restriction).
- **Rollenbasiertes Zugriffskonzept**:
  - `user`: Standardnutzer, verwaltet eigene Events.
  - `admin`: Vollzugriff, inkl. User-/Rollenverwaltung und Konfiguration.
- **Einfache Kollaboration**: Events können per URL als Read-only-Ansicht mit externen Stakeholdern geteilt werden.
- **Erweiterbare Plattform**: Basis legen für CSV-Import/Export, Kostenreports, LinkedIn-Planung und Dateiuploads.

## Nicht-Ziele (MVP)

- Kein vollwertiges CRM oder HR-System.
- Keine komplexen Freigabe- oder Budget-Workflows.
- Keine native Mobile-App – responsive Web-UI ist ausreichend.

## Erfolgskennzahlen (Beispiele)

- Vollständige Migration der bestehenden LocalStorage-Daten ohne Datenverlust.
- Aktive Nutzung durch Mitarbeitende (`@immomio.de`) im Tagesgeschäft.
- Keine kritischen Sicherheitsvorfälle (RLS & Auth korrekt konfiguriert).
- Gute Performance: Hauptansichten (Liste, Kalender, Kostenübersicht) laden im Normalfall < 1 s.

## Langfristige Vision

- **Single Source of Truth** für alle externen Veranstaltungen bei Immomio.
- Integration mit HR-/CRM-Systemen (z. B. Teilnahmebestätigungen, Follow-ups, Leads).
- Automatisierte Reports (Kosten pro Event, pro Team, pro Kanal, Zeitverläufe).
- Unterstützung weiterer Kommunikationskanäle (z. B. automatisierte LinkedIn-Posts, E-Mail-Templates).

## UI- und Designprinzipien

- **Immomio Blue Spectrum** als Basis:
  - Primärfarben: `immomio.azure` und `immomio.indigo` (Tailwind-Theme), Aliase unter `brand` (`brand`, `brand.dark`, `brand.soft`, `brand.bright`, `brand.accent`).
  - Sekundärfarben: Soft Blue, Bright, Lilac, Aqua, Petrol, Warm Red für Badges, Status und Akzente.
- **Weißraum & Klarheit**:
  - Dominant weißes UI mit dezenten grauen Rahmen (`border-slate-200`) und Schatten für Karten.
  - Konsistente Border-Radii (`rounded-2xl` für Karten, `rounded-full` für Filterchips/Badges).
- **Layout-Logik**:
  - Event-Liste + Detail/Historie: Split-View mit 2 Spalten auf Desktop.
  - Kalender- und Kostenansicht: responsives Grid mit 1 Spalte (Mobile), 2 Spalten (Laptop), 3 Spalten nur auf sehr breiten Screens (kein „Gequetsche“).
- **Komponenten-Stil**:
  - Primary-Buttons mit `bg-brand` / `hover:bg-brand-dark` und klarer Focus-Markierung.
  - Filter-Chips als `rounded-full`-Buttons mit aktiven/inaktiven Zuständen.
  - Status-Badges farbkodiert (z. B. geplant/gebucht/abgesagt) auf Basis der Brand-Palette.
