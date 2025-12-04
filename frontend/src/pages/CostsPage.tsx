import { useState } from 'react';
import { useEventCosts } from '../features/events/useEventCosts';

function formatEuro(value: number | null | undefined): string {
  const numeric = typeof value === 'number' ? value : 0;
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(numeric);
}

export function CostsPage() {
  const { data, isLoading, error } = useEventCosts();
  const rows = data ?? [];

  // Filter: Jahr & Kostenart
  const yearSet = new Set<number>();
  rows.forEach((row) => {
    if (!row.start_date) return;
    const d = new Date(row.start_date);
    if (Number.isNaN(d.getTime())) return;
    yearSet.add(d.getFullYear());
  });

  const yearOptions = Array.from(yearSet).sort((a, b) => a - b);

  const [yearFilter, setYearFilter] = useState<number | 'all'>(yearOptions[0] ?? 'all');
  const [costTypeFilter, setCostTypeFilter] = useState<'all' | 'participant' | 'booth'>('all');

  const filteredRows = rows.filter((row) => {
    if (yearFilter !== 'all') {
      if (!row.start_date) return false;
      const d = new Date(row.start_date);
      if (Number.isNaN(d.getTime()) || d.getFullYear() !== yearFilter) return false;
    }

    if (costTypeFilter !== 'all' && row.cost_type !== costTypeFilter) return false;

    return true;
  });

  const totalEvents = filteredRows.length;
  const totalParticipants = filteredRows.reduce(
    (sum, row) => sum + (row.colleagues_count ?? 0),
    0,
  );
  const totalCost = filteredRows.reduce((sum, row) => sum + (row.total_cost ?? 0), 0);

  const sortedEvents = filteredRows.slice().sort((a, b) => {
    const da = a.start_date ?? '';
    const db = b.start_date ?? '';
    if (da && db && da !== db) return da.localeCompare(db);
    return a.title.localeCompare(b.title, 'de-DE');
  });

  const byOrganizer = Array.from(
    filteredRows.reduce((map, row) => {
      if (!row.organizer) return map;
      const prev = map.get(row.organizer) ?? 0;
      return map.set(row.organizer, prev + (row.total_cost ?? 0));
    }, new Map<string, number>()),
  )
    .map(([organizer, sum]) => ({ organizer, sum }))
    .sort((a, b) => b.sum - a.sum);

  const byMonthMap = filteredRows.reduce((map, row) => {
    const iso = row.start_date;
    if (!iso) return map;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return map;
    const key = iso.slice(0, 7); // YYYY-MM
    const prev = map.get(key);
    const sum = (row.total_cost ?? 0) + (prev?.sum ?? 0);
    const refDate = prev?.date ?? date;
    map.set(key, { sum, date: refDate });
    return map;
  }, new Map<string, { sum: number; date: Date }>());

  const byMonth = Array.from(byMonthMap.entries())
    .map(([key, value]) => ({ key, sum: value.sum, date: value.date }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <div className="flex min-h-0 flex-col space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Kosten &amp; Teilnahmen</h1>
          <p className="text-sm text-slate-500">
            Aktuelle Filter (basierend auf allen geladenen Events).
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {totalEvents} Events · {totalParticipants} Teilnahmen
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          <div className="text-lg font-semibold text-slate-900">{formatEuro(totalCost)}</div>
          <div className="flex flex-wrap justify-end gap-2 text-xs text-slate-600">
            <select
              className="h-8 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm"
              value={yearFilter}
              onChange={(e) =>
                setYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
            >
              <option value="all">Alle Jahre</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <select
              className="h-8 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm"
              value={costTypeFilter}
              onChange={(e) => setCostTypeFilter(e.target.value as 'all' | 'participant' | 'booth')}
            >
              <option value="all">Alle Kostenarten</option>
              <option value="participant">Teilnehmerkosten</option>
              <option value="booth">Messestandkosten</option>
            </select>
          </div>
        </div>
      </div>
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,2.5fr)_minmax(0,1.5fr)_minmax(0,1.5fr)]">
        {/* Events-Tabelle */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Events
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-white text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Event</th>
                <th className="px-4 py-2 text-right font-medium">TN</th>
                <th className="px-4 py-2 text-right font-medium">Gesamt/Event</th>
                <th className="px-4 py-2 text-right font-medium">€/TN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-xs text-slate-400">
                    Lade Daten…
                  </td>
                </tr>
              )}
              {error && !isLoading && (
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-xs text-red-600">
                    Fehler beim Laden der Kosten: {error.message}
                  </td>
                </tr>
              )}
              {!isLoading && !error && sortedEvents.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-xs text-slate-400">
                    Noch keine Events mit Kosten vorhanden.
                  </td>
                </tr>
              )}
              {!isLoading && !error &&
                sortedEvents.map((row) => {
                  const tn = row.colleagues_count ?? 0;
                  const total = row.total_cost ?? 0;
                  const costPer = row.cost_per_participant ?? 0;

                  return (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="max-w-[260px] truncate px-4 py-1.5 text-sm text-slate-900">
                        {row.title}
                      </td>
                      <td className="px-4 py-1.5 text-right text-sm text-slate-700">{tn}</td>
                      <td className="px-4 py-1.5 text-right text-sm text-slate-700">
                        {formatEuro(total)}
                      </td>
                      <td className="px-4 py-1.5 text-right text-sm text-slate-700">
                        {tn > 0 ? formatEuro(costPer) : '–'}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
            </table>
          </div>
        </div>

        {/* Nach Veranstalter */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Nach Veranstalter
          </div>
          <div className="flex-1 divide-y divide-slate-100 overflow-y-auto text-sm">
            {isLoading && (
              <div className="px-4 py-2 text-xs text-slate-400">Lade Daten…</div>
            )}
            {error && !isLoading && (
              <div className="px-4 py-2 text-xs text-red-600">
                Fehler beim Laden der Kosten.
              </div>
            )}
            {!isLoading && !error && byOrganizer.length === 0 && (
              <div className="px-4 py-2 text-xs text-slate-400">Keine Einträge</div>
            )}
            {!isLoading && !error &&
              byOrganizer.map((item) => (
                <div key={item.organizer} className="flex items-center justify-between px-4 py-1.5">
                  <span className="truncate text-sm text-slate-900">{item.organizer}</span>
                  <span className="text-sm font-medium text-slate-900">{formatEuro(item.sum)}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Nach Monat (Startdatum) */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Nach Monat (Startdatum)
          </div>
          <div className="flex-1 divide-y divide-slate-100 overflow-y-auto text-sm">
            {isLoading && (
              <div className="px-4 py-2 text-xs text-slate-400">Lade Daten…</div>
            )}
            {error && !isLoading && (
              <div className="px-4 py-2 text-xs text-red-600">
                Fehler beim Laden der Kosten.
              </div>
            )}
            {!isLoading && !error && byMonth.length === 0 && (
              <div className="px-4 py-2 text-xs text-slate-400">Keine Einträge</div>
            )}
            {!isLoading && !error &&
              byMonth.map((item) => {
                const label = item.date.toLocaleDateString('de-DE', {
                  month: 'long',
                  year: 'numeric',
                });

                return (
                  <div key={item.key} className="flex items-center justify-between px-4 py-1.5">
                    <span className="text-sm text-slate-900">{label}</span>
                    <span className="text-sm font-medium text-slate-900">
                      {formatEuro(item.sum)}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Hinweis: Bei „Teilnehmerkosten" wird das Feld „Kosten/Ticket" oder Preis pro Person interpretiert und mit der Anzahl der
        Kolleg:innen multipliziert. Bei „Messestandkosten" wird nur der eingetragene Betrag als Gesamtsumme gewertet (unabhängig
        von der TN-Anzahl). Alle Summen basieren auf der aktuell gefilterten Liste.
      </p>
    </div>
  );
}
