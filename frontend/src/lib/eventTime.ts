/** Uhrzeiten aus der Datenbank ("09:30:00") für Anzeige/Inputs auf "09:30" kürzen. */
export function toTimeInput(value: string | null | undefined): string {
  if (!value) return '';
  const match = /^(\d{2}):(\d{2})/.exec(value);
  return match ? `${match[1]}:${match[2]}` : '';
}

/** "09:30" → "09:30 Uhr"; leer bleibt leer. */
export function formatTime(value: string | null | undefined): string {
  const t = toTimeInput(value);
  return t ? `${t} Uhr` : '';
}

/** Zeitspanne für Anzeigen, z. B. "09:30 – 17:00 Uhr" oder "ab 09:30 Uhr". */
export function formatTimeRange(start: string | null | undefined, end: string | null | undefined): string {
  const s = toTimeInput(start);
  const e = toTimeInput(end);
  if (s && e) return `${s} – ${e} Uhr`;
  if (s) return `ab ${s} Uhr`;
  if (e) return `bis ${e} Uhr`;
  return '';
}

/** Postgres-Fehler "Spalte existiert nicht" – Uhrzeit-Spalten noch nicht angelegt. */
export function isMissingColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42703' || /column .* does not exist/i.test(error.message ?? '');
}
