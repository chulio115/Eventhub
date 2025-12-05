# Security Audit Report - EventHub

**Datum:** 05.12.2024  
**Status:** ✅ Grundlegend sicher, Verbesserungen empfohlen

---

## 1. Authentifizierung & Autorisierung

### ✅ Gut implementiert
- **Supabase Auth** mit Magic Link (kein Passwort-Handling nötig)
- **E-Mail-Domain-Restriction** auf `@immomio.de`
- **RLS (Row Level Security)** auf allen Tabellen aktiviert
- **Rollen-System** (admin, user, extern) mit unterschiedlichen Berechtigungen
- **RequireAuth/RequireAdmin Guards** für geschützte Routen

### ⚠️ Verbesserungsvorschläge
1. **Session-Timeout** implementieren (aktuell unbegrenzt)
2. **Rate Limiting** für Login-Versuche hinzufügen
3. **Audit Log** für Admin-Aktionen (Rollenwechsel, User-Löschung)

---

## 2. Row Level Security (RLS) Policies

### Aktuelle Policies:

#### `public.users`
```sql
✅ Users can view own profile (SELECT)
✅ Users can update own profile (UPDATE)
✅ Admins can manage all users (ALL)
```

#### `public.events`
```sql
✅ Users can view own events or admins all (SELECT)
✅ Users can insert events for themselves (INSERT)
✅ Users can update own events or admins all (UPDATE)
✅ Admins can delete events (DELETE)
```

#### `public.event_history`
```sql
✅ Users can view history of accessible events (SELECT)
✅ Users can insert history for accessible events (INSERT)
```

#### `public.share_tokens`
```sql
✅ Admins can manage share tokens (ALL)
✅ Anyone can view valid share tokens (SELECT)
```

### ⚠️ Empfehlungen
1. **Extern-Rolle** hat aktuell vollen Lesezugriff - ggf. einschränken
2. **Delete-Policy für Users** fehlt - nur Admins sollten löschen können

---

## 3. Input Validation

### ✅ Implementiert
- E-Mail-Validierung bei Login/Invite
- TypeScript Types für alle Datenstrukturen
- Supabase validiert Datentypen serverseitig

### ⚠️ Verbesserungsvorschläge
1. **XSS-Schutz** - React escaped standardmäßig, aber bei `dangerouslySetInnerHTML` aufpassen
2. **URL-Validierung** für externe Links (LinkedIn, Website)
3. **Dateiupload-Validierung** - Dateitypen und Größe prüfen

---

## 4. API & Datenübertragung

### ✅ Gut implementiert
- **HTTPS** über Netlify/Supabase
- **Supabase RLS** verhindert unbefugten Datenzugriff
- **Keine API-Keys im Frontend** (nur anon key, der ist öffentlich)

### ⚠️ Empfehlungen
1. **CORS** - Supabase-Projekt auf spezifische Origins beschränken
2. **Content Security Policy (CSP)** Header hinzufügen

---

## 5. Datenschutz (DSGVO)

### ⚠️ Zu prüfen
1. **Datenschutzerklärung** fehlt
2. **Cookie-Banner** nicht implementiert (falls Cookies verwendet)
3. **Datenexport-Funktion** für Nutzer (Art. 20 DSGVO)
4. **Löschfunktion** für eigene Daten

---

## 6. Empfohlene Maßnahmen

### Priorität: Hoch
- [ ] Session-Timeout nach 24h Inaktivität
- [ ] CSP-Header in Netlify konfigurieren
- [ ] URL-Validierung für externe Links

### Priorität: Mittel
- [ ] Audit-Log für Admin-Aktionen
- [ ] Rate Limiting für Auth-Endpoints
- [ ] Extern-Rolle Berechtigungen einschränken

### Priorität: Niedrig
- [ ] Datenschutzerklärung hinzufügen
- [ ] Datenexport für Nutzer
- [ ] 2FA-Option (optional)

---

## 7. Netlify Security Headers

Empfohlene `netlify.toml` Konfiguration:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co"
```

---

## Fazit

Die App ist **grundlegend sicher** durch:
- Supabase Auth mit Magic Links
- RLS auf allen Tabellen
- Rollen-basierte Zugriffskontrolle
- TypeScript für Type Safety

Die empfohlenen Verbesserungen erhöhen die Sicherheit weiter, sind aber für den internen Gebrauch nicht kritisch.
